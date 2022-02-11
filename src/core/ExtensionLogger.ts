import { Logger, LoggerOptions } from 'pino';
import { LogLevels } from '../enums/LogLevels';

/**
 * Wrapper around the pino logger provided by Directus
 * To have extension wide customizations configurable at one central place
 */
export default class ExtensionLogger {

	private loggerReference: Logger<LoggerOptions>;

	constructor(directusLogger: Logger<LoggerOptions>) {
		// adding a prefix for the output
		// using "name" to have it before the message itself based on the used formatter
		// --> see https://github.com/directus/directus/blob/ee7e678f24fd85846798bc3cc1af3103e728ebb7/api/src/logger.ts#L18
		// and https://www.npmjs.com/package/pino-colada
		this.loggerReference = directusLogger.child({name: 'Version Control Changelog Extension'});
	}

	
	logMessage(level: LogLevels, message: string) : void {
		switch (level) {
			case LogLevels.silent:
				this.loggerReference.silent(message);
				break;
			case LogLevels.trace:
				this.loggerReference.trace(message);
				break;
			case LogLevels.debug:
				this.loggerReference.debug(message);
				break;
			case LogLevels.info:
				this.loggerReference.info(message);
				break;
			case LogLevels.warn:
				this.loggerReference.warn(message);
				break;
			case LogLevels.error:
				this.loggerReference.error(message);
				break;
			case LogLevels.fatal:
				this.loggerReference.fatal(message);
				break;
		}
	}

	logObject(level: LogLevels, headline: string, object: any) : void {
		switch (level) {
			case LogLevels.silent:
				this.loggerReference.silent(object, headline);
				break;
			case LogLevels.trace:
				this.loggerReference.trace(object, headline);
				break;
			case LogLevels.debug:
				this.loggerReference.debug(object, headline);
				break;
			case LogLevels.info:
				this.loggerReference.info(object, headline);
				break;
			case LogLevels.warn:
				this.loggerReference.warn(object, headline);
				break;
			case LogLevels.error:
				this.loggerReference.error(object, headline);
				break;
			case LogLevels.fatal:
				this.loggerReference.fatal(object, headline);
				break;
		}
	}
}