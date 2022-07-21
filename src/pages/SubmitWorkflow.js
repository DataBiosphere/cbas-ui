import { Fragment, useState } from 'react'
import { div, h, h2, span } from 'react-hyperscript-helpers'
import { ButtonOutline, ButtonPrimary, headerBar } from 'src/components/common'
import { Ajax } from 'src/libs/ajax'
import { useCancellation, useOnMount } from 'src/libs/react-utils'
import { SavedWorkflows } from 'src/pages/SavedWorkflows'
import { WorkflowInputs } from 'src/pages/WorkflowInputs'
import { WorkflowSource } from 'src/pages/WorkflowSource'


export const SubmitWorkflow = () => {
  // State
  const [workflowUrl, setWorkflowUrl] = useState()
  const [workflowInputs, setWorkflowInputs] = useState()
  const [showInputsPage, setShowInputsPage] = useState(false)
  const [cbasStatus, setCbasStatus] = useState()

  const signal = useCancellation()

  useOnMount(() => {
    const loadCbasStatus = async () => {
      const cbasStatus = await Ajax(signal).Cbas.status()
      setCbasStatus(cbasStatus)
    }

    loadCbasStatus()
  })

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
        !showInputsPage && h(Fragment, [
          h(WorkflowSource, { workflowUrl, setWorkflowUrl }),
          div({ style: { display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' } }, [
            h(ButtonPrimary, {
              disabled: !workflowUrl,
              onClick: () => setShowInputsPage(true)
            }, ['Use workflow'])
          ]),
          h(SavedWorkflows, { setWorkflowUrl, setShowInputsPage })
        ]),
        showInputsPage && h(Fragment, [
          h(WorkflowInputs, { workflowUrl, workflowInputs, setWorkflowInputs }),
          div({ style: { display: 'flex', marginTop: '1rem', justifyContent: 'space-between' } }, [
            'Outputs will be saved to cloud storage',
            div([
              h(ButtonOutline, {
                onClick: () => setShowInputsPage(false)
              }, ['Change selected workflow']),
              h(ButtonPrimary, {
                style: { marginLeft: '1rem' },
                disabled: !workflowInputs,
                onClick: () => submitRun()
              }, ['Run workflow'])
            ])
          ])
        ]),
        div({ style: { bottom: 0, position: 'absolute', marginBottom: '1em' } }, [
          span(['CBAS Status OK: ']),
          cbasStatus && span([JSON.stringify(cbasStatus.ok)])
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
