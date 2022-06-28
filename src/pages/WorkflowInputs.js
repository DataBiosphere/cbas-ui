import { div, h2, h3, h } from 'react-hyperscript-helpers'
import { ButtonOutline, ButtonPrimary, ButtonSecondary, headerBar, IdContainer } from 'src/components/common'
import { TextArea } from 'src/components/input'
import { FormLabel } from 'src/libs/form'
import { Fragment, useState } from 'react'
import * as Nav from 'src/libs/nav'
import * as StateHistory from 'src/libs/state-history'

export const WorkflowInputs = ({workflowUrl}) => {
  // State
  const [workflowInputs, setWorkflowInputs] = useState()

  console.log(`Workflow URL in INPUTS file: ${StateHistory.get().workflowUrl}`)

  return div([
    headerBar(),
    div({ style: { margin: '4rem' } }, [
      div([
        h2(['Submit a workflow']),
        div(['Submit your Terra workflows with the Cromwell engine. Full featured workflow submissions coming soon!'])
      ]),
      div({ style: { marginTop: '2rem' }}, ['Using workflow ???']),
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
          div({ style: { display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' } }, [
            h(ButtonOutline, {
              onClick: () => {
                console.log(`Back to previous page`)
                Nav.goToPath('root')
              }
            }, ['Back to previous page']),
            h(ButtonPrimary, {
              style: { marginLeft: '1rem' },
              disabled: !workflowInputs,
              onClick: () => {
                console.log(`SUBMIT value ${workflowInputs}`)
              }
            }, ['Run workflow'])
          ])
        ])
      ])
    ])
  ])
}

export const navPaths = [
  {
    name: 'workflow-inputs',
    path: '/workflow-inputs',
    component: WorkflowInputs,
    public: true
  }
]
