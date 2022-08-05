import _ from 'lodash/fp'
import { useState } from 'react'
import { div, h, h3 } from 'react-hyperscript-helpers'
import { AutoSizer } from 'react-virtualized'
import { FlexTable, Sortable, TextCell } from 'src/components/table'
import * as Utils from 'src/libs/utils'


export const SavedWorkflows = ({ runsData }) => {
  // State
  const [sort, setSort] = useState({ field: 'submissionTimestamp', direction: 'desc' })

  const sortedPreviousRuns = _.orderBy(sort.field, sort.direction, runsData)

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
              field: 'workflowName',
              headerRenderer: () => h(Sortable, { sort, field: 'workflowName', onSort: setSort }, ['Workflow Name']),
              cellRenderer: ({ rowIndex }) => {
                return h(TextCell, [sortedPreviousRuns[rowIndex].name])
              }
            },
            {
              size: { basis: 350, grow: 0 },
              field: 'submissionTimestamp',
              headerRenderer: () => h(Sortable, { sort, field: 'submissionTimestamp', onSort: setSort }, ['Last Run']),
              cellRenderer: ({ rowIndex }) => {
                return h(TextCell, [Utils.makeCompleteDate(sortedPreviousRuns[rowIndex].submission_date)])
              }
            }
          ]
        })
      ])
    ])
  ])
}
