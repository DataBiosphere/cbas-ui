/* eslint-disable no-unused-expressions */
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { h } from 'react-hyperscript-helpers'
import { Ajax } from 'src/libs/ajax'
import { makeCompleteDate } from 'src/libs/utils'

import { RunDetails } from './RunDetails'


jest.mock('src/libs/ajax')

jest.mock('src/libs/config', () => ({
  ...jest.requireActual('src/libs/config'),
  getConfig: jest.fn().mockReturnValue({})
}))


const runDetailsProps = {
  namespace: 'example-billing-project',
  name: 'workspace',
  submissionId: 1,
  workflowId: 2
}

const end = new Date()
const start = new Date(end.getMilliseconds() - 1000000)

const runDetailsMetadata = {
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

beforeEach(() => {
  const workId = {
    metadata() {
      return jest.fn(() => runDetailsMetadata)
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

describe('RunDetails - render smoke test', () => {
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
    render(h(RunDetails, runDetailsProps))

    await waitFor(() => {
      const detailsContainer = screen.getByTestId('run-details-container')
      expect(detailsContainer).toBeDefined
    })
  })

  it('shows the workflow status', async () => {
    render(h(RunDetails, runDetailsProps))
    await waitFor(() => {
      const workflowStatus = screen.getByText(runDetailsMetadata.status)
      expect(workflowStatus).toBeDefined
    })
  })

  it('shows the workflow timing', async () => {
    render(h(RunDetails, runDetailsProps))
    await waitFor(() => {
      const startTime = screen.getByText(makeCompleteDate(runDetailsMetadata.start))
      expect(startTime).toBeDefined
      const endTime = screen.getByText(makeCompleteDate(runDetailsMetadata.end))
      expect(endTime).toBeDefined
    })
  })

  it('shows the workflow failures', async () => {
    jest.spyOn(navigator.clipboard, 'writeText')

    render(h(RunDetails, runDetailsProps))
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

  it('shows the workflow tasks', async () => {
    const callData = runDetailsMetadata.calls.testOne[0]
    render(h(RunDetails, runDetailsProps))
    await waitFor(() => {
      const callCollapse = screen.getByText('Tasks')
      expect(callCollapse).toBeDefined
      const countString = screen.getByText('Total Task Status Counts')
      expect(countString).toBeDefined
      const totalRunningString = screen.getByText(/1 running/)
      expect(totalRunningString).toBeDefined
      const collapseTestOneString = screen.getByText(/^testOne/)
      expect(collapseTestOneString).toBeDefined
      const testOneTable = screen.getByRole(/table/)
      expect(testOneTable).toBeDefined
      const rows = within(testOneTable).queryAllByRole(/^row$/)
      expect(rows.length).toEqual(2)
      const columnHeaders = ['Index', 'Attempt', 'Status', 'Start', 'End']
      columnHeaders.forEach(label => {
        const columnHeader = within(rows[0]).getByText(label)
        expect(columnHeader).toBeDefined()
        const key = label.toLowerCase()
        let value

        switch (key) {
          case 'start':
          case 'end':
            const time = callData[key]
            value = makeCompleteDate(time)
            break
          case 'index':
            value = callData.shardIndex
            break
          case 'status':
            value = 'Running'
            break
          default:
            value = callData[key]
        }
        const cellData = within(rows[1]).getAllByText(value)
        expect(cellData).toBeDefined
      })
    })
  })

  it('shows the wdl text in a dedicated code block', async () => {
    render(h(RunDetails, runDetailsProps))
    const user = userEvent.setup()
    await waitFor(async () => {
      const collapseTitle = screen.getByText('Submitted workflow script')
      await user.click(collapseTitle)
      const wdlScript = screen.getByText(/Running checksum/)
      expect(wdlScript).toBeDefined
    })
  })
})