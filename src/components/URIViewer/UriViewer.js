import filesize from 'filesize'
import _ from 'lodash/fp'
import { Fragment, useState } from 'react'
import { div, h, input } from 'react-hyperscript-helpers'
import Collapse from 'src/components/Collapse'
import { Link, ClipboardButton } from 'src/components/common'
import { spinner } from 'src/components/icons'
import Modal from 'src/components/Modal'
import { Ajax } from 'src/libs/ajax'
import { useCancellation, useOnMount, withDisplayName } from 'src/libs/react-utils'
import * as Utils from 'src/libs/utils'

import els from './uri-viewer-styles'
import { isAzureUri, isGsUri } from './uri-viewer-utils'
import { UriDownloadButton } from './UriDownloadButton'
import { UriPreview } from './UriPreview'


export const UriViewer = _.flow(
  withDisplayName('UriViewer')
)(({ workflow, onDismiss }) => {
  const uri = workflow.workflowLog
  const signal = useCancellation()
  const [metadata, setMetadata] = useState()
  const [loadingError, setLoadingError] = useState()

  const loadMetadata = async () => {
    try {
      if (isAzureUri(uri)) {
        const fileMetadata = await Ajax(signal).AzureStorage.getTextFileFromBlobStorage(uri)
        setMetadata(fileMetadata)
      } else if (isGsUri(uri)) {
        /*
        NB: Rather than bringing in all the dependencies needed to make GCP work for this component + its children,
        I'm leaving them commented out for now.
        */

        /*
        const [bucket, name] = parseGsUri(uri)
        const loadObject = withRequesterPaysHandler(onRequesterPaysError, () => {
          return Ajax(signal).Buckets.getObject(googleProject, bucket, name)
        })
        const metadata = await loadObject(googleProject, bucket, name)
        setMetadata(metadata)
        */
      } else {
        // TODO: change below comment after switch to DRSHub is complete, tracked in ticket [ID-170]
        // Fields are mapped from the martha_v3 fields to those used by google
        // https://github.com/broadinstitute/martha#martha-v3
        // https://cloud.google.com/storage/docs/json_api/v1/objects#resource-representations
        // The time formats returned are in ISO 8601 vs. RFC 3339 but should be ok for parsing by `new Date()`
        const { bucket, name, size, timeCreated, timeUpdated: updated, fileName, accessUrl } =
          await Ajax(signal).DrsUriResolver.getDataObjectMetadata(
            uri,
            ['bucket', 'name', 'size', 'timeCreated', 'timeUpdated', 'fileName', 'accessUrl']
          )
        const metadata = { bucket, name, fileName, size, timeCreated, updated, accessUrl }
        setMetadata(metadata)
      }
    } catch (e) {
      setLoadingError(await e.json())
    }
  }
  useOnMount(() => {
    loadMetadata()
  })
  const { storageAccountName , containerName, blobName, name, lastModified, size, contentType, textContent } = metadata || {}
  //const { size, timeCreated, updated, bucket, name, fileName, accessUrl } = metadata || {}
  //const gsUri = `gs://${bucket}/${name}`
  if (isAzureUri(uri)) {
    return h(Modal, {
        onDismiss,
        title: 'File Details',
        showCancel: false,
        showX: true,
        showButtons: false
      } , [
      Utils.cond(
        [loadingError, () => h(Fragment, [
          div({ style: { paddingBottom: '1rem' } }, [
            'Error loading data. This file does not exist or you do not have permission to view it.'
          ]),
          h(Collapse, { title: 'Details' }, [
            div({ style: { marginTop: '0.5rem', whiteSpace: 'pre-wrap', fontFamily: 'monospace', overflowWrap: 'break-word' } }, [
              JSON.stringify(loadingError, null, 2)
            ])
          ])
        ])],
        [!name, () => h(Fragment, [
          'Loading file...',
          spinner({ style: { marginLeft: 4 } })
        ])],
        [name, () => h(Fragment, [
          els.cell([
            els.label('Filename'),
            els.data((name || _.last(name.split('/'))).split('.').join('.\u200B')) // allow line break on periods
          ]),
          els.cell([els.label('File size'), els.data(filesize(size))]),
          metadata && h(UriPreview, { metadata, textContent }),
          uri && h(UriDownloadButton, { uri, metadata, size })
        ])]
      )]
    )
  }
  /*
  return h(Modal, {
    onDismiss,
    title: 'File Details',
    showCancel: false,
    showX: true,
    okButton: 'Done'
  }, [
    Utils.cond(
      [loadingError, () => h(Fragment, [
        div({ style: { paddingBottom: '1rem' } }, [
          'Error loading data. This file does not exist or you do not have permission to view it.'
        ]),
        h(Collapse, { title: 'Details' }, [
          div({ style: { marginTop: '0.5rem', whiteSpace: 'pre-wrap', fontFamily: 'monospace', overflowWrap: 'break-word' } }, [
            JSON.stringify(loadingError, null, 2)
          ])
        ])
      ])],
      [metadata, () => h(Fragment, [
        els.cell([
          els.label('Filename'),
          els.data((fileName || _.last(name.split('/'))).split('.').join('.\u200B')) // allow line break on periods
        ]),
        els.cell([els.label('File size'), els.data(filesize(size))]),
        !accessUrl && !!gsUri && els.cell([
          h(Link, {
            ...Utils.newTabLinkProps,
            href: "www.google.com"
          }, ['View this file in the Google Cloud Storage Browser'])
        ]),
        h(UriDownloadButton, { uri, metadata, accessUrl }),
        els.cell([
          els.label('Terminal download command'),
          els.data([
            div({ style: { display: 'flex' } }, [
              input({
                readOnly: true,
                value: "Download Command Text",
                style: { flexGrow: 1, fontWeight: 400, fontFamily: 'Menlo, monospace' }
              }),
              h(ClipboardButton, {
                text: "Download Command Clipboard",
                style: { margin: '0 1rem' }
              })
            ])
          ])
        ]),
        (timeCreated || updated) && h(Collapse, {
          title: 'More Information',
          style: { marginTop: '2rem' },
          summaryStyle: { marginBottom: '0.5rem' }
        }, [
          timeCreated && els.cell([
            els.label('Created'),
            els.data(new Date(timeCreated).toLocaleString())
          ]),
          updated && els.cell([
            els.label('Updated'),
            els.data(new Date(updated).toLocaleString())
          ])
        ]),
      ])],
      () => h(Fragment, [
        'Loading file...',
        spinner({ style: { marginLeft: 4 } })
      ])
    )
  ])
   */
})
