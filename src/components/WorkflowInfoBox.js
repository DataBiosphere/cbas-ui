
import { div, span } from 'react-hyperscript-helpers'
import colors from 'src/libs/colors'


export const WorkflowInfoBox = () => {
  const workflowStart = 'April 1, 2023, 7:49 PM'
  const workflowEnd = 'December 31, 2023, 12:45pm'
  const workflowScript = { data: 'this is a button that shows a workflow script' }

  return div({ style: { backgroundColor: colors.accent(0.2), paddingTop: '0.25em', paddingBottom: '0.25em', paddingLeft: '1em', paddingRight: '1em' } }, [
    div({ 'data-testid': 'timing-container', style: { display: 'block', justifyContent: 'left-justify' } }, [
      div({}, [span({ style: { fontWeight: 'bold', 'font-size': 16 } }, ['Workflow Timing'])]),
      div({ style: { paddingLeft: '0.9em' } }, [
        div({}, [span({ style: { fontWeight: 'bold' } }, ['Start: ']), span({}, [workflowStart])]),
        div({}, [span({ style: { fontWeight: 'bold' } }, ['End: ']), span({}, [workflowEnd])])
      ]),
      div({}, [span({ style: { fontWeight: 'bold', 'font-size': 16 } }, ['Workflow Status'])]),
      div({ style: { paddingLeft: '0.9em' } }, [
        div({}, [span({ style: { fontWeight: 'bold' } }, ['Start: ']), span({}, [workflowStart])]),
        div({}, [span({ style: { fontWeight: 'bold' } }, ['End: ']), span({}, [workflowEnd])])
      ])
    ]),
    div({}, [span({}, [workflowScript.data])])
  ])
}

