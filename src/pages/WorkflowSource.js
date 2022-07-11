import { Fragment } from 'react'
import { div, h, h3 } from 'react-hyperscript-helpers'
import { IdContainer, makeInlineDockLink } from 'src/components/common'
import { TextArea } from 'src/components/input'
import { FormLabel } from 'src/libs/form'


export const WorkflowSource = ({ workflowUrl, setWorkflowUrl }) => {
  return div([
    h3(['Provide a URL to a workflow']),
    div([
      h(Fragment, [
        `You can browse for workflows in `,
        makeInlineDockLink('https://firecloud.dsde-dev.broadinstitute.org/?return=#methods', 'Broad Methods Repository', 14),
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
    ])])
  ])
}
