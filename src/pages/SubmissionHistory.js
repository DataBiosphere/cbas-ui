import _ from 'lodash/fp'
import { Fragment, useState } from 'react'
import { div, h, h2 } from 'react-hyperscript-helpers'
import ReactJson from 'react-json-view'
import { AutoSizer } from 'react-virtualized'
import { ButtonOutline, ButtonPrimary, headerBar, Link } from 'src/components/common'
import Modal from 'src/components/Modal'
import { FlexTable, paginator, Sortable, tableHeight, TextCell, styles } from 'src/components/table'
import { Ajax } from 'src/libs/ajax'
import * as Nav from 'src/libs/nav'
import { notify } from 'src/libs/notifications'
import { useCancellation, useOnMount } from 'src/libs/react-utils'
import * as Utils from 'src/libs/utils'

export const SubmissionHistory = () => {
  // State
  const [sort, setSort] = useState({ field: 'submission_date', direction: 'desc' })
  const [pageNumber, setPageNumber] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(50)
  const [viewInputsId, setViewInputsId] = useState()
  const [runSetsData, setRunSetData] = useState()

  const signal = useCancellation()

  useOnMount(() => {
    const loadRunSetsData = async () => {
      try {
        const runSets = await Ajax(signal).Cbas.runSets.get()
        setRunSetData(runSets.run_sets)
      } catch (error) {
        notify('error', 'Error loading previous run sets', { detail: await (error instanceof Response ? error.text() : error) })
      }
    }

    loadRunSetsData()
  })

  const stateCell = ( { state, error_count } ) => {
    return {
      SET_UNKNOWN: h(TextCell, ["Unknown"]),
      SET_RUNNING: h(TextCell, ["Running"]),
      SET_COMPLETE: h(TextCell, ["Success"]),
      SET_ERROR: h(
        Link, 
        { onClick: () => window.alert('TODO: API call to retrieve error messages for this Run Set') }, 
        [`Failed with ${error_count} errors`]),
    }[state]
  } 

  const sortedPreviousRunSets = _.orderBy(sort.field, sort.direction, runSetsData)

  const firstPageIndex = (pageNumber - 1) * itemsPerPage
  const lastPageIndex = firstPageIndex + itemsPerPage
  const paginatedPreviousRunSets = sortedPreviousRunSets.slice(firstPageIndex, lastPageIndex)

  const rowHeight = 250

  return h(Fragment, [
    headerBar(),
    div({ style: { margin: '4em' } }, [
      div({ style: { display: 'flex', marginTop: '1rem', justifyContent: 'space-between' } }, [
        h2(['Submission History']),
        h(ButtonOutline, {
          onClick: () => Nav.goToPath('root')
        }, ['Submit another workflow'])
      ]),
      div(['Remember to turn off your Cromwell App in Terra once you are done to prevent incurring costs.']),
      div(
        { 
          style: { 
            marginTop: '1em', 
            height: tableHeight({ actualRows: paginatedPreviousRunSets.length, maxRows: 12.5, heightPerRow: rowHeight }), 
            minHeight: '10em',
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
            rowHeight: rowHeight,
            styleCell: () => ({
              display: 'flex',
              alignItems: 'top',
              paddingLeft: '1rem',
              paddingRight: '1rem',
              paddingTop: '1em'
            }),
            columns: [
              {
                size: { basis: 350 },
                field: 'run_id',
                headerRenderer: () => h(Sortable, { sort, field: 'run_id', onSort: setSort }, ['Workflow Name']),
                cellRenderer: ({ rowIndex }) => {
                  // return h(TextCell, [paginatedPreviousRunSets[rowIndex].run_set_id])
                  return div([
                    h(
                      Link, 
                      {onClick: () => {window.alert("this will go to the Submission Details page")}, style: {fontWeight: 'bold'} }, 
                      ["pathogenic-genomic-surveillance/fastq_to_ubam [HARDCODED]"]
                    ),
                    h(TextCell, { style: {display: 'block', marginTop: '1em', whiteSpace: 'normal'} }, ["Data used: covid 19 sample [HARDCODED]"]),
                    h(TextCell, { style: {display: 'block', marginTop: '1em', whiteSpace: 'normal'} }, ["68 Workflows [HARDCODED]"])
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
                field: 'submission_date',
                headerRenderer: () => h(Sortable, { sort, field: 'submission_date', onSort: setSort }, ['Submission Date']),
                cellRenderer: ({ rowIndex }) => {
                  return h(TextCell, {style: { whiteSpace: 'normal' }},[Utils.makeCompleteDate(paginatedPreviousRunSets[rowIndex].submission_timestamp)])
                }
              },
              {
                size: { basis: 175, grow: 0 },
                field: 'duration',
                headerRenderer: () => h(Sortable, { sort, field: 'duration', onSort: setSort }, ['Duration']),
                cellRenderer: ({ rowIndex }) => {
                  let terminalStates = ["SET_ERROR"]
                  let durationSeconds
                  if (terminalStates.includes(paginatedPreviousRunSets[rowIndex].state)) {
                    durationSeconds = Utils.differenceFromDatesInSeconds(
                      paginatedPreviousRunSets[rowIndex].submission_timestamp,
                      paginatedPreviousRunSets[rowIndex].last_modified_timestamp,
                    )
                  } else {
                    durationSeconds = Utils.differenceFromNowInSeconds(paginatedPreviousRunSets[rowIndex].submission_timestamp)
                  }
                  return h(TextCell, [Utils.customFormatDuration(durationSeconds)])
                }
              },
              {
                size: { basis: 600, grow: 0 },
                field: 'comment',
                headerRenderer: () => h(Sortable, { sort, field: 'comment', onSort: setSort }, ['Comment']),
                cellRenderer: ({ rowIndex }) => {
                  return div({ style: { width: '100%', textAlign: 'left' } }, [
                    h(TextCell, {style: { whiteSpace: 'normal' }}, ["Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum."]),
                    h(Link, { style: {display: 'block', marginTop: '1em', textDecoration: 'underline'}, onClick: () => window.alert('Comment editing disabled') }, ['Edit']),
                  ])
                }
              },
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
      ]),
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
