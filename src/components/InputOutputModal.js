import { div, h } from 'react-hyperscript-helpers'
import { AutoSizer } from 'react-virtualized'
import { Link } from 'src/components/common'
import { icon } from 'src/components/icons'
import Modal from 'src/components/Modal'
import { FlexTable, HeaderCell, tableHeight } from 'src/components/table'

import { isAzureUri } from './URIViewer/uri-viewer-utils'


const InputOutputModal = ({ title, jsonData, onDismiss, sasToken }) => {
  /*
  const testData = {
    library_id: 'UT-UPHL-2012556126',
    sample_collection_date: '2020-11-30',
    biosample_accession: 'SAMN17251688',
    run_date: '2022-06-22',
    sra_metadata:
          'https://lz43a8a3d21540dfd25f5ace.blob.core.windows.net/sc-0cd50a9c-d2d4-49f8-8038-e40982530830/workspace-services/cbas/terra-app-e79dfdc2-354e-496e-99b5-555b3097c8a2/fetch_sra_to_bam/117f49d5-413a-4cd8-976b-5204681ba097/call-Fetch_SRA_to_BAM/execution/SRR13379731.json',
    library_strategy: 'AMPLICON',
    num_reads: 552132,
    sequencing_center: 'UPHL_ID',
    reads_ubam:
          'https://lz43a8a3d21540dfd25f5ace.blob.core.windows.net/sc-0cd50a9c-d2d4-49f8-8038-e40982530830/workspace-services/cbas/terra-app-e79dfdc2-354e-496e-99b5-555b3097c8a2/fetch_sra_to_bam/117f49d5-413a-4cd8-976b-5204681ba097/call-Fetch_SRA_to_BAM/execution/SRR13379731.bam',
    sample_strain: 'SARS-CoV-2/USA/44165/2020',
    biosample_attributes_json:
          'https://lz43a8a3d21540dfd25f5ace.blob.core.windows.net/sc-0cd50a9c-d2d4-49f8-8038-e40982530830/workspace-services/cbas/terra-app-e79dfdc2-354e-496e-99b5-555b3097c8a2/fetch_sra_to_bam/117f49d5-413a-4cd8-976b-5204681ba097/call-Fetch_SRA_to_BAM/execution/SRR13379731-biosample_attributes.json',
    sample_geo_loc: 'USA: Utah',
    sequencing_platform: 'ILLUMINA',
    sample_collected_by: 'Utah Public Health Laboratory',
    sequencing_platform_model: 'NextSeq 550'
  }
  */

  //Helper function to have a friendly display name for blob files we're displaying to the user.
  const getFilenameFromAzureBlobPath = blobPath => {
    const n = blobPath.lastIndexOf('/')
    return blobPath.substring(n + 1) //If there is no slash, this will return the whole string.
  }

  const renderBlobLink = blobPath => {
    const fileName = getFilenameFromAzureBlobPath(blobPath)
    const downloadUrl = `${blobPath}?${sasToken}`
    return h(Link, { disabled: !downloadUrl, href: downloadUrl, download: fileName, style: {} },
      [fileName, icon('pop-out', { size: 12, style: { marginLeft: '0.25rem' } })])
  }

  const dataArray = jsonData ? Object.keys(jsonData).map(key => [key, jsonData[key]]) : []
  //const dataArray = Object.keys(testData).map(key => [key, testData[key]])
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
