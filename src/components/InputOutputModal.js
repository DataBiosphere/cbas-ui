import _ from 'lodash/fp'
import { useState } from 'react'
import { div, h } from 'react-hyperscript-helpers'
import { AutoSizer } from 'react-virtualized'
import { Link, Select } from 'src/components/common'
import Modal from 'src/components/Modal'
import { FlexTable, Sortable, tableHeight, TooltipCell } from 'src/components/table'


const InputOutputModal = ({ dataTableJson, isInputData, onDismiss }) => {
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
  const [statusFilter, setStatusFilter] = useState([])
  const [sort, setSort] = useState({ field: 'index', direction: 'asc' })

  const dataArray = Object.keys(testData).map(key => [key, testData[key]])
  console.log(dataArray)
  return h(Modal,
    {
      title: isInputData ? 'Inputs' : 'Outputs',
      onDismiss,
      showCancel: false,
      showX: true,
      okButton: 'Done',
      width: 900,
      height: 500
    }, [
      // we are specifying height here so that for long workflow scripts the Modal doesn't overflow the main screen
      div({ style: { margin: '1rem 0', display: 'flex', alignItems: 'center' } }, [
        div({ style: { flexBasis: 350 } }, [
          h(Select, {
            isClearable: true,
            isMulti: true,
            isSearchable: false,
            placeholder: 'Status',
            'aria-label': 'Status',
            value: statusFilter,
            onChange: data => setStatusFilter(_.map('value', data)),
            options: ['Succeeded', 'Failed', 'Running', 'Submitted, Awaiting Cloud Quota', 'Unknown']
          })
        ]),
        h(AutoSizer, { disableHeight: true }, [
          ({ width }) => h(FlexTable, {
            'aria-label': 'call table',
            height: tableHeight({ actualRows: dataArray.length, maxRows: 10.5 }), // The half-row here hints at there being extra rows if scrolled
            width, sort,
            rowCount: dataArray.length,
            noContentMessage: 'No Inputs',
            columns: [
              {
                size: { basis: 100, grow: 0 },
                field: 'key',
                headerRenderer: () => h(Sortable, { sort, field: 'key', onSort: setSort }, ['Key']),
                cellRenderer: ({ rowIndex }) => {
                  return div({}, dataArray[rowIndex][0])
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
