import _ from 'lodash/fp'
import { Fragment, useState } from 'react'
import { div, h } from 'react-hyperscript-helpers'
import { ButtonPrimary } from 'src/components/common'
import { spinner } from 'src/components/icons'
import { Ajax } from 'src/libs/ajax'
import { useCancellation, useOnMount } from 'src/libs/react-utils'
import * as Utils from 'src/libs/utils'
import els from './uri-viewer-styles'
import { isAzureUri, isDrsUri } from './uri-viewer-utils'


/*
//Part of Terra-UI: uncomment on merge.
const getMaxDownloadCostNA = bytes => {
  const nanos = DownloadPrices.pricingInfo[0].pricingExpression.tieredRates[1].unitPrice.nanos
  const downloadPrice = bytes * nanos / DownloadPrices.pricingInfo[0].pricingExpression.baseUnitConversionFactor / 10e8
  return Utils.formatUSD(downloadPrice)
}
*/

export const UriDownloadButton = ({ uri, metadata: { bucket, name, fileName, size }, accessUrl }) => {
  const signal = useCancellation()
  const [url, setUrl] = useState()
  const getUrl = async () => {
    if(isAzureUri(uri)) {
      const filePath = 'https://lz0d5275bdd36d3e6a22a130.blob.core.windows.net/sc-97c7cccb-aaf8-424c-92cc-587ba49919b6/workspace-services/cbas/wds-97c7cccb-aaf8-424c-92cc-587ba49919b6/cromwell-workflow-logs/workflow.85d75e23-eb96-4823-a0ad-dfc21903f1d4.log'
      const sasToken = 'sv=2021-12-02&spr=https&st=2023-05-02T14%3A31%3A05Z&se=2023-05-02T22%3A46%3A05Z&sr=c&sp=racwdl&sig=vNKvY82jQ8OinblN5LuQFdZb2Od6xopZlX8OIv4v5rk%3D'
      const combined = filePath + '?' + sasToken
      setUrl(combined)
    }
    /* Terra-UI stuff
    if (accessUrl?.url) {

       NOTE: Not supporting downloading using `accessUrl.headers`:
       - https://ga4gh.github.io/data-repository-service-schemas/preview/release/drs-1.1.0/docs/#_accessurl

       If we want to support supplying `accessUrl.headers` here we'll probably need a bigger solution.
       As of 2021-05-17 a google search turned up this c. 2018 result that mentioned something called `ServiceWorker`
       - https://stackoverflow.com/questions/51721904/make-browser-submit-additional-http-header-if-click-on-hyperlink#answer-51784608
      setUrl(_.isEmpty(accessUrl.headers) ? accessUrl.url : null)
    } else {
      try {
        // This is still using Martha instead of DrsHub because DrsHub has not yet implemented signed URLs
        const { url } = await Ajax(signal).DrsUriResolver.getSignedUrl({
          bucket,
          object: name,
          dataObjectUri: isDrsUri(uri) ? uri : undefined
        })
        const workspace = workspaceStore.get()
        const userProject = await getUserProjectForWorkspace(workspace)
        setUrl(knownBucketRequesterPaysStatuses.get()[bucket] ? Utils.mergeQueryParams({ userProject }, url) : url)
      } catch (error) {
        setUrl(null)
      }
    }
     */
  }
  useOnMount(() => {
    getUrl()
  })

if(isAzureUri(uri)) {
  return els.cell([
    url === null ?
      'Unable to generate download link.' :
      div({ style: { display: 'flex', justifyContent: 'center' } }, [
        h(ButtonPrimary, {
          disabled: !url,
          href: url,
          download: fileName,
          ...Utils.newTabLinkProps
        }, [
          url ?
            `Download file` :
            h(Fragment, [`Generating download link...${url}`, spinner({ style: { color: 'white', marginLeft: 4 } })])
        ])
      ])
  ])
}

/*
  return els.cell([
    url === null ?
      'Unable to generate download link.' :
      div({ style: { display: 'flex', justifyContent: 'center' } }, [
        h(ButtonPrimary, {
          disabled: !url,
          onClick: () => {
            Ajax().Metrics.captureEvent(Events.workspaceDataDownload, {
              ...extractWorkspaceDetails(workspaceStore.get().workspace),
              fileType: _.head((/\.\w+$/).exec(uri)),
              downloadFrom: 'file direct'
            })
          },
          href: url,

           NOTE:
           Some DOS/DRS servers return file names that are different from the end of the path in the gsUri/url.
           Attempt to hint to the browser the correct name.
           FYI this hint doesn't work in Chrome: https://bugs.chromium.org/p/chromium/issues/detail?id=373182#c24

          download: fileName,
          ...Utils.newTabLinkProps
        }, [
          url ?
            `Download for ${getMaxDownloadCostNA(size)}*` :
            h(Fragment, ['Generating download link...', spinner({ style: { color: 'white', marginLeft: 4 } })])
        ])
      ])
  ])
*/
}

