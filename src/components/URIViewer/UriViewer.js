import filesize from 'filesize'
import _ from 'lodash/fp'
import { Fragment, useState } from 'react'
import { div, h, p, pre, span } from 'react-hyperscript-helpers'
import Collapse from 'src/components/Collapse'
import { ClipboardButton, Link } from 'src/components/common'
import { spinner } from 'src/components/icons'
import Modal from 'src/components/Modal'
import { Ajax } from 'src/libs/ajax'
import colors from 'src/libs/colors'
import { useCancellation, useOnMount, withDisplayName } from 'src/libs/react-utils'
import * as Utils from 'src/libs/utils'

import els from './uri-viewer-styles'
import { getDownloadCommand, isAzureUri, isGsUri } from './uri-viewer-utils'
import { UriDownloadButton } from './UriDownloadButton'
import { UriPreview } from './UriPreview'


// eslint-disable-next-line lodash-fp/no-single-composition
export const UriViewer = _.flow(
  withDisplayName('UriViewer')
)(({ uri, onDismiss, isStdLog }) => {
  const signal = useCancellation()
  const [metadata, setMetadata] = useState()
  const [loadingError, setLoadingError] = useState(false)

  const loadMetadata = async () => {
    try {
      if (isAzureUri(uri)) {
        const azureMetadata = await Ajax(signal).AzureStorage.getTextFileFromBlobStorage(uri)
        setMetadata(azureMetadata)
        setLoadingError(false)
      } else if (isGsUri(uri)) {
        /* TODO: Uncomment on merge with Terra UI
        const [bucket, name] = parseGsUri(uri)
        const loadObject = withRequesterPaysHandler(onRequesterPaysError, () => {
          return Ajax(signal).Buckets.getObject(googleProject, bucket, name)
        })
        const metadata = await loadObject(googleProject, bucket, name)
        setMetadata(metadata)
        */
        setMetadata(null) //Delete this when the above is uncommented.
      } else {
        // TODO: change below comment after switch to DRSHub is complete, tracked in ticket [ID-170]
        // Fields are mapped from the martha_v3 fields to those used by google
        // https://github.com/broadinstitute/martha#martha-v3
        // https://cloud.google.com/storage/docs/json_api/v1/objects#resource-representations
        // The time formats returned are in ISO 8601 vs. RFC 3339 but should be ok for parsing by `new Date()`
        const { bucket, name, size, timeCreated, timeUpdated: updated, fileName, accessUrl } =
          await Ajax(signal).DrsUriResolver.getDataObjectMetadata(uri, [
            'bucket',
            'name',
            'size',
            'timeCreated',
            'timeUpdated',
            'fileName',
            'accessUrl'
          ])
        const googleMetadata = { bucket, name, fileName, size, timeCreated, updated, accessUrl }
        setMetadata(googleMetadata)
      }
    } catch (e) {
      setLoadingError(true)
    }
  }

  useOnMount(() => {
    loadMetadata()
  })


  const renderFailureMessage = () => {
    const errorMsg = isStdLog ? 'Log file not found. This may be the result of a task failing to start. Please check relevant docker images and file paths to ensure valid references.' :
      'Error loading data. This file does not exist or you do not have permission to view it.'
    return h(Fragment, [
      div({ style: { paddingBottom: '1rem' } }, [errorMsg])
      // below section should be re-enabled later on. Currently if a file is missing it's because Cromwell never fired up a task.
      // A static message should be enough to tackle this scenario for now.
      // h(Collapse, { title: 'Details' }, [
      //   div({ style: { marginTop: '0.5rem', whiteSpace: 'pre-wrap', fontFamily: 'monospace', overflowWrap: 'break-word' } }, [
      //     // JSON.stringify(loadingError, null, 2)
      //     'This is an error message'
      //   ])
      // ])
    ])
  }

  const renderGoogleStorageBrowserLink = metadata => {
    const { accessUrl, bucket, name } = metadata
    const gsUri = `gs://${bucket}/${name}`

    return !accessUrl && !!gsUri &&
      els.cell([
        h(
          Link,
          {
            ...Utils.newTabLinkProps
            //href: bucketBrowserUrl(gsUri.match(/gs:\/\/(.+)\//)[1]), TODO: Uncomment on merge with Terra UI
          },
          ['View this file in the Google Cloud Storage Browser']
        )
      ])
  }

  const renderLoadingSymbol = uri => {
    h(Fragment, [isGsUri(uri) || isAzureUri(uri) ? 'Loading metadata...' : 'Resolving DRS file...', spinner({ style: { marginLeft: 4 } })])
  }

  const renderTerminalCommand = metadata => {
    const { bucket, name } = metadata
    const gsUri = `gs://${bucket}/${name}`
    const azUri = `${uri}?${metadata.sasToken}`
    const downloadCommand = isAzureUri(uri) ? getDownloadCommand(metadata.name, azUri, metadata.accessUrl) : getDownloadCommand(metadata.name, gsUri, metadata.accessUrl)
    return h(Fragment, [
      p({ style: { marginBottom: '0.5rem', fontWeight: 500 } }, ['Terminal download command']),
      pre(
        {
          style: {
            display: 'flex',
            alignItems: 'center',
            margin: 0,
            padding: '0 0.5rem',
            background: colors.light(0.4)
          }
        },
        [
          span(
            {
              style: {
                overflowX: 'auto',
                flex: '1 1 0',
                padding: '1rem 0'
              },
              tabIndex: 0
            },
            [downloadCommand || ' ']
          ),
          h(ClipboardButton, {
            'aria-label': 'Copy download URL to clipboard',
            disabled: !downloadCommand,
            style: { marginLeft: '1ch' },
            text: downloadCommand
          })
        ]
      )
    ])
  }

  const renderMoreInfo = metadata => {
    const { timeCreated, updated } = metadata
    return (timeCreated || updated) &&
    h(
      Collapse,
      {
        title: 'More Information',
        style: { marginTop: '2rem' },
        summaryStyle: { marginBottom: '0.5rem' }
      },
      [
        timeCreated && els.cell([els.label('Created'), els.data(new Date(timeCreated).toLocaleString())]),
        updated && els.cell([els.label('Updated'), els.data(new Date(updated).toLocaleString())])
        //isFeaturePreviewEnabled('data-table-provenance') && //TODO: Uncomment on merge with Terra UI
        //  els.cell([els.label('Where did this file come from?'), els.data([h(FileProvenance, { workspace, fileUrl: uri })])])
      ]
    )
  }

  const { name, size } = metadata || {}
  const fileName = isAzureUri(uri) ? name : metadata ? metadata.fileName : 'Loading...'
  return h(
    Modal,
    {
      onDismiss,
      title: 'File Details',
      showCancel: false,
      showX: true,
      showButtons: false
    },
    [
      Utils.cond(
        [loadingError, () => renderFailureMessage()],
        [
          !loadingError && !_.isEmpty(metadata),
          () => h(Fragment, [
            els.cell([
              els.label('Filename'),
              els.data((fileName || _.last(name.split('/'))).split('.').join('.\u200B')) // allow line break on periods
            ]),
            h(UriPreview, { metadata }),
            div({ style: { display: 'flex', justifyContent: 'space-around' } }, [h(UriDownloadButton, metadata)]),
            els.cell([els.label('File size'), els.data(filesize(size))]),
            !isAzureUri(uri) && renderGoogleStorageBrowserLink(metadata),
            renderTerminalCommand(metadata),
            renderMoreInfo(metadata),
            !isAzureUri(uri) && div({ style: { fontSize: 10 } }, ['* Estimated. Download cost may be higher in China or Australia.'])
          ])
        ],
        () => renderLoadingSymbol(uri)
      )
    ]
  )
})
