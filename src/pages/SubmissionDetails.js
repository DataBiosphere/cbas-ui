import _ from 'lodash/fp'
import { Fragment, useState } from 'react'
import { div, h, h2 } from 'react-hyperscript-helpers'
import ReactJson from 'react-json-view'
import { AutoSizer } from 'react-virtualized'
import { ButtonOutline, ButtonPrimary, headerBar, Link } from 'src/components/common'
import Modal from 'src/components/Modal'
import { FlexTable, paginator, Sortable, tableHeight, TextCell } from 'src/components/table'
import { Ajax } from 'src/libs/ajax'
import * as Nav from 'src/libs/nav'
import { notify } from 'src/libs/notifications'
import { useCancellation, useOnMount } from 'src/libs/react-utils'
import * as Utils from 'src/libs/utils'


export const SubmissionDetails = ({submissionId}) => {
  // State
  console.log("submissionId = " + submissionId)
  const [sort, setSort] = useState({ field: 'submission_date', direction: 'desc' })
  const [pageNumber, setPageNumber] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(50)
  const [viewInputsId, setViewInputsId] = useState()
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
      div({ style: { display: 'flex', marginTop: '0.5rem', justifyContent: 'space-between' } }, [
        h(Link, { onClick: () => Nav.goToPath('submission-history') }, ['Submission History']),
        h(TextCell, ['> Submission ' + submissionId]),
        h(ButtonOutline, {
          onClick: () => Nav.goToPath('root')
        }, ['Submit a new workflow'])
      ]),
      div(['Breadcrumb placeholder.']),
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
                size: { basis: 350 },
                field: 'run_id',
                headerRenderer: () => h(Sortable, { sort, field: 'run_id', onSort: setSort }, ['Run ID']),
                cellRenderer: ({ rowIndex }) => {
                  return h(TextCell, [paginatedPreviousRuns[rowIndex].run_id])
                }
              },
              {
                size: { basis: 200, grow: 0 },
                field: 'state',
                headerRenderer: () => h(Sortable, { sort, field: 'state', onSort: setSort }, ['Status']),
                cellRenderer: ({ rowIndex }) => {
                  return h(TextCell, [paginatedPreviousRuns[rowIndex].state])
                }
              },
              {
                size: { basis: 300, grow: 0 },
                field: 'submission_date',
                headerRenderer: () => h(Sortable, { sort, field: 'submission_date', onSort: setSort }, ['Submitted']),
                cellRenderer: ({ rowIndex }) => {
                  return h(TextCell, [Utils.makeCompleteDate(paginatedPreviousRuns[rowIndex].submission_date)])
                }
              },
              {
                size: { basis: 300, grow: 0 },
                field: 'duration',
                headerRenderer: () => h(Sortable, { sort, field: 'duration', onSort: setSort }, ['Duration']),
                cellRenderer: ({ rowIndex }) => {
                  let terminalStates = ["COMPLETE", "CANCELED", "SYSTEM_ERROR", "ABORTED", "EXECUTOR_ERROR"]
                  let durationSeconds
                  if (terminalStates.includes(paginatedPreviousRuns[rowIndex].state)) {
                    durationSeconds = Utils.differenceFromDatesInSeconds(
                      paginatedPreviousRuns[rowIndex].submission_date,
                      paginatedPreviousRuns[rowIndex].last_modified_timestamp,
                    )
                  } else {
                    durationSeconds = Utils.differenceFromNowInSeconds(paginatedPreviousRuns[rowIndex].submission_date)
                  }
                  return h(TextCell, [Utils.customFormatDuration(durationSeconds)])
                }
              },
              {
                size: { basis: 150, grow: 0 },
                field: 'workflow_params',
                headerRenderer: () => 'Inputs',
                cellRenderer: ({ rowIndex }) => {
                  return div({ style: { width: '100%', textAlign: 'center' } }, [
                    h(Link, { onClick: () => setViewInputsId(rowIndex) }, ['View'])
                  ])
                }
              },
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
      ]),
      (viewInputsId !== undefined) && h(Modal, {
        title: 'Inputs Definition JSON',
        width: 600,
        onDismiss: () => setViewInputsId(undefined),
        showCancel: false,
        okButton:
          h(ButtonPrimary, {
            disabled: false,
            onClick: () => setViewInputsId(undefined)
          }, ['OK'])
      }, [
        h(ReactJson, {
          style: { whiteSpace: 'pre-wrap', wordBreak: 'break-word' },
          name: false,
          collapsed: 4,
          enableClipboard: true,
          displayDataTypes: false,
          displayObjectSize: false,
          src: _.isEmpty(paginatedPreviousRuns[viewInputsId].workflow_params) ? {} : JSON.parse(paginatedPreviousRuns[viewInputsId].workflow_params)
        })
      ])
    ])
  ])
}

export const navPaths = [
  {
    name: 'submission-details',
    path: '/submission-history/:submissionId',
    component: SubmissionDetails,
    public: true
  }
]
