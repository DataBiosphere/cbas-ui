import { isEmpty, orderBy } from 'lodash/fp'
import { useMemo, useState } from 'react'
import { div, h } from 'react-hyperscript-helpers'
import ReactJson from 'react-json-view'
import { AutoSizer } from 'react-virtualized'
import { ButtonPrimary, Link, Navbar } from 'src/components/common'
import { icon } from 'src/components/icons'
import { HeaderSection } from 'src/components/job-common'
import Modal from 'src/components/Modal'
import { FlexTable, paginator, Sortable, tableHeight, TextCell } from 'src/components/table'
import { Ajax } from 'src/libs/ajax'
import { goToPath } from 'src/libs/nav'
import { notify } from 'src/libs/notifications'
import { useCancellation, useOnMount } from 'src/libs/react-utils'
import { customFormatDuration, differenceFromDatesInSeconds, differenceFromNowInSeconds, makeCompleteDate } from 'src/libs/utils'


export const SubmissionDetails = ({ submissionId }) => {
  // State
  const [sort, setSort] = useState({ field: 'submission_date', direction: 'desc' })
  const [pageNumber, setPageNumber] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(50)
  const [viewInputsId, setViewInputsId] = useState()
  const [viewOutputsId, setViewOutputsId] = useState()
  const [viewErrorsId, setViewErrorsId] = useState()
  const [runsData, setRunsData] = useState()

  const signal = useCancellation()

  useOnMount(() => {
    const loadRunsData = async () => {
      try {
        const runs = await Ajax(signal).Cbas.runs.get(submissionId)
        setRunsData(runs?.runs)
      } catch (error) {
        notify('error', 'Error loading previous runs', { detail: await (error instanceof Response ? error.text() : error) })
      }
    }

    loadRunsData()
  })

  const sortedPreviousRuns = orderBy(sort.field, sort.direction, runsData)

  const firstPageIndex = (pageNumber - 1) * itemsPerPage
  const lastPageIndex = firstPageIndex + itemsPerPage
  const paginatedPreviousRuns = sortedPreviousRuns.slice(firstPageIndex, lastPageIndex)

  const header = useMemo(() => {
    const breadcrumbPathObjects = [
      {
        label: 'Submission History',
        path: 'submission-history'
      },
      {
        label: `Submission ${submissionId}`
      }
    ]

    return h(HeaderSection, { breadcrumbPathObjects, title: 'Submission Details' })
  }, [submissionId])

  const rowWidth = 100
  const rowHeight = 200
  return div({ id: 'submission-details-page' }, [
    Navbar('SUBMIT WORKFLOWS WITH CROMWELL'),
    div({ style: { padding: '1rem 2rem 2rem' } }, [
      header,
      div({
        style: {
          marginTop: '1em', height: tableHeight({ actualRows: paginatedPreviousRuns.length, maxRows: 12.5, heightPerRow: 250 }), minHeight: '10em'
        }
      }, [
        h(AutoSizer, [
          ({ width, height }) => h(FlexTable, {
            'aria-label': 'previous runs',
            width, height, sort,
            rowCount: paginatedPreviousRuns.length,
            noContentMessage: 'Nothing here yet! Your previously run workflows will be displayed here.',
            hoverHighlight: true,
            rowHeight,
            rowWidth,
            columns: [
              {
                size: { basis: 350 },
                field: 'record_id',
                headerRenderer: () => h(Sortable, { sort, field: 'record_id', onSort: setSort }, ['Record Entry']),
                cellRenderer: ({ rowIndex }) => {
                  return h(TextCell, [paginatedPreviousRuns[rowIndex].record_id])
                }
              },
              {
                size: { basis: 350 },
                field: 'engine_id',
                headerRenderer: () => h(Sortable, { sort, field: 'engine_id', onSort: setSort }, ['Engine Details']),
                cellRenderer: ({ rowIndex }) => {
                  // link to workflow-dashboard / :workflowId
                  return h(
                    Link,
                    { onClick: () => { goToPath('workflow-dashboard', { workflowId: paginatedPreviousRuns[rowIndex].engine_id }) }, style: { fontWeight: 'bold' } },
                    ['Workflow Dashboard']
                  )
                }
              },
              {
                size: { basis: 220, grow: 0 },
                field: 'state',
                headerRenderer: () => h(Sortable, { sort, field: 'state', onSort: setSort }, ['Status']),
                cellRenderer: ({ rowIndex }) => {
                  const failureStates = ['SYSTEM_ERROR', 'EXECUTOR_ERROR']
                  if (failureStates.includes(paginatedPreviousRuns[rowIndex].state)) {
                    return div({ style: { width: '100%', textAlign: 'center' } }, [
                      div({ style: { marginBottom: '1rem', fontWeight: 'bold' } }, [h(TextCell, {}, [icon('warning-standard', { size: 18, color: 'red' }), ['   Failed with error']])]),
                      h(Link, { style: {}, onClick: () => setViewErrorsId(rowIndex) }, ['View'])
                    ])
                  } else { return h(TextCell, [paginatedPreviousRuns[rowIndex].state]) }
                }
              },
              {
                size: { basis: 300, grow: 0 },
                field: 'submission_date',
                headerRenderer: () => h(Sortable, { sort, field: 'submission_date', onSort: setSort }, ['Submission date']),
                cellRenderer: ({ rowIndex }) => {
                  return h(TextCell, [makeCompleteDate(paginatedPreviousRuns[rowIndex].submission_date)])
                }
              },
              {
                size: { basis: 300, grow: 0 },
                field: 'duration',
                headerRenderer: () => h(Sortable, { sort, field: 'duration', onSort: setSort }, ['Duration']),
                cellRenderer: ({ rowIndex }) => {
                  const terminalStates = ['COMPLETE', 'CANCELED', 'SYSTEM_ERROR', 'ABORTED', 'EXECUTOR_ERROR']
                  let durationSeconds
                  if (terminalStates.includes(paginatedPreviousRuns[rowIndex].state)) {
                    durationSeconds = differenceFromDatesInSeconds(
                      paginatedPreviousRuns[rowIndex].submission_date,
                      paginatedPreviousRuns[rowIndex].last_modified_timestamp
                    )
                  } else {
                    durationSeconds = differenceFromNowInSeconds(paginatedPreviousRuns[rowIndex].submission_date)
                  }
                  return h(TextCell, [customFormatDuration(durationSeconds)])
                }
              },
              {
                size: { basis: 155, grow: 0 },
                field: 'workflow_params',
                headerRenderer: () => 'Data',
                cellRenderer: ({ rowIndex }) => {
                  return div({ style: { width: '100%', textAlign: 'left' } }, [
                    h(Link, { style: { display: 'inline-block', marginBottom: '1rem', textDecoration: 'underline' }, onClick: () => setViewInputsId(rowIndex) }, ['View inputs']),
                    h(Link, { style: { display: 'inline-block', marginTop: '1rem', textDecoration: 'underline' }, onClick: () => setViewOutputsId(rowIndex) }, ['View outputs'])
                  ])
                }
              },
              {
                size: { basis: 250, grow: 0 },
                field: 'logs',
                headerRenderer: () => 'Logs',
                cellRenderer: ({ rowIndex }) => {
                  return div({ style: { width: '100%', textAlign: 'center' } }, [
                    h(Link, { disabled: true, onClick: () => setViewInputsId(rowIndex) }, ['View workflow log file'])
                  ])
                }
              }
            ]
          })
        ])
      ]),
      !isEmpty(sortedPreviousRuns) && div({ style: { bottom: 0, position: 'absolute', marginBottom: '1.5rem', right: '4rem' } }, [
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
          src: isEmpty(paginatedPreviousRuns[viewInputsId].workflow_params) ? {} : JSON.parse(paginatedPreviousRuns[viewInputsId].workflow_params)
        })
      ]),
      (viewOutputsId !== undefined) && h(Modal, {
        title: 'Outputs Definition JSON',
        width: 600,
        onDismiss: () => setViewOutputsId(undefined),
        showCancel: false,
        okButton:
          h(ButtonPrimary, {
            disabled: false,
            onClick: () => setViewOutputsId(undefined)
          }, ['OK'])
      }, [
        h(ReactJson, {
          style: { whiteSpace: 'pre-wrap', wordBreak: 'break-word' },
          name: false,
          collapsed: 4,
          enableClipboard: true,
          displayDataTypes: false,
          displayObjectSize: false,
          src: isEmpty(paginatedPreviousRuns[viewOutputsId].workflow_outputs) ?
            {} :
            JSON.parse(paginatedPreviousRuns[viewOutputsId].workflow_outputs)
        })
      ]),
      (viewErrorsId !== undefined) && h(Modal, {
        title: 'Error Messages',
        width: 600,
        onDismiss: () => setViewErrorsId(undefined),
        showCancel: false,
        okButton:
          h(ButtonPrimary, {
            disabled: false,
            onClick: () => setViewErrorsId(undefined)
          }, ['OK'])
      }, [
        h(TextCell, {
          style: { textAlign: 'center', whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: '3rem', marginBottom: '1rem' }
        }, [paginatedPreviousRuns[viewErrorsId].error_messages])
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
