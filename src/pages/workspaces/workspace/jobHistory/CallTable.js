import _ from 'lodash/fp'
import { useCallback, useEffect, useMemo, useState } from 'react'
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
        'data-testid': 'task-name-search-input',
        type: 'text',
        placeholder: 'Search by task name',
        style: { width: '100%', padding: '9px', borderRadius: '15px', border: '1px solid #8F95A0' },
        value: searchText,
        onChange: e => setSearchText(e.target.value)
      })
    ]
  )
}

///////WORKFLOW BREADCRUMB SUB-COMPONENT///////////////////////
const WorkflowBreadcrumb = ({ workflowPath, loadWorkflow, updateWorkflowPath }) => {
  const workflowPathRender = workflowPath.map((workflow, index) => {
    const { id, workflowName } = workflow
    const isLast = index === workflowPath.length - 1
    return span({ key: `${id}-breadcrumb`, style: { marginRight: '5px' } }, [
      isLast ? span([workflowName]) : h(Link, { style: { cursor: 'pointer' }, onClick: () => loadWorkflow(id, updateWorkflowPath) }, [workflowName]),
      !isLast && span(' > ')
    ])
  })
  return div({ style: { marginBottom: '10px' } }, [workflowPathRender])
}

////////CALL TABLE///////////////////////
const CallTable = ({ tableData, defaultFailedFilter = false, showLogModal, showTaskDataModal, loadWorkflow, enableExplorer = false, workflowName, workflowId }) => {
  const [sort, setSort] = useState({ field: 'index', direction: 'asc' })
  const [statusFilter, setStatusFilter] = useState([])
  const [filteredCallObjects, setFilteredCallObjects] = useState([])
  //NOTE: workflowPath is used to load the workflow in the explorer, implement after the table update is confirmed to be working
  const [workflowPath, setWorkflowPath] = useState([{id: workflowId, workflowName}])

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

  const updateWorkflowPath = useCallback((id, workflowName) => {
    const currentIndex = workflowPath.findIndex(workflow => workflow.id === id)
    if(currentIndex !== -1) {
      setWorkflowPath(workflowPath.slice(0, currentIndex + 1))
    } else {
      setWorkflowPath([...workflowPath, { id, workflowName }])
    }
  }, [workflowPath])

  return div([
    label({
      isRendered: !enableExplorer,
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
        div({ 'data-testid': 'status-dropdown-filter', style: { flexBasis: 250, marginRight: '20px' }, isRendered: !enableExplorer }, [
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
    h(WorkflowBreadcrumb, { isRendered: enableExplorer, workflowPath, loadWorkflow, updateWorkflowPath }),
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
              const { stdout, stderr, inputs, outputs, subWorkflowId } = filteredCallObjects[rowIndex]
              const style =
                enableExplorer && !_.isEmpty(subWorkflowId) ?
                  {
                    display: 'flex',
                    justifyContent: 'flex-start'
                  } :
                  {
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gridColumnGap: '0.3em',
                    gridRowGap: '0.3em'
                  }
              const linkTemplate = enableExplorer && !_.isEmpty(subWorkflowId) ?
                [h(Link, {
                  'data-testid': `view-subworkflow-${subWorkflowId}-link`,
                  onClick: () => {
                    loadWorkflow(subWorkflowId, updateWorkflowPath)
                  }
                }, ['View subworkflow'])] :
                _.isEmpty(subWorkflowId) && [
                  h(
                    Link,
                    {
                      'data-testid': 'inputs-modal-link',
                      onClick: () => showTaskDataModal('Inputs', inputs)
                    },
                    ['Inputs']
                  ),
                  h(
                    Link,
                    {
                      'data-testid': 'outputs-modal-link',
                      onClick: () => showTaskDataModal('Outputs', outputs)
                    },
                    ['Outputs']
                  ),
                  h(
                    Link,
                    {
                      'data-testid': 'stdout-modal-link',
                      onClick: () => showLogModal(stdout, true)
                    },
                    ['stdout']
                  ),
                  h(
                    Link,
                    {
                      'data-testid': 'stderr-modal-link',
                      onClick: () => showLogModal(stderr, true)
                    },
                    'stderr'
                  )
                ]
              return div({ style }, linkTemplate)
            })
          }
        ]
      })
    ])
  ])
}

export default CallTable
