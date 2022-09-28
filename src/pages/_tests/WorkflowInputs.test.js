import '@testing-library/jest-dom'

import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { h } from 'react-hyperscript-helpers'
import { WorkflowInputs } from 'src/pages/WorkflowInputs'


describe('WorkflowInputs component', () => {
  const getRecordTypeInput = () => screen.getByLabelText('Select a Data Table *')
  const getRecordIdInput = () => screen.getByLabelText('Select Data Table row(s) *')
  const getInputDefinitionInput = () => screen.getByLabelText('Inputs definition *')
  const getOutputDefinitionInput = () => screen.getByLabelText('Outputs definition')

  it('should display workflow url upon rendering the component', async () => {
    // Arrange
    const workflowUrl = 'https://myWorkflow.wdl'
    const recordType = undefined
    const setRecordType = jest.fn()
    const recordId = undefined
    const setRecordId = jest.fn()
    const workflowInputsDefinition = undefined
    const setWorkflowInputsDefinition = jest.fn()
    const workflowOutputsDefinition = undefined
    const setWorkflowOutputsDefinition = jest.fn()

    const inputRecordType = 'BAR'
    const inputRecordId = '["BAR1"]'
    const inputsMapping = JSON.stringify([
      {
        input_name: 'workflow_input_foo',
        input_type: 'String',
        source: {
          type: 'literal',
          parameter_value: 'hello world'
        }
      }
    ])
    const outputMapping = JSON.stringify([
      {
        output_name: 'myWorkflow.myCall.output1',
        output_type: 'Int',
        record_attribute: 'entity_field_foo_rating'
      }
    ])

    // Act
    render(h(WorkflowInputs, { workflowUrl, recordType, setRecordType, recordId, setRecordId, workflowInputsDefinition, setWorkflowInputsDefinition, workflowOutputsDefinition, setWorkflowOutputsDefinition }))

    // Assert
    screen.getByText('https://myWorkflow.wdl')

    // Check that values for each input field is empty
    expect(getRecordTypeInput().value).toBe('')
    expect(getRecordIdInput().value).toBe('')
    expect(getInputDefinitionInput().value).toBe('')
    expect(getOutputDefinitionInput().value).toBe('')

    // Act
    // Enact user filling out all the input fields
    // Note: userEvent treats `{` and `[` as special characters and treats them as descriptor. As a result we need to work around
    //       it by escaping it using below regex, otherwise it throws an error. See https://github.com/testing-library/user-event/issues/584
    await act(async () => {
      await userEvent.type(getRecordTypeInput(), inputRecordType)
      await userEvent.type(getRecordIdInput(), inputRecordId.replace(/[{[]/g, '$&$&'))
      await userEvent.type(getInputDefinitionInput(), inputsMapping.replace(/[{[]/g, '$&$&'))
      await userEvent.type(getOutputDefinitionInput(), outputMapping.replace(/[{[]/g, '$&$&'))
    })

    // Assert
    // Check that input fields were updated with entered values and respective setter methods were called
    expect(setRecordType).toHaveBeenCalledWith(inputRecordType)
    expect(getRecordTypeInput().value).toBe(inputRecordType)

    expect(setRecordId).toHaveBeenCalledWith(inputRecordId)
    expect(getRecordIdInput().value).toBe(inputRecordId)

    expect(setWorkflowInputsDefinition).toHaveBeenCalledWith(inputsMapping)
    expect(getInputDefinitionInput().value).toBe(inputsMapping)

    expect(setWorkflowOutputsDefinition).toHaveBeenCalledWith(outputMapping)
    expect(getOutputDefinitionInput().value).toBe(outputMapping)
  })
})
