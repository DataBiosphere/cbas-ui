import _ from 'lodash/fp'
import { useState } from 'react'
import { div, h } from 'react-hyperscript-helpers'
import { AutoSizer } from 'react-virtualized'
import { Link, Select } from 'src/components/common'
import { icon } from 'src/components/icons'
import { collapseCromwellStatus, makeCromwellStatusLine } from 'src/components/job-common'
import { FlexTable, Sortable, tableHeight, TooltipCell } from 'src/components/table'
import colors from 'src/libs/colors'
import * as Utils from 'src/libs/utils'
import { FailuresModal } from 'src/pages/workspaces/workspace/jobHistory/FailuresViewer'


const CallTable = ({ callName, callObjects }) => {
  const [failuresModalParams, setFailuresModalParams] = useState()
  const [sort, setSort] = useState({ field: 'index', direction: 'asc' })
  const [statusFilter, setStatusFilter] = useState([])

  const filteredCallObjects = _.flow(
    _.filter(({ executionStatus, backendStatus }) => {
      const status = collapseCromwellStatus(executionStatus, backendStatus).label()
      return (_.isEmpty(statusFilter) || statusFilter.includes(status))
    }),
    _.sortBy(sort.field),
    sort.direction === 'asc' ? _.identity : _.reverse
  )(callObjects)

  return div([
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
      ])
    ]),
    h(AutoSizer, { disableHeight: true }, [
      ({ width }) => h(FlexTable, {
        'aria-label': 'call table',
        height: tableHeight({ actualRows: filteredCallObjects.length, maxRows: 10.5 }), // The half-row here hints at there being extra rows if scrolled
        width, sort,
        rowCount: filteredCallObjects.length,
        noContentMessage: 'No matching calls',
        columns: [
          {
            size: { basis: 100, grow: 0 },
            field: 'index',
            headerRenderer: () => h(Sortable, { sort, field: 'index', onSort: setSort }, ['Index']),
            cellRenderer: ({ rowIndex }) => {
              const { shardIndex } = filteredCallObjects[rowIndex]
              return shardIndex >= 0 ? shardIndex : 'N/A'
            }
          }, {
            size: { basis: 100, grow: 0 },
            field: 'attempt',
            headerRenderer: () => h(Sortable, { sort, field: 'attempt', onSort: setSort }, ['Attempt']),
            cellRenderer: ({ rowIndex }) => {
              const { attempt } = filteredCallObjects[rowIndex]
              return attempt
            }
          }, {
            size: { basis: 200, grow: 2 },
            field: 'status',
            headerRenderer: () => h(Sortable, { sort, field: 'status', onSort: setSort }, ['Status']),
            cellRenderer: ({ rowIndex }) => {
              const { executionStatus, backendStatus } = filteredCallObjects[rowIndex]
              return makeCromwellStatusLine(executionStatus, backendStatus)
            }
          }, {
            size: { basis: 200, grow: 2 },
            field: 'start',
            headerRenderer: () => h(Sortable, { sort, field: 'start', onSort: setSort }, ['Start']),
            cellRenderer: ({ rowIndex }) => {
              const { start } = filteredCallObjects[rowIndex]
              return h(TooltipCell, [start ? Utils.makeCompleteDate(start) : 'N/A'])
            }
          }, {
            size: { basis: 200, grow: 2 },
            field: 'end',
            headerRenderer: () => h(Sortable, { sort, field: 'end', onSort: setSort }, ['End']),
            cellRenderer: ({ rowIndex }) => {
              const { end } = filteredCallObjects[rowIndex]
              return h(TooltipCell, [end ? Utils.makeCompleteDate(end) : 'N/A'])
            }
          },
          {
            size: { basis: 200, grow: 2 },
            headerRenderer: () => 'Links',
            cellRenderer: ({ rowIndex }) => {
              const { failures, shardIndex: index, attempt } = filteredCallObjects[rowIndex]
              const failureCount = _.size(failures)
              return !!failureCount && h(Link, {
                style: { marginLeft: '0.5rem' },
                onClick: () => setFailuresModalParams({ index, attempt, failures })
              }, [
                div({ style: { display: 'flex', alignItems: 'center' } }, [
                  icon('warning-standard', { size: 18, style: { color: colors.warning(), marginRight: '0.5rem' } }),
                  `${failureCount} Message${failureCount > 1 ? 's' : ''}`
                ])
              ])
            }
          }
        ]
      })
    ]),
    failuresModalParams && h(FailuresModal, { ...failuresModalParams, callFqn: callName, onDismiss: () => setFailuresModalParams(undefined) })
  ])
}

export default CallTable
