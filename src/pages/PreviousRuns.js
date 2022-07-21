import _ from 'lodash/fp'
import { useState, Fragment } from 'react'
import { div, h, h2 } from 'react-hyperscript-helpers'
import { AutoSizer } from 'react-virtualized'
import { ButtonOutline, ButtonPrimary, headerBar, Link } from 'src/components/common'
import { TextArea } from 'src/components/input'
import Modal from 'src/components/Modal'
import { FlexTable, paginator, Sortable, TextCell } from 'src/components/table'
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
      workflowName: 'simple-hello-world-1',
      workflowStatus: 'Submitted',
      workflowInputs: '{ "wf_hello.hello.addressee": "World" }',
      workflowUrl: 'https://raw.githubusercontent.com/broadinstitute/cromwell/develop/centaur/src/main/resources/standardTestCases/hello/hello.wdl',
      submissionTimestamp: '2022-01-27T22:27:15.591Z'
    },
    {
      workflowName: 'mock-abc-1',
      workflowInputs: '',
      workflowStatus: 'Failed',
      workflowUrl: 'https://raw.githubusercontent.com/abc/xyz',
      submissionTimestamp: '2022-07-14T22:22:15.591Z'
    },
    {
      workflowName: 'dockstore-abc-hello-1',
      workflowStatus: 'Done',
      workflowInputs: '{ "hello.inputs_array": [1, 2, 3, 4, 5] }',
      workflowUrl: 'https://dockstore/abc/hello.wdl',
      submissionTimestamp: '2022-07-12T22:57:15.591Z'
    },
    {
      workflowName: 'simple-hello-world-2',
      workflowStatus: 'Done',
      workflowInputs: '{ "wf_hello.hello.addressee": "World" }',
      workflowUrl: 'https://raw.githubusercontent.com/broadinstitute/cromwell/develop/centaur/src/main/resources/standardTestCases/hello/hello.wdl',
      submissionTimestamp: '2021-01-27T22:28:15.591Z'
    },
    {
      workflowName: 'mock-abc-2',
      workflowStatus: 'Submitted',
      workflowInputs: '',
      workflowUrl: 'https://raw.githubusercontent.com/abc/xyz',
      submissionTimestamp: '2022-07-14T22:28:15.591Z'
    },
    {
      workflowName: 'dockstore-abc-hello-1',
      workflowStatus: 'Done',
      workflowInputs: '{ "hello.inputs_array": [1, 2, 3, 4, 5] }',
      workflowUrl: 'https://dockstore/abc/hello.wdl',
      submissionTimestamp: '2021-05-12T22:26:15.591Z'
    },
    {
      workflowName: 'simple-hello-world-3',
      workflowStatus: 'Aborted',
      workflowInputs: '{ "wf_hello.hello.addressee": "World" }',
      workflowUrl: 'https://raw.githubusercontent.com/broadinstitute/cromwell/develop/centaur/src/main/resources/standardTestCases/hello/hello.wdl',
      submissionTimestamp: '2022-01-27T22:29:15.591Z'
    },
    {
      workflowName: 'mock-abc-3',
      workflowStatus: 'Failed',
      workflowInputs: '',
      workflowUrl: 'https://raw.githubusercontent.com/abc/xyz',
      submissionTimestamp: '2019-10-20T22:22:15.591Z'
    },
    {
      workflowName: 'dockstore-abc-hello-1',
      workflowStatus: 'Done',
      workflowInputs: '{ "hello.inputs_array": [1, 2, 3, 4, 5] }',
      workflowUrl: 'https://dockstore/abc/hello.wdl',
      submissionTimestamp: '2019-07-12T22:24:15.591Z'
    },
    {
      workflowName: 'simple-hello-world-1',
      workflowStatus: 'Submitted',
      workflowInputs: '{ "wf_hello.hello.addressee": "World" }',
      workflowUrl: 'https://raw.githubusercontent.com/broadinstitute/cromwell/develop/centaur/src/main/resources/standardTestCases/hello/hello.wdl',
      submissionTimestamp: '2022-01-27T22:27:15.591Z'
    },
    {
      workflowName: 'mock-abc-1',
      workflowInputs: '',
      workflowStatus: 'Failed',
      workflowUrl: 'https://raw.githubusercontent.com/abc/xyz',
      submissionTimestamp: '2022-07-14T22:22:15.591Z'
    },
    {
      workflowName: 'dockstore-abc-hello-1',
      workflowStatus: 'Done',
      workflowInputs: '{ "hello.inputs_array": [1, 2, 3, 4, 5] }',
      workflowUrl: 'https://dockstore/abc/hello.wdl',
      submissionTimestamp: '2022-07-12T22:57:15.591Z'
    },
    {
      workflowName: 'simple-hello-world-2',
      workflowStatus: 'Done',
      workflowInputs: '{ "wf_hello.hello.addressee": "World" }',
      workflowUrl: 'https://raw.githubusercontent.com/broadinstitute/cromwell/develop/centaur/src/main/resources/standardTestCases/hello/hello.wdl',
      submissionTimestamp: '2021-01-27T22:28:15.591Z'
    },
    {
      workflowName: 'mock-abc-2',
      workflowStatus: 'Submitted',
      workflowInputs: '',
      workflowUrl: 'https://raw.githubusercontent.com/abc/xyz',
      submissionTimestamp: '2022-07-14T22:28:15.591Z'
    },
    {
      workflowName: 'dockstore-abc-hello-1',
      workflowStatus: 'Done',
      workflowInputs: '{ "hello.inputs_array": [1, 2, 3, 4, 5] }',
      workflowUrl: 'https://dockstore/abc/hello.wdl',
      submissionTimestamp: '2021-05-12T22:26:15.591Z'
    },
    {
      workflowName: 'simple-hello-world-3',
      workflowStatus: 'Aborted',
      workflowInputs: '{ "wf_hello.hello.addressee": "World" }',
      workflowUrl: 'https://raw.githubusercontent.com/broadinstitute/cromwell/develop/centaur/src/main/resources/standardTestCases/hello/hello.wdl',
      submissionTimestamp: '2022-01-27T22:29:15.591Z'
    },
    {
      workflowName: 'mock-abc-3',
      workflowStatus: 'Failed',
      workflowInputs: '',
      workflowUrl: 'https://raw.githubusercontent.com/abc/xyz',
      submissionTimestamp: '2019-10-20T22:22:15.591Z'
    },
    {
      workflowName: 'dockstore-abc-hello-1',
      workflowStatus: 'Done',
      workflowInputs: '{ "hello.inputs_array": [1, 2, 3, 4, 5] }',
      workflowUrl: 'https://dockstore/abc/hello.wdl',
      submissionTimestamp: '2019-07-12T22:24:15.591Z'
    }
  ]

  const sortedPreviousRuns = _.orderBy(sort.field, sort.direction, previousRuns)

  return h(Fragment, [
    headerBar(),
    div({ style: { margin: '4rem' } }, [
      h2(['Previous Runs']),
      div(['Remember to turn off your Cromwell App in Terra once you are done to prevent incurring costs.']),
      div({ style: { marginTop: '1em', flex: 1, height: '100vh' } }, [
        h(AutoSizer, [
          ({ width, height }) => h(FlexTable, {
            'aria-label': 'previous runs',
            width, height, sort,
            rowCount: sortedPreviousRuns.length,
            noContentMessage: 'Nothing here yet! Your previously run workflows will be saved here.',
            hoverHighlight: true,
            columns: [
              {
                size: { basis: 500 },
                field: 'workflowName',
                headerRenderer: () => h(Sortable, { sort, field: 'workflowName', onSort: setSort }, ['Workflow Name']),
                cellRenderer: ({ rowIndex }) => {
                  return h(TextCell, [sortedPreviousRuns[rowIndex].workflowName])
                }
              },
              {
                size: { basis: 150, grow: 0 },
                field: 'workflowStatus',
                headerRenderer: () => h(Sortable, { sort, field: 'workflowStatus', onSort: setSort }, ['Status']),
                cellRenderer: ({ rowIndex }) => {
                  return h(TextCell, [sortedPreviousRuns[rowIndex].workflowStatus])
                }
              },
              {
                size: { basis: 80, grow: 0  },
                field: 'workflowInputs',
                headerRenderer: () => 'Inputs',
                cellRenderer: ({ rowIndex }) => {
                  const inputs = sortedPreviousRuns[rowIndex].workflowInputs
                  return div({ style: { width: '100%', textAlign: 'center' } }, [
                    h(Link, {
                      onClick: () => setViewInputsId(rowIndex)
                    }, ['View'])
                  ])
                }
              },
              {
                size: { basis: 250, grow: 0 },
                field: 'submissionTimestamp',
                headerRenderer: () => h(Sortable, { sort, field: 'submissionTimestamp', onSort: setSort }, ['Submitted']),
                cellRenderer: ({ rowIndex }) => {
                  return h(TextCell, [Utils.makeCompleteDate(sortedPreviousRuns[rowIndex].submissionTimestamp)])
                }
              }
            ]
          })
        ])
      ]),
      !_.isEmpty(sortedPreviousRuns) && div({ style: { flex: 'none', margin: '1rem' } }, [
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
    viewInputsId && h(Modal, {
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
        placeholder: sortedPreviousRuns[viewInputsId].workflowInputs,
        value: sortedPreviousRuns[viewInputsId].workflowInputs,
        readOnly: true
      })
    ])
  ])
}
