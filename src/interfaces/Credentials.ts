/**
 * Interface to describe a Credentials Object
 */
export default interface Credentials {
	/**
	 * The name or email of a user (whatever the VCS uses)
	 */
	user: string;
	/**
	 * The password of a user
	 */
	password: string;
	/**
	 * The token of a user
	 */
	token: string;
}
