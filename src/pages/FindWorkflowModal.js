import { div, h, h2 } from 'react-hyperscript-helpers'
import ModalDrawer  from 'src/components/ModalDrawer'


const FindWorkflowModal = () => {

  return h(ModalDrawer, {
    'aria-label': 'find-workflow-modal', isOpen: true, width: '80%',
    onDismiss: () => null // ??
  }, [
    div({ style: { padding: '0 25px 25px' } }, [
      h2(["Find a Workflow"])
    ])
  ])
}

export default FindWorkflowModal
