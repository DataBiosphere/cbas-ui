import _ from 'lodash/fp'
import { Fragment, useState } from 'react'
import { div, h, h1, h2, h3 } from 'react-hyperscript-helpers'
import ReactJson from 'react-json-view'
import { AutoSizer } from 'react-virtualized'
import { ButtonOutline, ButtonPrimary, headerBar, Link, Select } from 'src/components/common'
import { icon } from 'src/components/icons'
import Modal from 'src/components/Modal'
import { FlexTable, paginator, Sortable, tableHeight, TextCell } from 'src/components/table'
import { Ajax } from 'src/libs/ajax'
import colors from 'src/libs/colors'
import * as Nav from 'src/libs/nav'
import { notify } from 'src/libs/notifications'
import { useCancellation, useOnMount } from 'src/libs/react-utils'
import * as Utils from 'src/libs/utils'


export const SubmissionDetails = ({ submissionId }) => {
  // State
  const [sort, setSort] = useState({ field: 'submission_date', direction: 'desc' })
  const [pageNumber, setPageNumber] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(50)
  const [viewInputsId, setViewInputsId] = useState()
  const [viewOutputsId, setViewOutputsId] = useState()
  const [viewErrorsId, setViewErrorsId] = useState()
  const [runsData, setRunsData] = useState()
  const [runSetData, setRunSetData] = useState()
  const [submissionTimestamp, setSubmissionTimestamp] = useState()

  const signal = useCancellation()

  useOnMount(() => {
    const loadRunsData = async () => {
      try {
        const runs = await Ajax(signal).Cbas.runs.get(submissionId)
        setRunsData(runs.runs)
      } catch (error) {
        notify('error', 'Error loading previous runs', { detail: await (error instanceof Response ? error.text() : error) })
      }
    }

    const loadSubmissionData = async () => {
      try {
        const runSetData = await Ajax(signal).Cbas.runSets.get()
        setRunSetData(runSetData.run_sets)
        setSubmissionTimestamp(JSON.parse(runSetData.submission_timestamp))
      } catch (error) {
        notify('error', 'Error loading run set data', { detail: await (error instanceof Response ? error.text() : error) })
      }
    }

    loadRunsData()
    loadSubmissionData()
  })

  console.log(submissionTimestamp)

  const sortedPreviousRuns = _.orderBy(sort.field, sort.direction, runsData)
  const specifyRunSet = _.filter(r => r.run_set_id === submissionId, runSetData)

  const firstPageIndex = (pageNumber - 1) * itemsPerPage
  const lastPageIndex = firstPageIndex + itemsPerPage
  const paginatedPreviousRuns = sortedPreviousRuns.slice(firstPageIndex, lastPageIndex)

  const rowWidth = 100
  const rowHeight = 50
  return h(Fragment, [
    div({
      style: {
        borderBottom: '2px solid rgb(116, 174, 67)',
        boxShadow: 'rgb(0 0 0 / 26%) 0px 2px 5px 0px, rgb(0 0 0 / 16%) 0px 2px 10px 0px',
        position: 'relative'
      }
    }, [
      headerBar(),
      div({ style: { marginLeft: '4em', display: 'flex', marginTop: '0.5rem', justifyContent: 'space-between' } }, [
        h1(['Submission Details']),
        h(ButtonOutline, {
          style: { margin: '2em' },
          onClick: () => Nav.goToPath('root')
        }, ['Submit a new workflow'])
      ]),
      div({ style: { marginLeft: '4em' } }, [
        h(TextCell, [(h(Link, { onClick: () => Nav.goToPath('submission-history') }, ['Submission History'])), ' >', ` Submission ${submissionId}`]),
        h2(['workflow_name(HARDCODED)']),
        h3([`Submission date: `]),
        h3(['Duration: ']),
        h3(['Submitted by: '])
      ])
    ]),
    div({
      style: {
        backgroundColor: 'rgb(235, 236, 238)',
        display: 'flex',
        flex: '1 1 auto',
        flexDirection: 'column',
        padding: '1rem 3rem'
      }
    }, [
      div({
        style: {
          marginTop: '1em', height: tableHeight({ actualRows: paginatedPreviousRuns.length, maxRows: 12.5, heightPerRow: 250 }), minHeight: '10em'
        }
      }, [
        div([h2(['Workflows'])]),
        div([h3(['Filter by: '])]),
        h(Select, {
          isDisabled: false,
          'aria-label': 'Select a data table',
          isClearable: false,
          value: null,
          placeholder: 'None selected',
          styles: { container: old => ({ ...old, display: 'inline-block', width: 200, marginBottom: '1.5rem' }) }
        }),
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
                headerRenderer: () => h(Sortable, { sort, field: 'record_id', onSort: setSort }, ['Workflow name']),
                cellRenderer: ({ rowIndex }) => {
                  return h(TextCell, [paginatedPreviousRuns[rowIndex].record_id])
                }
              },
              {
                size: { basis: 600, grow: 0 },
                field: 'state',
                headerRenderer: () => h(Sortable, { sort, field: 'state', onSort: setSort }, ['Status']),
                cellRenderer: ({ rowIndex }) => {
                  const failureStates = ['SYSTEM_ERROR', 'EXECUTOR_ERROR']
                  if (failureStates.includes(paginatedPreviousRuns[rowIndex].state)) {
                    return div({ style: { width: '100%', textAlign: 'center' } }, [
                      h(Link, { style: { fontWeight: 'bold' }, onClick: () => setViewErrorsId(rowIndex) }, [[icon('warning-standard', { size: 18, color: 'red' })], ['      Error(s)']])
                    ])
                  } else if (paginatedPreviousRuns[rowIndex].state === 'COMPLETE') {
                    return div({ style: { width: '100%', textAlign: 'center' } }, [
                      div({ style: { fontWeight: 'bold' } }, [h(TextCell, {}, [icon('check', { size: 18, style: { color: colors.success() } }), ['   Succeeded']])])
                    ])
                  }
                }
              },
              {
                size: { basis: 600, grow: 0 },
                field: 'duration',
                headerRenderer: () => h(Sortable, { sort, field: 'duration', onSort: setSort }, ['Duration']),
                cellRenderer: ({ rowIndex }) => {
                  const terminalStates = ['COMPLETE', 'CANCELED', 'SYSTEM_ERROR', 'ABORTED', 'EXECUTOR_ERROR']
                  let durationSeconds
                  if (terminalStates.includes(paginatedPreviousRuns[rowIndex].state)) {
                    durationSeconds = Utils.differenceFromDatesInSeconds(
                      paginatedPreviousRuns[rowIndex].submission_date,
                      paginatedPreviousRuns[rowIndex].last_modified_timestamp
                    )
                  } else {
                    durationSeconds = Utils.differenceFromNowInSeconds(paginatedPreviousRuns[rowIndex].submission_date)
                  }
                  return h(TextCell, [Utils.customFormatDuration(durationSeconds)])
                }
              },
              {
                size: { basis: 550, grow: 0 },
                field: 'run_id',
                headerRenderer: () => 'Run ID',
                cellRenderer: ({ rowIndex }) => {
                  return div({ style: { width: '100%', textAlign: 'left' } } [
                    h(Link, { style: { display: 'inline-block', textDecoration: 'underline' }, onClick: () => setViewInputsId(rowIndex) }, [paginatedPreviousRuns[rowIndex].run_id])
                  ])
                }
              }
            ],
            styleCell: ({ rowIndex }) => {
              return rowIndex % 2 && { backgroundColor: colors.light(0.2) }
            }
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
        title: 'TODO',
        width: 600,
        onDismiss: () => setViewInputsId(undefined),
        showCancel: false,
        okButton:
          h(ButtonPrimary, {
            disabled: false,
            onClick: () => setViewInputsId(undefined)
          }, ['OK'])
      }, [
        h(TextCell, {
          style: { whiteSpace: 'pre-wrap', wordBreak: 'break-word' },
          name: false,
          collapsed: 4,
          enableClipboard: true,
          displayDataTypes: false,
          displayObjectSize: false,
          src: 'Link to workflow details!'//_.isEmpty(paginatedPreviousRuns[viewInputsId].workflow_params) ? {} : JSON.parse(paginatedPreviousRuns[viewInputsId].workflow_params)
        }, ['Link to workflow details!'])
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
          src: _.isEmpty(paginatedPreviousRuns[viewOutputsId].workflow_outputs) ?
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
