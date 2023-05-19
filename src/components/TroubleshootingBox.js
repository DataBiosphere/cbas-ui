import { div, h, span } from 'react-hyperscript-helpers'
import { ButtonOutline, ClipboardButton} from 'src/components/common'
import colors from 'src/libs/colors'


export const TroubleshootingBox = props => {
  const workflowId = 'aaaa-1111-bbbb-2222'
  const submissionId = 'dddd-3333-eeee-4444'

  return div({ style: { backgroundColor: colors.accent(0.2), paddingTop: '0.25em', paddingBottom: '0.25em', paddingLeft: '1em', paddingRight: '1em' } }, [
    div({ style: { 'font-weight': 'bold' } }, 'Troubleshooting?'),
    div([
      span({ style: { 'font-weight': 'bold' } }, 'Workflow ID:'),
      workflowId,
      h(ClipboardButton, {
        text: workflowId,
        style: { marginLeft: '0.5rem' }
      })
    ]),
    div([
      span({ style: { 'font-weight': 'bold' } }, 'Submission ID:'),
      submissionId,
      h(ClipboardButton, {
        text: workflowId,
        style: { marginLeft: '0.5rem' }
      })
    ]),
    div([
      h(ButtonOutline, {
        onClick: () => {}
      }, ['Execution Log']),
      h(ButtonOutline, {
        onClick: () => {}
      }, ['Execution Files'])
    ])
  ])
}

