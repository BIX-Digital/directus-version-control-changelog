import 'jest';
import ChangelogFormatter from '../src/core/ChangelogFormatter';

describe('ChangelogFormatter', () => {
	const newInputContent = `this is a line\n-a line with missing space\r\n- a line with correct dash and space\n\n another line    \n and the last line`;
	const newInputHeadline = '## Some Headline'
	const existingFileContent = [
		'# Directus Changelog',
		'',
		'## existing entry',
		'- text for testing',
	];
	const malformedHeaderFileContent = [
		'# Wrong Header',
		'existing text',
		'for testing',
	];

	it('should clean up and format input correctly', async () => {
		const expectedOutput = [
			'## Some Headline',
			'',
			'- this is a line',
			'- a line with missing space',
			'- a line with correct dash and space',
			'- another line',
			'- and the last line'
		];
		const formattedText = ChangelogFormatter.formatLatestChanges(newInputContent, newInputHeadline);
		expect(formattedText).toEqual(expectedOutput);
	});

	it('should generate the file content correctly from scratch', async () => {
		const expectedOutput = [
			'# Directus Changelog',
			'',
			'## Some Headline',
			'',
			'- this is a line',
			'- a line with missing space',
			'- a line with correct dash and space',
			'- another line',
			'- and the last line'
		];
		const formattedText = ChangelogFormatter.formatLatestChanges(newInputContent, newInputHeadline);
		const fileContent = ChangelogFormatter.insertNewEntryIntoLog(new Array<string>(), formattedText);
		expect(fileContent).toEqual(expectedOutput);
	});

	it('should extend an existing changelog file correctly', async () => {
		const expectedOutput = [
			'# Directus Changelog',
			'',
			'## Some Headline',
			'',
			'- this is a line',
			'- a line with missing space',
			'- a line with correct dash and space',
			'- another line',
			'- and the last line',
			'',
			'## existing entry',
			'- text for testing',
		];
		const formattedText = ChangelogFormatter.formatLatestChanges(newInputContent, newInputHeadline);
		const fileContent = ChangelogFormatter.insertNewEntryIntoLog(existingFileContent, formattedText);
		expect(fileContent).toEqual(expectedOutput);
	});

	it('should extend malformed file content correctly', async () => {
		const expectedOutput = [
			'# Directus Changelog',
			'',
			'## Some Headline',
			'',
			'- this is a line',
			'- a line with missing space',
			'- a line with correct dash and space',
			'- another line',
			'- and the last line',
			'',
			'# Wrong Header',
			'existing text',
			'for testing',
		];
		const formattedText = ChangelogFormatter.formatLatestChanges(newInputContent, newInputHeadline);
		const fileContent = ChangelogFormatter.insertNewEntryIntoLog(malformedHeaderFileContent, formattedText);
		expect(fileContent).toEqual(expectedOutput);
	});

});
	