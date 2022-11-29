import _ from 'lodash/fp'
import { useState } from 'react'
import { div, h, h3 } from 'react-hyperscript-helpers'
import { AutoSizer } from 'react-virtualized'
import { ButtonOutline } from 'src/components/common'
import { FlexTable, Sortable, TextCell } from 'src/components/table'
import * as Utils from 'src/libs/utils'


export const SavedWorkflows = ({ runsData, setWorkflowUrl, setShowInputsPage }) => {
  // State
  const [sort, setSort] = useState({ field: 'submission_date', direction: 'desc' })

  const sortedPreviousRuns = _.orderBy(sort.field, sort.direction, runsData)

  const rowHeight = 200
  return div({ style: { marginTop: '2em', display: 'flex', flexDirection: 'column' } }, [
    // h3(['Saved Workflows']),
    div({ style: { flex: `1 1 auto`, height: '100%', minHeight: '25em' } }, [
      h(AutoSizer, [
        ({ width, height }) => h(FlexTable, {
          'aria-label': 'saved workflows',
          width, height, sort,
          rowCount: sortedPreviousRuns.length,
          noContentMessage: 'Nothing here yet! Your previously run workflows will be saved here.',
          hoverHighlight: true,
          rowHeight,
          columns: [
            {
              size: { basis: 500 },
              field: 'workflow_url',
              //headerRenderer: () => null,//h(Sortable, { sort, field: 'workflow_url', onSort: setSort }, ['Workflow Link']),
              cellRenderer: ({ rowIndex }) => {
                return h(TextCell, [sortedPreviousRuns[rowIndex].name])
              }
            }
          ]
        })
      ])
    ])
  ])
}
