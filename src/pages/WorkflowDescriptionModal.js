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
      div({}, [
          h2({ style: { paddingTop: '1.5em', marginBottom: '0.3rem' }}, ['Synopsis']),
          h(TextCell, ['Lorem ipsum']),
          h2({ style: { paddingTop: '1.5rem', marginBottom: '0.3rem' }}, ['Method Owner']),
          h(TextCell, ['Lorem ipsum']),
          h2({ style: { paddingTop: '1.5rem', marginBottom: '0.3rem' }}, ['Documentation']),
          h3(TextCell, [`Please visit this ${a({ href: 'https://support.terra.bio/hc/en-us/articles/12028928980123-Covid-19-Surveillance-tutorial-guide'}, ['Dockstore'])} link for the latest version of the workflow and import it to your Terra workspace`]),

        h(Fragment, [
          div({}, [
            h(Fragment, [
              h(ButtonPrimary, {}, ['Add to workspace']),
              h(ButtonOutline, {}, ['Return to List']),
              h(ButtonOutline, {}, ['Download sample data to run workflow'])])
          ])])
        ])
    ])
}

export default WorkflowDescriptionModal

//alert('ALERT')
