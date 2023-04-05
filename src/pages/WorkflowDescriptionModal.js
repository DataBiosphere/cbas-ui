import _ from 'lodash/fp'
import { useState, Fragment } from 'react'
import { div, h, h2, h3, h5 } from 'react-hyperscript-helpers'
import { ButtonPrimary, ButtonSecondary } from 'src/components/common'
import Modal from 'src/components/Modal'
import { TextCell } from 'src/components/table'


const WorkflowDescriptionModal = ({ onDismiss }) => {
  const [workflowDescriptionModal, setWorkflowDescriptionModal] = useState()

  return h(Modal, {
      onDismiss,
      title: 'Workflow: ',
      width: '75%',
      height: '75%',
    }, [ h(Fragment, [div({}, [
      h(ButtonPrimary, {}, ['Add to workspace']),
      h(ButtonSecondary, {}, ['Return to List']),
      h(ButtonSecondary, {}, ['Download sample data to run workflow'])
  ])]), h(Fragment, [div( {}, [h3(['Synopsis']), h(TextCell, ['Lorem ipsum']) ])])])
}

export default WorkflowDescriptionModal

//alert('ALERT')
