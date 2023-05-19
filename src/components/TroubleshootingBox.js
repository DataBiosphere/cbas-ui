import { div, h, span } from 'react-hyperscript-helpers'
import { ButtonOutline, ClipboardButton } from 'src/components/common'
import { icon } from 'src/components/icons'
import colors from 'src/libs/colors'


export const TroubleshootingBox = props => {
  const workflowId = 'aaaa-1111-bbbb-2222'
  const submissionId = 'dddd-3333-eeee-4444'

  return div({ style: { backgroundColor: colors.accent(0.2), paddingTop: '0.25em', paddingBottom: '0.25em', paddingLeft: '1em', paddingRight: '1em' } }, [
    div({}, [span({ style: { 'font-weight': 'bold' } }, ['Troubleshooting'])]),
    div({ 'data-testid': 'workflow-id-container', style: { display: 'flex', justifyContent: 'space-between' } }, [
      div({}, [span({ style: { 'font-weight': 'bold' } }, ['Workflow ID: ']), span({}, [workflowId])]),
      div({ 'data-testid': 'clipboard-button' }, [h(ClipboardButton, { text: workflowId, style: { marginLeft: '0.5rem' } })])
    ]),
    div({ 'data-testid': 'submission-id-container', style: { display: 'flex', justifyContent: 'space-between' } }, [
      div({}, [span({ style: { 'font-weight': 'bold' } }, ['Submission ID : ']), span({}, [submissionId])]),
      div({ 'data-testid': 'clipboard-button' }, [h(ClipboardButton, { text: submissionId, style: { marginLeft: '0.5rem' } })])
    ]),
    div([
      h(ButtonOutline, {
        onClick: () => {}
      }, [icon('fileAlt', { size: 18 }), 'Execution Log']),
      h(ButtonOutline, {
        onClick: () => {}
      }, [icon('folder-open', { size: 18 }), 'Directory Link'])
    ])
  ])
}

