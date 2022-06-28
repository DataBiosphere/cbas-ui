import { Fragment, useState } from 'react'
import { div, h, h2, h3 } from 'react-hyperscript-helpers'
import { ButtonPrimary, headerBar, IdContainer, makeInlineDockLink } from 'src/components/common'
import { TextArea } from 'src/components/input'
import { FormLabel } from 'src/libs/form'
import * as Nav from 'src/libs/nav'
import * as StateHistory from 'src/libs/state-history'


export const WorkflowSource = () => {
  // State
  const [workflowUrl, setWorkflowUrl] = useState(StateHistory.get().workflowUrl || undefined)

  console.log(`At beginning: ${workflowUrl}`)

  return div([
    headerBar(),
    div({ style: { margin: '4rem' } }, [
      div([
        h2(['Submit a workflow']),
        div(['Submit your Terra workflows with the Cromwell engine. Full featured workflow submissions coming soon!'])
      ]),
      div({ style: { marginTop: '2rem' } }, [
        h3(['Provide a URL to a workflow']),
        div([
          h(Fragment, [
            `You can browse for workflows in `,
            makeInlineDockLink('https://firecloud.dsde-dev.broadinstitute.org/?return=terra#methods', 'Broad Methods Repository', 14),
            ` or in `,
            makeInlineDockLink('https://staging.dockstore.org/search?descriptorType=WDL&entryType=workflows&searchMode=files', 'Dockstore', 14),
            `. Please note that for now only public, unauthenticated URLs ending in '.wdl' work.`
          ])
        ]),
        h(IdContainer, [id => h(Fragment, [
          h(FormLabel, { htmlFor: id }),
          h(TextArea, {
            id,
            style: { height: 100 },
            placeholder: 'Paste workflow URL here',
            value: workflowUrl,
            onChange: setWorkflowUrl
          })
        ])]),
        div({ style: { display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' } }, [
          h(ButtonPrimary, {
            disabled: !workflowUrl,
            onClick: () => {
              StateHistory.update({ workflowUrl: workflowUrl })
              console.log(`State history: ${StateHistory.get().workflowUrl}`)

              // this.setState({ workflowUrl: workflowUrl })
              // console.log(`Get state: ${this.getState.workflowUrl}`)

              Nav.goToPath('workflow-inputs')
            }
          }, ['Use workflow'])
        ])
      ])
    ])
  ])
}

// For now, this will be our Landing page. It might be changed later on.
export const navPaths = [
  {
    name: 'root',
    path: '/',
    component: WorkflowSource,
    public: true
  }
]
