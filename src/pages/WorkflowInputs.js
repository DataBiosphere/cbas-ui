import { Fragment } from 'react'
import { div, h, h3, span } from 'react-hyperscript-helpers'
import { IdContainer } from 'src/components/common'
import { TextArea, TextInput } from 'src/components/input'
import { FormLabel } from 'src/libs/form'


export const WorkflowInputs = ({ workflowUrl, recordType, setRecordType, recordId, setRecordId, workflowInputsDefinition, setWorkflowInputsDefinition }) => {
  // used as placeholder to let users know expected structure of inputs definition.
  // To be removed later when we design UI for entering the input definition.
  const inputMappingExample = [
    {
      parameter_name: 'workflow_input_foo',
      parameter_type: 'String',
      source: {
        type: 'literal',
        record_attribute: 'hello world'
      }
    },
    {
      parameter_name: 'workflow_input_foo_rating',
      parameter_type: 'Int',
      source: {
        type: 'record_lookup',
        record_attribute: 'record_field_foo_rating'
      }
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
              h(FormLabel, { htmlFor: id }, ['Record Type']),
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
              h(FormLabel, { htmlFor: id }, ['Record ID(s)']),
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
        h(IdContainer, [id => h(Fragment, [
          h(FormLabel, { htmlFor: id }, ['Inputs definition']),
          h(TextArea, {
            id,
            style: { height: 360 },
            placeholder: `Paste your JSON input mapping here. For example,\n ${JSON.stringify(inputMappingExample, null, 4)}`,
            value: workflowInputsDefinition,
            onChange: setWorkflowInputsDefinition
          })
        ])])
      ])
    ])
  ])
}
