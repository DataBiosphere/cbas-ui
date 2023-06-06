import { div, h } from 'react-hyperscript-helpers'
import { AutoSizer } from 'react-virtualized'
import { Link } from 'src/components/common'
import { icon } from 'src/components/icons'
import Modal from 'src/components/Modal'
import { FlexTable, HeaderCell, tableHeight } from 'src/components/table'
import { newTabLinkProps } from 'src/libs/utils'

import { isAzureUri } from './URIViewer/uri-viewer-utils'


const InputOutputModal = ({ title, jsonData, onDismiss, sasToken }) => {
  const getFilenameFromAzureBlobPath = blobPath => {
    const n = blobPath.lastIndexOf('/')
    return blobPath.substring(n + 1) //If there is no slash, this returns the whole string.
  }

  //Link to download the blob file
  //TODO: Appending the SAS token to the end of the blob path prevents public blobs from being downloaded, for some reason.
  const renderBlobLink = blobPath => {
    const fileName = getFilenameFromAzureBlobPath(blobPath)
    const downloadUrl = `${blobPath}?${sasToken}`
    return h(Link, {
      disabled: !downloadUrl,
      href: downloadUrl,
      download: fileName,
      style: {},
      ...newTabLinkProps
    },
    [fileName, icon('pop-out', { size: 12, style: { marginLeft: '0.25rem' } })])
  }

  const dataArray = jsonData ? Object.keys(jsonData).map(key => [key, jsonData[key]]) : []

  return h(Modal,
    {
      title,
      onDismiss,
      showCancel: false,
      showX: true,
      okButton: 'Done',
      width: 900,
      height: 500
    }, [
      // we are specifying height here so that for long workflow scripts the Modal doesn't overflow the main screen
      div({ style: { margin: '1rem 0', display: 'flex', alignItems: 'center' } }, [
        h(AutoSizer, { disableHeight: true }, [
          ({ width }) => h(FlexTable, {
            'aria-label': 'call table',
            height: tableHeight({ actualRows: dataArray.length, maxRows: 10.5 }), // The half-row here hints at there being extra rows if scrolled
            width,
            rowCount: dataArray.length,
            noContentMessage: 'No Inputs',
            columns: [
              {
                size: { basis: 100, grow: 30 },
                field: 'key',
                headerRenderer: () => h(HeaderCell, {}, ['Key']),
                cellRenderer: ({ rowIndex }) => {
                  return div({}, dataArray[rowIndex][0])
                }
              },
              {
                size: { basis: 100, grow: 70 },
                field: 'value',
                headerRenderer: () => h(HeaderCell, {}, ['Value']),
                cellRenderer: ({ rowIndex }) => {
                  return isAzureUri(dataArray[rowIndex][1]) ? renderBlobLink(dataArray[rowIndex][1]) : div({}, dataArray[rowIndex][1])
                }
              }
            ]
          }, [])
        ])
      ]
      )
    ]
  )
}

export default InputOutputModal
