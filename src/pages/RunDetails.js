
import { cloneDeep, filter, includes, isEmpty, map } from 'lodash/fp'
import { Fragment, useCallback, useMemo, useRef, useState } from 'react'
import { div, h } from 'react-hyperscript-helpers'
import { Link, Navbar } from 'src/components/common'
import { centeredSpinner, icon } from 'src/components/icons'
import {
  collapseStatus,
  HeaderSection,
  statusType,
  SubmitNewWorkflowButton
} from 'src/components/job-common'
import { TroubleshootingBox } from 'src/components/TroubleshootingBox'
import { UriViewer } from 'src/components/URIViewer/UriViewer'
import { WorkflowInfoBox } from 'src/components/WorkflowInfoBox'
import { Ajax } from 'src/libs/ajax'
import { useCancellation, useOnMount } from 'src/libs/react-utils'
import { elements } from 'src/libs/style'
import { cond, newTabLinkProps } from 'src/libs/utils'
import CallTable from 'src/pages/workspaces/workspace/jobHistory/CallTable'
import { collapseCromwellStatus } from 'src/pages/workspaces/workspace/jobHistory/JobStatus'


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
        'attempt',
        'subWorkflowId' //needed for task type column
        // 'subWorkflowMetadata' //may need this later
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
        div({ 'data-testid': 'details-top-container', style: { display: 'flex', justifyContent: 'space-between', padding: '1rem 2rem 2rem' } }, [
          h(WorkflowInfoBox, { workflow }, []),
          h(TroubleshootingBox, { workflow, submissionId, workflowId }, [])
        ]),
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
