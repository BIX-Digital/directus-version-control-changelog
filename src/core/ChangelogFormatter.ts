/**
 * The changelog content formatter that takes the plain text user
 * input and makes sure it is displayed as standardized markdown
 */
export default class ChangelogFormatter {

	/**
	 * A helper function to format the user input into a valid Markdown list entry with headline
	 * @param userChangelog The string that was entered into the changelog text field in the directus UI
	 * @param entryHeadline The headline for the changelog entry in the VCS, expected to be already formatted as Markdown
	 * @returns Array of new lines that can need to be inserted into the changelog
	 */
	static formatLatestChanges(userChangelog: string, entryHeadline: string): Array<string> {
		// split by newline
		// remove empty lines
		// add - at the beginning of the line (if not already there) to format as list
		const userChangelogLines = userChangelog.split(`\n`);
		const formattedChanges = new Array<string>();
		formattedChanges.push(entryHeadline);
		formattedChanges.push('');

		userChangelogLines.forEach((line) => {
			if (line.trim() !== '') {
				if (!line.trim().startsWith('-')) {
					// no dash at the beginning - add one
					formattedChanges.push('- '.concat(line));
				} else {
					if (line.trim().startsWith('- ')) {
						// starts with dash and space (as required in markdown)
						formattedChanges.push(line);
					} else {
						// starts with dash but not followed by space
						// -> we need to change it to "dash space" to have a proper markdown list
						formattedChanges.push('- '.concat(line.substring(1)));
					}
				}
			}
		});

		return formattedChanges;
	}

	/**
	 * A helper function that adds the new changelog data into the old one while making sure the overall headline is not moved or duplicated
	 * @param oldLog The lines of the old log as plain (markdown) strings
	 * @param newLines The lines to add to the log as plain (markdown) strings
	 * @returns The content of the updated changelog file as an array of lines
	 */
	static insertNewEntryIntoLog(oldLog: Array<string>, newLines: Array<string>): Array<string> {
		const fileHeadline = '# Directus Changelog';
		const newLog = new Array<string>();

		// add header to new log data
		newLog.push(fileHeadline);
		newLog.push('');

		// add all latest changelog notes
		newLines.forEach((line) => {
			newLog.push(line)
		});

		// append old log content
		oldLog.forEach((line, index) => {
			if (index === 0 || index === 1) {
				// if first line and or second line of old log
				// are not identical with the first or second line
				// of the new log copy them over too 
				if (newLog[index]?.trim() !== line.trim()) {
					newLog.push(line);
				}
			} else {
				// all lines beyond the first to are always copied
				// into the new log content
				newLog.push(line);
			}
		});

		return newLog;
	}

}