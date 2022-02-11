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

	constructor(logger: ExtensionLogger) {
		this.loggerReference = logger;
		this.authentication = { user: '', password: '', token: ''};
		this.serverConfig = { serverUrl: '', projectName: '', repositoryName: '', branchName: ''};
		this.changelogFile = '';
		this.isConfigured = false;
		this.exceptionProvider = ExceptionProvider.getInstance();
		this.loggerReference.logMessage(LogLevels.debug, 'Bitbucket Version Control Abstraction created');
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

		const bitbucketApiAuthHeader = {
			auth: {
				username: this.authentication.user,
				password: this.authentication.password
			}
		};
		this.loggerReference.logMessage(LogLevels.debug, 'BitbucketVersionControl: fetching last commit information');
		let lastCommitDetails = await axios.get(
			`${this.serverConfig.serverUrl}/rest/api/1.0/projects/${this.serverConfig.projectName}/repos/${this.serverConfig.repositoryName}/commits?until=${this.serverConfig.branchName}&limit=0&start=0`,
			bitbucketApiAuthHeader
		);
		// ToDo: 404 in case of non existent branch -> {"errors": [{"context": null,"message": "Commit 'feature/directus-changes' does not exist in repository 'directus-plugin-playground'.","exceptionName": "com.atlassian.bitbucket.commit.NoSuchCommitException"}]}
		// Las commit is always filled as long as there is at least one in the repo; even on new branches you get the last commit ID from the origin
		if (lastCommitDetails.status !== 200) {
			this.loggerReference.logMessage(LogLevels.error, 'could not fetch the ID of the latest commit from Bitbucket');
			// ToDo: error handling in combination with detection if file is there
			return false;
		}
		const lastCommitId = lastCommitDetails.data.values[0].id;
		this.loggerReference.logMessage(LogLevels.debug, `BitbucketVersionControl: latest commit in Directus Changelog Branch: ${lastCommitId}`);

		this.loggerReference.logMessage(LogLevels.debug, 'BitbucketVersionControl: fetching current changelog content');
		let oldChangelogContent = await axios.get(
			`${this.serverConfig.serverUrl}/rest/api/1.0/projects/${this.serverConfig.projectName}/repos/${this.serverConfig.repositoryName}/browse/${this.changelogFile}?at=${this.serverConfig.branchName}`,
			bitbucketApiAuthHeader
		);
		// ToDo: if 404 (not found) we need to generate dummy data - or handle this somehow different
		if (oldChangelogContent.status !== 200) {
			this.loggerReference.logMessage(LogLevels.error, 'BitbucketVersionControl: could not fetch the current changelog from Bitbucket');
			// ToDo: find out if the file is just missing and we need to create it
			return false;
		}
		
		// build updated changelog
		const tempLines = new Array<string>();
		// extract lines from object array
		for (let idx = 0; idx < oldChangelogContent.data?.lines?.length; idx++) {
			tempLines.push(oldChangelogContent.data?.lines[idx].text);
		}
		const newLogLines = ChangelogFormatter.insertNewEntryIntoLog(tempLines, newContent);
		
		const data = new FormData();
		data.append('branch', this.serverConfig.branchName);
		data.append('content', newLogLines.join(`\n`));
		data.append('message', commitMessage);
		data.append('sourceCommitId', lastCommitId);
		const bitbucketApiPutHeader = {
			headers: data.getHeaders(),
			auth: {
				username: this.authentication.user,
				password: this.authentication.password
			}
		};
		this.loggerReference.logMessage(LogLevels.debug, 'BitbucketVersionControl: committing changes to Bitbucket');
		const putResult = await axios.put(
			`${this.serverConfig.serverUrl}/rest/api/1.0/projects/${this.serverConfig.projectName}/repos/${this.serverConfig.repositoryName}/browse/${this.changelogFile}`,
			data, bitbucketApiPutHeader
		);

		if (putResult.status !== 200) {
			this.loggerReference.logMessage(LogLevels.error, 'BitbucketVersionControl: Could push the new changelog to Bitbucket');
			// ToDo: find out if the file is just missing and we need to create it
			return false;
		}

		// signal that everything worked
		return true;
	}

}