import _ from 'lodash/fp'
import { useState, Fragment } from 'react'
import { div, h, h2, h3, h5, a } from 'react-hyperscript-helpers'
import { ButtonOutline, ButtonPrimary, ButtonSecondary, Link } from 'src/components/common'
import Modal from 'src/components/Modal'
import { TextCell } from 'src/components/table'


const WorkflowDescriptionModal = ({ onDismiss }) => {
  const [workflowDescriptionModal, setWorkflowDescriptionModal] = useState()

  //TODO: Update with correct link
  const dockstoreLink = () => {
    return h(Link, {href: 'https://support.terra.bio/hc/en-us/articles/12028928980123-Covid-19-Surveillance-tutorial-guide'}, ['Dockstore'])
  }

  return h(Modal, {
      onDismiss,
      title: 'Workflow: ',
      width: '75%',
      height: '75%',
      showX: true,
    }, [
    h(Fragment, [
      div({ style: { display: 'flex' } }, [
        div({ style: { flexGrow: 1 } }, [
          div({ style: { fontSize: 18, fontWeight: 600, margin: '1rem 0 0.5rem' } }, ['Synopsis']),
          div(['synopsis' || (/*selectedWorkflowDetails &&*/ 'None')]),
          div({ style: { fontSize: 18, fontWeight: 600, margin: '1rem 0 0.5rem' } }, ['Method Owner']),
          // div([_.join(',', managers)])
        ]),
        div({ style: { margin: '0 1rem', display: 'flex', flexDirection: 'column' } }, [
          h(ButtonPrimary, { style: { marginBottom: '0.5rem' }, onClick: () => alert("on click!")/*exportMethod*/ }, ['Add to Workspace']),
          h(ButtonOutline, {
            onClick: () => {
              alert("on click!")
              //setSelectedWorkflow(undefined)
              //setSelectedWorkflowDetails(undefined)
            }
          }, ['Return to List'])
        ])
      ]),
      div({ style: { fontSize: 18, fontWeight: 600, margin: '1rem 0 0.5rem' } }, ['Documentation']),
      //documentation && h(MarkdownViewer, { style: { maxHeight: 600, overflowY: 'auto' } }, [documentation]),
      //(!selectedWorkflowDetails || exporting) && spinnerOverlay
    ])
    ])
}

export default WorkflowDescriptionModal

//alert('ALERT')
