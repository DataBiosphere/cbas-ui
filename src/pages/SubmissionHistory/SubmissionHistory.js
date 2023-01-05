import _ from 'lodash/fp'
import { Fragment, useState } from 'react'
import { div, h, h2 } from 'react-hyperscript-helpers'
import { AutoSizer } from 'react-virtualized'
import { ButtonOutline, Link, Navbar } from 'src/components/common'
import { icon } from 'src/components/icons'
import { makeStatusLine, statusType } from 'src/components/submission-common'
import { FlexTable, paginator, Sortable, tableHeight, TextCell } from 'src/components/table'
import { Ajax } from 'src/libs/ajax'
import * as Nav from 'src/libs/nav'
import { notify } from 'src/libs/notifications'
import { useCancellation, useOnMount } from 'src/libs/react-utils'
import * as Utils from 'src/libs/utils'


export const SubmissionHistory = () => {
  // State
  const [sort, setSort] = useState({ field: 'submission_timestamp', direction: 'desc' })
  const [pageNumber, setPageNumber] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(50)
  const [runSetsData, setRunSetData] = useState()

  const signal = useCancellation()

  const terminalStates = ['ERROR', 'COMPLETE']

  const runSetDuration = ({
    state,
    submission_timestamp: submitted,
    last_modified_timestamp: modified
  }) => {
    return terminalStates.includes(state) ?
      Utils.differenceFromDatesInSeconds(submitted, modified) :
      Utils.differenceFromNowInSeconds(submitted)
  }

  useOnMount(() => {
    const loadRunSetsData = async () => {
      try {
        const runSets = await Ajax(signal).Cbas.runSets.get()
        setRunSetData(_.map(r => _.merge(r, { duration: runSetDuration(r) }), runSets.run_sets))
      } catch (error) {
        notify('error', 'Error loading previous run sets', { detail: await (error instanceof Response ? error.text() : error) })
      }
    }

    loadRunSetsData()
  })

  const stateCell = ({ state, error_count: errorCount }) => {
    const stateContent = {
      UNKNOWN: 'Unknown',
      RUNNING: 'Running',
      COMPLETE: 'Success',
      ERROR: h(
        Link,
        { onClick: () => window.alert('TODO: API call to retrieve error messages for this Run Set') },
        [`Failed with ${errorCount} errors`])
    }

    const stateIconKey = {
      UNKNOWN: 'unknown',
      RUNNING: 'running',
      COMPLETE: 'succeeded',
      ERROR: 'failed'
    }

    return div([
      makeStatusLine(statusType[stateIconKey[state]].icon, stateContent[state])
    ])
  }

  const sortedPreviousRunSets = _.orderBy(sort.field, sort.direction, runSetsData)
  const firstPageIndex = (pageNumber - 1) * itemsPerPage
  const lastPageIndex = firstPageIndex + itemsPerPage
  const paginatedPreviousRunSets = sortedPreviousRunSets.slice(firstPageIndex, lastPageIndex)

  const rowHeight = 250

  return h(Fragment, [
    Navbar(),
    div({ style: { margin: '4em' } }, [
      div({ style: { display: 'flex', marginTop: '1rem', justifyContent: 'space-between' } }, [
        h2(['Submission History']),
        h(ButtonOutline, {
          onClick: () => Nav.goToPath('root')
        }, ['Submit another workflow'])
      ]),
      div(
        {
          style: {
            marginTop: '1em',
            height: tableHeight({ actualRows: paginatedPreviousRunSets.length, maxRows: 12.5, heightPerRow: rowHeight }),
            minHeight: '10em'
          }
        },
        [
          h(AutoSizer, [
            ({ width, height }) => h(FlexTable, {
              'aria-label': 'previous runs',
              width, height, sort,
              rowCount: paginatedPreviousRunSets.length,
              noContentMessage: 'Nothing here yet! Your previously run workflows will be displayed here.',
              hoverHighlight: true,
              rowHeight,
              styleCell: () => ({
                display: 'inline',
                alignItems: 'top',
                paddingLeft: '1rem',
                paddingRight: '1rem',
                paddingTop: '1em'
              }),
              columns: [
                {
                  size: { basis: 100, grow: 0 },
                  field: 'actions',
                  headerRenderer: () => h(Sortable, { sort, field: 'actions', onSort: setSort }, ['Actions']),
                  cellRenderer: () => {
                    return div(
                      { style: { textAlign: 'center' } },
                      [icon('cardMenuIcon', { size: 24, onClick: () => { window.alert('TODO: go to actions menu') } })]
                    )
                  }
                },
                {
                  size: { basis: 350 },
                  field: 'runset_name',
                  headerRenderer: () => h(Sortable, { sort, field: 'runset_name', onSort: setSort }, ['Submission name']),
                  cellRenderer: ({ rowIndex }) => {
                    return div([
                      h(
                        Link,
                        { onClick: () => { Nav.goToPath('submission-details', { submissionId: paginatedPreviousRunSets[rowIndex].run_set_id }) }, style: { fontWeight: 'bold' } },
                        [paginatedPreviousRunSets[rowIndex].run_set_name || 'No name']
                      ),
                      h(
                        TextCell,
                        { style: { display: 'block', marginTop: '1em', whiteSpace: 'normal' } },
                        [`Data used: ${paginatedPreviousRunSets[rowIndex].record_type}`]
                      ),
                      h(
                        TextCell,
                        { style: { display: 'block', marginTop: '1em', whiteSpace: 'normal' } },
                        [`${paginatedPreviousRunSets[rowIndex].run_count} workflows`]
                      )
                    ])
                  }
                },
                {
                  size: { basis: 200, grow: 0 },
                  field: 'state',
                  headerRenderer: () => h(Sortable, { sort, field: 'state', onSort: setSort }, ['Status']),
                  cellRenderer: ({ rowIndex }) => {
                    return stateCell(paginatedPreviousRunSets[rowIndex])
                  }
                },
                {
                  size: { basis: 200, grow: 0 },
                  field: 'submission_timestamp',
                  headerRenderer: () => h(Sortable, { sort, field: 'submission_timestamp', onSort: setSort }, ['Date Submitted']),
                  cellRenderer: ({ rowIndex }) => {
                    return h(TextCell, { style: { whiteSpace: 'normal' } }, [Utils.makeCompleteDate(paginatedPreviousRunSets[rowIndex].submission_timestamp)])
                  }
                },
                {
                  size: { basis: 175, grow: 0 },
                  field: 'duration',
                  headerRenderer: () => h(Sortable, { sort, field: 'duration', onSort: setSort }, ['Duration']),
                  cellRenderer: ({ rowIndex }) => {
                    return h(TextCell, [Utils.customFormatDuration(runSetDuration(paginatedPreviousRunSets[rowIndex]))])
                  }
                },
                {
                  size: { basis: 600, grow: 0 },
                  field: 'comment',
                  headerRenderer: () => h(Sortable, { sort, field: 'comment', onSort: setSort }, ['Comment']),
                  cellRenderer: ({ rowIndex }) => {
                    return div({ style: { width: '100%', textAlign: 'left' } }, [
                      h(TextCell, { style: { whiteSpace: 'normal' } }, [paginatedPreviousRunSets[rowIndex].run_set_description || 'No Description']),
                      h(Link, { style: { display: 'block', marginTop: '1em', textDecoration: 'underline' }, onClick: () => window.alert('Comment editing disabled') }, ['Edit'])
                    ])
                  }
                }
              ]
            })
          ])
        ]),
      !_.isEmpty(sortedPreviousRunSets) && div({ style: { bottom: 0, position: 'absolute', marginBottom: '1.5rem', right: '4rem' } }, [
        paginator({
          filteredDataLength: sortedPreviousRunSets.length,
          unfilteredDataLength: sortedPreviousRunSets.length,
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
    name: 'submission-history',
    path: '/submission-history',
    component: SubmissionHistory,
    public: true
  }
]
