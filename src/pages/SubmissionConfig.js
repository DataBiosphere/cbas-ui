import _ from 'lodash/fp'
import { Fragment, useState } from 'react'
import { a, div, h, h2, h3, span } from 'react-hyperscript-helpers'
import ReactJson from 'react-json-view'
import { AutoSizer } from 'react-virtualized'
import { ButtonPrimary, Checkbox, Clickable, headerBar, Link, Select } from 'src/components/common'
import { HeaderOptions, renderDataCell } from 'src/components/data/data-utils'
import { icon } from 'src/components/icons'
import { TextArea, TextInput } from 'src/components/input'
import Modal from 'src/components/Modal'
import { MenuButton, MenuTrigger } from 'src/components/PopupTrigger'
import StepButtons from 'src/components/StepButtons'
import { GridTable, HeaderCell, Resizable, TextCell } from 'src/components/table'
import { Ajax } from 'src/libs/ajax'
import colors from 'src/libs/colors'
import * as Nav from 'src/libs/nav'
import { notify } from 'src/libs/notifications'
import { useCancellation, useOnMount } from 'src/libs/react-utils'
import * as Utils from 'src/libs/utils'


export const SubmissionConfig = ({ methodId }) => {
  const [activeTab, setActiveTab] = useState({ key: 'select-data' })
  const [recordTypes, setRecordTypes] = useState()
  const [method, setMethod] = useState()
  const [records, setRecords] = useState([])

  // Options chosen on this page:
  const [selectedRecordType, setSelectedRecordType] = useState()
  const [selectedRecords, setSelectedRecords] = useState()
  const [configuredInputDefinition, setConfiguredInputDefinition] = useState()
  const [configuredOutputDefinition, setConfiguredOutputDefinition] = useState()

  // TODO: These should probably be moved to the modal:
  const [runSetName, setRunSetName] = useState('')
  const [runSetDescription, setRunSetDescription] = useState('')

  // TODO: this should probably be moved to a scope more local to the data selector
  const [sort, setSort] = useState({ field: 'name', direction: 'asc' })

  const [launching, setLaunching] = useState(undefined)
  // const [runSet, setRunSetName] = useState(null)


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
    setRunSetDescription('New run set description')

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
          onClick: () => setLaunching(true) //submitRun()
        }, ['Submit'])
      }),
      (launching !== undefined) && h(Modal, {
        title: 'Send submission',
        width: 600,
        onDismiss: () => setLaunching(undefined),
        showCancel: true,
        borderRadius: 5, position: 'relative',
        padding: '1.5rem 1.25rem', outline: 'none',
        backgroundColor: 'white',
        okButton:
          h(ButtonPrimary, {
            disabled: false,
            onClick: () => submitRun()
          }, ['Submit'])
      }, [
        div({ style: { lineHeight: 2.0 } }, [
          h(TextCell, { style: { marginTop: '1.5rem', fontSize: 16, fontWeight: 'bold' } }, ['Submission name']),
          h(TextInput, {
            value: runSetName,
            onChange: setRunSetName,
            placeholder: 'Enter submission name' })]
        ),
        div({ style: { lineHeight: 2.0, marginTop: '1.5rem' } }, [
          span({ style: { fontSize: 16, fontWeight: 'bold' } }, ['Comment ']), '(optional)',
          h(TextArea, { style: { height: '10rem' }, placeholder: 'Enter comments' })]),
        div({ style: { lineHeight: 2.0, marginTop: '1.5rem' } }, [
          h(TextCell, ['This will launch # workflows']),
          h(TextCell, { style: { marginTop: '1.5rem'} }, ['Running workflows will generate cloud compute charges.'])
        ])
        ])
    ])
  }

  const renderRecordSelector = () => {
    return recordTypes && records.length ? renderGrid({
      records,
      selectedRecords, setSelectedRecords,
      selectedDataTable: _.keyBy('name', recordTypes)[selectedRecordType || records[0].type],
      sort, setSort
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

  const submitModal = () => {
    return h(Modal, {
      title: 'Submit modal',
      onDismiss: setLaunching(true),
      okButton:
        h(ButtonPrimary, {
        disabled: false, //TODO: change this to be disabled when there is no submission name
        onClick: () => {
          setLaunching(true)
          submitRun()
        }
      }, ['Submit'])
    }, [div(), div({}, [h(TextCell, ['Comment (optional)']),(h(TextInput, {placeholder: 'Enter comments'}))]), div()]
    )
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
        ['select-data', () => renderRecordSelector()],
        ['inputs', () => renderInputs()],
        ['outputs', () => renderOutputs()]
      )
    ])
  ])
}

const renderGrid = props => {
  const {
    records,
    selectedRecords, setSelectedRecords,
    selectedDataTable,
    sort, setSort
  } = props

  const selectAll = () => {
    console.log('TODO: implement selectAll')
  }

  const selectPage = () => {
    console.log('TODO: implement selectPage')
  }

  const deselectPage = () => {
    console.log('TODO: implement deselectPage')
  }

  const selectNone = () => {
    console.log('TODO: implement selectNone')
  }

  const pageSelected = () => {
    const recordIds = _.map('id', records)
    const selectedIds = _.keys(selectedRecords)
    return records.length && _.every(k => _.includes(k, selectedIds), recordIds)
  }

  const resizeColumn = (delta, columnName) => {
    window.alert(`column resizing currently disabled (${delta}, ${columnName}`)
  }

  const columnWidth = 300

  return h(AutoSizer, [({ width, height }) => {
    return h(GridTable, {
      'aria-label': `${selectedDataTable.name} data table`,
      width,
      height,
      // // Keeping these properties here as a reminder: can we use them?
      // noContentMessage: DEFAULT,
      // noContentRenderer: DEFAULT,
      rowCount: records.length,
      columns: [
        {
          width: 70,
          headerRenderer: () => {
            return h(Fragment, [
              h(Checkbox, {
                checked: () => pageSelected(),
                disabled: !records.length,
                onChange: () => pageSelected() ? deselectPage : selectPage,
                'aria-label': 'Select all'
              }),
              h(MenuTrigger, {
                closeOnClick: true,
                content: h(Fragment, [
                  h(MenuButton, { onClick: selectPage }, ['Page']),
                  h(MenuButton, { onClick: selectAll }, [`All (${records.length})`]),
                  h(MenuButton, { onClick: selectNone }, ['None'])
                ]),
                side: 'bottom'
              }, [
                h(Clickable, { 'aria-label': '"Select All" options' }, [icon('caretDown')])
              ])
            ])
          },
          cellRenderer: ({ rowIndex }) => {
            const thisRecord = records[rowIndex]
            const { id } = thisRecord
            const checked = _.has([id], selectedRecords)
            return h(Checkbox, {
              'aria-label': id || 'id-pending',
              checked,
              onChange: () => {
                setSelectedRecords((checked ? _.unset([id]) : _.set([id], thisRecord))(selectedRecords))
              }
            })
          }
        },
        {
          field: 'id',
          width: columnWidth,
          headerRenderer: () => h(Resizable, {
            width: columnWidth, // TODO: read this from state after resizing
            onWidthChange: delta => resizeColumn(delta, 'id')
          }, [
            h(HeaderOptions, { sort, field: 'id', onSort: setSort },
              [h(HeaderCell, ['ID'])])
          ]),
          cellRenderer: ({ rowIndex }) => {
            const { id: recordId } = records[rowIndex]
            return h(Fragment, [
              renderDataCell(recordId),
              div({ style: { flexGrow: 1 } })
            ])
          }
        },
        ..._.map(({ name: attributeName }) => {
          const thisWidth = columnWidth // TODO: read this from state after resizing
          const [, columnNamespace, columnName] = /(.+:)?(.+)/.exec(attributeName)
          return {
            field: attributeName,
            width: thisWidth,
            headerRenderer: () => h(Resizable, {
              width: thisWidth,
              onWidthChange: delta => resizeColumn(delta, 'id')
            }, [
              h(HeaderOptions, {
                sort,
                field: attributeName,
                onSort: setSort
              }, [
                h(HeaderCell, [
                  !!columnNamespace && span({ style: { fontStyle: 'italic', color: colors.dark(0.75), paddingRight: '0.2rem' } }, [columnNamespace]),
                  columnName
                ])
              ])
            ]),
            cellRenderer: ({ rowIndex }) => {
              return h(Fragment, [
                String(records[rowIndex].attributes[attributeName])
              ])
            }
          }
        }, selectedDataTable.attributes)
      ]
    }, [])
  }])
}

export const navPaths = [
  {
    name: 'submission-config',
    path: '/submission-config/:methodId',
    component: SubmissionConfig,
    public: true
  }
]
