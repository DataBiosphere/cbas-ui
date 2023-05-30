import { every, includes, isEmpty, keys, map, min, sortBy } from 'lodash/fp'
import { Fragment, useMemo, useRef, useState } from 'react'
import { div, h } from 'react-hyperscript-helpers'
import Collapse from 'src/components/Collapse'
import { Link, Navbar } from 'src/components/common'
import { centeredSpinner, icon } from 'src/components/icons'
import {
  collapseStatus,
  HeaderSection,
  makeSection, statusType,
  SubmitNewWorkflowButton
} from 'src/components/job-common'
import { TroubleshootingBox } from 'src/components/TroubleshootingBox'
import { WorkflowInfoBox } from 'src/components/WorkflowInfoBox'
import { Ajax } from 'src/libs/ajax'
import { useCancellation, useOnMount } from 'src/libs/react-utils'
import { codeFont, elements } from 'src/libs/style'
import { cond, newTabLinkProps } from 'src/libs/utils'
import CallTable from 'src/pages/workspaces/workspace/jobHistory/CallTable'


export const RunDetails = ({ submissionId, workflowId }) => {
  /*
   * State setup
   */
  const [workflow, setWorkflow] = useState()

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

    return h(HeaderSection, { breadcrumbPathObjects, button: SubmitNewWorkflowButton, title: 'Workflow Details' })
  }, [workflow, submissionId])

  /*
   * Page render
   */
  // Disabling warning about workflowLog being unused
  // TODO maybe display the path to the workflow log file rather than the contents?
  // eslint-disable-next-line
  const { metadataArchiveStatus, calls, end, failures, start, status, workflowLog, workflowRoot, submittedFiles: { workflow: wdl } = {} } = workflow || {}

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
        div({ 'data-testid': 'details-top-container', style: { display: 'flex', justifyContent: 'space-between', padding: '1rem 2rem 2rem' } }, [
          h(WorkflowInfoBox, { workflow }, []),
          h(TroubleshootingBox, { workflow, submissionId, workflowId }, [])
        ]),
        div({ 'data-testid': 'details-table-container', style: { padding: '1rem 2rem 2rem' } }, [
          !isEmpty(calls) &&
          makeSection(
            'Tasks:',
            [
              map(callName => {
                return h(
                  Collapse,
                  {
                    key: callName,
                    style: { marginLeft: '1rem', marginTop: '0.5rem' },
                    title: div({ style: { ...codeFont, ...elements.sectionHeader } }, [`${callName} × ${calls[callName].length}`]),
                    initialOpenState: !every({ executionStatus: 'Done' }, calls[callName]),
                    'data-testid': 'call-table-collapse'
                  },
                  [h(CallTable, { callName, callObjects: calls[callName] })]
                )
              }, callNames)
            ],
            { style: { overflow: 'visible' } }
          )
        ])
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
