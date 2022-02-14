import 'jest';
import ExceptionProvider from '../src/core/ExceptionProvider';
import { ExceptionTypes } from '../src/enums/ExceptionTypes';

// mocks for the exceptions
class BaseException extends Error {
	constructor(message: string) {
		super(message);
	}
}
class InvalidConfigException extends BaseException {
	constructor(message = 'Invalid config') {
		super(message);
	}
}
class InvalidCredentialsException extends BaseException {
	constructor(message = 'Invalid user credentials.') {
		super(message);
	}
}
class UnexpectedResponseException extends BaseException {
	constructor(message: string) {
		super(message);
	}
}
class FailedValidationException extends BaseException {
	constructor(message: string) {
		super(message);
	}
}

describe('ExceptionProvider', () => {
	let instance: ExceptionProvider;

	beforeEach(() => {
			instance = ExceptionProvider.getInstance();
			const exceptions = {
				BaseException,
				InvalidConfigException,
				InvalidCredentialsException,
				UnexpectedResponseException,
				FailedValidationException
			};
			instance.injectDirectusExceptions(exceptions);
	});

	it('should be an instance', async () => {
			expect(instance).toBeInstanceOf(ExceptionProvider);
	});

	it('should prevent you from using new', async () => {
		expect(() => {
			instance = new ExceptionProvider();
		}).toThrow('Error: Manual instantiation forbidden - use ExceptionProvider.getInstance() instead of new.')
	});

	it('should return the right types of exception and message', async () => {
		const base = instance.getNewException(ExceptionTypes.BaseException, 'b');
		expect(base).toBeInstanceOf(BaseException);
		expect(base.message).toBe('b');
		
		const invalidConfig = instance.getNewException(ExceptionTypes.InvalidConfigException, 'ico');
		expect(invalidConfig).toBeInstanceOf(InvalidConfigException);
		expect(invalidConfig.message).toBe('ico');
		
		const invalidCredentials = instance.getNewException(ExceptionTypes.InvalidCredentialsException, 'icr');
		expect(invalidCredentials).toBeInstanceOf(InvalidCredentialsException);
		expect(invalidCredentials.message).toBe('icr');
		
		const unexpected = instance.getNewException(ExceptionTypes.UnexpectedResponseException, 'u');
		expect(unexpected).toBeInstanceOf(UnexpectedResponseException);
		expect(unexpected.message).toBe('u');

		const failed = instance.getNewException(ExceptionTypes.FailedValidationException, 'f');
		expect(failed).toBeInstanceOf(FailedValidationException);
		expect(failed.message).toBe('f');
	});

});
