import _ from 'lodash/fp'
import { Fragment, useState } from 'react'
import { a, div, h, h2, span } from 'react-hyperscript-helpers'
import ReactJson from 'react-json-view'
import { ButtonPrimary, Link, Navbar, Select } from 'src/components/common'
import StepButtons from 'src/components/StepButtons'
import { Ajax } from 'src/libs/ajax'
import * as Nav from 'src/libs/nav'
import { notify } from 'src/libs/notifications'
import { useCancellation, useOnMount } from 'src/libs/react-utils'
import * as Utils from 'src/libs/utils'


export const SubmissionConfig = ({ methodId }) => {
  const [activeTab, setActiveTab] = useState({ key: 'select-data' })
  const [dataTables, setDataTables] = useState()
  const [methodsData, setMethodsData] = useState({})

  // Options chosen on this page:
  const [selectedTable, setSelectedTable] = useState()
  const [selectedDataTableRows, setSelectedDataTableRows] = useState()
  const [configuredInputDefinition, setConfiguredInputDefinition] = useState()
  const [configuredOutputDefinition, setConfiguredOutputDefinition] = useState()

  // TODO: These should probably be moved to the modal:
  const [runSetName, setRunSetName] = useState()
  const [runSetDescription, setRunSetDescription] = useState()

  const signal = useCancellation()

  useOnMount(() => {
    const loadMethodsData = async () => {
      try {
        const methodsResponse = await Ajax(signal).Cbas.methods.get()
        const allMethods = methodsResponse.methods
        const selectedMethod = _.head(_.filter(m => m.method_id === methodId, allMethods))
        if (selectedMethod) {
          setMethodsData(selectedMethod)
        } else {
          notify('error', 'Error loading methods data', { detail: 'Method not found.' })
        }
      } catch (error) {
        notify('error', 'Error loading methods data', { detail: await (error instanceof Response ? error.text() : error) })
      }
    }

    const loadRunSet = async () => {
      try {
        const runSet = await Ajax(signal).Cbas.runSets.getForMethod(methodId, 1)
        const newRunSetData = runSet.run_sets[0]
        setSelectedTable(newRunSetData.record_type)
        setConfiguredInputDefinition(JSON.parse(newRunSetData.input_definition))
        setConfiguredOutputDefinition(JSON.parse(newRunSetData.output_definition))
      } catch (error) {
        notify('error', 'Error loading run set data', { detail: await (error instanceof Response ? error.text() : error) })
      }
    }

    const loadTablesData = async () => {
      try {
        setDataTables(await Ajax(signal).Wds.types.get())
      } catch (error) {
        notify('error', 'Error loading tables data', { detail: await (error instanceof Response ? error.text() : error) })
      }
    }

    // TODO: Replace with more sensible defaults:
    setSelectedDataTableRows(['FOO1', 'FOO2', 'FOO3'])
    setRunSetName('New run set name')
    setRunSetDescription('New run set description')

    loadMethodsData()
    loadTablesData()
    loadRunSet()
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
        value: selectedTable ? selectedTable : null,
        onChange: ({ value }) => setSelectedTable(value),
        placeholder: 'None selected',
        styles: { container: old => ({ ...old, display: 'inline-block', width: 200 }) },
        options: _.map(d => d.name, dataTables)
      }),
      div({ style: { lineHeight: 2.0 } }, [
        div([span({ style: { fontWeight: 'bold' } }, ['New run set name (TODO: Move to modal): ']), runSetName ? runSetName : 'Run set name required']),
        div([span({ style: { fontWeight: 'bold' } }, ['New run set description (TODO: Move to modal): ']), runSetDescription ? runSetDescription : 'Run set description required'])
      ]),
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
          onClick: () => submitRun()
        }, ['Submit'])
      })
    ])
  }

  const renderDataSelector = () => {
    return selectedDataTableRows ? h(ReactJson, {
      style: { whiteSpace: 'pre-wrap' },
      name: false,
      collapsed: 4,
      enableClipboard: false,
      displayDataTypes: false,
      displayObjectSize: false,
      src: { selectedDataTableRows }
    }) : 'No data table rows selected...'
  }

  const renderInputs = () => {
    return configuredInputDefinition ? h(ReactJson, {
      style: { whiteSpace: 'pre-wrap' },
      name: false,
      collapsed: 4,
      enableClipboard: false,
      displayDataTypes: false,
      displayObjectSize: false,
      src: configuredInputDefinition
    }) : 'No configured input definition...'
  }

  const renderOutputs = () => {
    return configuredOutputDefinition ? h(ReactJson, {
      style: { whiteSpace: 'pre-wrap' },
      name: false,
      collapsed: 4,
      enableClipboard: false,
      displayDataTypes: false,
      displayObjectSize: false,
      src: configuredOutputDefinition
    }) : 'No previous run set data...'
  }

  const submitRun = async () => {
    try {
      const runSetsPayload = {
        run_set_name: runSetName,
        run_set_description: runSetDescription,
        method_id: methodId,
        workflow_input_definitions: configuredInputDefinition,
        workflow_output_definitions: configuredOutputDefinition,
        wds_records: {
          record_type: selectedTable,
          record_ids: selectedDataTableRows
        }
      }

      await Ajax(signal).Cbas.runSets.post(runSetsPayload)
      notify('success', 'Workflow successfully submitted', { message: 'You may check on the progress of workflow on this page anytime.', timeout: 5000 })
      Nav.goToPath('submission-history')
    } catch (error) {
      notify('error', 'Error submitting workflow', { detail: await (error instanceof Response ? error.text() : error) })
    }
  }

  return h(Fragment, [
    div({
      style: {
        borderBottom: '2px solid rgb(116, 174, 67)',
        boxShadow: 'rgb(0 0 0 / 26%) 0px 2px 5px 0px, rgb(0 0 0 / 16%) 0px 2px 10px 0px',
        position: 'relative'
      }
    }, [
      Navbar(),
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
    path: '/submission-config/:methodId',
    component: SubmissionConfig,
    public: true
  }
]
