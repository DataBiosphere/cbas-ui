import { useState } from 'react'
import { div, h, span } from 'react-hyperscript-helpers'
import { ClipboardButton, Link } from 'src/components/common'
import { icon } from 'src/components/icons'
import { UriViewer } from 'src/components/URIViewer/UriViewer'
import colors from 'src/libs/colors'


export const TroubleshootingBox = () => {
  const [showLog, setShowLog] = useState(false)

  const fileBrowserRoot = '/#workspaces/[billing-account]/[workspace-name]/files'
  const workflowId = 'aaaa-1111-bbbb-2222'
  const submissionId = 'dddd-3333-eeee-4444'

  return div({
    style: {
      border: `1px solid ${colors.dark(0.4)}`,
      borderRadius: 5,
      paddingTop: '0.25em', paddingBottom: '0.25em',
      paddingLeft: '1em', paddingRight: '1em',
      lineHeight: '24px',
      'align-self': 'flex-start',
      'max-height': 'fit-content'
    }
  }, [
    div({}, [span({ style: { 'font-size': 16, fontWeight: 'bold' } }, ['Troubleshooting?'])]),
    div({ 'data-testid': 'workflow-id-container', style: { display: 'flex', justifyContent: 'space-between' } }, [
      div({}, [span({ style: { fontWeight: 'bold' } }, ['Workflow ID: ']), span({}, [workflowId])]),
      div({ 'data-testid': 'clipboard-button' }, [h(ClipboardButton, { text: workflowId, style: { marginLeft: '0.5rem' } })])
    ]),
    div({ 'data-testid': 'submission-id-container', style: { display: 'flex', justifyContent: 'space-between' } }, [
      div({}, [span({ style: { fontWeight: 'bold' } }, ['Submission ID : ']), span({}, [submissionId])]),
      div({ 'data-testid': 'clipboard-button' }, [h(ClipboardButton, { text: submissionId, style: { marginLeft: '0.5rem' } })])
    ]),
    div({ 'data-testid': 'log-link-container', style: { display: 'flex', justifyContent: 'space-around' } }, [
      h(Link, { onClick: () => { setShowLog(true) } }, [
        div({ 'data-testid': 'workflow-log-link' }, [icon('fileAlt', { size: 18 }), ' Execution log'], {})
      ]),
      h(Link, { href: fileBrowserRoot, target: '_blank', onClick: () => {} }, [
        icon('folder-open', { size: 18 }), ' Execution Directory'
      ])
    ]),
    showLog && h(UriViewer, { workflowId, onDismiss: () => setShowLog(false) })
  ])
}

