import { ExceptionTypes } from "../enums/ExceptionTypes";

/**
 * Singleton helper to provide the Directus exceptions easily in all sub-components of the extension
 */
export default class ExceptionProvider {
	private directusExceptions: any;
	private static instance: ExceptionProvider = new ExceptionProvider();

	/**
	 * DO NOT USE! This is a singleton; use getInstance() instead of new!
	 */
	constructor() {
		if (ExceptionProvider.instance){
			throw new Error('Error: Manual instantiation forbidden - use ExceptionProvider.getInstance() instead of new.');
		}
		ExceptionProvider.instance = this;
	}

	/**
	 * Injector function - intended to be called ONCE in the init process of the main extension class
	 * @param directusExceptions The object from directus that contains the exceptions it provides
	 */
	injectDirectusExceptions(directusExceptions: any) {
		this.directusExceptions = directusExceptions;
	}

	/**
	 * Get the one instance of this class that you should use to get Directus exception types
	 * @returns The (singleton) instance of this class to use
	 */
	static getInstance() {
		return ExceptionProvider.instance;
	}

	/**
	 * The function to get new instances of Directus exceptions
	 * @param exceptionType The type of exception you want to get
	 * @param message The error message that should be passed to the exception
	 * @returns The Directus requested exception - ready to be thrown ;)
	 */
	getNewException( exceptionType: ExceptionTypes, message: string): any {
		switch (exceptionType) {
			case ExceptionTypes.InvalidConfigException:
				return new this.directusExceptions.InvalidConfigException(message);
			case ExceptionTypes.InvalidCredentialsException:
				return new this.directusExceptions.InvalidCredentialsException(message);
			case ExceptionTypes.FailedValidationException:
				return new this.directusExceptions.FailedValidationException(message);
			case ExceptionTypes.UnexpectedResponseException:
				return new this.directusExceptions.UnexpectedResponseException(message);
			case ExceptionTypes.BaseException:
				return new this.directusExceptions.BaseException(message);
		}
	}

}