import _ from 'lodash/fp'
import { Fragment, useState } from 'react'
import { div, h } from 'react-hyperscript-helpers'
import { ButtonPrimary } from 'src/components/common'
import { spinner } from 'src/components/icons'
import { Ajax } from 'src/libs/ajax'
import { useCancellation, useOnMount } from 'src/libs/react-utils'
import * as Utils from 'src/libs/utils'
import els from './uri-viewer-styles'
import { isDrsUri } from './uri-viewer-utils'

export const UriDownloadButton = (props) => {
  const url = "myUrl"
  const fileName = "myfilename"
  return els.cell([
    url === null ?
      'Unable to generate download link.' :
      div({ style: { display: 'flex', justifyContent: 'center' } }, [
        h(ButtonPrimary, {
          disabled: !url,
          onClick: () => {
            /*
            Ajax().Metrics.captureEvent(Events.workspaceDataDownload, {
              ...extractWorkspaceDetails(workspaceStore.get().workspace),
              fileType: _.head((/\.\w+$/).exec(uri)),
              downloadFrom: 'file direct'
            })
             */},
          href: url,
          /*
           NOTE:
           Some DOS/DRS servers return file names that are different from the end of the path in the gsUri/url.
           Attempt to hint to the browser the correct name.
           FYI this hint doesn't work in Chrome: https://bugs.chromium.org/p/chromium/issues/detail?id=373182#c24
           */
          download: fileName,
          ...Utils.newTabLinkProps
        }, [
          url ?
           "Download for $free.99" :
            h(Fragment, ['Generating download link...', spinner({ style: { color: 'white', marginLeft: 4 } })])
        ])
      ])
  ])
}
