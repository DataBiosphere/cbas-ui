
import { cloneDeep, countBy, every, filter, flattenDepth, flow, includes, isEmpty, keys, map, min, sortBy, startCase, values } from 'lodash/fp'
import { Fragment, useMemo, useRef, useState } from 'react'
import { div, h, span } from 'react-hyperscript-helpers'
import ReactJson from 'react-json-view'
import Collapse from 'src/components/Collapse'
import { ClipboardButton, Link, Navbar } from 'src/components/common'
import { centeredSpinner, icon } from 'src/components/icons'
import {
  collapseCromwellStatus, collapseStatus,
  HeaderSection,
  makeSection, makeStatusLine, statusType,
  SubmitNewWorkflowButton
} from 'src/components/job-common'
//  Q4-2022 Disable log-viewing
//import UriViewer from 'src/components/UriViewer'
import WDLViewer from 'src/components/WDLViewer'
import { Ajax } from 'src/libs/ajax'
import { useCancellation, useOnMount } from 'src/libs/react-utils'
import { codeFont, elements } from 'src/libs/style'
import { cond, makeCompleteDate, newTabLinkProps } from 'src/libs/utils'
import CallTable from 'src/pages/workspaces/workspace/jobHistory/CallTable'


const commonStatuses = ['submitted', 'waitingForQuota', 'running', 'succeeded', 'failed']

const styles = {
  sectionTableLabel: { fontWeight: 600 }
}

// Note: this can take a while with large data inputs. Consider memoization if the page ever needs re-rendering.
const groupCallStatuses = flow(
  values,
  flattenDepth(1),
  countBy(a => {
    const collapsedStatus = collapseCromwellStatus(a.executionStatus, a.backendStatus)
    return collapsedStatus !== statusType.unknown ? collapsedStatus.id : collapsedStatus.label(a.executionStatus)
  })
)

const statusCell = ({ calls }) => {
  const statusGroups = groupCallStatuses(calls)
  const makeRow = (count, status, labelOverride) => {
    const seeMore = !!status.moreInfoLink ? h(Link, { href: status.moreInfoLink, style: { marginLeft: '0.50rem' }, ...newTabLinkProps },
      [status.moreInfoLabel, icon('pop-out', { size: 12, style: { marginLeft: '0.25rem' } })]) : ''
    return !!count && div({ style: { display: 'flex', alignItems: 'center', marginTop: '0.25rem' } }, [
      status.icon(),
      ` ${count} ${!!labelOverride ? labelOverride : status.label()}`,
      seeMore
    ])
  }
  const status = commonStatuses.filter(
    s => statusGroups[s]).map(s => makeRow(statusGroups[s], statusType[s]))
  return h(Fragment, status)
}

// Filter function that only displays rows based on task name search parameters
// NOTE: the viewable call should have the task name stored on the call instance itself, should be done via pre-processing step
export const taskNameFilterFn = searchTerm => filter(call => call?.taskName?.includes(searchTerm))
export const statusFilterFn = status => filter(call => call.uiStatusLabel.toLocaleLowerCase() === status.toLocaleLowerCase())

//Helper function to generate base table data for unfiltered view
//Filter functions/selections should act on this data, not the workflow source data
//Flag the latest attempt as latest for table row updates
export const generateCallTableData = tasks => {
  const clonedTasks = cloneDeep(tasks)
  const taskNames = Object.keys(clonedTasks)
  return taskNames.flatMap(taskName => {
    const attempts = clonedTasks[taskName]
    const maxAttempt = attempts.length
    const calls = attempts.map(call => {
      call.taskName = taskName
      //Nullish coalescing operator to set latest to true if attempt value is the max attempt
      call.latest ??= call.attempt === maxAttempt
      //assigning status styling object for use in call table
      const cromwellStatusObj = collapseCromwellStatus(call.executionStatus, call.backendStatus)
      call.statusObj = cromwellStatusObj
      return call
    })
    //localeCompare returns a negative, positive, or 0 when comparing strings
    //so the line before is a shorthand for sorting by taskName, then by attempt
    return calls.sort((a, b) => a.taskName.localeCompare(b.taskName) || b.attempt - a.attempt)
  })
}

export const RunDetails = ({ submissionId, workflowId }) => {
  /*
   * State setup
   */
  const [workflow, setWorkflow] = useState()
  const [tableData, setTableData] = useState([])
  //Q4-2022 Disable log-viewing
  //const [showLog, setShowLog] = useState(false)

  const signal = useCancellation()
  const stateRefreshTimer = useRef()

  /*
   * Data fetchers
   */

  useOnMount(() => {
    const loadWorkflow = async () => {
      const includeKey = [
        'end', 'executionStatus', 'failures', 'start', 'status', 'submittedFiles:workflow', 'workflowLog', 'workflowRoot',
        'backendStatus'
      ]
      const excludeKey = []

      //NOTE: commenting this out for now, setting metadata to mock workflow for local development purposes. Re-enable when submitting PR
      const metadata = await Ajax(signal).Cromwell.workflows(workflowId).metadata({ includeKey, excludeKey })
      setWorkflow(metadata)
      if (!isEmpty(metadata?.calls)) {
        const formattedTableData = generateCallTableData(metadata.calls)
        setTableData(formattedTableData)
        if (includes(collapseStatus(metadata.status), [statusType.running, statusType.submitted])) {
          stateRefreshTimer.current = setTimeout(loadWorkflow, 60000)
        }
      }
    }

    loadWorkflow()
    return () => {
      clearTimeout(stateRefreshTimer.current)
    }
  })

  const header = useMemo(() => {
    const breadcrumbPathObjects = [
      {
        label: 'Submission History',
        path: 'submission-history'
      },
      {
        label: `Submission ${submissionId}`,
        path: `submission-details`,
        params: { submissionId }
      },
      {
        label: workflow?.workflowName
      }
    ]

    return h(HeaderSection, { breadcrumbPathObjects, button: SubmitNewWorkflowButton, title: 'Workflow Details' })
  }, [workflow, submissionId])

  /*
   * Page render
   */
  // Disabling warning about workflowLog being unused
  // TODO maybe display the path to the workflow log file rather than the contents?
  // eslint-disable-next-line
  const { metadataArchiveStatus, calls, end, failures, start, status, workflowLog, workflowRoot, submittedFiles: { workflow: wdl } = {} } = workflow || {}
  const restructureFailures = failuresArray => {
    const filtered = filter(({ message }) => !isEmpty(message) && !message.startsWith('Will not start job'), failuresArray)
    const sizeDiff = failuresArray.length - filtered.length
    const newMessage = sizeDiff > 0 ? [{
      message: `${sizeDiff} jobs were queued in Cromwell but never sent to the cloud backend due to failures elsewhere in the workflow`
    }] : []
    const simplifiedFailures = [...filtered, ...newMessage]

    return map(({ message, causedBy }) => ({
      message,
      ...(!isEmpty(causedBy) ? { causedBy: restructureFailures(causedBy) } : {})
    }), simplifiedFailures)
  }

  return div({ 'data-testid': 'run-details-container', id: 'run-details-page' }, [
    Navbar('RUN WORKFLOWS WITH CROMWELL'),
    //Loading state (spinner)
    cond(
      [
        workflow === undefined,
        () => h(Fragment, [div({ style: { fontStyle: 'italic', marginBottom: '1rem' } }, ['Fetching workflow metadata...']), centeredSpinner()])
      ],
      [
        metadataArchiveStatus === 'ArchivedAndDeleted',
        () => h(Fragment, [
          div({ style: { lineHeight: '24px', marginTop: '0.5rem', ...elements.sectionHeader } }, ' Run Details Archived'),
          div({ style: { lineHeight: '24px', marginTop: '0.5rem' } }, [
            "This run's details have been archived. Please refer to the ",
            h(
              Link,
              {
                href: 'https://support.terra.bio/hc/en-us/articles/360060601631',
                ...newTabLinkProps
              },
              [icon('pop-out', { size: 18 }), ' Run Details Archived']
            ),
            ' support article for details on how to access the archive.'
          ])
        ])
      ],
      () => h(Fragment, {}, [
        div({ style: { padding: '1rem 2rem 2rem' } }, [header]),
        div(
          {
            style: {
              id: 'details-colored-container',
              backgroundColor: 'rgb(222, 226, 232)'
            }
          },
          [
            div(
              {
                id: `details-colored-container-content`,
                style: {
                  padding: '1rem 2rem 2rem'
                }
              },
              [
                div({ 'data-testid': 'workflow-status-container', style: { display: 'flex', justifyContent: 'flex-start' } }, [
                  makeSection(
                    'Workflow Status',
                    [
                      div({ style: { lineHeight: '24px', marginTop: '0.5rem' } }, [
                        makeStatusLine(style => collapseStatus(status).icon(style), status)
                      ])
                    ],
                    {}
                  ),
                  makeSection('Workflow Timing', [
                    div({ style: { marginTop: '0.5rem', display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '0.5rem' } }, [
                      div({ style: styles.sectionTableLabel }, ['Start:']),
                      div({ 'data-testid': 'workflow-start-time' }, [start ? makeCompleteDate(start) : 'N/A']),
                      div({ style: styles.sectionTableLabel }, ['End:']),
                      div({ 'data-testid': 'workflow-end-time' }, [end ? makeCompleteDate(end) : 'N/A'])
                    ])
                  ]),
                  makeSection('Workflow Engine Id', [
                    div({
                      style: { lineHeight: '24px', marginTop: '0.5rem' }
                    }, [span({ 'data-testid': 'workflow-engine-id-span' }, [workflowId])]
                    )
                  ])
                ]),
                failures &&
                    h(
                      Collapse,
                      {
                        style: { marginBottom: '1rem' },
                        initialOpenState: true,
                        title: div({ style: elements.sectionHeader }, 'Workflow-Level Failures'),
                        afterTitle: h(ClipboardButton, {
                          text: JSON.stringify(failures, null, 2),
                          style: { marginLeft: '0.5rem' }
                        })
                      },
                      [
                        h(ReactJson, {
                          style: { whiteSpace: 'pre-wrap' },
                          name: false,
                          collapsed: 4,
                          enableClipboard: false,
                          displayDataTypes: false,
                          displayObjectSize: false,
                          src: restructureFailures(failures)
                        })
                      ]
                    ),
                wdl &&
                    h(
                      Collapse,
                      {
                        'data-testid': 'workflow-script-collapse',
                        title: div({ style: elements.sectionHeader }, ['Submitted workflow script'])
                      },
                      [h(WDLViewer, { wdl })]
                    )
              ]
            )
          ]
        ),
        //NOTE:filter drop down, status count, and taskname search will occur here

        div({
          'data-testid': 'workflow-call-table',
          style: {
            margin: '1rem 3rem'
          }
        }, [
          !isEmpty(tableData) && h(CallTable, { key: 'workflow-tasks', callObjects: tableData })
        ])

        //  Q4-2022 Disable log-viewing
        //showLog && h(UriViewer, { workspace, uri: workflowLog, onDismiss: () => setShowLog(false) })
      ])
    )
  ])
}

export const navPaths = [
  {
    name: 'run-details',
    path: '/submission-monitoring/:submissionId/:workflowId',
    component: RunDetails,
    title: ({ name }) => `${name} - Run Details`
  }
]
