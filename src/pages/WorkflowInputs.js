import { Fragment } from 'react'
import { div, h, h3, span } from 'react-hyperscript-helpers'
import { IdContainer } from 'src/components/common'
import { TextArea } from 'src/components/input'
import { FormLabel } from 'src/libs/form'


export const WorkflowInputs = ({ workflowUrl, workflowInputs, setWorkflowInputs }) => {
  return div([
    div({ style: { marginTop: '2rem' } }, [
      span({ style: { fontWeight: 'bold' } }, ['Using workflow ']),
      span([workflowUrl])
    ]),
    div({ style: { marginTop: '2rem' } }, [
      h3(['Provide inputs JSON file']),
      div([
        'Copy and paste your JSON file below',
        h(IdContainer, [id => h(Fragment, [
          h(FormLabel, { htmlFor: id }),
          h(TextArea, {
            id,
            style: { height: 100 },
            placeholder: 'Paste your JSON inputs here',
            value: workflowInputs,
            onChange: setWorkflowInputs
          })
        ])])
      ])
    ])
  ])
}
