# Directus Hook Extension: Version Control Changelog

This package is a Hook Extension for the CMS [Directus](https://directus.io) that allows you to add entries to a changelog in a version control system. Currently only Bitbucket Server is supported, but it is prepared to be extended to other version control systems (like GitHub or GitLab) in the future.

Instead of just "blindly" adding each change in the database it relies on a user written changelog entry that summarizes the changes. For that it relies on a singleton collection with (at least) a textarea field in it.

## Why would I want that?

We ([BI X](https://www.bix-digital.com)) created this extension because of the way how [GastbyJS](https://www.gatsbyjs.com/) with Directus as content source and our build system ([OpenDevStack](https://www.opendevstack.org/) with [ods-pipeline](https://github.com/opendevstack/ods-pipeline)) work.  
Our builds are triggered by webhooks that get fired on pushes to our VCS server. For that it relies heavily on the Bitbucket webhooks and its specific content. Recreating them with the Directus webhook functionality would have been a huge effort - and as our build system does not rebuild things if there are no changes (to the codebase / repository) it would also be without any effect.

Additionally we wanted to see what has changed in a new release - code as well as content.

That is why we decided to maintain a changelog inside of the VCS that can be updated by Directus. And for that we wrote this extension hook.

## Table of Contents

- [Directus Hook Extension: Version Control Changelog](#directus-hook-extension-version-control-changelog)
	- [Why would I want that?](#why-would-i-want-that)
	- [Table of Contents](#table-of-contents)
	- [How can I use it?](#how-can-i-use-it)
		- [Set up things in Directus](#set-up-things-in-directus)
			- [1. Create a singleton collection with at least one textarea](#1-create-a-singleton-collection-with-at-least-one-textarea)
			- [2. Add the required configuration values to your Directus installation](#2-add-the-required-configuration-values-to-your-directus-installation)
			- [3. Add the extension to your installation](#3-add-the-extension-to-your-installation)
	- [Release History](#release-history)
	- [ToDo's](#todos)
		- [Before first release](#before-first-release)
		- [Future possibilities](#future-possibilities)

## How can I use it?

### Set up things in Directus

#### 1. Create a singleton collection with at least one textarea

First you create a new collection in your Directus - make sure that the option to treat it as a single object is activated:
![Screenshot of the collection setup](documentation/images/create_collection.png)

Then you add at least one textarea field and make sure that it is requiring content in there to be saved:
![Screenshot of the textarea setup](documentation/images/create_field.png)

While the above shown is enough we recommend to use the features of Directus to give the content managers more guidance. Below you see our setup where we used the `placeholder` and the `note` of the textarea - as well as a readonly-field with an instructional message as default content:
![Screenshot of a recommended setup](documentation/images/recommended_collection.png)

#### 2. Add the required configuration values to your Directus installation

The extension uses the configuration mechanism of Directus. So all you have to do is to add the following variables to your preferred configuration location:

| Variable Name | Description |
|---------------|-------------|
| `VERSION_CONTROL_CHANGELOG_COLLECTION` | name of the collection (e.g. `vcs_changelog`) |
| `VERSION_CONTROL_CHANGELOG_FIELD_NAME` | name of the field in the collection (e.g. `changes_made`) |
| `VERSION_CONTROL_CHANGELOG_VCS` | Has to be `bitbucket` for now |
| `VERSION_CONTROL_CHANGELOG_BITBUCKET_USER` | the user of the Bitbucket VCS server |
| `VERSION_CONTROL_CHANGELOG_BITBUCKET_PASSWORD` | the password for the user above |
| `VERSION_CONTROL_CHANGELOG_VCS_SERVER_URL` | the full URL of your VCS server - without a trailing `/` (e.g. `https://your.vcs.example`) |
| `VERSION_CONTROL_CHANGELOG_VCS_PROJECT` | the name of the project (or user) on the VCS server |
| `VERSION_CONTROL_CHANGELOG_VCS_REPOSITORY` | the name of the repository of the project (or user) |
| `VERSION_CONTROL_CHANGELOG_VCS_BRANCH` | the branch that should be used for reading and writing the changelog (e.g. `cms-changes`) |
| `VERSION_CONTROL_CHANGELOG_VCS_FILENAME` | the name of the file that should be used (e.g. `directus-changelog.md`) |

#### 3. Add the extension to your installation

1. clone (or download) this repository to your local machine
1. open a terminal and change into the directory containing the `package.json`
1. run `npm install`
1. run `npm run build`
1. create a directory named `version-control-changelog` inside of your `<directus-root-folder>/extensions/hooks/` directory
1. copy the generated `index.js` file from the `dist` directory
1. paste the copied file into the newly created directory
1. restart your Directus instance; monitor the log during startup

If everything works you will see the following line in the log output:

```log
01:23:45 ✨ Version Control Changelog Extension Extension initialized, action handler registered
...
01:23:45 ✨ Server started at http://localhost:8055
```

## Release History

no releases yet (but should be coming soon)

## ToDo's

### Before first release

Before we make the first release this will be tackled

- [ ] automate Bitbucket setup (basically be more error tolerant)
  - make sure branch is created if not already existing
  - avoid the need of creating the file before first use

### Future possibilities

These are things that would make sense, but it is not granted that it will be implemented

- [ ] support "auto-create" of the required collection(s) and field(s) on first run
- [ ] allow multiple changelogs (multiple collections writing to multiple repositories)
- [ ] add GitHub and / or GitLab as target systems
- [ ] add to npm (to allow [installation via npm](https://directus.io/road-map/#q1-2022) once it is available)
- [ ] add to the [Extension Marketplace]((https://directus.io/road-map/#q2-2022)) once it is available
