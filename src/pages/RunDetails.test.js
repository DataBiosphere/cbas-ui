/* eslint-disable no-unused-expressions */
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { cloneDeep } from 'lodash/fp'
import { h } from 'react-hyperscript-helpers'
import { appendSASTokenIfNecessary, getFilenameFromAzureBlobPath } from 'src/components/InputOutputModal'
import { collapseCromwellStatus } from 'src/components/job-common'
import { isAzureUri } from 'src/components/URIViewer/uri-viewer-utils'
import { Ajax } from 'src/libs/ajax'
import * as configStore from 'src/libs/config'
import { makeCompleteDate } from 'src/libs/utils'

import { failedTasks, failedTasks as failedTasksMetadata } from '../fixtures/failed-tasks'
import { metadata as childMetadata } from '../fixtures/test-child-workflow'
import { metadata as parentMetadata } from '../fixtures/test-parent-workflow'
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
  submissionId: '000sdkfjsdfj-dfdsfdsf3-sdfsdjfkj3',
  workflowId: '00001111-2222-3333-aaaa-bbbbccccdddd',
  uri: 'https://coaexternalstorage.blob.core.windows.net/cromwell/user-inputs/inputFile.txt'
}

const mockObj = {
  Cromwell: {
    workflows: () => {
      return {
        metadata: () => {
          return runDetailsMetadata
        },
        failedTasks: () => {
          return failedTasksMetadata
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

const subworkflowCromwellAjaxMock = (parentOverride = {}) => {
  const modifiedParentMetadata = Object.assign({}, parentMetadata, parentOverride)
  return {
    Cromwell: {
      workflows: id => {
        return {
          metadata: () => {
            const workflowMap = {
              [parentMetadata.id]: modifiedParentMetadata,
              [childMetadata.id]: childMetadata
            }
            return workflowMap[id]
          },
          failedTasks: () => {
            return {}
          }
        }
      }
    }
  }
}

beforeEach(() => {
  Ajax.mockImplementation(() => {
    return mockObj
  })
})

afterEach(() => {
  jest.resetAllMocks()
})

describe('RunDetails - render smoke test', () => {
  const originalOffsetHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetHeight')
  const originalOffsetWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetWidth')

  beforeAll(() => {
    Object.defineProperty(HTMLElement.prototype, 'offsetHeight', { configurable: true, value: 1000 })
    Object.defineProperty(HTMLElement.prototype, 'offsetWidth', { configurable: true, value: 800 })
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
      const statusContainer = screen.getByTestId('status-container')
      const statusText = within(statusContainer).getByText(runDetailsMetadata.status)
      expect(statusText).toBeDefined
    })
  })

  it('shows the workflow timing', async () => {
    render(h(RunDetails, runDetailsProps))
    await waitFor(() => {
      const startTime = screen.getByTestId('workflow-start-container')
      expect(startTime).toBeDefined
      const endTime = screen.getByTestId('workflow-end-container')
      expect(endTime).toBeDefined
      const formattedStart = makeCompleteDate(runDetailsMetadata.start)
      const formattedEnd = makeCompleteDate(runDetailsMetadata.end)
      expect(startTime.textContent).toContain(formattedStart)
      expect(endTime.textContent).toContain(formattedEnd)
    })
  })

  it('shows the troubleshooting box', async () => {
    render(h(RunDetails, runDetailsProps))
    await waitFor(() => {
      const troubleshootingBox = screen.getByText('Troubleshooting?')
      expect(troubleshootingBox).toBeDefined
      const workflowId = screen.getByText(runDetailsProps.workflowId)
      expect(workflowId).toBeDefined
      const troubleshootingId = screen.getByText(runDetailsProps.submissionId)
      expect(troubleshootingId).toBeDefined
      const executionLog = screen.getByText('Execution Log')
      expect(executionLog).toBeDefined
    })
  })

  it('has copy buttons', async () => {
    render(h(RunDetails, runDetailsProps))
    await waitFor(() => {
      const workflowIdCopyButton = screen.getByTestId('workflow-clipboard-button')
      const submissionIdCopyButton = screen.getByTestId('submission-clipboard-button')
      expect(workflowIdCopyButton).toBeDefined
      expect(submissionIdCopyButton).toBeDefined
      const workflowId = screen.getByText(runDetailsProps.workflowId)
      const submissionId = screen.getByText(runDetailsProps.submissionId)
      expect(workflowId).toBeDefined
      expect(submissionId).toBeDefined
    })
  })

  it('shows the wdl text in a modal component', async () => {
    render(h(RunDetails, runDetailsProps))
    const user = userEvent.setup()
    await waitFor(async () => {
      const viewModalLink = screen.getByText('View Workflow Script')
      await user.click(viewModalLink)
      const wdlScript = screen.getByText(/Retrieve reads from the/)
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
        const stdout = within(row).getByTestId('stdout-modal-link')
        expect(stdout).toBeDefined
        const stderr = within(row).getByTestId('stderr-modal-link')
        expect(stderr).toBeDefined
        const inputs = within(row).getByTestId('inputs-modal-link')
        expect(inputs).toBeDefined
        const outputs = within(row).getByTestId('outputs-modal-link')
        expect(outputs).toBeDefined
        //Checking row text content for dates since querying by formatted date doesn't seem to work
        const statusObj = collapseCromwellStatus(executionStatus, backendStatus)
        const status = within(row).queryAllByText(statusObj.label())
        expect(status.length).toEqual(2)
        const targetStartText = makeCompleteDate(start)
        const targetEndText = makeCompleteDate(end)
        expect(row.textContent).toContain(targetStartText)
        expect(row.textContent).toContain(targetEndText)
      })
    })
  })

  it('only shows failed tasks if a workflow has failed', async () => {
    const failedTaskCalls = Object.values(failedTasks)[0].calls
    const targetCall = Object.values(failedTaskCalls)[0][0]
    const { start, end } = targetCall
    const workflowCopy = cloneDeep(runDetailsMetadata)
    workflowCopy.status = 'Failed'

    const modifiedMock = Object.assign({}, cloneDeep(mockObj), {
      Cromwell: {
        workflows: () => {
          return {
            metadata: () => { return workflowCopy },
            failedTasks: () => { return failedTasksMetadata }
          }
        }
      }
    })

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
      expect(rows.length).toEqual(6)
      const targetRow = within(table).getAllByRole('row')[1]
      expect(targetRow).toBeDefined
      const taskName = within(targetRow).getByText('sub_wf_scattering.subSubworkflowHello')
      expect(taskName).toBeDefined
      const failedStatus = within(targetRow).queryAllByText('Failed')
      expect(failedStatus.length).toEqual(2)
      const targetStartText = makeCompleteDate(start)
      const targetEndText = makeCompleteDate(end)
      expect(targetRow.textContent).toContain(targetStartText)
      expect(targetRow.textContent).toContain(targetEndText)
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

  it('shows a static error message on UriViewer if stdout cannot be retrieved', async () => {
    const altMockObj = cloneDeep(mockObj)
    altMockObj.AzureStorage.getTextFileFromBlobStorage = () => Promise.reject('Mock error')
    Ajax.mockImplementation(() => altMockObj)
    render(h(RunDetails, runDetailsProps))
    const user = userEvent.setup()
    await waitFor(async () => {
      const table = screen.getByTestId('call-table-container')
      expect(table).toBeDefined
      const stdout = within(table).queryAllByText('stdout')
      await user.click(stdout[0])
      const modalTitle = screen.getByText('File Details')
      expect(modalTitle).toBeDefined
      const errorText = screen.getByText('Log file not found. This may be the result of a task failing to start. Please check relevant docker images and file paths to ensure valid references.')
      expect(errorText).toBeDefined
    })
  })

  it('shows a static error message on UriViewer if stderr cannot be retrieved', async () => {
    const altMockObj = cloneDeep(mockObj)
    altMockObj.AzureStorage.getTextFileFromBlobStorage = () => Promise.reject('Mock error')
    Ajax.mockImplementation(() => altMockObj)
    render(h(RunDetails, runDetailsProps))
    const user = userEvent.setup()
    await waitFor(async () => {
      const table = screen.getByTestId('call-table-container')
      expect(table).toBeDefined
      const stderr = within(table).queryAllByText('stderr')
      await user.click(stderr[0])
      const modalTitle = screen.getByText('File Details')
      expect(modalTitle).toBeDefined
      const errorText = screen.getByText('Log file not found. This may be the result of a task failing to start. Please check relevant docker images and file paths to ensure valid references.')
      expect(errorText).toBeDefined
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

  it('opens the input/output modal when Inputs is clicked', async () => {
    render(h(RunDetails, runDetailsProps))
    const user = userEvent.setup()
    await waitFor(async () => {
      const table = screen.getByTestId('call-table-container')
      expect(table).toBeDefined
      const inputs = within(table).queryAllByTestId('inputs-modal-link')
      await user.click(inputs[0])
      const keyHeader = screen.getByTestId('inputoutput-key-header')
      expect(keyHeader).toBeDefined
      const valueHeader = screen.getByTestId('inputoutput-value-header')
      expect(valueHeader.toBeDefined)
      const firstRowKey = screen.getByText('docker')
      expect(firstRowKey).toBeDefined
      const firstRowValue = screen.getByText('quay.io/broadinstitute/ncbi-tools:2.10.7.10')
      expect(firstRowValue.toBeDefined)
    })
  })

  it('opens the input/output modal when Outputs is clicked', async () => {
    render(h(RunDetails, runDetailsProps))
    const user = userEvent.setup()
    await waitFor(async () => {
      const table = screen.getByTestId('call-table-container')
      expect(table).toBeDefined
      const outputs = within(table).queryAllByTestId('outputs-modal-link')
      await user.click(outputs[0])
      //There is no output data in this test case, but the modal still open.
      const keyHeader = screen.getByTestId('inputoutput-key-header')
      expect(keyHeader).toBeDefined
      const valueHeader = screen.getByTestId('inputoutput-value-header')
      expect(valueHeader.toBeDefined)
    })
  })

  it('input/output modal file functions work as expected', () => {
    const mockWorkspaceId = 'd4564046-bbba-495c-afec-14f7d3a8283a'
    jest.spyOn(configStore, 'getConfig').mockReturnValue({ workspaceId: mockWorkspaceId })
    const publicURI = 'https://lze033433beed5b4a6a47de6.blob.core.windows.net/sc-e3ac5af2-dc4f-42cc-9111-a6f37acfe21a/ref-sarscov2-NC_045512.2.fasta'
    const privateURI = 'https://lz43a8a3d21540dfd25f5ace.blob.core.windows.net/sc-d4564046-bbba-495c-afec-14f7d3a8283a/workspace-services/cbas/terra-app-566e92a0-e55e-4250-b4c1-d0925dd03916/assemble_refbased/43d15a0d-848b-46e3-a1da-02b37caaa761/call-align_to_ref/shard-0/execution/stdout'
    const mockSAS = 'mockSAS'

    expect(privateURI.includes(mockWorkspaceId)).toBeTruthy //sanity check that the test is set up properly

    //Should be the last thing after the slash
    const publicFilename = getFilenameFromAzureBlobPath(publicURI)
    const privateFilename = getFilenameFromAzureBlobPath(privateURI)
    expect(publicFilename).toEqual('ref-sarscov2-NC_045512.2.fasta')
    expect(privateFilename).toEqual('stdout')
    expect(getFilenameFromAzureBlobPath('')).toEqual('')
    expect(getFilenameFromAzureBlobPath(undefined)).toEqual('')

    //Should only append SAS if it is a private URI
    const appendedPublic = appendSASTokenIfNecessary(publicURI, mockSAS)
    const appendedPrivate = appendSASTokenIfNecessary(privateURI, mockSAS)
    expect(appendedPublic).toEqual(publicURI)
    expect(appendedPrivate).toEqual(`${privateURI}?${mockSAS}`)
  })

  it('renders the workflow path above the table for successful workflows', async () => {
    render(h(RunDetails, runDetailsProps))
    await waitFor(() => {
      const workflowPath = screen.getByTestId('workflow-path')
      expect(workflowPath).toBeDefined
      const workflowPathText = within(workflowPath).getByText(runDetailsMetadata.workflowName)
      expect(workflowPathText).toBeDefined
    })
  })

  it('shows the "View sub-workflow" button for sub-workflows', async () => {
    const altMockObj = cloneDeep(mockObj)
    const altRunDetailsProps = Object.assign({}, runDetailsProps, { workflowId: parentMetadata.id })
    Ajax.mockImplementation(() => Object.assign({}, altMockObj, subworkflowCromwellAjaxMock({ status: 'Succeeded' })))
    render(h(RunDetails, altRunDetailsProps))
    await waitFor(() => {
      const childId = childMetadata.id
      const table = screen.getByTestId('call-table-container')
      const subworkflowButton = within(table).getByTestId(`view-subworkflow-${childId}`)
      expect(subworkflowButton).toBeDefined
    })
  })

  it('updates the workflow path when the "View sub-workflow" button is clicked', async () => {
    const altMockObj = cloneDeep(mockObj)
    const altRunDetailsProps = Object.assign({}, runDetailsProps, { workflowId: parentMetadata.id })
    Ajax.mockImplementation(() => Object.assign({}, altMockObj, subworkflowCromwellAjaxMock({ status: 'Succeeded' })))
    const user = userEvent.setup()
    render(h(RunDetails, altRunDetailsProps))
    await waitFor(async () => {
      const childId = childMetadata.id
      const table = screen.getByTestId('call-table-container')
      const subworkflowButton = within(table).getByTestId(`view-subworkflow-${childId}`)
      expect(subworkflowButton).toBeDefined
      await user.click(subworkflowButton)
      const workflowPath = screen.getByTestId('workflow-path')
      expect(workflowPath).toBeDefined
      const childIdText = within(workflowPath).getByText(childMetadata.workflowName)
      expect(childIdText).toBeDefined
    })
  })

  it('updates the table to show the sub-workflow calls when the "View sub-workflow" button is clicked', async () => {
    const altMockObj = cloneDeep(mockObj)
    const altRunDetailsProps = Object.assign({}, runDetailsProps, { workflowId: parentMetadata.id })
    Ajax.mockImplementation(() => Object.assign({}, altMockObj, subworkflowCromwellAjaxMock({ status: 'Succeeded' })))
    const user = userEvent.setup()
    render(h(RunDetails, altRunDetailsProps))
    await waitFor(async () => {
      const childId = childMetadata.id
      const table = screen.getByTestId('call-table-container')
      const subworkflowButton = within(table).getByTestId(`view-subworkflow-${childId}`)
      await user.click(subworkflowButton)
      const updatedTable = screen.getByTestId('call-table-container')
      const subWorkflowTaskNames = Object.keys(childMetadata.calls)
      subWorkflowTaskNames.forEach(taskName => {
        const taskNameText = within(updatedTable).getByText(taskName)
        expect(taskNameText).toBeDefined
      })
    })
  })

  it('updates the workflow path and the table if the user clicks on a workflow id within the workflow path', async () => {
    const altMockObj = cloneDeep(mockObj)
    const altRunDetailsProps = Object.assign({}, runDetailsProps, { workflowId: parentMetadata.id })
    Ajax.mockImplementation(() => Object.assign({}, altMockObj, subworkflowCromwellAjaxMock({ status: 'Succeeded' })))
    const user = userEvent.setup()
    render(h(RunDetails, altRunDetailsProps))
    await waitFor(async () => {
      const childId = childMetadata.id
      const table = screen.getByTestId('call-table-container')
      const subworkflowButton = within(table).getByTestId(`view-subworkflow-${childId}`)
      await user.click(subworkflowButton)
      const workflowPath = screen.getByTestId('workflow-path')
      const targetIdPath = within(workflowPath).getByText(parentMetadata.workflowName)
      await user.click(targetIdPath)
      const updatedTable = screen.getByTestId('call-table-container')
      const updatedPath = screen.getByTestId('workflow-path')
      const parentWorkflowName = within(updatedPath).getByText(parentMetadata.workflowName)
      expect(parentWorkflowName).toBeDefined
      expect(screen.queryByText(childMetadata.workflowName)).not.toBeInTheDocument
      const parentTaskNames = Object.keys(parentMetadata.calls)
      parentTaskNames.forEach(taskName => {
        const taskNameText = within(updatedTable).getByText(taskName)
        expect(taskNameText).toBeDefined
      })
    })
  })
})
