import { Fragment, useState } from 'react'
import { a, div, h, h2, span } from 'react-hyperscript-helpers'
import { ButtonPrimary, GroupedSelect, headerBar, Link } from 'src/components/common'
import StepButtons from 'src/components/StepButtons'


const wdlUrl = 'https://raw.githubusercontent.com/broadinstitute/viral-pipelines/master/pipes/WDL/workflows/fastq_to_ubam.wdl'

export const SubmissionConfig = () => {
  const [activeTab, setActiveTab] = useState({ key: 'select-data' })

  return h(Fragment, [
    headerBar(),
    div({ style: { margin: '4em' } }, [
      div({ style: { display: 'flex', marginTop: '1rem', justifyContent: 'space-between' } }, [
        h2(['Fastq_to_ubam'])
      ]),
      div({ style: { lineHeight: 2.0 } }, [
        div([
          span({ style: { fontWeight: 'bold' } }, ['Workflow source link: ']),
          a(
            { href: wdlUrl },
            [wdlUrl]
          )
        ]),
        div([span({ style: { fontWeight: 'bold' } }, ['Version: ']), '1.14']),
        h(
          Link,
          {
            style: { textDecoration: 'underline' },
            onClick: () => { window.alert('this will go to the Submission Details page') }
          },
          ['View Script']
        )
      ]),
      div({ style: { marginTop: '2rem', height: '2rem', fontWeight: 'bold' } }, ['Select a data table']),
      h(GroupedSelect, {
        'aria-label': 'Entity type selector',
        isClearable: false,
        // isDisabled: currentSnapRedacted || this.isSingle() || !!Utils.editWorkspaceError(ws),
        isSearchable: true,
        placeholder: 'None selected',
        styles: { container: old => ({ ...old, display: 'inline-block', width: 200, marginLeft: '0.5rem' }) },
        // value: selectedEntityType,
        onChange: async () => {},
        options: [
          { label: 'Covid19_DataTable' }
        ]
      }),
      h(StepButtons, {
        tabs: [
          { key: 'select-data', title: 'Select Data', isValid: () => true },
          { key: 'inputs', title: 'Inputs', isValid: () => true },
          { key: 'outputs', title: 'Outputs', isValid: () => true }
        ],
        activeTab: activeTab.key || 'select-data',
        onChangeTab: v => setActiveTab({ key: v }),
        finalStep: h(ButtonPrimary, {
          style: { marginLeft: '1rem' },
          // disabled: !!Utils.computeWorkspaceError(ws) || !!noLaunchReason || currentSnapRedacted || !!snapshotReferenceError,
          // tooltip: Utils.computeWorkspaceError(ws) || noLaunchReason || (currentSnapRedacted && 'Workflow version was redacted.'),
          onClick: () => window.alert(`submitting`)
        }, ['Submit'])
      })
    ])
  ])
}

export const navPaths = [
  {
    name: 'submission-config',
    path: '/submission-config',
    component: SubmissionConfig,
    public: true
  }
]
