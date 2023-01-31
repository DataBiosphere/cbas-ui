
import { countBy, every, filter, flattenDepth, flow, includes, isEmpty, keys, map, min, sortBy, values } from 'lodash/fp'
import { Fragment, useMemo, useRef, useState } from 'react'
import { div, h } from 'react-hyperscript-helpers'
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
  const status = ['submitted', 'waitingForQuota', 'running', 'succeeded', 'failed'].filter(
    s => statusGroups[s]).map(s => makeRow(statusGroups[s], statusType[s]))
  return h(Fragment, status)
}


export const RunDetails = ({ namespace, name, submissionId, workflowId }) => {
  /*
   * State setup
   */
  const [workflow, setWorkflow] = useState()
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
        'end', 'executionStatus', 'failures', 'start', 'status', 'submittedFiles:workflow', 'workflowLog', 'workflowRoot', 'callCaching:result',
        'callCaching:effectiveCallCachingMode', 'backendStatus'
      ]
      const excludeKey = []

      const metadata = await Ajax(signal).Cromwell.workflows(workflowId).metadata({ includeKey, excludeKey })
      setWorkflow(metadata)

      if (includes(collapseStatus(metadata.status), [statusType.running, statusType.submitted])) {
        stateRefreshTimer.current = setTimeout(loadWorkflow, 60000)
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

    return h(HeaderSection, { breadcrumbPathObjects, button: SubmitNewWorkflowButton, title: 'Workflow details' })
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

  const callNames = sortBy(callName => min(map('start', calls[callName])), keys(calls))

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
        div({
          style: {
            id: 'details-colored-container',
            backgroundColor: 'rgb(222, 226, 232)'
          }
        }, [
          div(
            {
              id: `details-colored-container-content`,
              style: {
                padding: '1rem 2rem 2rem'
              }
            },
            [
              div({ style: { display: 'flex', justifyContent: 'flex-start' } }, [
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
                    div([start ? makeCompleteDate(start) : 'N/A']),
                    div({ style: styles.sectionTableLabel }, ['End:']),
                    div([end ? makeCompleteDate(end) : 'N/A'])
                  ])
                ])
              ]),
              failures &&
                h(Collapse,
                  {
                    style: { marginBottom: '1rem' },
                    initialOpenState: true,
                    title: div({ style: elements.sectionHeader }, [
                      'Workflow-Level Failures',
                      h(ClipboardButton, {
                        text: JSON.stringify(failures, null, 2),
                        style: { marginLeft: '0.5rem' },
                        onClick: e => e.stopPropagation() // this stops the collapse when copying
                      })
                    ])
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
              h(Collapse,
                {
                  title: div({ style: elements.sectionHeader }, ['Tasks']),
                  initialOpenState: true
                },
                [
                  div({ style: { marginLeft: '1rem' } }, [
                    makeSection('Total Task Status Counts', [
                      !isEmpty(calls) ? statusCell(workflow) :
                        div({ style: { marginTop: '0.5rem' } }, ['No calls have been started by this workflow.'])
                    ]),
                    !isEmpty(calls) &&
                      makeSection(
                        'Task Lists',
                        [
                          map(callName => {
                            return h(
                              Collapse,
                              {
                                key: callName,
                                style: { marginLeft: '1rem', marginTop: '0.5rem' },
                                title: div({ style: { ...codeFont, ...elements.sectionHeader } }, [`${callName} × ${calls[callName].length}`]),
                                initialOpenState: !every({ executionStatus: 'Done' }, calls[callName])
                              },
                              [h(CallTable, { namespace, name, submissionId, workflowId, callName, callObjects: calls[callName] })]
                            )
                          }, callNames)
                        ],
                        { style: { overflow: 'visible' } }
                      )
                  ])
                ]
              ),
              wdl && h(Collapse,
                {
                  title: div({ style: elements.sectionHeader }, ['Submitted workflow script'])
                },
                [h(WDLViewer, { wdl })]
              )
            ]
          )
        ]
        )
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
