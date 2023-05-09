import '@testing-library/jest-dom'

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { h } from 'react-hyperscript-helpers'
import ImportGithub from 'src/components/ImportGithub'
import { Ajax } from 'src/libs/ajax'


jest.mock('src/libs/ajax')
jest.mock('src/libs/notifications.js')
jest.mock('src/libs/nav.js')
jest.mock('src/libs/config', () => ({
  ...jest.requireActual('src/libs/config'),
  getConfig: jest.fn().mockReturnValue({})
}))

describe('Add a Workflow Link', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render text inputs/headers', async () => {
    // ** ACT **
    await act(async () => {
      await render(h(ImportGithub, { onDismiss: jest.fn() }))
    })

    const urlLink = screen.getByText('Workflow Link *')
    const workflowName = screen.getByText('Workflow Name *')
    const workflowVersion = screen.getByText('Workflow Version *')
    const addToWorkspaceButton = screen.getByText('Add to Workspace')

    expect(urlLink).toBeInTheDocument()
    expect(workflowName).toBeInTheDocument()
    expect(workflowVersion).toBeInTheDocument()
    expect(addToWorkspaceButton).toBeInTheDocument()
  })

  it('should submit github.com links', async () => {
    const postMethodFunction = jest.fn(() => Promise.resolve({ method_id: 'abc123' }))

    await Ajax.mockImplementation(() => {
      return {
        Cbas: {
          methods: {
            post: postMethodFunction
          }
        }
      }
    })

    const githubLink = 'https://github.com/broadinstitute/cromwell/blob/develop/wdl/transforms/draft3/src/test/cases/simple_task.wdl'
    const rawGithubLink = 'https://raw.githubusercontent.com/broadinstitute/cromwell/develop/wdl/transforms/draft3/src/test/cases/simple_task.wdl'
    // ** ACT **
    render(h(ImportGithub, { setLoading: jest.fn(), signal: jest.fn(), onDismiss: jest.fn() }))

    const urlLink = screen.getByPlaceholderText('Paste Github link')
    const workflowName = screen.getByPlaceholderText('Workflow Name')
    const workflowVersion = screen.getByPlaceholderText('Workflow Version')
    const addToWorkspaceButton = screen.getByText('Add to Workspace')

    fireEvent.change(urlLink, { target: { value: githubLink } })
    fireEvent.change(workflowName, { target: { value: 'Test workflow' } })
    fireEvent.change(workflowVersion, { target: { value: 'v.01' } })
    fireEvent.click(addToWorkspaceButton)

    // ** ASSERT **
    // assert POST /methods endpoint was called with expected parameters & transformed github.com link
    await waitFor(() => {
      expect(postMethodFunction).toHaveBeenCalled()
      expect(postMethodFunction).toHaveBeenCalledWith(
        {
          method_name: 'Test workflow',
          method_description: undefined,
          method_source: 'GitHub',
          method_version: 'v.01',
          method_url: rawGithubLink
        })
    })
    jest.clearAllMocks()
  })

  it('should accept raw github.com links', async () => {
    const rawGithubLink = 'https://raw.githubusercontent.com/broadinstitute/cromwell/develop/wdl/transforms/draft3/src/test/cases/simple_task.wdl'
    const postMethodFunction = jest.fn(() => Promise.resolve({ method_id: 'abc123' }))

    await Ajax.mockImplementation(() => {
      return {
        Cbas: {
          methods: {
            post: postMethodFunction
          }
        }
      }
    })

    // ** ACT **
    render(h(ImportGithub, { setLoading: jest.fn(), signal: jest.fn(), onDismiss: jest.fn() }))

    const urlLink = screen.getByLabelText('Github link input')
    const workflowName = screen.getByLabelText('Workflow name input')
    const workflowVersion = screen.getByLabelText('Version name input')
    const addToWorkspaceButton = screen.getByLabelText('Add to Workspace button')

    fireEvent.change(urlLink, { target: { value: rawGithubLink } })
    fireEvent.change(workflowName, { target: { value: 'Test workflow again' } })
    fireEvent.change(workflowVersion, { target: { value: 'v.02' } })
    fireEvent.click(addToWorkspaceButton)

    // Check that raw github links still work
    await waitFor(() => {
      expect(postMethodFunction).toHaveBeenCalledTimes(1)
      expect(postMethodFunction).toHaveBeenCalledWith(
        {
          method_name: 'Test workflow again',
          method_description: undefined,
          method_source: 'GitHub',
          method_version: 'v.02',
          method_url: rawGithubLink
        })
    })
  })

  it('should fail when given a non github link', async () => {
    const postMethodFunction = jest.fn(() => Promise.resolve({ method_id: 'abc123' }))

    await Ajax.mockImplementation(() => {
      return {
        Cbas: {
          methods: {
            post: postMethodFunction
          }
        }
      }
    })

    const onDismiss = jest.fn()
    // ** ACT **
    render(h(ImportGithub, { setLoading: jest.fn(), signal: jest.fn(), onDismiss }))

    const urlLink = screen.getByLabelText('Github link input')
    const workflowName = screen.getByLabelText('Workflow name input')
    const workflowVersion = screen.getByLabelText('Version name input')
    const addToWorkspaceButton = screen.getByLabelText('Add to Workspace button')

    fireEvent.change(urlLink, { target: { value: 'lol.com' } })
    fireEvent.change(workflowName, { target: { value: 'Test bad workflow' } })
    fireEvent.change(workflowVersion, { target: { value: 'v.03' } })
    fireEvent.click(addToWorkspaceButton)

    // Check that raw github links still work
    await waitFor(() => {
      expect(postMethodFunction).toHaveBeenCalledTimes(1)
      expect(postMethodFunction).toHaveBeenCalledWith(
        {
          method_name: 'Test bad workflow',
          method_description: undefined,
          method_source: 'GitHub',
          method_version: 'v.03',
          method_url: 'lol.com'
        })
    })

    // onDismiss is called when an error occurs in the modal
    expect(onDismiss).toHaveBeenCalled()
  })
})

