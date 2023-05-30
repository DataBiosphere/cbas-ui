/* eslint-disable no-unused-expressions */
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { h } from 'react-hyperscript-helpers'
import { isAzureUri } from 'src/components/URIViewer/uri-viewer-utils'
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
  workflowId: '00001111-2222-3333-aaaa-bbbbccccdddd',
  uri: 'https://coaexternalstorage.blob.core.windows.net/cromwell/user-inputs/inputFile.txt'
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
  workflowLog: 'https://coaexternalstorage.blob.core.windows.net/cromwell/user-inputs/inputFile.txt',
  failures: [
    {
      message: 'InjectionManagerFactory not found.',
      causedBy: []
    }
  ],
  end: '2022-11-16T18:48:24.858Z',
  start: '2022-11-16T19:48:23.195Z',
  id: '00001111-2222-3333-aaaa-bbbbccccdddd',
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
      },
      WorkspaceManager: {
        getSASToken() {
          return '1234-this-is-a-mock-sas-token-5678'
        }
      },
      AzureStorage: {
        getTextFileFromBlobStorage() {
          return {
            uri: 'https://someBlobFilePath.blob.core.windows.net/cromwell/user-inputs/inputFile.txt',
            sasToken: '1234-this-is-a-mock-sas-token-5678',
            storageAccountName: 'mockStorageAccountName',
            containerName: 'mockContainerName',
            blobName: '/mockcromwell/mock-inputs/inputFile.txt',
            name: 'inputFile.txt',
            lastModified: 'Mon, 22 May 2023 17:12:58 GMT',
            size: '324',
            contentType: 'text/plain',
            textContent: 'this is the text of a mock file'
          }
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

  it('shows the workflow id', async () => {
    render(h(RunDetails, runDetailsProps))
    await waitFor(() => {
      const workflowId = screen.getByText(runDetailsMetadata.id)
      expect(workflowId).toBeDefined
    })
  })

  it('shows the workflow failures', async () => {
    jest.spyOn(navigator.clipboard, 'writeText')

    render(h(RunDetails, runDetailsProps))
    const user = userEvent.setup()
    await waitFor(async () => {
      const callCollapse = screen.getByTestId('call-table-collapse')
      await user.click(callCollapse)
      const attemptColumnTitle = screen.getByText('Attempt')
      const indexColumnTitle = screen.getByText('Index')
      expect(attemptColumnTitle).toBeDefined
      expect(indexColumnTitle).toBeDefined
    })
  })

  it('shows the workflow tasks', async () => {
    const callData = runDetailsMetadata.calls.testOne[0]
    render(h(RunDetails, runDetailsProps))
    await waitFor(() => {
      const callCollapse = screen.getByTestId('call-table-collapse')
      expect(callCollapse).toBeDefined
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

  it('shows the wdl text in a modal component', async () => {
    render(h(RunDetails, runDetailsProps))
    const user = userEvent.setup()
    await waitFor(async () => {
      const viewModalLink = screen.getByText('View Workflow Script')
      await user.click(viewModalLink)
      const wdlScript = screen.getByText(/Running checksum/)
      expect(wdlScript).toBeDefined
    })
  })

  it('shows the execution log button', async () => {
    render(h(RunDetails, runDetailsProps))
    await waitFor(() => {
      const executionLog = screen.getByText('Execution Log')
      expect(executionLog).toBeDefined
    })
  })

  it('correctly identifies azure URIs', () => {
    expect(isAzureUri('https://coaexternalstorage.blob.core.windows.net/cromwell/user-inputs/inputFile.txt')).toBeTruthy
    expect(isAzureUri('gs://some-bucket/some-file.txt')).toBeFalsy
  })

  it('shows a functional log modal when clicked', async () => {
    render(h(RunDetails, runDetailsProps))
    const user = userEvent.setup()
    await waitFor(async () => {
      const executionLog = screen.getByText('Execution Log')
      await user.click(executionLog) //Open the modal

      //Verify all the element titles are present
      expect(screen.getByText('File Details')).toBeDefined
      expect(screen.getByText('Filename')).toBeDefined
      expect(screen.getByText('Preview')).toBeDefined
      expect(screen.getByText('File size')).toBeDefined
      expect(screen.getByText('Terminal download command')).toBeDefined
      expect(screen.getByText('Download')).toBeDefined

      //Verify the data loaded properly
      expect(screen.getByText('inputFile.\u200Btxt')).toBeDefined //This weird character is here because we allow line breaks on periods when displaying the filename
      expect(screen.getByText('this is the text of a mock file')).toBeDefined
    })
  })
})
