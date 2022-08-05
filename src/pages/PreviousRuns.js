import _ from 'lodash/fp'
import { Fragment, useState } from 'react'
import { div, h, h2 } from 'react-hyperscript-helpers'
import { AutoSizer } from 'react-virtualized'
import { ButtonOutline, headerBar } from 'src/components/common'
import { FlexTable, paginator, Sortable, tableHeight, TextCell } from 'src/components/table'
import { Ajax } from 'src/libs/ajax'
import * as Nav from 'src/libs/nav'
import { notify } from 'src/libs/notifications'
import { useCancellation, useOnMount } from 'src/libs/react-utils'
import * as Utils from 'src/libs/utils'


export const PreviousRuns = () => {
  // State
  const [sort, setSort] = useState({ field: 'submissionTimestamp', direction: 'desc' })
  const [pageNumber, setPageNumber] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(50)
  const [runsData, setRunsData] = useState()

  const signal = useCancellation()

  useOnMount(() => {
    const loadRunsData = async () => {
      try {
        const runs = await Ajax(signal).Cbas.runs.get()
        setRunsData(runs.runs)
      } catch (error) {
        notify('error', 'Error loading previous runs', { detail: await (error instanceof Response ? error.text() : error) })
      }
    }

    loadRunsData()
  })

  const sortedPreviousRuns = _.orderBy(sort.field, sort.direction, runsData)

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
                size: { basis: 300 },
                field: 'workflowName',
                headerRenderer: () => h(Sortable, { sort, field: 'workflowName', onSort: setSort }, ['Workflow Name']),
                cellRenderer: ({ rowIndex }) => {
                  return h(TextCell, [paginatedPreviousRuns[rowIndex].name])
                }
              },
              {
                size: { basis: 250, grow: 0 },
                field: 'workflowStatus',
                headerRenderer: () => h(Sortable, { sort, field: 'workflowStatus', onSort: setSort }, ['Status']),
                cellRenderer: ({ rowIndex }) => {
                  return h(TextCell, [paginatedPreviousRuns[rowIndex].state])
                }
              },
              {
                size: { basis: 350, grow: 0 },
                field: 'submissionTimestamp',
                headerRenderer: () => h(Sortable, { sort, field: 'submissionTimestamp', onSort: setSort }, ['Submitted']),
                cellRenderer: ({ rowIndex }) => {
                  return h(TextCell, [Utils.makeCompleteDate(paginatedPreviousRuns[rowIndex].submission_date)])
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
          itemsPerPageOptions: [10, 25, 50, 100]
        })
      ])
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
