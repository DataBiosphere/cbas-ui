/* eslint-disable no-unused-expressions */
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { cloneDeep } from 'lodash/fp'
import { h } from 'react-hyperscript-helpers'
import { collapseCromwellStatus } from 'src/components/job-common'
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

const mockObj = {
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

beforeEach(() => {
  Ajax.mockImplementation(() => {
    return mockObj
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
      const collapseTitle = screen.getByTestId('workflow-failures-dropdown')
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
      const collapseTitle = screen.getByTestId('workflow-script-dropdown')
      expect(collapseTitle).toBeDefined
      await user.click(collapseTitle)
      const wdlCollapseContainer = screen.getByTestId('wdl-code-block')
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
      const table = screen.getByTestId('call-table-container')
      expect(table).toBeDefined
      const rows = within(table).getAllByRole('row')
      expect(rows.length).toEqual(calcRowCount())
      const taskRows = rows.slice(1)
      const taskNames = Object.keys(calls)
      taskNames.forEach((taskName, index) => {
        const { executionStatus, backendStatus, start, end } = calls[taskName][0]
        const row = taskRows[index]
        const taskCell = within(row).getByText(taskName)
        expect(taskCell).toBeDefined
        const stdout = within(row).getByText('stdout')
        expect(stdout).toBeDefined
        const stderr = within(row).getByText('stderr')
        expect(stderr).toBeDefined
        //Following checks are looking for the taget text on the cell and on the tooltip elements
        const statusObj = collapseCromwellStatus(executionStatus, backendStatus)
        const status = within(row).queryAllByText(statusObj.label())
        expect(status.length).toEqual(2)
        const startTime = within(row).queryAllByText(makeCompleteDate(start))
        expect(startTime.length).toEqual(2)
        const endTime = within(row).queryAllByText(makeCompleteDate(end))
        expect(endTime.length).toEqual(2)
      })
    })
  })

  it('only shows failed tasks if a workflow has failed', async () => {
    const workflowCopy = cloneDeep(runDetailsMetadata)
    const targetCall = Object.values(workflowCopy.calls)[0]
    const callCopy = cloneDeep(targetCall)
    callCopy[0].executionStatus = 'Failed'
    workflowCopy.calls['Failed Call'] = callCopy
    workflowCopy.status = 'Failed'
    const { start, end } = callCopy[0]

    const modifiedMock = Object.assign({}, cloneDeep(mockObj), { Cromwell: { workflows: () => { return { metadata: () => { return workflowCopy } } } } })

    //redefine Ajax mock so that it returns the modified workflow instead of the original
    Ajax.mockImplementation(() => {
      return modifiedMock
    })

    render(h(RunDetails, { runDetailsProps }))
    await waitFor(() => {
      const statusFilter = screen.getByTestId('status-dropdown-filter')
      const failedOption = within(statusFilter).getByText('Failed')
      expect(failedOption).toBeDefined

      const table = screen.getByTestId('call-table-container')
      const rows = within(table).getAllByRole('row')
      expect(rows.length).toEqual(2)
      const targetRow = within(table).getAllByRole('row')[1]
      expect(targetRow).toBeDefined
      const taskName = within(targetRow).getByText('Failed Call')
      expect(taskName).toBeDefined
      const failedStatus = within(targetRow).queryAllByText('Failed')
      expect(failedStatus.length).toEqual(2)
      const startTime = within(targetRow).queryAllByText(makeCompleteDate(start))
      expect(startTime.length).toEqual(2)
      const endTime = within(targetRow).queryAllByText(makeCompleteDate(end))
      expect(endTime.length).toEqual(2)
      const stdout = within(targetRow).getByText('stdout')
      expect(stdout).toBeDefined
      const stderr = within(targetRow).getByText('stderr')
      expect(stderr).toBeDefined
    })
  })

  it('opens the uri viewer modal when stdout is clicked', async () => {
    render(h(RunDetails, runDetailsProps))
    const user = userEvent.setup()
    await waitFor(async () => {
      const table = screen.getByTestId('call-table-container')
      expect(table).toBeDefined
      const stdout = within(table).queryAllByText('stdout')
      await user.click(stdout[0])
      const modalTitle = screen.getByText('File Details')
      expect(modalTitle).toBeDefined
    })
  })

  it('opens the uri viewer modal when stderr is clicked', async () => {
    render(h(RunDetails, runDetailsProps))
    const user = userEvent.setup()
    await waitFor(async () => {
      const table = screen.getByTestId('call-table-container')
      expect(table).toBeDefined
      const stderr = within(table).queryAllByText('stderr')
      await user.click(stderr[0])
      const modalTitle = screen.getByText('File Details')
      expect(modalTitle).toBeDefined
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

  it('filters out task list via task name search', async () => {
    const taskName = Object.keys(runDetailsMetadata.calls)[0]
    render(h(RunDetails, runDetailsProps))
    await waitFor(async () => {
      const searchInput = screen.getByTestId('task-name-search-input')
      expect(searchInput).toBeDefined
      await fireEvent.change(searchInput, { target: { value: 'Random' } })
      const updatedTable = screen.getByTestId('call-table-container')
      const updatedRows = within(updatedTable).getAllByRole('row')
      expect(updatedRows.length).toEqual(1)
      const updatedElements = within(updatedTable).queryAllByText(taskName)
      expect(updatedElements.length).toEqual(0)
    })
  })

  it('filters in tasks via task name search', async () => {
    const taskName = Object.keys(runDetailsMetadata.calls)[0]
    render(h(RunDetails, runDetailsProps))
    await waitFor(async () => {
      const searchInput = screen.getByTestId('task-name-search-input')
      expect(searchInput).toBeDefined
      await fireEvent.change(searchInput, { target: { value: 'Fetch' } })
      const updatedTable = screen.getByTestId('call-table-container')
      const updatedRows = within(updatedTable).getAllByRole('row')
      expect(updatedRows.length).toEqual(2)
      const updatedElement = within(updatedTable).queryAllByText(taskName)
      expect(updatedElement.length).toEqual(1)
      expect(updatedElement[0].textContent).toEqual(taskName)
    })
  })
})
