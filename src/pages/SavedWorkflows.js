import _ from 'lodash/fp'
import { useState } from 'react'
import { div, h, h3 } from 'react-hyperscript-helpers'
import { AutoSizer } from 'react-virtualized'
import { ButtonOutline } from 'src/components/common'
import { FlexTable, Sortable, TextCell } from 'src/components/table'
import * as Utils from 'src/libs/utils'


export const SavedWorkflows = ({ setWorkflowUrl, setShowInputsPage }) => {
  // State
  const [sort, setSort] = useState({ field: 'submissionTimestamp', direction: 'desc' })

  // this hardcoded data to be removed in https://broadworkbench.atlassian.net/browse/BW-1318
  const previousRuns = [
    {
      workflowUrl: 'https://raw.githubusercontent.com/broadinstitute/cromwell/develop/centaur/src/main/resources/standardTestCases/hello/hello.wdl',
      submissionTimestamp: '2022-01-27T22:27:15.591Z'
    },
    {
      workflowUrl: 'https://raw.githubusercontent.com/abc/xyz',
      submissionTimestamp: '2022-07-14T22:22:15.591Z'
    },
    {
      workflowUrl: 'https://dockstore/abc/hello.wdl',
      submissionTimestamp: '2022-07-12T22:57:15.591Z'
    },
    {
      workflowUrl: 'https://raw.githubusercontent.com/broadinstitute/cromwell/develop/centaur/src/main/resources/standardTestCases/hello/hello.wdl',
      submissionTimestamp: '2021-01-27T22:28:15.591Z'
    },
    {
      workflowUrl: 'https://raw.githubusercontent.com/abc/xyz',
      submissionTimestamp: '2022-07-14T22:28:15.591Z'
    },
    {
      workflowUrl: 'https://dockstore/abc/hello.wdl',
      submissionTimestamp: '2021-05-12T22:26:15.591Z'
    },
    {
      workflowUrl: 'https://raw.githubusercontent.com/broadinstitute/cromwell/develop/centaur/src/main/resources/standardTestCases/hello/hello.wdl',
      submissionTimestamp: '2022-01-27T22:29:15.591Z'
    },
    {
      workflowUrl: 'https://raw.githubusercontent.com/abc/xyz',
      submissionTimestamp: '2019-10-20T22:22:15.591Z'
    },
    {
      workflowUrl: 'https://dockstore/abc/hello.wdl',
      submissionTimestamp: '2019-07-12T22:24:15.591Z'
    }
  ]

  const sortedPreviousRuns = _.orderBy(sort.field, sort.direction, previousRuns)

  return div({ style: { marginTop: '2em', display: 'flex', flexDirection: 'column' } }, [
    h3(['Saved Workflows']),
    div({ style: { flex: `1 1 auto`, height: '100%', minHeight: '25em' } }, [
      h(AutoSizer, [
        ({ width, height }) => h(FlexTable, {
          'aria-label': 'saved workflows',
          width, height, sort,
          rowCount: sortedPreviousRuns.length,
          noContentMessage: 'Nothing here yet! Your previously run workflows will be saved here.',
          hoverHighlight: true,
          columns: [
            {
              size: { basis: 500 },
              field: 'workflowUrl',
              headerRenderer: () => h(Sortable, { sort, field: 'workflowUrl', onSort: setSort }, ['Workflow Link']),
              cellRenderer: ({ rowIndex }) => {
                return h(TextCell, [sortedPreviousRuns[rowIndex].workflowUrl])
              }
            },
            {
              size: { basis: 250, grow: 0 },
              field: 'submissionTimestamp',
              headerRenderer: () => h(Sortable, { sort, field: 'submissionTimestamp', onSort: setSort }, ['Last Run']),
              cellRenderer: ({ rowIndex }) => {
                return h(TextCell, [Utils.makeCompleteDate(sortedPreviousRuns[rowIndex].submissionTimestamp)])
              }
            },
            {
              size: { basis: 190, grow: 0 },
              field: 'useWorkflowButton',
              headerRenderer: () => '',
              cellRenderer: ({ rowIndex }) => {
                return h(ButtonOutline, {
                  onClick: () => {
                    setWorkflowUrl(sortedPreviousRuns[rowIndex].workflowUrl)
                    setShowInputsPage(true)
                  }
                }, ['Use Workflow'])
              }
            }
          ]
        })
      ])
    ])
  ])
}
