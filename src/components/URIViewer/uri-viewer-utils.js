import _ from 'lodash/fp'

const azureRegex = RegExp('^https://(.+).blob.core.windows.net')

export const isAzureUri = (uri) => azureRegex.test(uri)

export const isGsUri = (uri) => _.startsWith('gs://', uri)

export const isDrsUri = (uri) => _.startsWith('dos://', uri) || _.startsWith('drs://', uri)

