import { useState } from 'react'
import { div, h, h2 } from 'react-hyperscript-helpers'
import { ButtonOutline, ButtonPrimary, headerBar } from 'src/components/common'
import { Ajax } from 'src/libs/ajax'
import { useCancellation } from 'src/libs/react-utils'
import { WorkflowInputs } from 'src/pages/WorkflowInputs'
import { WorkflowSource } from 'src/pages/WorkflowSource'


export const SubmitWorkflow = () => {
  // State
  const [workflowUrl, setWorkflowUrl] = useState()
  const [workflowInputs, setWorkflowInputs] = useState()
  const [showInputsPage, setShowInputsPage] = useState(false)

  const signal = useCancellation()

  const submitRun = async () => {
    const runRes = await Ajax(signal).Cbas.submitRun(workflowUrl, workflowInputs)
    console.log(runRes)
  }

  return div([
    headerBar(),
    div({ style: { margin: '4rem' } }, [
      h2(['Submit a workflow']),
      div(['Submit your Terra workflows with the Cromwell engine. Full featured workflow submissions coming soon!']),
      div({ style: { marginTop: '2rem' } }, [
        !showInputsPage && h(WorkflowSource, { workflowUrl, setWorkflowUrl }),
        !showInputsPage && div({ style: { display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' } }, [
          h(ButtonPrimary, {
            disabled: !workflowUrl,
            onClick: () => setShowInputsPage(true)
          }, ['Use workflow'])
        ]),
        showInputsPage && h(WorkflowInputs, { workflowUrl, workflowInputs, setWorkflowInputs }),
        showInputsPage && div({ style: { display: 'flex', marginTop: '1rem', justifyContent: 'flex-end' } }, [
          h(ButtonOutline, {
            onClick: () => setShowInputsPage(false)
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
}

// For now, this will be our Landing page. It might be changed later on.
export const navPaths = [
  {
    name: 'root',
    path: '/',
    component: SubmitWorkflow,
    public: true
  }
]
