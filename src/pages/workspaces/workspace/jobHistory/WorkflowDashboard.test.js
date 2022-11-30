/* eslint-disable no-unused-expressions */
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { h } from 'react-hyperscript-helpers'
import { Ajax } from 'src/libs/ajax'
import { makeCompleteDate } from 'src/libs/utils'
import { WorkflowDashboard } from 'src/pages/workspaces/workspace/jobHistory/WorkflowDashboard'


jest.mock('src/libs/ajax')

jest.mock('src/libs/config', () => ({
  ...jest.requireActual('src/libs/config'),
  getConfig: jest.fn().mockReturnValue({})
}))


const workspaceDashboardProps = {
  namespace: 'example-billing-project',
  name: 'workspace',
  submissionId: 'subId',
  workflowId: 'workId'
}

const workspaceDashboardMetadata = {
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
      'task md5 {\n    File inputFile \n    command {\n        echo "`date`: Running checksum on ${inputFile}..."\n        md5sum ${inputFile} > md5sum.txt\n        echo "`date`: Checksum is complete."\n    }\n    output {\n        File result = "md5sum.txt"\n    }\n    runtime {\n        docker: \'ubuntu:18.04\'\n        preemptible: true\n    }\n}\n\nworkflow fileChecksum {\n    File inputFile\n    call md5 { input: inputFile=inputFile}\n}\n\n',
    root: '',
    options: '{\n\n}',
    inputs: '{"fileChecksum.inputFile":"https://coaexternalstorage.blob.core.windows.net/cromwell/user-inputs/inputFile.txt"}',
    workflowUrl: '',
    labels: '{}'
  },
  calls: {},
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

beforeEach(() => {
  const workId = {
    metadata() {
      return jest.fn(() => workspaceDashboardMetadata)
    }
  }
  Ajax.mockImplementation(() => {
    return {
      Cromwell: {
        workflows() {
          return workId
        }
      }
    }
  })
})

describe('WorkspaceDashboard - Dashboard render smoke test', () => {
  const originalOffsetHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetHeight')
  const originalOffsetWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetWidth')

  beforeAll(() => {
    Object.defineProperty(HTMLElement.prototype, 'offsetHeight', { configurable: true, value: 1000 })
    Object.defineProperty(HTMLElement.prototype, 'offsetWidth', { configurable: true, value: 800 })
    Object.assign(navigator, { clipboard: { writeText: () => {} } })
  })

  afterAll(() => {
    Object.defineProperty(HTMLElement.prototype, 'offsetHeight', originalOffsetHeight)
    Object.defineProperty(HTMLElement.prototype, 'offsetWidth', originalOffsetWidth)
  })

  it('should mount the component', async () => {
    // Act
    render(h(WorkflowDashboard, workspaceDashboardProps))

    await waitFor(() => {
      const dashboardContainer = screen.getByTestId('dashboard-container')
      expect(dashboardContainer).toBeDefined
    })
  })

  it('shows the time taken to fetch the workflow metadata', async () => {
    // Act
    render(h(WorkflowDashboard, workspaceDashboardProps))
    await waitFor(() => {
      const fetchTime = screen.getByText(/Workflow metadata fetched in \d+ms/)
      expect(fetchTime).toBeDefined
    })
  })

  it('shows the workflow status', async () => {
    render(h(WorkflowDashboard, workspaceDashboardProps))
    await waitFor(() => {
      const workflowStatus = screen.getByText(workspaceDashboardMetadata.status)
      expect(workflowStatus).toBeDefined
    })
  })

  it('shows the workflow timing', async () => {
    render(h(WorkflowDashboard, workspaceDashboardProps))
    await waitFor(() => {
      const startTime = screen.getByText(makeCompleteDate(workspaceDashboardMetadata.start))
      expect(startTime).toBeDefined
      const endTime = screen.getByText(makeCompleteDate(workspaceDashboardMetadata.end))
      expect(endTime).toBeDefined
    })
  })

  it('shows the workflow failures', async () => {
    jest.spyOn(navigator.clipboard, 'writeText')

    render(h(WorkflowDashboard, workspaceDashboardProps))
    const user = userEvent.setup()
    await waitFor(async () => {
      const collapseTitle = screen.getByText('Workflow-Level Failures')
      await user.click(collapseTitle)
      const clipboardButton = screen.getByText('Copy to clipboard')
      expect(clipboardButton).toBeDefined
      await user.click(clipboardButton)
      expect(navigator.clipboard.writeText).toHaveBeenCalled
    })
  })

  it('shows the wdl text in a dedicated code block', async () => {
    render(h(WorkflowDashboard, workspaceDashboardProps))
    const user = userEvent.setup()
    await waitFor(async () => {
      const collapseTitle = screen.getByText('Submitted workflow script')
      await user.click(collapseTitle)
      const wdlScript = screen.getByText(/Running checksum/)
      expect(wdlScript).toBeDefined
    })
  })
})
