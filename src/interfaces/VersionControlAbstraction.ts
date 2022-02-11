
import Credentials from "./Credentials";
import VersionControlConfig from "./VersionControlConfig";

/**
 * Interface to describe the Version Control (Server) abstraction.
 * Intended to allow the integration of more then just one Version Control
 * Server Vendor by abstracting the actions that need to be done
 */
export default interface VersionControlAbstraction {
	/**
	 * Apply the configuration values
	 * @param authentication The Authentication for the Version Control API
	 * @param config The Server Configuration
	 * @param changelogFile The changelog file in the repository to write to
	 */	
	applyConfig(authentication: Credentials, config: VersionControlConfig, changelogFile: string): void;

	/**
	 * Function to add something to the changelog file in the version control
	 * @param newContent The content to add at the beginning of the already existing
	 * @param commitMessage The commit message to use for the change
	 */
	addToChangelogFile(newContent: Array<string>, commitMessage: string): Promise<boolean>;

}
