
import { cloneDeep, filter, includes, isEmpty, map } from 'lodash/fp'
import { Fragment, useCallback, useMemo, useRef, useState } from 'react'
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
import { UriViewer } from 'src/components/URIViewer/UriViewer'
import WDLViewer from 'src/components/WDLViewer'
import { Ajax } from 'src/libs/ajax'
import { useCancellation, useOnMount } from 'src/libs/react-utils'
import { elements } from 'src/libs/style'
import { cond, makeCompleteDate, newTabLinkProps } from 'src/libs/utils'
import CallTable from 'src/pages/workspaces/workspace/jobHistory/CallTable'


const styles = {
  sectionTableLabel: { fontWeight: 600 }
}


// Filter function that only displays rows based on task name search parameters
// NOTE: the viewable call should have the task name stored on the call instance itself, should be done via pre-processing step
export const taskNameFilterFn = searchTerm => filter(call => call?.taskName?.includes(searchTerm))
export const statusFilterFn = status => filter(call => call.uiStatusLabel.toLocaleLowerCase() === status.toLocaleLowerCase())

//Helper method to generate data for the call table
export const generateCallTableData = calls => {
  const taskName = Object.keys(calls)
  return taskName.map(taskName => {
    const targetData = calls[taskName]
    const lastCall = cloneDeep(targetData[targetData.length - 1])
    const additionalData = {
      taskName,
      statusObj: collapseCromwellStatus(lastCall.executionStatus, lastCall.backendStatus)
    }
    return Object.assign(additionalData, lastCall)
  })
}

export const RunDetails = ({ submissionId, workflowId }) => {
  /*
   * State setup
   */
  const [workflow, setWorkflow] = useState()
  const [tableData, setTableData] = useState([])
  const [showLog, setShowLog] = useState(false)
  const [logUri, setLogUri] = useState({})

  const signal = useCancellation()
  const stateRefreshTimer = useRef()

  const showLogModal = useCallback(logUri => {
    setLogUri(logUri)
    setShowLog(true)
  }, [])
  /*
   * Data fetchers
   */
  useOnMount(() => {
    const loadWorkflow = async () => {
      const includeKey = [
        'backendStatus',
        'executionStatus',
        'shardIndex',
        // 'outputs', //not sure if I need this yet
        // 'inputs', //not sure if I need this yet
        'jobId',
        'start',
        'end',
        'stderr',
        'stdout',
        'attempt'
        // 'subWorkflowId', //might not need this
        // 'subWorkflowMetadata' //don't need this now, will need it when subworkflows data is fetched in one shot
      ]
      const excludeKey = []
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
                    div(
                      {
                        style: { lineHeight: '24px', marginTop: '0.5rem' }
                      },
                      [span({ 'data-testid': 'workflow-engine-id-span' }, [workflowId])]
                    )
                  ])
                ])
              ]
            ),
            makeSection(
              'Logs',
              [
                h(
                  Link,
                  {
                    onClick: () => {
                      setShowLog(true)
                      setLogUri(workflow.workflowLog)
                    },
                    style: { display: 'flex', marginLeft: '1rem', alignItems: 'center' }
                  },
                  [div({ 'data-testid': 'execution-log-container' }, [icon('fileAlt', { size: 18 }), ' Execution log'])]
                )
              ],
              {}
            ),
            failures &&
                h(
                  Collapse,
                  {
                    'data-testid': 'workflow-failures-dropdown',
                    style: { marginBottom: '1rem' },
                    initialOpenState: true,
                    title: div({ style: elements.sectionHeader }, 'Workflow-Level Failures'),
                    afterTitle: h(ClipboardButton, {
                      'data-testid': 'clipboard-button-failures',
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
                    title: div({ 'data-testid': 'workflow-script-dropdown', style: elements.sectionHeader }, ['Submitted workflow script'])
                  },
                  [h(WDLViewer, { wdl })]
                )
          ]
        ),
        div(
          {
            'data-testid': 'call-table-container',
            style: {
              margin: '2rem'
            }
          },
          [
            h(CallTable, {
              defaultFailedFilter: workflow?.status.toLocaleLowerCase().includes('failed'),
              isRendered: !isEmpty(tableData),
              showLogModal,
              tableData
            })
          ]
        ),
        showLog && h(UriViewer, { uri: logUri || '', onDismiss: () => setShowLog(false) })
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
