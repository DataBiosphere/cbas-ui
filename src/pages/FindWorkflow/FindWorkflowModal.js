import _ from 'lodash/fp'
import { useState } from 'react'
import { div, h } from 'react-hyperscript-helpers'
import { Clickable, Link } from 'src/components/common'
import { icon } from 'src/components/icons'
import ModalDrawer from 'src/components/ModalDrawer'
import colors from 'src/libs/colors'
import * as Style from 'src/libs/style'
import { MethodCard } from 'src/pages/FindWorkflow/MethodCard'


const styles = {
  findWorkflowSubHeader: selected => {
    return {
      ...Style.findWorkflowNavList.itemContainer(selected),
      ...Style.findWorkflowNavList.item(selected),
      ...(selected ? { backgroundColor: colors.accent(0.2) } : {}),
      paddingLeft: '3rem'
    }
  }
}

const suggestedWorkflowsList = [
  {
    method_name: 'mock_method_1',
    method_description: 'mock_method_1 description. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
    method_source: 'GitHub',
    method_version: 'master',
    method_url: 'https://raw.githubusercontent.com/broadinstitute/mock_method_1.wdl'
  },
  {
    method_name: 'mock_method_2',
    method_description: 'mock_method_2 description. Lorem ipsum dolor sit amet.',
    method_source: 'GitHub',
    method_version: 'master',
    method_url: 'https://raw.githubusercontent.com/broadinstitute/mock_method_2.wdl'
  },
  {
    method_name: 'mock_method_3',
    method_description: 'mock_method_3 description',
    method_source: 'GitHub',
    method_version: 'master',
    method_url: 'https://raw.githubusercontent.com/broadinstitute/mock_method_3.wdl'
  }
]


const FindWorkflowModal = ({ onDismiss }) => {
  const [selectedSubHeader, setSelectedSubHeader] = useState('browse-suggested-workflows')

  const subHeadersMap = {
    'browse-suggested-workflows': 'Browse Suggested Workflows'
  }

  const isSubHeaderActive = subHeader => selectedSubHeader === subHeader

  return h(ModalDrawer, {
    'aria-label': 'find-workflow-modal', isOpen: true, width: '70%',
    onDismiss
  }, [
    div({ style: { display: 'flex', alignItems: 'center', flex: 'none', padding: '0 20px 20px', margin: '1.5rem 0 .5rem 0rem' } }, [
      div({ style: { fontSize: 18, fontWeight: 600 } }, ['Find a Workflow']),
      div({ style: { marginLeft: 'auto', display: 'flex' } }, [
        onDismiss && h(Link, {
          'aria-label': 'Close',
          style: { marginLeft: '2rem' },
          tabIndex: 0,
          onClick: onDismiss
        }, [icon('times', { size: 30 })])
      ])
    ]),
    div({ role: 'main', style: { display: 'flex', flex: 1, height: `calc(100% - 66px)`, paddingLeft: '20px' } }, [
      div({ style: { minWidth: 330, maxWidth: 330, overflowY: 'auto' } }, [
        _.map(([subHeaderKey, subHeaderName]) => {
          const isActive = isSubHeaderActive(subHeaderKey)
          return h(Clickable, {
            'aria-label': `${subHeaderKey}-header-button`,
            style: { ...styles.findWorkflowSubHeader(isActive), color: isActive ? colors.accent(1.1) : colors.accent(), fontSize: 16 },
            onClick: () => setSelectedSubHeader(subHeaderKey),
            hover: Style.findWorkflowNavList.itemHover(isActive),
            'aria-current': isActive,
            key: subHeaderKey
          }, [subHeaderName])
        }, Object.entries(subHeadersMap))
      ]),
      isSubHeaderActive('browse-suggested-workflows') && div({ style: { overflowY: 'auto', flexGrow: 1, display: 'flex', flexDirection: 'column', paddingLeft: '20px' } }, [
        div({ style: { display: 'flex', flexWrap: 'wrap', overflowY: 'auto', paddingBottom: 5, paddingLeft: 5 } }, [
          _.map(method => h(MethodCard, { method, onClick: () => console.log(`Clicked on ${method.method_name} card`), key: method.method_name }), suggestedWorkflowsList)
        ])
      ])
    ])
  ])
}

export default FindWorkflowModal
