/* eslint-disable no-unused-expressions */
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { h } from 'react-hyperscript-helpers'
import { isAzureUri } from 'src/components/URIViewer/uri-viewer-utils'
import { Ajax } from 'src/libs/ajax'
import { makeCompleteDate } from 'src/libs/utils'

import { metadata as runDetailsMetadata } from '../fixtures/test-workflow'
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

// const end = new Date()
// const start = new Date(end.getMilliseconds() - 1000000)

beforeEach(() => {
  Ajax.mockImplementation(() => {
    return {
      Cromwell: {
        workflows: () => {
          return {
            metadata: () => {
              return runDetailsMetadata
            }
          }
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
      const statusContainer = screen.getByTestId('workflow-status-container')
      const statusText = within(statusContainer).getByText(runDetailsMetadata.status)
      expect(statusText).toBeDefined
    })
  })

  it('shows the workflow timing', async () => {
    render(h(RunDetails, runDetailsProps))
    await waitFor(() => {
      const startTime = screen.getByTestId('workflow-start-time')
      expect(startTime).toBeDefined
      const endTime = screen.getByTestId('workflow-end-time')
      expect(endTime).toBeDefined
    })
  })

  it('shows the workflow id', async () => {
    render(h(RunDetails, runDetailsProps))
    await waitFor(() => {
      const workflowIdSpan = screen.getByTestId('workflow-engine-id-span')
      const workflowId = within(workflowIdSpan).getByText(runDetailsProps.workflowId)
      expect(workflowId).toBeDefined
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

  it('shows the wdl text in a dedicated code block', async () => {
    render(h(RunDetails, runDetailsProps))
    const user = userEvent.setup()
    await waitFor(async () => {
      const collapseTitle = screen.getByText('Submitted workflow script')
      await user.click(collapseTitle)
      const wdlCollapseContainer = screen.getByTestId('workflow-script-collapse')
      const wdlScript = within(wdlCollapseContainer).getByText(/Retrieve reads from the NCBI Short Read Archive/)
      expect(wdlScript).toBeDefined
    })
  })

  it('shows the calls in a table', async () => {
    const { calls } = runDetailsMetadata

    const calcRowCount = () => {
      const callNames = Object.keys(calls)
      return callNames.reduce((rows, callName) => {
        rows += (calls[callName]?.length || 0)
        return rows
      }, 1)
    }

    render(h(RunDetails, runDetailsProps))

    await waitFor(() => {
      const table = screen.getByTestId('workflow-call-table')
      const rows = within(table).getAllByRole('row')
      expect(rows.length).toEqual(calcRowCount())
      const taskNames = Object.keys(calls)
      //NOTE: finish up row evaluation portion of this test
      // taskNames.forEach(taskName => {
      //   const taskCallArray = calls[taskName]
      //   const
      // }
    })
  })

  it('shows the execution log button', async () => {
    render(h(RunDetails, runDetailsProps))
    await waitFor(() => {
      const executionLog = screen.getByText('Execution log')
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
      const executionLog = screen.getByText('Execution log')
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
