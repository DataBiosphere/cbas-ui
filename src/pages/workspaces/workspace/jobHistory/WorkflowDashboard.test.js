import '@testing-library/jest-dom'

import { render, screen, waitFor } from '@testing-library/react'
import { h } from 'react-hyperscript-helpers'
import { Ajax } from 'src/libs/ajax'
import { WorkflowDashboard } from 'src/pages/workspaces/workspace/jobHistory/WorkflowDashboard'

jest.mock('src/libs/ajax')

const workspaceDashboardProps = {
  namespace: "example-billing-project",
  name: "workspace",
  submissionId: "subId",
  workflowId: "workId"
}

const workspaceDashboardMetadata = {
  end: "",
  executionStatus: "",
  failures: "",
  start: "",
  status: "",
  submittedFilesWorkflow: "",
  workflowLog: "",
  workflowRoot: "",
  callCachingResult: "",
  callCachingEffectiveCallCachingMode: "",
  backendStatus: ""
}

beforeEach(() => {
    const workId = {
      metadata() {
        return  jest.fn(() => {Promise.resolve(workspaceDashboardMetadata)});
      }
    }
    Ajax.mockImplementation(() => {
      return {
        Cromwell: {
          workflows() {
            return workId;
          }
        }
      }
    })
  })

describe('WorkspaceDashboard - Dashboard render smoke test', () => {
  it('should not fail any accessibility tests', () => {
    // Act
    render(h(WorkflowDashboard, workspaceDashboardProps))
    // Assert
    waitFor(() => expect(screen.queryByText("Links")).toBeInTheDocument())
  })
})
