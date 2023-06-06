import _ from 'lodash/fp'
import { Fragment, useCallback, useEffect, useRef, useState } from 'react'
import { a, div, h, h2, span } from 'react-hyperscript-helpers'
import { ButtonPrimary, Link, Navbar, Select } from 'src/components/common'
import { errorStyles } from 'src/components/ErrorView'
import HelpfulLinksBox from 'src/components/HelpfulLinksBox'
import { centeredSpinner, icon } from 'src/components/icons'
import { TextArea, TextInput } from 'src/components/input'
import InputsTable from 'src/components/InputsTable'
import Modal from 'src/components/Modal'
import OutputsTable from 'src/components/OutputsTable'
import RecordsTable from 'src/components/RecordsTable'
import StepButtons from 'src/components/StepButtons'
import {
  inputsMissingRequiredAttributes,
  inputsWithIncorrectValues,
  requiredInputsWithoutSource,
  resolveWdsUrl,
  WdsPollInterval
} from 'src/components/submission-common'
import { TextCell } from 'src/components/table'
import { Ajax } from 'src/libs/ajax'
import colors from 'src/libs/colors'
import { getConfig } from 'src/libs/config'
import * as Nav from 'src/libs/nav'
import { notify } from 'src/libs/notifications'
import { useCancellation, useOnMount } from 'src/libs/react-utils'
import { maybeParseJSON } from 'src/libs/utils'
import * as Utils from 'src/libs/utils'
import ViewWorkflowScriptModal from 'src/pages/ViewWorkflowScriptModal'


export const SubmissionConfig = ({ methodId }) => {
  const [activeTab, setActiveTab] = useState({ key: 'select-data' })
  const [recordTypes, setRecordTypes] = useState()
  const [method, setMethod] = useState()
  const [availableMethodVersions, setAvailableMethodVersions] = useState()
  const [selectedMethodVersion, setSelectedMethodVersion] = useState()
  const [records, setRecords] = useState([])
  const [dataTableColumnWidths, setDataTableColumnWidths] = useState({})
  const [loading, setLoading] = useState(false)
  const [workflowScript, setWorkflowScript] = useState()
  const [runSetRecordType, setRunSetRecordType] = useState()
  const [wdsProxyUrl, setWdsProxyUrl] = useState({ status: 'None', state: '' })
  const pollWdsInterval = useRef()

  // Options chosen on this page:
  const [selectedRecordType, setSelectedRecordType] = useState()
  const [selectedRecords, setSelectedRecords] = useState({})
  const [configuredInputDefinition, setConfiguredInputDefinition] = useState()
  const [configuredOutputDefinition, setConfiguredOutputDefinition] = useState()
  const [missingRequiredInputs, setMissingRequiredInputs] = useState([])
  const [missingExpectedAttributes, setMissingExpectedAttributes] = useState([])
  const [inputsWithInvalidValues, setInputsWithInvalidValues] = useState([])
  const [viewWorkflowScriptModal, setViewWorkflowScriptModal] = useState(false)

  // TODO: These should probably be moved to the modal:
  const [runSetName, setRunSetName] = useState('')
  const [runSetDescription, setRunSetDescription] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [workflowSubmissionError, setWorkflowSubmissionError] = useState()

  // TODO: this should probably be moved to a scope more local to the data selector
  const [recordsTableSort, setRecordsTableSort] = useState({ field: 'id', direction: 'asc' })
  const [inputTableSort, setInputTableSort] = useState({ field: '', direction: 'asc' })
  const [outputTableSort, setOutputTableSort] = useState({ field: '', direction: 'asc' })

  const [displayLaunchModal, setDisplayLaunchModal] = useState(false)
  const [noRecordTypeData, setNoRecordTypeData] = useState(null)

  const dataTableRef = useRef()
  const signal = useCancellation()

  const loadWdsUrl = useCallback(async () => {
    // for local testing - since we use local WDS setup, we don't need to call Leo to get proxy url
    // for CBAS UI deployed in app - we don't want to decouple CBAS and WDS yet. Until then we keep using WDS url passed in config.
    //                               When we are ready for that change to be released, we should remove `wdsUrlRoot` from cromwhelm configs
    //                               and then CBAS UI will talk to Leo to get WDS url root.
    const wdsUrlRoot = getConfig().wdsUrlRoot
    if (wdsUrlRoot) {
      const res = { status: 'Ready', state: wdsUrlRoot }
      setWdsProxyUrl(res)
      return res
    }

    let res = { status: 'None', state: '' }
    try {
      const wdsUrl = await Ajax(signal).Leonardo.listAppsV2().then(resolveWdsUrl)
      if (!!wdsUrl) {
        res = { status: 'Ready', state: wdsUrl }
        setWdsProxyUrl(res)
      }
      return res
    } catch (error) {
      if (error.status === 401) res = { status: 'Unauthorized', state: error }
      else res = { status: 'Error', state: error }

      setWdsProxyUrl(res)
      return res
    }
  }, [signal])

  const loadRecordsData = useCallback(async (recordType, wdsUrlRoot) => {
    try {
      const searchResult = await Ajax(signal).Wds.search.post(wdsUrlRoot, recordType)
      setRecords(searchResult.records)
    } catch (error) {
      if (recordType === undefined) {
        setNoRecordTypeData('Select a data table')
      } else {
        setNoRecordTypeData(`Data table not found: ${recordType}`)
      }
    }
  }, [signal])

  const loadMethodsData = async (methodId, methodVersionId) => {
    try {
      const methodsResponse = await Ajax(signal).Cbas.methods.getById(methodId)
      const method = methodsResponse.methods[0]
      if (method) {
        const selectedVersion = _.filter(mv => mv.method_version_id === methodVersionId, method.method_versions)[0]
        setMethod(method)
        setAvailableMethodVersions(method.method_versions)
        setSelectedMethodVersion(selectedVersion)
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
      setConfiguredInputDefinition(maybeParseJSON(newRunSetData.input_definition))

      setConfiguredOutputDefinition(maybeParseJSON(newRunSetData.output_definition))
      setSelectedRecordType(newRunSetData.record_type)
      return newRunSetData
    } catch (error) {
      notify('error', 'Error loading run set data', { detail: await (error instanceof Response ? error.text() : error) })
    }
  }

  const loadRecordTypes = useCallback(async wdsUrlRoot => {
    try {
      setRecordTypes(await Ajax(signal).Wds.types.get(wdsUrlRoot))
    } catch (error) {
      notify('error', 'Error loading data types', { detail: await (error instanceof Response ? error.text() : error) })
    }
  }, [signal])

  const loadWdsData = useCallback(async ({ recordType, includeLoadRecordTypes = true }) => {
    try {
      // try to load WDS proxy URL if one doesn't exist
      if (!wdsProxyUrl || (wdsProxyUrl.status !== 'Ready')) {
        const { status, state: wdsUrlRoot } = await loadWdsUrl()
        if (status === 'Unauthorized') {
          notify('warn', 'Error loading data tables', { detail: 'Service returned Unauthorized error. Session might have expired. Please close the tab and re-open it.' })
        } else if (!!wdsUrlRoot) {
          if (includeLoadRecordTypes) { await loadRecordTypes(wdsUrlRoot) }
          await loadRecordsData(recordType, wdsUrlRoot)
        } else {
          const errorDetails = await (wdsUrlRoot instanceof Response ? wdsUrlRoot.text() : wdsUrlRoot)
          // to avoid stacked warning banners due to auto-poll for WDS url, we remove the current banner at 29th second
          notify('warn', 'Error loading data tables', { detail: `Data Table app not found. Will retry in 30 seconds. Error details: ${errorDetails}`, timeout: WdsPollInterval - 1000 })
        }
      } else {
        // if we have the WDS proxy URL load the WDS data
        const wdsUrlRoot = wdsProxyUrl.state
        if (includeLoadRecordTypes) { await loadRecordTypes(wdsUrlRoot) }
        await loadRecordsData(recordType, wdsUrlRoot)
      }
    } catch (error) {
      notify('error', 'Error loading data tables', { detail: await (error instanceof Response ? error.text() : error) })
    }
  }, [loadRecordsData, loadRecordTypes, loadWdsUrl, wdsProxyUrl])

  useOnMount(() => {
    loadRunSet().then(runSet => {
      setRunSetRecordType(runSet.record_type)
      loadMethodsData(runSet.method_id, runSet.method_version_id)
      loadWdsData({ recordType: runSet.record_type })
    })
  })

  useEffect(() => {
    // inspect input configuration and selected data table to find required inputs without attributes assigned to it
    if (recordTypes && records && records.length && configuredInputDefinition) {
      const selectedDataTable = _.keyBy('name', recordTypes)[records[0].type]
      const dataTableAttributes = _.keyBy('name', selectedDataTable.attributes)

      const newMissingExpectedAttributes = _.map(
        i => i.input_name,
        inputsMissingRequiredAttributes(configuredInputDefinition, dataTableAttributes))

      const newMissingRequiredInputs = _.map(
        i => i.input_name,
        requiredInputsWithoutSource(configuredInputDefinition))

      const newInputsWithIncorrectValues = _.map(i => i.input_name, inputsWithIncorrectValues(configuredInputDefinition))

      setMissingExpectedAttributes(newMissingExpectedAttributes)
      setMissingRequiredInputs(newMissingRequiredInputs)
      setInputsWithInvalidValues(newInputsWithIncorrectValues)
    }
  }, [records, recordTypes, configuredInputDefinition])

  useEffect(() => {
    dataTableRef.current?.recomputeColumnSizes()
  }, [dataTableColumnWidths, records, recordTypes])

  useEffect(() => {
    if (method && availableMethodVersions) {
      setLoading(false)
    } else {
      setLoading(true)
    }
  }, [method, availableMethodVersions])

  useEffect(() => {
    async function getWorkflowScript() {
      try {
        const script = await Ajax(signal).WorkflowScript.get(selectedMethodVersion.url)
        setWorkflowScript(script)
      } catch (error) {
        notify('error', 'Error loading workflow script', { detail: await (error instanceof Response ? error.text() : error) })
      }
    }

    if (selectedMethodVersion != null) {
      getWorkflowScript()
    }
  }, [signal, selectedMethodVersion])

  useEffect(() => {
    // Start polling if we're missing WDS proxy url and stop polling when we have it
    if ((!wdsProxyUrl || (wdsProxyUrl.status !== 'Ready')) && wdsProxyUrl.status !== 'Unauthorized' && !pollWdsInterval.current) {
      pollWdsInterval.current = setInterval(() => loadWdsData({ recordType: runSetRecordType }), WdsPollInterval)
    } else if (!!wdsProxyUrl && wdsProxyUrl.status === 'Ready' && pollWdsInterval.current) {
      clearInterval(pollWdsInterval.current)
      pollWdsInterval.current = undefined
    }

    return () => {
      clearInterval(pollWdsInterval.current)
      pollWdsInterval.current = undefined
    }
  }, [loadWdsData, wdsProxyUrl, runSetRecordType])

  const renderSummary = () => {
    return div({ style: { marginLeft: '2em', marginTop: '1rem', display: 'flex', justifyContent: 'space-between' } }, [
      div([
        div([
          h2([method ? `Submission Configuration for ${method.name}` : 'loading'])
        ]),
        div({ style: { lineHeight: 2.0 } }, [
          div([span({ style: { fontWeight: 'bold' } }, ['Workflow Version: ']),
            availableMethodVersions ?
              h(Select, {
                isDisabled: false,
                'aria-label': 'Select a workflow version',
                isClearable: false,
                value: selectedMethodVersion ? selectedMethodVersion.name : null,
                onChange: ({ value }) => {
                  setSelectedMethodVersion(_.find(m => m.name === value, availableMethodVersions))
                },
                placeholder: 'None',
                styles: { container: old => ({ ...old, display: 'inline-block', width: 325, marginLeft: 20 }) },
                options: _.map(m => m.name, availableMethodVersions)
              }) :
              'Fetching available workflow versions...']),
          div([
            span({ style: { fontWeight: 'bold' } }, ['Workflow source URL: ']),
            selectedMethodVersion ?
              selectedMethodVersion.url : 'No workflow version selected'
          ]),
          div([
            h(Link, { disabled: workflowScript == null, onClick: () => setViewWorkflowScriptModal(true) }, 'View Workflow Script')
          ])
        ]),
        div({ style: { marginTop: '2rem', height: '2rem', fontWeight: 'bold' } }, ['Select a data table']),
        div({}, [
          h(Select, {
            isDisabled: false,
            'aria-label': 'Select a data table',
            isClearable: false,
            value: selectedRecordType ? selectedRecordType : null,
            onChange: ({ value }) => {
              setNoRecordTypeData(null)
              setSelectedRecordType(value)
              setSelectedRecords(null)
              loadWdsData({ recordType: value, includeLoadRecordTypes: false })
            },
            placeholder: 'None selected',
            styles: { container: old => ({ ...old, display: 'inline-block', width: 200 }), paddingRight: '2rem' },
            options: _.map(t => t.name, recordTypes)
          }),
          noRecordTypeData && h(Fragment, [
            a({ 'aria-label': 'warning message', style: { marginLeft: '1rem', fontSize: 15, marginTop: '1rem', height: '2rem', fontWeight: 'bold' } }, [icon('error-standard', { size: 20, style: { color: colors.warning(), flex: 'none', marginRight: '0.5rem' } }), noRecordTypeData])
          ])
        ]),
        h(StepButtons, {
          tabs: [
            { key: 'select-data', title: 'Select Data', isValid: true },
            { key: 'inputs', title: 'Inputs', isValid: !missingRequiredInputs.length && !missingExpectedAttributes.length && !inputsWithInvalidValues.length },
            { key: 'outputs', title: 'Outputs', isValid: true }
          ],
          activeTab: activeTab.key || 'select-data',
          onChangeTab: v => setActiveTab({ key: v }),
          finalStep: h(ButtonPrimary, {
            'aria-label': 'Submit button',
            style: { marginLeft: '1rem' },
            disabled: _.isEmpty(selectedRecords) || missingRequiredInputs.length || missingExpectedAttributes.length || inputsWithInvalidValues.length,
            tooltip: Utils.cond(
              [_.isEmpty(selectedRecords), () => 'No records selected'],
              [missingRequiredInputs.length || missingExpectedAttributes.length, () => 'One or more inputs have missing values'],
              [inputsWithInvalidValues.length, () => 'One or more inputs have invalid values'],
              () => ''
            ),
            onClick: () => {
              updateRunSetName()
              setDisplayLaunchModal(true)
            }
          }, ['Submit'])
        }),
        displayLaunchModal && h(Modal, {
          title: 'Send submission',
          width: 600,
          onDismiss: () => {
            if (!isSubmitting) {
              setDisplayLaunchModal(false)
              setWorkflowSubmissionError(undefined)
            }
          },
          showCancel: !isSubmitting,
          okButton:
            h(ButtonPrimary, {
              disabled: isSubmitting,
              'aria-label': 'Launch Submission',
              onClick: () => submitRun()
            }, [isSubmitting ? 'Submitting...' : 'Submit'])
        }, [
          div({ style: { lineHeight: 2.0 } }, [
            h(TextCell, { style: { marginTop: '1.5rem', fontSize: 16, fontWeight: 'bold' } }, ['Submission name']),
            h(TextInput, {
              disabled: isSubmitting,
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
              disabled: isSubmitting,
              value: runSetDescription,
              onChange: setRunSetDescription,
              placeholder: 'Enter comments'
            })
          ]),
          div({ style: { lineHeight: 2.0, marginTop: '1.5rem' } }, [
            div([h(TextCell, ['This will launch ', span({ style: { fontWeight: 'bold' } }, [_.keys(selectedRecords).length]), ' workflow(s).'])]),
            h(TextCell, { style: { marginTop: '1rem' } }, ['Running workflows will generate cloud compute charges.']),
            workflowSubmissionError && div([
              div({ style: { display: 'flex', alignItems: 'center', marginTop: '1rem' } }, [
                icon('warning-standard', { size: 16, style: { color: colors.danger() } }),
                h(TextCell, { style: { marginLeft: '0.5rem' } }, ['Error submitting workflow:'])
              ]),
              div({
                style: { ...errorStyles.jsonFrame, overflowY: 'scroll', maxHeight: 160 },
                'aria-label': 'Modal submission error'
              }, [workflowSubmissionError])
            ])
          ])
        ]),
        viewWorkflowScriptModal && h(ViewWorkflowScriptModal, { workflowScript, onDismiss: () => setViewWorkflowScriptModal(false) })
      ]),
      method && div({ style: { marginRight: '1em' } }, [h(HelpfulLinksBox, { method })])
    ])
  }

  const renderRecordSelector = () => {
    return recordTypes && records.length ? h(RecordsTable, {
      dataTableColumnWidths, setDataTableColumnWidths,
      dataTableRef,
      records,
      selectedRecords, setSelectedRecords,
      selectedDataTable: _.keyBy('name', recordTypes)[selectedRecordType || records[0].type],
      recordsTableSort, setRecordsTableSort
    }) : 'No data table rows selected...'
  }

  const renderInputs = () => {
    return configuredInputDefinition && recordTypes && records.length ? h(InputsTable, {
      selectedDataTable: _.keyBy('name', recordTypes)[selectedRecordType],
      configuredInputDefinition, setConfiguredInputDefinition,
      inputTableSort, setInputTableSort,
      missingExpectedAttributes,
      missingRequiredInputs,
      inputsWithInvalidValues
    }) : 'No data table rows available or input definition is not configured...'
  }

  const renderOutputs = () => {
    return configuredOutputDefinition ? h(OutputsTable, {
      selectedDataTable: _.keyBy('name', recordTypes)[selectedRecordType],
      configuredOutputDefinition, setConfiguredOutputDefinition,
      outputTableSort, setOutputTableSort
    }) : 'No previous run set data...'
  }

  const updateRunSetName = () => {
    const timestamp = new Date().toISOString().slice(0, -5) // slice off milliseconds at the end for readability.
    if (runSetName === '') {
      setRunSetName(`${_.kebabCase(method.name)}_${_.kebabCase(selectedRecordType)}_${timestamp}`)
    }
  }

  const submitRun = async () => {
    try {
      const runSetsPayload = {
        run_set_name: runSetName,
        run_set_description: runSetDescription,
        method_version_id: selectedMethodVersion.method_version_id,
        workflow_input_definitions: configuredInputDefinition,
        workflow_output_definitions: configuredOutputDefinition,
        wds_records: {
          record_type: selectedRecordType,
          record_ids: _.keys(selectedRecords)
        }
      }

      setIsSubmitting(true)
      const runSetObject = await Ajax(signal).Cbas.runSets.post(runSetsPayload)
      notify('success', 'Workflow successfully submitted', { message: 'You may check on the progress of workflow on this page anytime.', timeout: 5000 })
      Nav.goToPath('submission-details', {
        submissionId: runSetObject.run_set_id
      })
    } catch (error) {
      setIsSubmitting(false)
      setWorkflowSubmissionError(JSON.stringify(error instanceof Response ? (await error.json()) : error, null, 2))
    }
  }

  return loading ? centeredSpinner() : h(Fragment, [
    div({
      style: {
        borderBottom: '2px solid rgb(116, 174, 67)',
        boxShadow: 'rgb(0 0 0 / 26%) 0px 2px 5px 0px, rgb(0 0 0 / 16%) 0px 2px 10px 0px',
        position: 'relative'
      }
    }, [
      Navbar('RUN WORKFLOWS WITH CROMWELL'),
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
