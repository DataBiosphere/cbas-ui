import { Fragment, useState } from 'react'
import { div, h, h2 } from 'react-hyperscript-helpers'
import { ButtonOutline, Clickable, Navbar } from 'src/components/common'
import { centeredSpinner, icon } from 'src/components/icons'
import { Ajax } from 'src/libs/ajax'
import colors from 'src/libs/colors'
import * as Nav from 'src/libs/nav'
import { notify } from 'src/libs/notifications'
import { useCancellation, useOnMount } from 'src/libs/react-utils'
import * as Style from 'src/libs/style'
import { withBusyState } from 'src/libs/utils'
import FindWorkflowModal from 'src/pages/FindWorkflow/FindWorkflowModal'
import { SavedWorkflows } from 'src/pages/SavedWorkflows'


const styles = {
  // Card's position: relative and the outer/inner styles are a little hack to fake nested links
  card: {
    ...Style.elements.card.container, position: 'absolute'
  },
  shortCard: {
    width: 300, height: 125, margin: '0 1rem 2rem 0'
  }
}

export const SubmitWorkflow = () => {
  // State
  const [methodsData, setMethodsData] = useState()
  const [loading, setLoading] = useState(false)
  const [viewFindWorkflowModal, setViewFindWorkflowModal] = useState(false)

  const signal = useCancellation()

  const refresh = withBusyState(setLoading, async () => {
    const loadRunsData = async () => {
      try {
        const runs = await Ajax(signal).Cbas.methods.getWithoutVersions()
        setMethodsData(runs.methods)
      } catch (error) {
        notify('error', 'Error loading saved workflows', { detail: await (error instanceof Response ? error.text() : error) })
      }
    }
    await loadRunsData()
  })

  useOnMount(async () => {
    await refresh()
  })

  return loading ? centeredSpinner() : div([
    Navbar('RUN WORKFLOWS WITH CROMWELL'),
    div({ style: { margin: '4rem' } }, [
      div({ style: { display: 'flex', marginTop: '1rem', justifyContent: 'space-between' } }, [
        h2(['Submit a workflow']),
        h(ButtonOutline, {
          onClick: () => Nav.goToPath('submission-history')
        }, ['Submission history'])
      ]),
      div(['Run a workflow in Terra using Cromwell engine. Full feature workflow submission coming soon.']),
      div({ style: { marginTop: '3rem' } }, [(h(Clickable, {
        'aria-haspopup': 'dialog',
        style: { ...styles.card, ...styles.shortCard, color: colors.accent(), fontSize: 18, lineHeight: '22px' },
        onClick: () => setViewFindWorkflowModal(true)
      }, ['Find a Workflow', icon('plus-circle', { size: 32 })])),
      (h(Fragment, [h(SavedWorkflows, { methodsData })]))]),
      viewFindWorkflowModal && h(FindWorkflowModal, { onDismiss: () => setViewFindWorkflowModal(false) })
    ])
  ])
}

// For now, this will be our Landing page. It might be changed later on.
export const navPaths = [
  {
    name: 'root',
    path: '/',
    component: SubmitWorkflow,
    public: true
  }
]
