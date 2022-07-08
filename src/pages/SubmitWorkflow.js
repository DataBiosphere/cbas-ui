import { useState } from 'react'
import { div, h, h2 } from 'react-hyperscript-helpers'
import { headerBar } from 'src/components/common'
import { WorkflowInputs } from 'src/pages/WorkflowInputs'
import { WorkflowSource } from 'src/pages/WorkflowSource'


export const SubmitWorkflow = () => {
  // State
  const [workflowUrl, setWorkflowUrl] = useState()
  const [workflowInputs, setWorkflowInputs] = useState()
  const [showInputsPage, setShowInputsPage] = useState(false)

  return div([
    headerBar(),
    div({ style: { margin: '4rem' } }, [
      h2(['Submit a workflow']),
      div(['Submit your Terra workflows with the Cromwell engine. Full featured workflow submissions coming soon!']),
      div({ style: { marginTop: '2rem' } }, [
        !showInputsPage && h(WorkflowSource, { workflowUrl, setWorkflowUrl, onClick: () => setShowInputsPage(true) }),
        showInputsPage && h(WorkflowInputs, { workflowUrl, workflowInputs, setWorkflowInputs, displayWorkflowUrlPage: () => setShowInputsPage(false) })
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
