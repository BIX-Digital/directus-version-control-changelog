import { defineHook } from '@directus/extensions-sdk';
import ChangelogWriter from './core/ChangelogWriter';
import ExceptionProvider from './core/ExceptionProvider';
import ExtensionLogger from './core/ExtensionLogger';
import { LogLevels } from './enums/LogLevels';

export default defineHook(({ action }, { exceptions, database, env, logger }) => {
	const extensionLogger = new ExtensionLogger(logger);
	const exceptionHelper = ExceptionProvider.getInstance();
	exceptionHelper.injectDirectusExceptions(exceptions);

	try {
		const extensionHook = new ChangelogWriter(env, extensionLogger, database);
		// using the directus event-filter to only call out extension
		// in case the changelog collection changes - to avoid unnecessary executions
		action(`${extensionHook.getCollectionName()}.items.update`, (event, meta) => {
			extensionHook.triggerProcessor(event, meta);
		});
		extensionLogger.logMessage(LogLevels.info, 'Extension initialized, action handler registered');
	} catch (error: any) {
		if (error instanceof exceptions.InvalidConfigException) {
			extensionLogger.logMessage(LogLevels.error, 'Configuration error on initialization: '.concat(error.message));
		} else if (error instanceof exceptions.InvalidCredentialsException) {
			extensionLogger.logMessage(LogLevels.error, 'Credential error on initialization: '.concat(error.message));
		} else if (error instanceof exceptions.FailedValidationException) {
			extensionLogger.logMessage(LogLevels.error, 'Validation failure on initialization: '.concat(error.message));
		} else {
			extensionLogger.logObject(LogLevels.error, 'Extension could not be initialized:', error);
		}
	}
	
});
