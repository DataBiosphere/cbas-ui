import { div, h2 } from 'react-hyperscript-helpers'

export const WorkflowInputs = ({workflowUrl}) => {
  console.log(workflowUrl)
  return div([
    h2(['Hello!']),
    // div([workflowUrl])
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
