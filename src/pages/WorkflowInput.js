import { Fragment, useState } from 'react'
import { div, h, h2, h3 } from 'react-hyperscript-helpers'
import { ButtonPrimary, headerBar, IdContainer, makeInlineDockLink } from 'src/components/common'
import { TextArea } from 'src/components/input'
import { FormLabel } from 'src/libs/form'


export const WorkflowInput = () => {
  // State
  const [workflowUrl, setWorkflowUrl] = useState()

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
            `.`
          ])
        ]),
        h(IdContainer, [id => h(Fragment, [
          h(FormLabel, { htmlFor: id }),
          h(TextArea, {
            id,
            style: { height: 100 },
            placeholder: 'Paste workflow URL here',
            value: workflowUrl,
            onChange: value => {
              console.log(value)
              setWorkflowUrl(value)
            }
          })
        ])]),
        div({ style: { display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' } }, [
          h(ButtonPrimary, {
            disabled: !workflowUrl
            // onClick: navigateToNextPage TODO: Navigate to inputs page in https://broadworkbench.atlassian.net/browse/BW-1284
          }, ['Use workflow'])
        ])
      ])
    ])
  ])
}
