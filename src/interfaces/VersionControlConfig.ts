/**
 * Interface to describe the Version Control Configuration
 */
export default interface VersionControlConfig {
	/**
	 * The server URL (without trailing /)
	 */
	serverUrl: string;
	/**
	 * The name of the project or user that contains the repository
	 */
	projectName: string;
	/**
	 * The name of the repository
	 */
	repositoryName: string;
	/**
	 * The name of the branch that should be worked on
	 */
	branchName: string;
}