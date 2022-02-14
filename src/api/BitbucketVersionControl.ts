import axios from 'axios';
import FormData from 'form-data';
import ChangelogFormatter from '../core/ChangelogFormatter';
import ExceptionProvider from '../core/ExceptionProvider';
import ExtensionLogger from '../core/ExtensionLogger';
import { ExceptionTypes } from '../enums/ExceptionTypes';
import { LogLevels } from '../enums/LogLevels';
import Credentials from '../interfaces/Credentials';
import VersionControlAbstraction from '../interfaces/VersionControlAbstraction';
import VersionControlConfig from '../interfaces/VersionControlConfig';

/**
 * Bitbucket (Server) Version Control Abstraction
 * Intended to work with Bitbucket Server, using the v1 API and
 * Basic Auth (thus needing username and password in the credentials)
 */
export default class BitbucketVersionControl implements VersionControlAbstraction {
	private authentication: Credentials;
	private serverConfig: VersionControlConfig;
	private changelogFile: string;
	private isConfigured: boolean;
	private loggerReference: ExtensionLogger;
	private exceptionProvider: ExceptionProvider;
	private defaultAuthHeader: {
		auth: {
			username: string,
			password: string
		}
	};

	constructor(logger: ExtensionLogger) {
		this.loggerReference = logger;
		this.authentication = { user: '', password: '', token: ''};
		this.serverConfig = { serverUrl: '', projectName: '', repositoryName: '', branchName: ''};
		this.changelogFile = '';
		this.isConfigured = false;
		this.exceptionProvider = ExceptionProvider.getInstance();
		this.loggerReference.logMessage(LogLevels.debug, 'Bitbucket Version Control Abstraction created');

		this.defaultAuthHeader = {
			auth: {
				username: this.authentication.user,
				password: this.authentication.password
			}
		};
	}

	applyConfig(authentication: Credentials, config: VersionControlConfig, changelogFile: string): void {
		if (authentication === undefined
			|| config === undefined
			|| changelogFile === undefined) {
			throw this.exceptionProvider.getNewException(ExceptionTypes.InvalidConfigException, 'BitbucketVersionControl: Parameters cannot be undefined when calling applyConfig()');
		}
		if (config.serverUrl.trim() === '' 
			|| config.projectName.trim() === ''
			|| config.repositoryName.trim() === ''
			|| config.repositoryName.trim() == '') {
				throw this.exceptionProvider.getNewException(ExceptionTypes.InvalidConfigException, 'BitbucketVersionControl: Values in the config parameter cannot be empty strings when calling applyConfig()');
		}
		if (changelogFile.trim() === '') {
			throw this.exceptionProvider.getNewException(ExceptionTypes.InvalidConfigException, 'BitbucketVersionControl: Parameter changelogFile cannot be an empty string when calling applyConfig()');
		}
		if (authentication.user.trim() === '' || authentication.password.trim() === '' ) {
			throw this.exceptionProvider.getNewException(ExceptionTypes.InvalidCredentialsException, 'BitbucketVersionControl: Credentials passed to applyConfig() need .name and .password set');
		}
		this.authentication = authentication;
		this.serverConfig = config;
		this.changelogFile = changelogFile;
		this.isConfigured = true;
	}

	async addToChangelogFile(newContent: Array<string>, commitMessage: string): Promise<boolean> {
		if (!this.isConfigured) {
			throw this.exceptionProvider.getNewException(ExceptionTypes.BaseException, 'BitbucketVersionControl: Calling addToChangelogFile() cannot work without configuration; run applyConfig() first');
		}

		try {
			const branches = await this.getBranchList();
			let lastCommitId = ''
			if (branches.availableBranches.includes(this.serverConfig.branchName)) {
				// branch exists already, just get last commit
				lastCommitId = await this.getLastCommitId(this.serverConfig.branchName);
			} else {
				// branch needs to be created from latest commit in base branch
				this.loggerReference.logMessage(LogLevels.info, 'BitbucketVersionControl: configured working branch not found, will be created');
				lastCommitId = await this.getLastCommitId(branches.baseBranch);
				await this.createBranch(this.serverConfig.branchName, lastCommitId);
			}
			const filesInRepo = await this.getListOfFiles();
			let currentChangelog = new Array<string>();
			if (filesInRepo.includes(this.changelogFile)) {
				// file exists, get latest content
				currentChangelog = await this.getCurrentChangelogContent();
			} else {
				this.loggerReference.logMessage(LogLevels.info, 'BitbucketVersionControl: configured file not found, will be created');
				// file is not yet created; remove commit ID
				lastCommitId = '';
			}

			const logToPush = ChangelogFormatter.insertNewEntryIntoLog(currentChangelog, newContent);

			await this.pushNewChangelog(logToPush, commitMessage, lastCommitId);
			this.loggerReference.logMessage(LogLevels.info, 'BitbucketVersionControl: new changelog pushed successful');
		} catch (error: any) {
			this.loggerReference.logMessage(LogLevels.error, error.message);
			return false;
		}
		// signal that everything worked
		return true;
	}

	/**
	 * Internal function to get the list of branches in the repository
	 * @returns An object that contains the base branch name as well as an array with all branches in the repository
	 */
	private async getBranchList(): Promise<{ baseBranch: string; availableBranches: Array<string>; }> {
		const pageSize = 1000;
		const result = {
			baseBranch: '',
			availableBranches: new Array<string>()
		}
		this.loggerReference.logMessage(LogLevels.debug, 'BitbucketVersionControl: fetching list of branches in repository');
		let response: any = undefined;
		try {
			const requestResponse = await axios.get(
				`${this.serverConfig.serverUrl}/rest/api/1.0/projects/${this.serverConfig.projectName}/repos/${this.serverConfig.repositoryName}/branches?limit=${pageSize}`,
				this.defaultAuthHeader
			);
			response = requestResponse;
		} catch (error: any) {
			this.loggerReference.logObject(LogLevels.debug, 'Axios error result:', error.response.data.errors);
		}
		if (response.status !== 200) {
			throw this.exceptionProvider.getNewException(ExceptionTypes.UnexpectedResponseException,
					'BitbucketVersionControl: could not retrieve list of branches');
		}
		if (!response.data.isLastPage) {
			throw this.exceptionProvider.getNewException(ExceptionTypes.UnexpectedResponseException,
					`BitbucketVersionControl: found more then ${pageSize} branches in the repository, canceling changelog commit - please clean up to reactivate changelog writing`);
		}
		response.data.values.forEach((branch: any) => {
			if (branch.isDefault) {
				result.baseBranch = branch.displayId;
			}
			result.availableBranches.push(branch.displayId as string);
		});
		return result;
	}

	/**
	 * Internal function to create a branch in the repository
	 * @param branchName The name of the branch that should be created
	 * @param startCommit The ID of the commit on the base-branch that should be used as origin
	 */
	private async createBranch(branchName: string, startCommit: string): Promise<void> {
		this.loggerReference.logMessage(LogLevels.debug, 'BitbucketVersionControl: creating working branch in repository');
		let responseStatus: any = undefined;
		try {
			let requestResponse = await axios.post(
				`${this.serverConfig.serverUrl}/rest/api/1.0/projects/${this.serverConfig.projectName}/repos/${this.serverConfig.repositoryName}/branches`, {
					name: branchName,
					startPoint: startCommit,
					message: "Directus Changelog Branch | auto-created by the Version Control Changelog Extension for Directus"
				},
				this.defaultAuthHeader
			);
			responseStatus = requestResponse.status;
		} catch (error: any) {
			this.loggerReference.logObject(LogLevels.debug, 'Axios error result:', error.response.data.errors);
		}
		if (responseStatus !== 200) {
			throw this.exceptionProvider.getNewException(ExceptionTypes.UnexpectedResponseException,
					'BitbucketVersionControl: could not create working of branch');
		}
	}

	/**
	 * Internal function to get the last commit in a branch of the repository
	 * @param branchName The name of the branch where you want to get the last commit from
	 * @returns The ID of the last commit in the branch
	 */
	private async getLastCommitId(branchName: string): Promise<string> {
		this.loggerReference.logMessage(LogLevels.debug, 'BitbucketVersionControl: fetching last commit information');
		let response: any = undefined;
		try {
			const requestResponse = await axios.get(
				`${this.serverConfig.serverUrl}/rest/api/1.0/projects/${this.serverConfig.projectName}/repos/${this.serverConfig.repositoryName}/commits?until=${branchName}&limit=0&start=0`,
				this.defaultAuthHeader
			);
			response = requestResponse; 
		} catch (error: any) {
			this.loggerReference.logObject(LogLevels.debug, 'Axios error result:', error.response.data.errors);
		}
		// Last commit is always filled as long as there is at least one in the repo; even on new branches you get the last commit ID from the origin
		if (response.status !== 200) {
			throw this.exceptionProvider.getNewException(ExceptionTypes.UnexpectedResponseException,
					'BitbucketVersionControl: could not fetch the ID of the latest commit in the branch');
		}
		return response.data.values[0].id as string;
	}

	/**
	 * Internal function to get the content of the current changelog in the repository
	 * @returns An array os strings, each item represents a line in the file
	 */
	private async getCurrentChangelogContent(): Promise<Array<string>> {
		let result = new Array<string>();
		this.loggerReference.logMessage(LogLevels.debug, 'BitbucketVersionControl: fetching current changelog content');
		let response: any = undefined;
		try {
			const requestResponse = await axios.get(
				`${this.serverConfig.serverUrl}/rest/api/1.0/projects/${this.serverConfig.projectName}/repos/${this.serverConfig.repositoryName}/browse/${this.changelogFile}?at=${this.serverConfig.branchName}`,
				this.defaultAuthHeader
			);
			response = requestResponse;
		} catch (error: any) {
			this.loggerReference.logObject(LogLevels.debug, 'Axios error result:', error.response.data.errors);
		}
		if (response.status !== 200) {
			throw this.exceptionProvider.getNewException(ExceptionTypes.UnexpectedResponseException,
				'BitbucketVersionControl: could not fetch the current changelog from Bitbucket');
		}
		// extract lines from object array
		response.data?.lines?.forEach((line: any) => {
			result.push(line.text);
		});
		return result;
	}

	/**
	 * Internal function to get the list of files in the repository
	 * @param startAt Optional parameter at what position to start - for the recursive calls in case there are many files
	 * @returns An array of strings that contains the path and filename of each file in the repository
	 */
	private async getListOfFiles(startAt: number = 0): Promise<Array<string>> {
		const pageSize = 250;
		const result = new Array<string>();
		this.loggerReference.logMessage(LogLevels.debug, 'BitbucketVersionControl: fetching list of files in repository');
		let response: any = undefined;
		try {
			const requestResponse = await axios.get(
				`${this.serverConfig.serverUrl}/rest/api/1.0/projects/${this.serverConfig.projectName}/repos/${this.serverConfig.repositoryName}/files?at=${this.serverConfig.branchName}&start=${startAt}&limit=${pageSize}`,
				this.defaultAuthHeader
			);
			response = requestResponse;
		} catch (error: any) {
			this.loggerReference.logObject(LogLevels.debug, 'Axios error result:', error.response.data.errors);
		}
		if (response.status !== 200) {
			throw this.exceptionProvider.getNewException(ExceptionTypes.UnexpectedResponseException,
					`BitbucketVersionControl: could not retrieve list of files starting at file number ${startAt + 1}`);
		}
		result.push(...response.data.values);
		if (!response.data.isLastPage) {
			const moreFiles = await this.getListOfFiles(startAt + pageSize);
			result.push(...moreFiles);
		}
		return result;
	}

	/**
	 * Internal function to push the new Changelog to the repository
	 * @param changelogLines An array of strings, each item representing one line in the file to be written
	 * @param commitMessage The commit message that should be used for the push
	 * @param lastCommitId The ID of the previous commit if the file gets extended - or an empty string if the file is to be created
	 */
	private async pushNewChangelog(changelogLines: Array<string>, commitMessage: string, lastCommitId: string) {
		const data = new FormData();
		data.append('branch', this.serverConfig.branchName);
		data.append('content', changelogLines.join(`\n`));
		data.append('message', commitMessage);
		if (lastCommitId !== '') {
			// when the file is to be created there must not be a previous commit ID (even no empty one)
			data.append('sourceCommitId', lastCommitId);
		}
		const bitbucketApiPutHeader = {
			headers: data.getHeaders(),
			auth: this.defaultAuthHeader.auth
		};
		this.loggerReference.logMessage(LogLevels.debug, 'BitbucketVersionControl: committing changes to Bitbucket');
		let responseStatus = undefined;
		try {
			const putResult = await axios.put(
				`${this.serverConfig.serverUrl}/rest/api/1.0/projects/${this.serverConfig.projectName}/repos/${this.serverConfig.repositoryName}/browse/${this.changelogFile}`,
				data, bitbucketApiPutHeader
			);
			responseStatus = putResult.status;
		} catch (error: any) {
			this.loggerReference.logObject(LogLevels.debug, 'Axios error result:', error.response.data.errors);
		}
		if (responseStatus !== 200) {
			throw this.exceptionProvider.getNewException(ExceptionTypes.UnexpectedResponseException,
				'BitbucketVersionControl: could not push the new changelog to Bitbucket');
		}
	}

}