import { Fragment } from 'react'
import { div, h, h3, span } from 'react-hyperscript-helpers'
import { IdContainer } from 'src/components/common'
import { TextArea, TextInput } from 'src/components/input'
import { FormLabel } from 'src/libs/form'


export const WorkflowInputs = ({ workflowUrl, entityType, setEntityType, entityId, setEntityId, workflowInputsDefinition, setWorkflowInputsDefinition }) => {
  // used as placeholder to let users know expected structure of inputs definition
  const inputMappingExample = '\n[\n' +
    '\t{\n' +
    '    \t"parameter_name": "workflow_input_foo_rating",\n' +
    '      \t"parameter_type": "String",\n' +
    '      \t"source": {\n' +
    '        \t"type": "entity_lookup",\n' +
    '        \t"entity_attribute": "entity_field_foo_rating"\n' +
    '      \t}\n' +
    '    },\n' +
    '    {\n' +
    '      \t"parameter_name": "workflow_input_foo_id",\n' +
    '      \t"parameter_type": "Integer",\n' +
    '      \t"source": {\n' +
    '        \t"type": "literal",\n' +
    '        \t"param_value": "123"\n' +
    '      \t}\n' +
    '    }\n' +
    ']'

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
              h(FormLabel, { htmlFor: id }, ['Entity Type']),
              h(TextInput, {
                id,
                style: { display: 'block', width: '100ex' },
                placeholder: 'FOO',
                value: entityType,
                onChange: setEntityType
              })
            ])])
          ]),
          div([
            h(IdContainer, [id => h(Fragment, [
              h(FormLabel, { htmlFor: id }, ['Entity ID(s)']),
              h(TextInput, {
                id,
                style: { display: 'block', width: '100ex' },
                placeholder: '["F0011111-1111-1111-1111-111111111111"]',
                value: entityId,
                onChange: setEntityId
              })
            ])])
          ])
        ]),
        h(IdContainer, [id => h(Fragment, [
          h(FormLabel, { htmlFor: id }, ['Inputs definition']),
          h(TextArea, {
            id,
            style: { height: 360 },
            placeholder: `Paste your JSON input mapping here. For example,${inputMappingExample}`,
            value: workflowInputsDefinition,
            onChange: setWorkflowInputsDefinition
          })
        ])])
      ])
    ])
  ])
}
