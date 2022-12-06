import { Fragment, useState } from 'react'
import { div, h, h2, span } from 'react-hyperscript-helpers'
import { ButtonOutline, Clickable, Navbar } from 'src/components/common'
import { icon } from 'src/components/icons'
import { Ajax } from 'src/libs/ajax'
import colors from 'src/libs/colors'
import * as Nav from 'src/libs/nav'
import { notify } from 'src/libs/notifications'
import { useCancellation, useOnMount } from 'src/libs/react-utils'
import * as Style from 'src/libs/style'
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

export default function SubmitWorkflow() {
  // State
  const [cbasStatus, setCbasStatus] = useState()
  const [runsData, setRunsData] = useState()

  const signal = useCancellation()

  useOnMount(() => {
    const loadCbasStatus = async () => {
      const cbasStatus = await Ajax(signal).Cbas.status()
      setCbasStatus(cbasStatus)
    }

    const loadRunsData = async () => {
      try {
        const runs = await Ajax(signal).Cbas.methods.get()
        setRunsData(runs.methods)
      } catch (error) {
        notify('error', 'Error loading saved workflows', { detail: await (error instanceof Response ? error.text() : error) })
      }
    }

    loadCbasStatus()
    loadRunsData()
  })

  return div([
    Navbar(),
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
        disabled: true,
        // TODO: color of card is "disabled", revert back when we enable this clickable's functionality
        style: { ...styles.card, ...styles.shortCard, color: colors.dark(0.7), /*colors.accent()*/ fontSize: 18, lineHeight: '22px' },
        onClick: () => null
      }, ['Find a Workflow', icon('plus-circle', { size: 32 })])),
      (h(Fragment, [h(SavedWorkflows, { runsData })])),
      div({ style: { bottom: 0, position: 'absolute', marginBottom: '1em' } }, [
        span(['CBAS Status OK: ']),
        (cbasStatus && span([JSON.stringify(cbasStatus.ok)])) || 'Not Found'
      ])])
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
