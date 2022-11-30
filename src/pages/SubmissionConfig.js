import _ from 'lodash/fp'
import { Fragment, useState } from 'react'
import { a, div, h, h2, span } from 'react-hyperscript-helpers'
import { ButtonPrimary, headerBar, Link, Select } from 'src/components/common'
import StepButtons from 'src/components/StepButtons'
import { Ajax } from 'src/libs/ajax'
import { notify } from 'src/libs/notifications'
import { useCancellation, useOnMount } from 'src/libs/react-utils'
import * as Utils from 'src/libs/utils'


const methodId = '64b5bc5e-85cf-4aff-b522-01471b88b950' // TODO: get this from the previous page
// const wdlUrl = 'https://raw.githubusercontent.com/broadinstitute/viral-pipelines/master/pipes/WDL/workflows/fastq_to_ubam.wdl'

export const SubmissionConfig = () => {
  const [activeTab, setActiveTab] = useState({ key: 'select-data' })
  const [selectedTable, setSelectedTable] = useState({ name: null })
  const [methodsData, setMethodsData] = useState({})
  const [dataTables, setDataTables] = useState()

  const signal = useCancellation()

  useOnMount(() => {
    const loadMethodsData = async () => {
      try {
        const allMethods = await Ajax(signal).Cbas.methods.get()
        const selectedMethod = _.head(_.filter(m => m.method_id === methodId, allMethods))
        setMethodsData(selectedMethod) // TODO: this doesn't feel "safe"
      } catch (error) {
        notify('error', 'Error loading methods data', { detail: await (error instanceof Response ? error.text() : error) })
      }
    }

    const loadTablesData = async () => {
      try {
        setDataTables(await Ajax(signal).Wds.types.get())
      } catch (error) {
        notify('error', 'Error loading tables data', { detail: await (error instanceof Response ? error.text() : error) })
      }
    }

    loadMethodsData()
    loadTablesData()
  })

  const renderSummary = () => {
    return div({ style: { margin: '4em' } }, [
      div({ style: { display: 'flex', marginTop: '1rem', justifyContent: 'space-between' } }, [
        h2([methodsData.name])
      ]),
      div({ style: { lineHeight: 2.0 } }, [
        div([
          span({ style: { fontWeight: 'bold' } }, ['Workflow source link: ']),
          a(
            { href: methodsData.source_url },
            [methodsData.source_url]
          )
        ]),
        div([span({ style: { fontWeight: 'bold' } }, ['Version: ']), '1.14 <TODO: WHERE DOES THIS COME FROM?>']),
        h(
          Link,
          {
            style: { textDecoration: 'underline' },
            onClick: () => { window.alert('TODO: what happens when the user clicks this?') }
          },
          ['View Script']
        )
      ]),
      div({ style: { marginTop: '2rem', height: '2rem', fontWeight: 'bold' } }, ['Select a data table']),
      h(Select, {
        isDisabled: false,
        'aria-label': 'Select a data table',
        isClearable: false,
        value: selectedTable.name,
        onChange: ({ value }) => setSelectedTable({ name: value }),
        placeholder: 'None selected',
        styles: { container: old => ({ ...old, display: 'inline-block', width: 200 }) },
        options: _.map(d => d.name, dataTables)
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
  }

  const renderDataSelector = () => {
    return 'data selector'
  }

  const renderInputs = () => {
    return 'inputs'
  }

  const renderOutputs = () => {
    return 'outputs'
  }

  return h(Fragment, [
    div({
      style: {
        borderBottom: '2px solid rgb(116, 174, 67)',
        boxShadow: 'rgb(0 0 0 / 26%) 0px 2px 5px 0px, rgb(0 0 0 / 16%) 0px 2px 10px 0px',
        position: 'relative'
      }
    }, [
      headerBar(),
      renderSummary()
    ]),
    div({
      style: {
        backgroundColor: 'rgb(235, 236, 238)',
        display: 'flex',
        flex: '1 1 auto',
        flexDirection: 'column',
        padding: '1rem 3rem'
      }
    }, [
      Utils.switchCase(activeTab.key || 'select-data',
        ['select-data', () => renderDataSelector()],
        ['inputs', () => renderInputs()],
        ['outputs', () => renderOutputs()]
      )
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
