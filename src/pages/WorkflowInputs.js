import { Fragment } from 'react'
import { div, h, h3, span } from 'react-hyperscript-helpers'
import { IdContainer } from 'src/components/common'
import { TextArea, TextInput } from 'src/components/input'
import { FormLabel } from 'src/libs/form'


export const WorkflowInputs = ({ workflowUrl, recordType, setRecordType, recordId, setRecordId, workflowInputsDefinition, setWorkflowInputsDefinition, workflowOutputsDefinition, setWorkflowOutputsDefinition }) => {
  // used as placeholder to let users know expected structure of inputs definition.
  // To be removed later when we design UI for entering the input definition.
  const inputMappingExample = [
    {
      input_name: 'workflow_input_foo',
      input_type: 'String',
      source: {
        type: 'literal',
        parameter_value: 'hello world'
      }
    },
    {
      input_name: 'workflow_input_foo_rating',
      input_type: 'Int',
      source: {
        type: 'record_lookup',
        record_attribute: 'record_field_foo_rating'
      }
    }
  ]
  const outputMappingExample = [
    {
      output_name: 'myWorkflow.myCall.output1',
      output_type: 'Int',
      record_attribute: 'entity_field_foo_rating'
    },
    {
      output_name: 'myWorkflow.finalOutput',
      output_type: 'String',
      record_attribute: 'entity_field_final'
    }
  ]

  return div([
    div({ style: { marginTop: '2rem' } }, [
      span({ style: { fontWeight: 'bold' } }, ['Using workflow ']),
      span([workflowUrl])
    ]),
    div({ style: { marginTop: '2rem' } }, [
      h3(['Provide Inputs']),
      div([
        div({ style: { display: 'flex', justifyContent: 'space-between' } }, [
          div([
            h(IdContainer, [id => h(Fragment, [
              h(FormLabel, { htmlFor: id, required: true }, ['Select a Data Table']),
              h(TextInput, {
                id,
                style: { display: 'block', width: '100ex' },
                placeholder: 'FOO',
                value: recordType,
                onChange: setRecordType
              })
            ])])
          ]),
          div([
            h(IdContainer, [id => h(Fragment, [
              h(FormLabel, { htmlFor: id, required: true }, ['Select Data Table row(s)']),
              h(TextInput, {
                id,
                style: { display: 'block', width: '100ex' },
                placeholder: '["F0011111-1111-1111-1111-111111111111"]',
                value: recordId,
                onChange: setRecordId
              })
            ])])
          ])
        ]),
        div({ style: { display: 'flex', justifyContent: 'space-between' } }, [
          div([
            h(IdContainer, [id => h(Fragment, [
              h(FormLabel, { htmlFor: id, required: true }, ['Inputs definition']),
              h(TextArea, {
                id,
                style: { display: 'block', height: 360, width: '100ex' },
                placeholder: `Paste your JSON input mapping here. For example,\n ${JSON.stringify(inputMappingExample, null, 4)}`,
                value: workflowInputsDefinition,
                onChange: setWorkflowInputsDefinition
              })
            ])])
          ]),
          div([
            h(IdContainer, [id => h(Fragment, [
              h(FormLabel, { htmlFor: id }, ['Outputs definition']),
              h(TextArea, {
                id,
                style: { display: 'block', height: 360, width: '100ex' },
                placeholder: `Paste your JSON output mapping here. For example,\n ${JSON.stringify(outputMappingExample, null, 4)}`,
                value: workflowOutputsDefinition,
                onChange: setWorkflowOutputsDefinition
              })
            ])])
          ])
        ])
      ])
    ])
  ])
}
