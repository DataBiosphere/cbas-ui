# Terra Batch Analysis UI

Web user interface for Batch Analysis

------------------------

### Developing

1. We use Node 16 (the current LTS) and Yarn. On Darwin with Homebrew:

    ```sh
    brew install node@16 yarn; brew link node@16 --force --overwrite
    ```
2. Install deps:

    ```sh
    yarn install
    ```
3. Start development server, which will report any lint violations as well:

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
4. Testing:

    ```sh
    yarn test
    ```
5. Code style and linting:
    * On command line within the repo's root dir: `yarn lint`
      * Eslint will fix as many violations as possible. It will report any that it can't fix itself.
    * In an IDE other than IntelliJ (VS Code, etc): install the eslint plugin from your package manager, and there should be a command to fix issues at any time.
    * In IntelliJ:
        * Styles should be automatically applied by [.editorconfig](.editorconfig); make sure you've also [turned on eslint](https://www.jetbrains.com/help/idea/eslint.html#ws_js_eslint_automatic_configuration).
        * In order to correctly format a file at any time, run the IntelliJ `Reformat Code` action, and then right-click in a window and click `Fix ESLint Problems`. You could also create an IntelliJ macro to do this for you as explained [here](https://www.jetbrains.com/help/idea/using-macros-in-the-editor.html#reformat_on_save), and map running of the macro to a keyboard shortcut for convenience.

### Build and publish Docker image

From the root of the repository run the below steps:
1. To build the docker image run: `docker build . --no-cache -t us.gcr.io/broad-dsp-gcr-public/terra-batch-analysis-ui:<tag>`
4. To push the image to GCR, run: `docker push us.gcr.io/broad-dsp-gcr-public/terra-batch-analysis-ui:<tag>`

To run the docker image locally:
1. Run the app: `docker run -d -p 8080:8080 us.gcr.io/broad-dsp-gcr-public/terra-batch-analysis-ui:<tag>`. The app should be hosted on port 8080
2. Navigate to `http://localhost:8080/` to load the Hello World UI

Note: Don't forget to stop the docker container after use. One can run the below commands to stop and remove the container:
```
docker stop <container_id>
docker rm <container_id>
```
