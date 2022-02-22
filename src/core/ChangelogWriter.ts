import { EventContext } from '@directus/shared/dist/esm/types';
import BitbucketVersionControl from '../api/BitbucketVersionControl';
import { ExceptionTypes } from '../enums/ExceptionTypes';
import { LogLevels } from '../enums/LogLevels';
import Credentials from '../interfaces/Credentials';
import VersionControlAbstraction from '../interfaces/VersionControlAbstraction';
import VersionControlConfig from '../interfaces/VersionControlConfig';
import ChangelogFormatter from './ChangelogFormatter';
import ExceptionProvider from './ExceptionProvider';
import ExtensionLogger from './ExtensionLogger';

/**
 * The main class of the extension - setup and handling of 'action' events happens in here
 */
export default class ChangelogWriter {
	
	private loggerReference: ExtensionLogger;
	private exceptionProvider: ExceptionProvider;
	private vcsAbstraction: VersionControlAbstraction | undefined;
	private vcsCredentials: Credentials = {
		user: '',
		password: '',
		token: ''
	};
	private vcsConfig: VersionControlConfig = {
		serverUrl: '',
		projectName: '',
		repositoryName: '',
		branchName: ''
	}
	private extensionConfig = {
		/** The name of the Directus collection that should be monitored  */
		collectionName: '',
		/** The name of the field in the collection that contains the to-be-added changelog content */
		fieldName: '',
		/** The internal name of the used VCS */
		vcs: '',
		/** The name of the changelog file in the repository */
		fileName: ''
	}
	
	/**
	 * Create a new instance
	 * @param env The env variables that Directus provides to the Hook-Extension
	 * @param logger The logger that directus provides to the Hook-Extension
	 */
	constructor(env: Record<string, any>, logger: ExtensionLogger, database: any) {
		this.exceptionProvider = ExceptionProvider.getInstance();

		this.loggerReference = logger;
	
		this.loggerReference.logMessage(LogLevels.debug, 'Validating configuration...');
		this.configReader(env);

		this.loggerReference.logMessage(LogLevels.debug, 'Checking if configured collection and field exist...');
		if (!this.checkForTable(database)) {
			throw this.exceptionProvider.getNewException(ExceptionTypes.InvalidConfigException, `Configured collection '${this.extensionConfig.collectionName}' was not found`);
		}
		if (!this.checkForColumn(database)) {
			throw this.exceptionProvider.getNewException(ExceptionTypes.InvalidConfigException,
				`Configured field '${this.extensionConfig.fieldName}' was not found in collection '${this.extensionConfig.collectionName}'`);
		}

		// if config reader succeeded without error we should have a VCS abstraction loaded by now
		if (this.vcsAbstraction !== undefined) {
			this.loggerReference.logMessage(LogLevels.debug, 'Applying config to Version Control Abstraction...');
			this.vcsAbstraction.applyConfig(this.vcsCredentials, this.vcsConfig, this.extensionConfig.fileName);
		} else {
			throw this.exceptionProvider.getNewException(ExceptionTypes.BaseException, 'Version Control Abstraction could not be initialized');
		}

	}

	/**
	 * Function to get the name of the configured collection that should be monitored for changes
	 * @returns The name of the collection that should be monitored for updates
	 */
	getCollectionName() {
		return this.extensionConfig.collectionName;
	}

	/**
	 * The event handler that is executed once the monitored collection has a change
	 * @param event The event data from Directus
	 * @param meta The meta data from Directus
	 */
	async triggerProcessor(event: Record<string, any>, meta: EventContext) {
		if (this.vcsAbstraction === undefined) {
			throw this.exceptionProvider.getNewException(ExceptionTypes.BaseException, 'Cannot execute because VCS abstraction is undefined');
		}

		const userDetails = await meta.database('directus_users').where({ id: meta.accountability?.user });
		if (userDetails === undefined || userDetails === null) {
			throw this.exceptionProvider.getNewException(ExceptionTypes.UnexpectedResponseException, 'Could not extract details of the user that triggered the change');
		}
		if (userDetails.length !== 1) {
			throw this.exceptionProvider.getNewException(ExceptionTypes.UnexpectedResponseException, 'Received invalid number of user records when trying to identify the responsible for the change');
		}

		const changeUserId = this.extractUserId(userDetails[0]);
		const date = new Date().toLocaleString('en-GB', { hour12: false, timeZone: 'UTC', timeZoneName: 'short' });
		const changeContent = event.payload[this.extensionConfig.fieldName];
		if (changeContent !== undefined) {
			const newData = ChangelogFormatter.formatLatestChanges(changeContent,`## ${date} by ${changeUserId}`);
			const commitMsg = `Content update from Directus CMS by ${changeUserId}`;
			// do the actual execution
			this.vcsAbstraction.addToChangelogFile(newData, commitMsg);
		} else {
			// it seems there is a change in the monitored collection, but not in the field we're looking at
			// so we warn the admin that something that might be not intended is possible
			this.loggerReference.logMessage(LogLevels.warn,
				'Things in the changelog collection changed, but not in the monitored field. Make sure this is wanted behavior...');
		}

	}

	/**
	 * Helper to allow a synchronous check if the configured collection (table) exists
	 * @param database The Knex database object that is provided by Directus
	 * @returns Information if the collection (table) exists in the schema
	 */
	private async checkForTable(database: any): Promise<boolean> {
		return await database.schema.hasTable(this.extensionConfig.collectionName) as boolean;
	}

	/**
	 * Helper to allow a synchronous check if the configured field (column) exists in the collection (table)
	 * @param database The Knex database object that is provided by Directus
	 * @returns Information if the field (column) exists in the table
	 */
	private async checkForColumn(database: any): Promise<boolean> {
		return await database.schema.hasColumn(this.extensionConfig.collectionName, this.extensionConfig.fieldName) as boolean;
	}

	/**
	 * Internal helper to extract a human readable User Identifier from a user record
	 * @param userDetails The users record from Directus 'directus_users' table
	 * @returns A string that contains the best identifier that could be found
	 */
	private extractUserId(userDetails: any): string {
		// In Directus is nothing that needs to be set for a user beside the auto-generated ID.
		// As you could have a user with an API token but nothing more this function tries it's
		// best to find anything to identify the user in a human readable way - but falls back
		// to the user ID as last resort solution...
		let changeUserId = '';
		// first check the email field
		if (userDetails.email !== null) {
			changeUserId = userDetails.email;
		}
		// if we do not find have any content in the email field we need to go via a fallback strategy
		if (changeUserId.trim() === '') {
			// first we check if there is an external identifier set (should be available if SSO providers are active)
			if (userDetails.external_identifier !== null) {
				// if we are sure its not null make sure it was not accidentally filled with a space either
				if (userDetails.external_identifier.trim() !== '') {
					changeUserId = userDetails.external_identifier;
				}
			}
		}
		// if no email and no external identifier was found let's check for a name
		if (changeUserId.trim() === '') {
			let name = '';
			if (userDetails.first_name !== null) {
				name = userDetails.first_name.trim();
			}
			if (userDetails.last_name !== null) {
				if (name !== '') {
					name += ' '.concat(userDetails.last_name.trim());
				} else {
					name = userDetails.last_name.trim();
				}
			}
			// if there was any name it should now be in the variable
			if (name === '') {
				// if name is still empty use unknown and ID
				changeUserId = `Unknown (ID: ${userDetails.id})`;
			} else {
				// if we have a name use the name and ID
				changeUserId = `${name} (ID: ${userDetails.id})`;
			}
		}

		return changeUserId;
	}

	/**
	 * Internal helper to do a basic validation of a configuration item (not undefined and not an empty string)
	 * @param value The value to check
	 * @param exceptionType The type of exception that is thrown if the validation fails
	 * @param errorMessage The error message to add to the exception in case of a validation fail
	 */
	private configValueChecker(value: string | undefined, exceptionType: ExceptionTypes, errorMessage: string) {
		if (value === undefined || value.trim() === '') {
			throw this.exceptionProvider.getNewException(exceptionType,errorMessage);
		}
	}

	/**
	 * Internal helper to check and apply all configuration items to the internal settings objects
	 * @param env The env variables that Directus provides to the Hook-Extension
	 */
	private configReader(env: Record<string, any>) {
		this.configValueChecker(
			env.VERSION_CONTROL_CHANGELOG_COLLECTION,
			ExceptionTypes.InvalidConfigException,
			'Configuration BITBUCKET_CHANGELOG_COLLECTION is missing; cannot monitor for updates'
		);
		this.extensionConfig.collectionName = env.VERSION_CONTROL_CHANGELOG_COLLECTION;

		this.configValueChecker(
			env.VERSION_CONTROL_CHANGELOG_FIELD_NAME,
			ExceptionTypes.InvalidConfigException,
			'Configuration BITBUCKET_CHANGELOG_FIELD_NAME is missing; cannot extract changes'
		);
		this.extensionConfig.fieldName = env.VERSION_CONTROL_CHANGELOG_FIELD_NAME;

		this.configValueChecker(
			env.VERSION_CONTROL_CHANGELOG_VCS_SERVER_URL,
			ExceptionTypes.InvalidConfigException,
			'Configuration VERSION_CONTROL_CHANGELOG_VCS_SERVER_URL is missing'
		);
		this.vcsConfig.serverUrl = env.VERSION_CONTROL_CHANGELOG_VCS_SERVER_URL;

		this.configValueChecker(
			env.VERSION_CONTROL_CHANGELOG_VCS_PROJECT,
			ExceptionTypes.InvalidConfigException,
			'Configuration VERSION_CONTROL_CHANGELOG_VCS_PROJECT is missing'
		);
		this.vcsConfig.projectName = env.VERSION_CONTROL_CHANGELOG_VCS_PROJECT;

		this.configValueChecker(
			env.VERSION_CONTROL_CHANGELOG_VCS_REPOSITORY,
			ExceptionTypes.InvalidConfigException,
			'Configuration VERSION_CONTROL_CHANGELOG_VCS_REPOSITORY is missing'
		);
		this.vcsConfig.repositoryName = env.VERSION_CONTROL_CHANGELOG_VCS_REPOSITORY;

		this.configValueChecker(
			env.VERSION_CONTROL_CHANGELOG_VCS_BRANCH,
			ExceptionTypes.InvalidConfigException,
			'Configuration VERSION_CONTROL_CHANGELOG_VCS_BRANCH is missing'
		);
		this.vcsConfig.branchName = env.VERSION_CONTROL_CHANGELOG_VCS_BRANCH;

		this.configValueChecker(
			env.VERSION_CONTROL_CHANGELOG_VCS_FILENAME,
			ExceptionTypes.InvalidConfigException,
			'Configuration VERSION_CONTROL_CHANGELOG_VCS_FILENAME is missing'
		);
		this.extensionConfig.fileName = env.VERSION_CONTROL_CHANGELOG_VCS_FILENAME;

		this.configValueChecker(
			env.VERSION_CONTROL_CHANGELOG_VCS,
			ExceptionTypes.InvalidConfigException,
			'Configuration VERSION_CONTROL_CHANGELOG_VCS is missing; no VCS to connect to'
		);
		switch (env.VERSION_CONTROL_CHANGELOG_VCS.toLowerCase()) {
			case 'bitbucket':
				break;
			default:
				throw this.exceptionProvider.getNewException(ExceptionTypes.InvalidConfigException,
					`Configuration VERSION_CONTROL_CHANGELOG_VCS is set to '${env.VERSION_CONTROL_CHANGELOG_VCS}'; VCS provider is unknown`);
		}
		this.extensionConfig.vcs = env.VERSION_CONTROL_CHANGELOG_VCS.toLowerCase();

		// VCS specific credential reading and setup
		if (this.extensionConfig.vcs === 'bitbucket') {
			this.configValueChecker(
				env.VERSION_CONTROL_CHANGELOG_BITBUCKET_USER,
				ExceptionTypes.InvalidCredentialsException,
				'Configuration VERSION_CONTROL_CHANGELOG_BITBUCKET_USER is missing or empty'
			);
			this.vcsCredentials.user = env.VERSION_CONTROL_CHANGELOG_BITBUCKET_USER;
			this.configValueChecker(
				env.VERSION_CONTROL_CHANGELOG_BITBUCKET_PASSWORD,
				ExceptionTypes.InvalidCredentialsException,
				'Configuration VERSION_CONTROL_CHANGELOG_BITBUCKET_PASSWORD is missing or empty'
			);
			this.vcsCredentials.password = env.VERSION_CONTROL_CHANGELOG_BITBUCKET_PASSWORD;
			// create an instance of the VCS abstraction according to the setting
			this.vcsAbstraction = new BitbucketVersionControl(this.loggerReference);
		}
	}

}