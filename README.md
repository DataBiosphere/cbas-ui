# CBAS-UI (Composite Batch Analysis Service)

Web user interface for Batch Analysis

## Contributing

For compliance reasons, all pull requests **must** be submitted with a Jira ID in the pull request title.
You should include the Jira ID near the beginning of the title for better readability.
For example: "[WM-1992] add statement to README.md about including Jira IDs in PR titles" 

If there is more than one relevant ticket, include all of their Jira IDs.
For example: "WM-1997, WM-2002, WM-2005: Fix for many bugs with the same root cause"

------------------------

### Developing
1. We use Node 16 (the current LTS) and Yarn. On Darwin with Homebrew:

    ```sh
    brew install node@16 yarn; brew link node@16 --force --overwrite
    ```
2. Set Yarn version

    ```sh
    yarn set version 3.x
    ```
3. Install deps:

    ```sh
    yarn install
    ```
4. Start development server, which will report any lint violations as well:

    ```sh
    yarn start
    ```

    If you get an error that resembles:

    ```
    Failed to compile.

    ./node_modules/react-dev-utils/webpackHotDevClient.js
    Error: [BABEL] /Users/.../terra-ui/node_modules/react-scripts/node_modules/react-dev-utils/webpackHotDevClient.js: Cannot find module '...'
    Require stack:
    - ...
    - ...
    - ... (While processing: "...js")
    ```

    try:

    ```sh
    rm -rf node_modules
    yarn install
    yarn start
    ```
5. Testing:

    ```sh
    yarn test
    ```
6. Code style and linting:
    * On command line within the repo's root dir: `yarn lint`
      * Eslint will fix as many violations as possible. It will report any that it can't fix itself.
    * In an IDE other than IntelliJ (VS Code, etc): install the eslint plugin from your package manager, and there should be a command to fix issues at any time.
    * In IntelliJ:
        * Styles should be automatically applied by [.editorconfig](.editorconfig); make sure you've also [turned on eslint](https://www.jetbrains.com/help/idea/eslint.html#ws_js_eslint_automatic_configuration).
        * In order to correctly format a file at any time, run the IntelliJ `Reformat Code` action, and then right-click in a window and click `Fix ESLint Problems`. You could also create an IntelliJ macro to do this for you as explained [here](https://www.jetbrains.com/help/idea/using-macros-in-the-editor.html#reformat_on_save), and map running of the macro to a keyboard shortcut for convenience.

#### Adding a new navigation path

1. Create a new component that is to be rendered upon navigating to new path
2. Add new `navPaths` in the file for the new component (see `src/pages/PreviousRuns.js` in [this PR](https://github.com/DataBiosphere/cbas-ui/pull/8) as reference)
3. Add the new `navPath` to `routes` in `src/libs/routes.js` (see above PR for reference)
4. Use `Nav.goToPath(<navPath-name>)` to navigate to the new path

### Manually testing UI using Docker

You may build a cbas-ui docker image for local testing, but manually publishing that image to GCR is not
necessary: building and publication should happen automatically after your PR is merged to main.

To manually build the docker image, from the root of the repository run `docker build . --no-cache -t us.gcr.io/broad-dsp-gcr-public/cbas-ui:<tag>`

To run the docker image locally:
1. Run the app: `docker run -d -p 8080:8080 us.gcr.io/broad-dsp-gcr-public/cbas-ui:<tag>`. The app should be hosted on port 8080
2. Navigate to `http://localhost:8080/` to load the Hello World UI

To manually push the image to GCR (which should not be necessary, since it's auto-published on PR merge), run: `docker push us.gcr.io/broad-dsp-gcr-public/cbas-ui:<tag>`

Note: Don't forget to stop the docker container after use. One can run the below commands to stop and remove the container:
```
docker stop <container_id>
docker rm <container_id>
```

### Versioning

The CBAS-UI service follows the Google Cloud API versioning scheme of [semantic versioning](https://semver.org/). For more information, please visit this [document](https://docs.google.com/document/d/1qXNHTijdPn9ApYrznSkTFnxkt0g-o-Uh0SjqQlYd-ZA/edit).
