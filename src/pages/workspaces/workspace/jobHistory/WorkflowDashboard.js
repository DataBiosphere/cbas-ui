import { concat, countBy, every, filter, flattenDepth, flow, includes, isEmpty, keys, map, min, sortBy, toPairs, values } from 'lodash/fp'
import { Fragment, useMemo, useRef, useState } from 'react'
import { div, h } from 'react-hyperscript-helpers'
import ReactJson from 'react-json-view'
import Collapse from 'src/components/Collapse'
import { ButtonOutline, ClipboardButton, Link, Navbar, PageHeader } from 'src/components/common'
import { centeredSpinner, icon } from 'src/components/icons'
import {
  collapseCromwellStatus, collapseStatus, makeSection, makeStatusLine, statusType
} from 'src/components/job-common'
//  Q4-2022 Disable log-viewing
//import UriViewer from 'src/components/UriViewer'
import WDLViewer from 'src/components/WDLViewer'
import { Ajax } from 'src/libs/ajax'
import { goToPath } from 'src/libs/nav'
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
  // Note: these variable names match the id values of statusType (except for unknownStatuses, which will be their labels).
  const { ...unknownStatuses } = statusGroups

  const makeRow = (count, status, labelOverride) => {
    const seeMore = !!status.moreInfoLink ? h(Link, { href: status.moreInfoLink, style: { marginLeft: '0.50rem' }, ...newTabLinkProps },
      [status.moreInfoLabel, icon('pop-out', { size: 12, style: { marginLeft: '0.25rem' } })]) : ''
    return !!count && div({ style: { display: 'flex', alignItems: 'center', marginTop: '0.25rem' } }, [
      status.icon(),
      ` ${count} ${!!labelOverride ? labelOverride : status.label()}`,
      seeMore
    ])
  }
  return h(Fragment, concat(
    ['submitted', 'waitingForQuota', 'running', 'succeeded', 'failed'].filter(
      s => statusGroups[s]).map(s => makeRow(statusGroups[s], statusType[s])),
    map(([label, count]) => makeRow(count, statusType.unknown, label), toPairs(unknownStatuses)))
  )
}

const HeaderSection = ({ submissionId, workflowName }) => {
  const breadcrumbPathObj = [
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
      label: workflowName
    }
  ]

  return div({ id: 'header-section', style: { display: 'flex', padding: '1rem 2rem 2rem' } }, [
    div(
      {
        style: {
          width: '62%',
          justifyContent: 'space-around',
          marginBottom: '40px'
        }
      }, [PageHeader({ breadcrumbPathObj, title: 'Run details' })]
    ),
    div(
      {
        style: {
          width: '20%',
          display: 'flex',
          justifyContent: 'flex-end',
          marginTop: '18.76px'
        }
      }, [
        h(ButtonOutline, {
          onClick: () => goToPath('root')
        }, ['Submit a new workflow'])
      ]
    )
  ])
}

export const WorkflowDashboard = ({ namespace, name, submissionId, runId }) => {
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

      // const metadata = await Ajax(signal).Cromwell.workflows(runId).metadata({ includeKey, excludeKey })
      const metadata = {
  workflowName: 'fileChecksum',
  workflowProcessingEvents: [
    {
      cromwellId: 'cromid-18d9b68',
      description: 'PickedUp',
      timestamp: '2022-11-16T15:48:23.135Z',
      cromwellVersion: '85-3f4b998-SNAP'
    },
    {
      cromwellId: 'cromid-18d9b68',
      description: 'Finished',
      timestamp: '2022-11-16T15:48:24.859Z',
      cromwellVersion: '85-3f4b998-SNAP'
    }
  ],
  actualWorkflowLanguageVersion: 'draft-2',
  submittedFiles: {
    workflow:
      // eslint-disable-next-line no-template-curly-in-string
      'task md5 {\n    File inputFile \n    command {\n        echo "`date`: Running checksum on ${inputFile}..."\n        md5sum ${inputFile} > md5sum.txt\n        echo "`date`: Checksum is complete."\n    }\n    output {\n        File result = "md5sum.txt"\n    }\n    runtime {\n        docker: \'ubuntu:18.04\'\n        preemptible: true\n    }\n}\n\nworkflow fileChecksum {\n    File inputFile\n    call md5 { input: inputFile=inputFile}\n}\n\n',
    root: '',
    options: '{\n\n}',
    inputs: '{"fileChecksum.inputFile":"https://coaexternalstorage.blob.core.windows.net/cromwell/user-inputs/inputFile.txt"}',
    workflowUrl: '',
    labels: '{}'
  },
  calls: {
    testOne: [{
      start,
      executionStatus: 'Running',
      shardIndex: 3,
      attempt: 2,
      backendStatus: 'Running',
      end
    }]
  },
  outputs: {},
  actualWorkflowLanguage: 'WDL',
  status: 'Aborted',
  failures: [
    {
      message: 'InjectionManagerFactory not found.',
      causedBy: []
    }
  ],
  end: '2022-11-16T18:48:24.858Z',
  start: '2022-11-16T19:48:23.195Z',
  id: '5d96fd3c-1a89-40ae-8095-c364181cda46',
  inputs: {
    'fileChecksum.inputFile': 'https://coaexternalstorage.blob.core.windows.net/cromwell/user-inputs/inputFile.txt'
  },
  labels: {
    'cromwell-workflow-id': 'cromwell-5d96fd3c-1a89-40ae-8095-c364181cda46'
  },
  submission: '2022-11-16T15:48:22.506Z'
}
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

  const header = useMemo(() => h(HeaderSection, { submissionId, workflowName: workflow?.workflowName }), [submissionId, workflow])

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

  return div({ style: elements.pageContentContainer }, [
    Navbar(),
    div({ style: { flex: 1, display: 'flex', flexDirection: 'column' } }, [
      //Loading state (spinner)
      cond(
        [workflow === undefined, () => h(Fragment, [
          div({ style: { fontStyle: 'italic', marginBottom: '1rem' } }, ['Fetching workflow metadata...']),
          centeredSpinner()
        ])],
        [metadataArchiveStatus === 'ArchivedAndDeleted', () => h(Fragment, [
          div({ style: { lineHeight: '24px', marginTop: '0.5rem', ...elements.sectionHeader } }, ' Run Details Archived'),
          div({ style: { lineHeight: '24px', marginTop: '0.5rem' } }, [
            'This run\'s details have been archived. Please refer to the ',
            h(Link, {
              href: 'https://support.terra.bio/hc/en-us/articles/360060601631',
              ...newTabLinkProps
            }, [icon('pop-out', { size: 18 }), ' Run Details Archived']),
            ' support article for details on how to access the archive.'
          ])
        ])],
        () => h(Fragment, [
          header,
          div({ style: {
            id: 'details-container',
            backgroundColor: 'rgb(222, 226, 232)'
          } }, [
            div({
              id: `details-content`,
              style: {
                padding: '1rem 2rem 2rem'
              }
            }, [
              div({ style: { display: 'flex', justifyContent: 'space-between' } }, [
                makeSection('Workflow Status', [
                  div({ style: { lineHeight: '24px', marginTop: '0.5rem' } }, [makeStatusLine(style => collapseStatus(status).icon(style), status)])
                ], {}),
                makeSection('Workflow Timing', [
                  div({ style: { marginTop: '0.5rem', display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '0.5rem' } }, [
                    div({ style: styles.sectionTableLabel }, ['Start:']), div([start ? makeCompleteDate(start) : 'N/A']),
                    div({ style: styles.sectionTableLabel }, ['End:']), div([end ? makeCompleteDate(end) : 'N/A'])
                  ])
                ])
              ]),
              failures && h(Collapse,
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
                }, [h(ReactJson, {
                  style: { whiteSpace: 'pre-wrap' },
                  name: false,
                  collapsed: 4,
                  enableClipboard: false,
                  displayDataTypes: false,
                  displayObjectSize: false,
                  src: restructureFailures(failures)
                })]
              ),
              h(Collapse,
                {
                  title: div({ style: elements.sectionHeader }, ['Calls']),
                  initialOpenState: true
                }, [
                  div({ style: { marginLeft: '1rem' } },
                    [makeSection('Total Task Status Counts', [
                      !isEmpty(calls) ? statusCell(workflow) : div({ style: { marginTop: '0.5rem' } }, ['No calls have been started by this workflow.'])
                    ]),
                    !isEmpty(calls) && makeSection('Task Lists', [
                      map(callName => {
                        return h(Collapse, {
                          key: callName,
                          style: { marginLeft: '1rem', marginTop: '0.5rem' },
                          title: div({ style: { ...codeFont, ...elements.sectionHeader } }, [`${callName} × ${calls[callName].length}`]),
                          initialOpenState: !every({ executionStatus: 'Done' }, calls[callName])
                        }, [
                          h(CallTable, { namespace, name, submissionId, workflowId: runId, callName, callObjects: calls[callName] })
                        ])
                      }, callNames)
                    ],
                    { style: { overflow: 'visible' } })]
                  )
                ]
              ),
              wdl && h(Collapse, {
                title: div({ style: elements.sectionHeader }, ['Submitted workflow script'])
              }, [h(WDLViewer, { wdl })])
            ])
          ])
          //  Q4-2022 Disable log-viewing
          //showLog && h(UriViewer, { workspace, uri: workflowLog, onDismiss: () => setShowLog(false) })
        ])
      )
    ])
  ])
}

export const navPaths = [
  {
    name: 'workflow-dashboard',
    path: '/submission-monitoring/:submissionId/:runId',
    component: WorkflowDashboard,
    title: ({ name }) => `${name} - Run Details`
  }
]
