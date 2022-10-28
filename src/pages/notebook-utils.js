
import _ from 'lodash/fp'
import { isCromwellAppVisible } from 'src/libs/config'

// The label here matches the leonardo `tool` label for runtimes
export const tools = {
    RStudio: { label: 'RStudio', ext: ['Rmd', 'R'], imageIds: ['RStudio'], defaultImageId: 'RStudio', defaultExt: 'Rmd' },
    Jupyter: { label: 'Jupyter', ext: ['ipynb'], isNotebook: true, imageIds: ['terra-jupyter-bioconductor', 'terra-jupyter-bioconductor_legacy', 'terra-jupyter-hail', 'terra-jupyter-python', 'terra-jupyter-gatk', 'Pegasus', 'terra-jupyter-gatk_legacy'], defaultImageId: 'terra-jupyter-gatk', isLaunchUnsupported: true, defaultExt: 'ipynb' },
    jupyterTerminal: { label: 'terminal' },
    spark: { label: 'spark' },
    Galaxy: { label: 'Galaxy', appType: 'GALAXY' },
    Cromwell: { label: 'Cromwell', appType: 'CROMWELL', isAppHidden: !isCromwellAppVisible(), isPauseUnsupported: true },
    Azure: { label: 'Azure', isNotebook: true, ext: ['ipynb'], isAzureCompatible: true, isLaunchUnsupported: false, defaultExt: 'ipynb' }
}

// Returns appType for app with given label, or undefined if tool is not an app.
export const getAppType = label => _.find(tool => tool.label === label)(tools)?.appType
