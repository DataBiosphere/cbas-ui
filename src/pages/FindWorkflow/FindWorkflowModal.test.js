import '@testing-library/jest-dom'

import { render, screen } from '@testing-library/react'
import { h } from 'react-hyperscript-helpers'
import FindWorkflowModal from 'src/pages/FindWorkflow/FindWorkflowModal'


describe('FindWorkflowModal', () => {
  it('should render FindWorkflowModal with 3 hardcoded Method cards', () => {
    // ** ACT **
    render(h(FindWorkflowModal, { onDismiss: jest.fn() }))

    // ** ASSERT **
    expect(screen.getByText('Find a Workflow')).toBeInTheDocument()

    // verify "Browse Suggested Workflows" sub-header is present and selected by default
    const selectedSubHeader = screen.getByText('Browse Suggested Workflows')
    expect(selectedSubHeader).toBeInTheDocument()
    expect(selectedSubHeader).toHaveAttribute('aria-current', 'true')

    // verify 3 methods are present on screen
    // we only check for name because we are testing the MethodCard layout in different test file
    expect(screen.getByText('mock_method_1')).toBeInTheDocument()
    expect(screen.getByText('mock_method_2')).toBeInTheDocument()
    expect(screen.getByText('mock_method_3')).toBeInTheDocument()
  })
})
