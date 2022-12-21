import _ from 'lodash/fp'
import { Fragment, useState } from 'react'
import { a, div, h, h2, span } from 'react-hyperscript-helpers'
import ReactJson from 'react-json-view'
import { ButtonPrimary, Link, Navbar, Select } from 'src/components/common'
import { TextArea, TextInput } from 'src/components/input'
import Modal from 'src/components/Modal'
import StepButtons from 'src/components/StepButtons'
import { inputsTable, recordsTable } from 'src/components/submission-common'
import { TextCell } from 'src/components/table'
import { Ajax } from 'src/libs/ajax'
import * as Nav from 'src/libs/nav'
import { notify } from 'src/libs/notifications'
import { useCancellation, useOnMount } from 'src/libs/react-utils'
import * as Utils from 'src/libs/utils'


export const SubmissionConfig = ({ methodId }) => {
  const [activeTab, setActiveTab] = useState({ key: 'select-data' })
  const [recordTypes, setRecordTypes] = useState()
  const [method, setMethod] = useState()
  const [records, setRecords] = useState([])
  const [runSetData, setRunSet] = useState()

  // Options chosen on this page:
  const [selectedRecordType, setSelectedRecordType] = useState()
  const [selectedRecords, setSelectedRecords] = useState({})
  const [configuredInputDefinition, setConfiguredInputDefinition] = useState()
  const [configuredOutputDefinition, setConfiguredOutputDefinition] = useState()

  // TODO: These should probably be moved to the modal:
  const [runSetName, setRunSetName] = useState('')
  const [runSetDescription, setRunSetDescription] = useState('')

  // TODO: this should probably be moved to a scope more local to the data selector
  const [sort, setSort] = useState({ field: 'name', direction: 'asc' })
  const [inputTableSort, setInputTableSort] = useState({ field: 'taskVariable', direction: 'asc' })

  const [launching, setLaunching] = useState(undefined)


  const signal = useCancellation()
  const loadRecordsData = async recordType => {
    try {
      const searchResult = await Ajax(signal).Wds.search.post(recordType)
      setRecords(searchResult.records)
    } catch (error) {
      notify('error', 'Error loading WDS records', { detail: await (error instanceof Response ? error.text() : error) })
    }
  }

  const loadMethodsData = async () => {
    try {
      const methodsResponse = await Ajax(signal).Cbas.methods.get()
      const allMethods = methodsResponse.methods
      const selectedMethod = _.head(_.filter(m => m.method_id === methodId, allMethods))
      if (selectedMethod) {
        setMethod(selectedMethod)
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
      setRunSet(runSet.run_sets[0])
      setConfiguredInputDefinition(JSON.parse(newRunSetData.input_definition))
      setConfiguredOutputDefinition(JSON.parse(newRunSetData.output_definition))
      return newRunSetData.record_type
    } catch (error) {
      notify('error', 'Error loading run set data', { detail: await (error instanceof Response ? error.text() : error) })
    }
  }

  const loadTablesData = async () => {
    try {
      setRecordTypes(await Ajax(signal).Wds.types.get())
    } catch (error) {
      notify('error', 'Error loading tables data', { detail: await (error instanceof Response ? error.text() : error) })
    }
  }

  useOnMount(() => {
    //setRunSetName('New run set name')
    //setRunSetDescription('New run set description')

    loadMethodsData()
    loadTablesData()
    loadRunSet().then(recordType => {
      setSelectedRecordType(recordType)
      loadRecordsData(recordType)
    })
  })

  const renderSummary = () => {
    return div({ style: { margin: '4em' } }, [
      div({ style: { display: 'flex', marginTop: '1rem', justifyContent: 'space-between' } }, [
        h2([method ? method.name : 'loading'])
      ]),
      div({ style: { lineHeight: 2.0 } }, [
        div([
          span({ style: { fontWeight: 'bold' } }, ['Workflow source link: ']),
          a(
            { href: method ? method.source_url : 'loading' },
            [method ? method.source_url : 'loading']
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
        value: selectedRecordType ? selectedRecordType : null,
        onChange: ({ value }) => {
          setSelectedRecordType(value)
          loadRecordsData(value)
        },
        placeholder: 'None selected',
        styles: { container: old => ({ ...old, display: 'inline-block', width: 200 }) },
        options: _.map(t => t.name, recordTypes)
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
          'aria-label': 'Submit button',
          style: { marginLeft: '1rem' },
          disabled: _.isEmpty(selectedRecords),
          tooltip: _.isEmpty(selectedRecords) ? 'No records selected' : '',
          onClick: () => setLaunching(true)
        }, ['Submit'])
      }),
      (launching !== undefined) && h(Modal, {
        title: 'Send submission',
        width: 600,
        onDismiss: () => setLaunching(undefined),
        showCancel: true,
        okButton:
          h(ButtonPrimary, {
            disabled: false,
            onClick: () => submitRun()
          }, ['Submit'])
      }, [
        div({ style: { lineHeight: 2.0 } }, [
          h(TextCell, { style: { marginTop: '1.5rem', fontSize: 16, fontWeight: 'bold' } }, ['Submission name']),
          h(TextInput, {
            'aria-label': 'Submission name',
            value: runSetName,
            onChange: setRunSetName,
            placeholder: 'Enter submission name'
          })
        ]
        ),
        div({ style: { lineHeight: 2.0, marginTop: '1.5rem' } }, [
          span({ style: { fontSize: 16, fontWeight: 'bold' } }, ['Comment ']), '(optional)',
          h(TextArea, {
            style: { height: 200, borderTopLeftRadius: 0, borderTopRightRadius: 0 },
            'aria-label': 'Enter a comment',
            value: runSetDescription,
            onChange: setRunSetDescription,
            placeholder: 'Enter comments'
          })
        ]),
        div({ style: { lineHeight: 2.0, marginTop: '1.5rem' } }, [
          div([h(TextCell, ['This will launch ', span({ style: { fontWeight: 'bold' } }, [runSetData.run_count]), ' workflow(s).'])]),
          h(TextCell, { style: { marginTop: '1rem' } }, ['Running workflows will generate cloud compute charges.'])
        ])
      ])
    ])
  }

  const renderRecordSelector = () => {
    return recordTypes && records.length ? h(recordsTable, {
      records,
      selectedRecords, setSelectedRecords,
      selectedDataTable: _.keyBy('name', recordTypes)[selectedRecordType || records[0].type],
      sort, setSort
    }) : 'No data table rows selected...'
  }

  const renderInputs = () => {
    return configuredInputDefinition ? h(inputsTable, {
      selectedDataTable: _.keyBy('name', recordTypes)[selectedRecordType],
      configuredInputDefinition, setConfiguredInputDefinition,
      inputTableSort, setInputTableSort
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
          record_type: selectedRecordType,
          record_ids: _.keys(selectedRecords)
        }
      }

      const runSetObject = await Ajax(signal).Cbas.runSets.post(runSetsPayload)
      notify('success', 'Workflow successfully submitted', { message: 'You may check on the progress of workflow on this page anytime.', timeout: 5000 })
      Nav.goToPath('submission-details', {
        submissionId: runSetObject.run_set_id
      })
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
      Navbar('SUBMIT WORKFLOWS WITH CROMWELL'),
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
        ['select-data', () => renderRecordSelector()],
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
