import _ from 'lodash/fp'
import { useEffect, useMemo, useState } from 'react'
import { div, h, input, label, span } from 'react-hyperscript-helpers'
import { AutoSizer } from 'react-virtualized'
import { Link, Select } from 'src/components/common'
import { makeCromwellStatusLine } from 'src/components/job-common'
import { FlexTable, HeaderCell, Sortable, tableHeight, TooltipCell } from 'src/components/table'
import * as Utils from 'src/libs/utils'

///////////////FILTER UTILITY FUNCTIONS/////////////////////////////
export const taskNameFilter = searchText => {
  const searchTerms = searchText.toLowerCase().split(/[\s_/]/)
  return _.filter(callObject => {
    return searchTerms.every(term => (callObject?.taskName || '').toLowerCase().includes(term))
  })
}

export const statusFilter = statuses => {
  return _.filter(({ statusObj }) => {
    const { id } = statusObj
    return _.isEmpty(statuses) ? true : statuses.includes(_.startCase(id))
  })
}

export const filterCalllObjectsFn = (callObjects, sort, setFilteredCallObjects, statuses) => {
  return (searchText = '') => {
    const results = _.flow(
      taskNameFilter(searchText),
      statusFilter(statuses),
      _.sortBy(sort.field),
      sort.direction === 'asc' ? _.identity : _.reverse)(callObjects)
    setFilteredCallObjects(results)
  }
}

//////////////STATUS COUNT SUB-COMPONENT///////////////////////////
const StatusCounts = ({ statusListObjects }) => {
  const statuses = Object.keys(statusListObjects)
  const statusCountRender = statuses.map(status => {
    const { count, icon } = statusListObjects[status]
    return span({ key: `${status}-status-count`, style: { marginRight: '20px' } }, [
      icon(),
      span({ style: { fontWeight: 800, marginLeft: '3px' } }, [`${count} `]),
      span(`${status}`)
    ])
  })
  return div({}, [statusCountRender])
}

//////////////TABLE SEARCH BAR///////////////////////
const SearchBar = ({ filterFn }) => {
  const [searchText, setSearchText] = useState('')

  useEffect(() => {
    filterFn(searchText)
  }, [filterFn, searchText])

  return div(
    {
      id: 'task-name-search',
      style: {
        flexBasis: '400px'
      }
    },
    [
      input({
        id: 'task-name-search-input',
        type: 'text',
        placeholder: 'Search by task name',
        style: { width: '100%', padding: '9px', borderRadius: '15px', border: '1px solid #8F95A0' },
        value: searchText,
        onChange: e => setSearchText(e.target.value)
      })
    ]
  )
}

////////CALL TABLE///////////////////////
const CallTable = ({ tableData, defaultFailedFilter = false, showLogModal }) => {
  const [sort, setSort] = useState({ field: 'index', direction: 'asc' })
  const [statusFilter, setStatusFilter] = useState([])
  const [filteredCallObjects, setFilteredCallObjects] = useState([])

  useEffect(() => {
    if (defaultFailedFilter) {
      setStatusFilter(['Failed'])
    }
  }, [defaultFailedFilter])

  const filterFn = useMemo(() => {
    return filterCalllObjectsFn(tableData, sort, setFilteredCallObjects, statusFilter)
  }, [tableData, sort, setFilteredCallObjects, statusFilter])

  const statusListObjects = useMemo(() => {
    const statusSet = {}
    tableData.forEach(({ statusObj }) => {
      if (!_.isEmpty(statusObj)) {
        const { icon, id } = statusObj
        const startCasedId = _.startCase(id)
        if (!statusSet[startCasedId]) {
          statusSet[startCasedId] = { count: 0 }
        }
        statusSet[startCasedId].count += 1
        statusSet[startCasedId].icon = icon
      } else {
        return {}
      }
    })
    return statusSet
  }, [tableData])

  return div([
    label({
      style: {
        fontWeight: 700
      }
    }, ['Filter by:']),
    div({ style: { margin: '1rem 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' } }, [
      div({
        id: 'filter-section-left',
        style: {
          display: 'flex',
          justifyContent: 'flex-start',
          alignItems: 'center',
          flexBasis: 400,
          flexGrow: 2
        }
      }, [
        div({ 'data-testid': 'status-dropdown-filter', style: { flexBasis: 250, marginRight: '20px' } }, [
          h(Select, {
            isClearable: true,
            isMulti: true,
            isSearchable: false,
            placeholder: 'Status',
            'aria-label': 'Status',
            value: statusFilter,
            onChange: data => setStatusFilter(_.map('value', data)),
            options: Object.keys(statusListObjects)
          })
        ]),
        h(StatusCounts, { statusListObjects })
      ]),
      div({
        id: 'filter-section-right', style: {
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          flexBasis: 400,
          flexGrow: 1
        }
      }, [
        h(SearchBar, { filterFn })
      ])
    ]),

    h(AutoSizer, { disableHeight: true }, [
      ({ width }) => h(FlexTable, {
        'aria-label': 'call table',
        height: tableHeight({ actualRows: filteredCallObjects.length, maxRows: 10.5 }), // The half-row here hints at there being extra rows if scrolled
        width,
        sort,
        rowCount: filteredCallObjects.length,
        noContentMessage: 'No matching calls',
        columns: [
          {
            size: { basis: 300, grow: 2 },
            field: 'taskName',
            headerRenderer: () => h(Sortable, { sort, field: 'taskName', onSort: setSort }, ['Name']),
            cellRenderer: ({ rowIndex }) => {
              const { taskName } = filteredCallObjects[rowIndex]
              return taskName
            }
          },
          {
            size: { basis: 100, grow: 1 },
            field: 'type',
            headerRenderer: () => h(Sortable, { sort, field: 'type', onSort: setSort }, ['Type']),
            cellRenderer: ({ rowIndex }) => {
              const { subWorkflowId } = filteredCallObjects[rowIndex]
              return _.isEmpty(subWorkflowId) ? 'Task' : 'Sub-workflow'
            }
          },
          {
            size: { basis: 100, grow: 1 },
            field: 'attempt',
            headerRenderer: () => h(Sortable, { sort, field: 'attempt', onSort: setSort }, ['Attempt']),
            cellRenderer: ({ rowIndex }) => {
              const { attempt } = filteredCallObjects[rowIndex]
              return attempt
            }
          },
          {
            size: { basis: 150, grow: 2 },
            field: 'status',
            headerRenderer: () => h(Sortable, { sort, field: 'status', onSort: setSort }, ['Status']),
            cellRenderer: ({ rowIndex }) => {
              const { executionStatus, backendStatus } = filteredCallObjects[rowIndex]
              return makeCromwellStatusLine(executionStatus, backendStatus)
            }
          },
          {
            size: { basis: 200, grow: 1 },
            field: 'start',
            headerRenderer: () => h(Sortable, { sort, field: 'start', onSort: setSort }, ['Start']),
            cellRenderer: ({ rowIndex }) => {
              const { start } = filteredCallObjects[rowIndex]
              return h(TooltipCell, [start ? Utils.makeCompleteDate(start) : 'N/A'])
            }
          },
          {
            size: { basis: 200, grow: 1 },
            field: 'end',
            headerRenderer: () => h(Sortable, { sort, field: 'end', onSort: setSort }, ['End']),
            cellRenderer: ({ rowIndex }) => {
              const { end } = filteredCallObjects[rowIndex]
              return h(TooltipCell, [end ? Utils.makeCompleteDate(end) : 'N/A'])
            }
          },
          {
            size: { basis: 200, grow: 1 },
            field: 'logs',
            headerRenderer: () => h(HeaderCell, { fontWeight: 500 }, ['Logs']),
            cellRenderer: (({ rowIndex }) => {
              const { stdout, stderr } = filteredCallObjects[rowIndex]
              return div({ style: { display: 'flex', justifyContent: 'flex-start' } }, [
                h(Link, {
                  style: {
                    marginRight: '0.5rem'
                  },
                  onClick: () => showLogModal(stdout)
                }, ['stdout']),
                h(Link, {
                  onClick: () => showLogModal(stderr)
                }, 'stderr')
              ])
            })
          }
        ]
      })
    ])
  ])
}

export default CallTable
