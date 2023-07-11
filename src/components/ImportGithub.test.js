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
    const addToWorkspaceButton = screen.getByText('Add to Workspace')

    expect(urlLink).toBeInTheDocument()
    expect(workflowName).toBeInTheDocument()
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

    // ** ACT **
    render(h(ImportGithub, { setLoading: jest.fn(), signal: jest.fn(), onDismiss: jest.fn() }))

    const urlLink = screen.getByPlaceholderText('Paste Github link')
    const workflowName = screen.getByPlaceholderText('Workflow Name')
    const addToWorkspaceButtonDisabled = screen.getByLabelText('Add to Workspace button')

    expect(addToWorkspaceButtonDisabled.getAttribute('aria-disabled')).toBe('true')

    fireEvent.change(urlLink, { target: { value: githubLink } })
    expect(workflowName.value).toBe('simple_task')
    const addToWorkspaceButtonEnabled = screen.getByLabelText('Add to Workspace button')
    expect(addToWorkspaceButtonEnabled.getAttribute('aria-disabled')).toBe('false')
    fireEvent.click(addToWorkspaceButtonEnabled)

    // ** ASSERT **
    // assert POST /methods endpoint was called with expected parameters & transformed github.com link
    await waitFor(() => {
      expect(postMethodFunction).toHaveBeenCalledTimes(1)
      expect(postMethodFunction).toHaveBeenCalledWith(
        {
          method_name: 'simple_task',
          method_description: undefined,
          method_source: 'GitHub',
          method_version: 'develop',
          method_url: githubLink
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

    const urlLink = screen.getByPlaceholderText('Paste Github link')
    const workflowName = screen.getByPlaceholderText('Workflow Name')

    fireEvent.change(urlLink, { target: { value: rawGithubLink } })
    // Expect autofill
    expect(workflowName.value).toBe('simple_task')
    // User change name
    fireEvent.change(workflowName, { target: { value: 'Test workflow again' } })
    const addToWorkspaceButtonEnabled = screen.getByLabelText('Add to Workspace button')
    fireEvent.click(addToWorkspaceButtonEnabled)

    // Check that raw github links still work
    await waitFor(() => {
      expect(postMethodFunction).toHaveBeenCalledTimes(1)
      expect(postMethodFunction).toHaveBeenCalledWith(
        {
          method_name: 'Test workflow again',
          method_description: undefined,
          method_source: 'GitHub',
          method_version: 'develop',
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

    const urlLink = screen.getByPlaceholderText('Paste Github link')
    const workflowName = screen.getByPlaceholderText('Workflow Name')
    const addToWorkspaceButton = screen.getByLabelText('Add to Workspace button')

    fireEvent.change(urlLink, { target: { value: 'lol.com' } })
    fireEvent.change(workflowName, { target: { value: 'Test bad workflow' } })

    expect(addToWorkspaceButton.getAttribute('aria-disabled')).toBe('true')
  })
})

