import _ from 'lodash/fp'


const azRegexLiteral = /^https:\/\/([a-zA-Z0-9])+\.blob\.core\.windows\.net/
const azureRegex = RegExp(azRegexLiteral)

export const isAzureUri = uri => azureRegex.test(uri)

export const isGsUri = uri => _.startsWith('gs://', uri)

export const isDrsUri = uri => _.startsWith('dos://', uri) || _.startsWith('drs://', uri)

export const getDownloadCommand = (fileName, uri, accessUrl) => {
  const { url: httpUrl, headers: httpHeaders } = accessUrl || {}
  if (httpUrl) {
    const headers = _.flow(
      _.toPairs,
      _.reduce((acc, [header, value]) => `${acc}-H '${header}: ${value}' `, '')
    )(httpHeaders)
    const output = fileName ? `-o '${fileName}' ` : '-O '
    return `curl ${headers}${output}'${httpUrl}'`
  }

  if (isAzureUri(uri)) {
    return `azcopy copy '${uri}' ${fileName || '.'}`
  }

  if (isGsUri(uri)) {
    return `gsutil cp '${uri}' ${fileName || '.'}`
  }
}
