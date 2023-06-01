import { useState } from 'react'
import { div, h, span } from 'react-hyperscript-helpers'
import { ClipboardButton, Link } from 'src/components/common'
import { icon } from 'src/components/icons'
import { UriViewer } from 'src/components/URIViewer/UriViewer'
import colors from 'src/libs/colors'


export const TroubleshootingBox = ({ workflow, submissionId, workflowId }) => {
  const [showLog, setShowLog] = useState(false)

  //When we merge with Terra UI, we will be able to provide this link from the workspace. For now, leave it out.
  const fileBrowserRoot = null // '/#workspaces/[billing-account]/[workspace-name]/files'

  return div({
    style: {
      border: `1px solid ${colors.dark(0.4)}`,
      borderRadius: 5,
      paddingTop: '0.25em', paddingBottom: '0.25em',
      paddingLeft: '1em', paddingRight: '1em',
      lineHeight: '24px',
      alignSelf: 'flex-start',
      maxHeight: 'fit-content'
    }
  }, [
    div({}, [span({ style: { fontSize: 16, fontWeight: 'bold' } }, ['Troubleshooting?'])]),
    div({ 'data-testid': 'workflow-id-container', style: { display: 'flex', justifyContent: 'space-between' } }, [
      div({}, [span({ style: { fontWeight: 'bold' } }, ['Workflow ID: ']), span({}, [workflowId])]),
      div({ 'data-testid': 'workflow-clipboard-button' }, [h(ClipboardButton, { text: workflowId, style: { marginLeft: '0.5rem' } })])
    ]),
    div({ 'data-testid': 'submission-id-container', style: { display: 'flex', justifyContent: 'space-between' } }, [
      div({}, [span({ style: { fontWeight: 'bold' } }, ['Submission ID: ']), span({}, [submissionId])]),
      div({ 'data-testid': 'submission-clipboard-button' }, [h(ClipboardButton, { text: submissionId, style: { marginLeft: '0.5rem' } })])
    ]),
    div({ 'data-testid': 'log-link-container', style: { display: 'flex', justifyContent: 'left', paddingTop: '3px' } }, [
      h(Link, { onClick: () => { setShowLog(true) } }, [
        div({ 'data-testid': 'workflow-log-link' }, [icon('fileAlt', { size: 18 }), ' Execution Log'], {})
      ]),
      false && h(Link, { href: fileBrowserRoot, target: '_blank', onClick: () => {} }, [
        icon('folder-open', { size: 18 }), ' Execution Directory'
      ])
    ]),
    showLog && h(UriViewer, { workflow, onDismiss: () => setShowLog(false) })
  ])
}

