import { Fragment } from 'react'
import { div, h, h3, span } from 'react-hyperscript-helpers'
import { ButtonOutline, ButtonPrimary, IdContainer } from 'src/components/common'
import { TextArea } from 'src/components/input'
import { Ajax } from 'src/libs/ajax'
import { FormLabel } from 'src/libs/form'
import { useCancellation } from 'src/libs/react-utils'


export const WorkflowInputs = ({ workflowUrl, workflowInputs, setWorkflowInputs, displayWorkflowUrlPage }) => {
  const signal = useCancellation()

  const submitRun = async () => {
    const runRes = await Ajax(signal).Cbas.submitRun(workflowUrl, workflowInputs)
    console.log(runRes)
  }

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
        ])]),
        div({ style: { display: 'flex', marginTop: '1rem', justifyContent: 'space-between' } }, [
          'Outputs will be saved to cloud storage',
          div([
            h(ButtonOutline, {
              onClick: displayWorkflowUrlPage
            }, ['Back to previous page']),
            h(ButtonPrimary, {
              style: { marginLeft: '1rem' },
              disabled: !workflowInputs,
              onClick: () => submitRun()
            }, ['Run workflow'])
          ])
        ])
      ])
    ])
  ])
}
