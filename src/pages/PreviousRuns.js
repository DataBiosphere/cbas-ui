import _ from 'lodash/fp'
import { Fragment, useState } from 'react'
import { div, h, h2 } from 'react-hyperscript-helpers'
import { AutoSizer } from 'react-virtualized'
import { ButtonOutline, ButtonPrimary, headerBar, Link } from 'src/components/common'
import { TextArea } from 'src/components/input'
import Modal from 'src/components/Modal'
import { FlexTable, paginator, Sortable, tableHeight, TextCell } from 'src/components/table'
import * as Nav from 'src/libs/nav'
import * as Utils from 'src/libs/utils'


export const PreviousRuns = () => {
  // State
  const [sort, setSort] = useState({ field: 'submissionTimestamp', direction: 'desc' })
  const [viewInputsId, setViewInputsId] = useState()
  const [pageNumber, setPageNumber] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(100)

  // this hardcoded data to be removed in https://broadworkbench.atlassian.net/browse/BW-1319
  const previousRuns = [
    {
      workflowName: '1-simple-hello-world-1',
      workflowStatus: 'Submitted',
      workflowInputs: '{ "wf_hello.hello.addressee": "1-World" }',
      workflowUrl: 'https://raw.githubusercontent.com/broadinstitute/cromwell/develop/centaur/src/main/resources/standardTestCases/hello/hello.wdl',
      submissionTimestamp: '2022-01-27T22:27:15.591Z'
    },
    {
      workflowName: '2-mock-abc-1',
      workflowInputs: '',
      workflowStatus: 'Failed',
      workflowUrl: 'https://raw.githubusercontent.com/abc/xyz',
      submissionTimestamp: '2022-07-14T22:22:15.591Z'
    },
    {
      workflowName: '3-dockstore-abc-hello-1',
      workflowStatus: 'Done',
      workflowInputs: '{ "hello.inputs_array": [3-1, 2, 3, 4, 5] }',
      workflowUrl: 'https://dockstore/abc/hello.wdl',
      submissionTimestamp: '2022-07-12T22:57:15.591Z'
    },
    {
      workflowName: '4-simple-hello-world-2',
      workflowStatus: 'Done',
      workflowInputs: '{ "wf_hello.hello.addressee": "4-World" }',
      workflowUrl: 'https://raw.githubusercontent.com/broadinstitute/cromwell/develop/centaur/src/main/resources/standardTestCases/hello/hello.wdl',
      submissionTimestamp: '2021-01-27T22:28:15.591Z'
    },
    {
      workflowName: '5-mock-abc-2',
      workflowStatus: 'Submitted',
      workflowInputs: '',
      workflowUrl: 'https://raw.githubusercontent.com/abc/xyz',
      submissionTimestamp: '2022-07-14T22:28:15.591Z'
    },
    {
      workflowName: '6-dockstore-abc-hello-1',
      workflowStatus: 'Done',
      workflowInputs: '{ "hello.inputs_array": [6-1, 2, 3, 4, 5] }',
      workflowUrl: 'https://dockstore/abc/hello.wdl',
      submissionTimestamp: '2021-05-12T22:26:15.591Z'
    },
    {
      workflowName: '7-simple-hello-world-3',
      workflowStatus: 'Aborted',
      workflowInputs: '{ "wf_hello.hello.addressee": "7-World" }',
      workflowUrl: 'https://raw.githubusercontent.com/broadinstitute/cromwell/develop/centaur/src/main/resources/standardTestCases/hello/hello.wdl',
      submissionTimestamp: '2022-01-27T22:29:15.591Z'
    },
    {
      workflowName: '8-mock-abc-3',
      workflowStatus: 'Failed',
      workflowInputs: '',
      workflowUrl: 'https://raw.githubusercontent.com/abc/xyz',
      submissionTimestamp: '2019-10-20T22:22:15.591Z'
    },
    {
      workflowName: '9-dockstore-abc-hello-1',
      workflowStatus: 'Done',
      workflowInputs: '{ "hello.inputs_array": [9-1, 2, 3, 4, 5] }',
      workflowUrl: 'https://dockstore/abc/hello.wdl',
      submissionTimestamp: '2019-07-12T22:24:15.591Z'
    },
    {
      workflowName: '10-simple-hello-world-1',
      workflowStatus: 'Submitted',
      workflowInputs: '{ "wf_hello.hello.addressee": "10-World" }',
      workflowUrl: 'https://raw.githubusercontent.com/broadinstitute/cromwell/develop/centaur/src/main/resources/standardTestCases/hello/hello.wdl',
      submissionTimestamp: '2022-01-27T22:27:15.591Z'
    },
    {
      workflowName: '11-mock-abc-1',
      workflowInputs: '',
      workflowStatus: 'Failed',
      workflowUrl: 'https://raw.githubusercontent.com/abc/xyz',
      submissionTimestamp: '2022-07-14T22:22:15.591Z'
    },
    {
      workflowName: '12-dockstore-abc-hello-1',
      workflowStatus: 'Done',
      workflowInputs: '{ "hello.inputs_array": [12-1, 2, 3, 4, 5] }',
      workflowUrl: 'https://dockstore/abc/hello.wdl',
      submissionTimestamp: '2022-07-12T22:57:15.591Z'
    },
    {
      workflowName: '13-simple-hello-world-2',
      workflowStatus: 'Done',
      workflowInputs: '{ "wf_hello.hello.addressee": "13-World" }',
      workflowUrl: 'https://raw.githubusercontent.com/broadinstitute/cromwell/develop/centaur/src/main/resources/standardTestCases/hello/hello.wdl',
      submissionTimestamp: '2021-01-27T22:28:15.591Z'
    },
    {
      workflowName: '14-mock-abc-2',
      workflowStatus: 'Submitted',
      workflowInputs: '',
      workflowUrl: 'https://raw.githubusercontent.com/abc/xyz',
      submissionTimestamp: '2022-07-14T22:28:15.591Z'
    },
    {
      workflowName: '15-dockstore-abc-hello-1',
      workflowStatus: 'Done',
      workflowInputs: '{ "hello.inputs_array": [15-1, 2, 3, 4, 5] }',
      workflowUrl: 'https://dockstore/abc/hello.wdl',
      submissionTimestamp: '2021-05-12T22:26:15.591Z'
    },
    {
      workflowName: '16-simple-hello-world-3',
      workflowStatus: 'Aborted',
      workflowInputs: '{ "wf_hello.hello.addressee": "16-World" }',
      workflowUrl: 'https://raw.githubusercontent.com/broadinstitute/cromwell/develop/centaur/src/main/resources/standardTestCases/hello/hello.wdl',
      submissionTimestamp: '2022-01-27T22:29:15.591Z'
    },
    {
      workflowName: '17-mock-abc-3',
      workflowStatus: 'Failed',
      workflowInputs: '',
      workflowUrl: 'https://raw.githubusercontent.com/abc/xyz',
      submissionTimestamp: '2019-10-20T22:22:15.591Z'
    },
    {
      workflowName: '18-dockstore-abc-hello-1',
      workflowStatus: 'Done',
      workflowInputs: '{ "hello.inputs_array": [18-1, 2, 3, 4, 5] }',
      workflowUrl: 'https://dockstore/abc/hello.wdl',
      submissionTimestamp: '2019-07-12T22:24:15.591Z'
    }
  ]

  const sortedPreviousRuns = _.orderBy(sort.field, sort.direction, previousRuns)

  const firstPageIndex = (pageNumber - 1) * itemsPerPage
  const lastPageIndex = firstPageIndex + itemsPerPage
  const paginatedPreviousRuns = sortedPreviousRuns.slice(firstPageIndex, lastPageIndex)


  return h(Fragment, [
    headerBar(),
    div({ style: { margin: '4em' } }, [
      div({ style: { display: 'flex', marginTop: '1rem', justifyContent: 'space-between' } }, [
        h2(['Previous Runs']),
        h(ButtonOutline, {
          onClick: () => Nav.goToPath('root')
        }, ['Submit another workflow'])
      ]),
      div(['Remember to turn off your Cromwell App in Terra once you are done to prevent incurring costs.']),
      div({ style: { marginTop: '1em', height: tableHeight({ actualRows: paginatedPreviousRuns.length, maxRows: 12.5 }), minHeight: '10em' } }, [
        h(AutoSizer, [
          ({ width, height }) => h(FlexTable, {
            'aria-label': 'previous runs',
            width, height, sort,
            rowCount: paginatedPreviousRuns.length,
            noContentMessage: 'Nothing here yet! Your previously run workflows will be displayed here.',
            hoverHighlight: true,
            columns: [
              {
                size: { basis: 500 },
                field: 'workflowName',
                headerRenderer: () => h(Sortable, { sort, field: 'workflowName', onSort: setSort }, ['Workflow Name']),
                cellRenderer: ({ rowIndex }) => {
                  return h(TextCell, [paginatedPreviousRuns[rowIndex].workflowName])
                }
              },
              {
                size: { basis: 150, grow: 0 },
                field: 'workflowStatus',
                headerRenderer: () => h(Sortable, { sort, field: 'workflowStatus', onSort: setSort }, ['Status']),
                cellRenderer: ({ rowIndex }) => {
                  return h(TextCell, [paginatedPreviousRuns[rowIndex].workflowStatus])
                }
              },
              {
                size: { basis: 80, grow: 0 },
                field: 'workflowInputs',
                headerRenderer: () => 'Inputs',
                cellRenderer: ({ rowIndex }) => {
                  return div({ style: { width: '100%', textAlign: 'center' } }, [
                    h(Link, { onClick: () => setViewInputsId(rowIndex) }, ['View'])
                  ])
                }
              },
              {
                size: { basis: 250, grow: 0 },
                field: 'submissionTimestamp',
                headerRenderer: () => h(Sortable, { sort, field: 'submissionTimestamp', onSort: setSort }, ['Submitted']),
                cellRenderer: ({ rowIndex }) => {
                  return h(TextCell, [Utils.makeCompleteDate(paginatedPreviousRuns[rowIndex].submissionTimestamp)])
                }
              }
            ]
          })
        ])
      ]),
      !_.isEmpty(sortedPreviousRuns) && div({ style: { bottom: 0, position: 'absolute', marginBottom: '1.5rem', right: '4rem' } }, [
        paginator({
          filteredDataLength: sortedPreviousRuns.length,
          unfilteredDataLength: sortedPreviousRuns.length,
          pageNumber,
          setPageNumber,
          itemsPerPage,
          setItemsPerPage: v => {
            setPageNumber(1)
            setItemsPerPage(v)
          },
          itemsPerPageOptions: [10, 25, 50, 100, 250, 500, 1000]
        })
      ])
    ]),
    (viewInputsId !== undefined) && h(Modal, {
      title: 'Inputs JSON',
      width: 600,
      onDismiss: () => setViewInputsId(undefined),
      showCancel: false,
      okButton:
        h(ButtonPrimary, {
          disabled: false,
          onClick: () => setViewInputsId(undefined)
        }, ['OK'])
    }, [
      h(TextArea, {
        style: { height: 100 },
        'aria-label': 'Inputs JSON',
        value: _.isEmpty(paginatedPreviousRuns[viewInputsId].workflowInputs) ? '{}' : paginatedPreviousRuns[viewInputsId].workflowInputs,
        readOnly: true
      })
    ])
  ])
}

export const navPaths = [
  {
    name: 'previous-runs',
    path: '/previous-runs',
    component: PreviousRuns,
    public: true
  }
]
