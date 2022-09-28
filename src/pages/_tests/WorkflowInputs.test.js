import '@testing-library/jest-dom'

import { fireEvent, render, screen, within } from '@testing-library/react'
import { h } from 'react-hyperscript-helpers'
import { WorkflowInputs } from 'src/pages/WorkflowInputs'

describe('WorkflowInputs component', () => {
  const workflowUrl = 'https://myWorkflow.wdl'

  it('should display workflow url upon rendering the component', () => {
    const entityType = jest.fn()
    const setEntityType = jest.fn()
    const entityId = jest.fn()
    const setEntityId = jest.fn()
    const workflowInputsDefinition = jest.fn()
    const setWorkflowInputsDefinition = jest.fn()
    const workflowOutputsDefinition = jest.fn()
    const setWorkflowOutputsDefinition = jest.fn()

    render(h(WorkflowInputs, {workflowUrl, entityType, setEntityType, entityId, setEntityId, workflowInputsDefinition, setWorkflowInputsDefinition, workflowOutputsDefinition, setWorkflowOutputsDefinition}))

    screen.getByText('Nothing here yet! Your previously run workflows will be saved here.')
  })
})
