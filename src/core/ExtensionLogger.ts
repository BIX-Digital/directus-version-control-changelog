import { Logger, LoggerOptions } from 'pino';
import { LogLevels } from '../enums/LogLevels';

/**
 * Wrapper around the pino logger provided by Directus
 * To have extension wide customizations configurable at one central place
 */
export default class ExtensionLogger {

	private loggerReference: Logger<LoggerOptions>;

	/**
	 * Create a new instance
	 * @param directusLogger The reference to the pino logger provided by Directus
	 */
	constructor(directusLogger: Logger<LoggerOptions>) {
		// adding a prefix for the output
		// using "name" to have it before the message itself based on the used formatter
		// --> see https://github.com/directus/directus/blob/ee7e678f24fd85846798bc3cc1af3103e728ebb7/api/src/logger.ts#L18
		// and https://www.npmjs.com/package/pino-colada
		this.loggerReference = directusLogger.child({name: 'Version Control Changelog Extension'});
	}

	/**
	 * Log a simple text message
	 * @param level The log level at which this should be logged
	 * @param message The message to log
	 */
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

	/**
	 * Log a text description and an object
	 * @param level The log level at which this should be logged
	 * @param headline The message to log
	 * @param errorObject The object to log
	 */
	logObject(level: LogLevels, headline: string, errorObject: any) : void {
		// The JSON.stringify is used to work around the quirk that pino
		// for some reason does not print out the objects lately; it always
		// claims they are undefined (you can check that by simple logging one object)
		switch (level) {
			case LogLevels.silent:
				this.loggerReference.silent(`${headline}\n${JSON.stringify(errorObject, null, 2)}`);
				break;
			case LogLevels.trace:
				this.loggerReference.trace(`${headline}\n${JSON.stringify(errorObject, null, 2)}`);
				break;
			case LogLevels.debug:
				this.loggerReference.debug(`${headline}\n${JSON.stringify(errorObject, null, 2)}`);
				break;
			case LogLevels.info:
				this.loggerReference.info(`${headline}\n${JSON.stringify(errorObject, null, 2)}`);
				break;
			case LogLevels.warn:
				this.loggerReference.warn(`${headline}\n${JSON.stringify(errorObject, null, 2)}`);
				break;
			case LogLevels.error:
				this.loggerReference.error(`${headline}\n${JSON.stringify(errorObject, null, 2)}`);
				break;
			case LogLevels.fatal:
				this.loggerReference.fatal(`${headline}\n${JSON.stringify(errorObject, null, 2)}`);
				break;
		}
	}
}