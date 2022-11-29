import { Ajax } from 'src/libs/ajax'
import { notify } from 'src/libs/notifications'
import * as Style from 'src/libs/style'
import _ from 'lodash/fp'
import { useState } from 'react'
import { div, h, h3 } from 'react-hyperscript-helpers'
import { AutoSizer } from 'react-virtualized'
import { ButtonOutline, PageBox } from 'src/components/common'
import { /*FlexTable,*/ Sortable, TextCell } from 'src/components/table'
import { FlexTable } from 'src/components/table2'
import { memoWithName } from 'src/libs/react-utils'
import * as Utils from 'src/libs/utils'


const styles = {
  cardContainer: listView => ({
    display: 'flex', flexWrap: 'wrap',
    marginRight: listView ? undefined : '-1rem'
  }),
  // Card's position: relative and the outer/inner styles are a little hack to fake nested links
  card: {
    ...Style.elements.card.container, position: 'relative'
  },
  outerLink: {
    position: 'absolute', top: 0, right: 0, bottom: 0, left: 0
  },
  innerContent: {
    position: 'relative', pointerEvents: 'none'
  },
  innerLink: {
    pointerEvents: 'auto'
  },
  // (end link hacks)
  shortCard: {
    width: 300, height: 125, margin: '0 1rem 2rem 0'
  },
  shortTitle: {
    ...Style.elements.card.title,
    flex: 1,
    lineHeight: '20px', height: '40px',
    overflowWrap: 'break-word'
  },
  shortDescription: {
    flex: 'none',
    lineHeight: '18px', height: '90px',
    overflow: 'hidden'
  },
  longMethodVersion: {
    marginRight: '1rem', width: 90,
    ...Style.noWrapEllipsis
  },
  longCard: {
    width: '100%', minWidth: 0,
    marginBottom: '0.5rem'
  },
  longTitle: {
    ...Style.elements.card.title,
    ...Style.noWrapEllipsis, flex: 1
  },
  longDescription: {
    flex: 1,
    paddingRight: '1rem',
    ...Style.noWrapEllipsis
  }
}
const noContentMessage = 'Nothing here yet! Your previously run workflows will be saved here.'


export const SavedWorkflows = ({ runsData, setWorkflowUrl, setShowInputsPage }) => {

  // State
  const [sort, setSort] = useState({ field: 'submission_date', direction: 'desc' })

  const sortedPreviousRuns =
    _.orderBy(sort.field, sort.direction, runsData)

  const WorkflowCard = memoWithName('WorkflowCard', ({ name, lastRun, description, source }) => {

    return div({ style: { ...styles.card, ...styles.longCard } }, [
      // name,
        div({ style: { ...styles.innerContent, display: 'flex', alignItems: 'center' } }, [
          div({ style: { ...styles.longTitle, width: 20 } }, [`${name}`]),
          div({ style: { width: 400 } }, ['Last updated: ', lastRun]),
          div({ style: { flex: 'none', width: 275 } }, ['Source: ', source])
        ]),
      div({ style: { ...styles.innerContent, display: 'flex', alignItems: 'center', paddingTop: '1.5rem' } }, [description])
      ])
  })

  const cellRenderer = ({ rowIndex }) => {return h(TextCell, [sortedPreviousRuns[rowIndex].name])}


  const workflowCards = _.map(method => {
    return h(WorkflowCard, {
      name: method.name,
      lastUpdated: method.last_run,
      description: method.description,
      source: method.source,
      key: method.name
    })
  })(runsData)

  return [workflowCards]
  // return h(PageBox, [Utils.cond(
  //   [runsData && _.isEmpty(runsData), () => noContentMessage],
  //     [() => div({ style: { flex: 1 } }, [sortedPreviousRuns])],
  //   () => sortedPreviousRuns
  // )])


  const rowHeight = 200
  // return div({ style: { marginTop: '2em', display: 'flex', flexDirection: 'column' } }, [
  //   // h3(['Saved Workflows']),
  //   div({ style: { flex: `1 1 auto`, height: '100%', minHeight: '25em' } }, [
  //     h(AutoSizer, [
  //       ({ width, height }) => h(FlexTable, {
  //         'aria-label': 'saved workflows',
  //         width, height, sort,
  //         rowCount: sortedPreviousRuns.length,
  //         noContentMessage: 'Nothing here yet! Your previously run workflows will be saved here.',
  //         hoverHighlight: true,
  //         rowHeight,
  //         columns: [
  //           {
  //             size: { basis: 500 },
  //             field: 'workflow_url',
  //             //headerRenderer: () => null,//h(Sortable, { sort, field: 'workflow_url', onSort: setSort }, ['Workflow Link']),
  //             cellRenderer: ({ rowIndex }) => {
  //               return h(TextCell, [sortedPreviousRuns[rowIndex].name])
  //             }
  //           }
  //         ],
  //       })
  //     ])
  //   ])
  // ])
}
