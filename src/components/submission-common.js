import _ from 'lodash/fp'
import { Fragment } from 'react'
import { div, h, span } from 'react-hyperscript-helpers'
import { AutoSizer } from 'react-virtualized'
import { Checkbox, Clickable, Select } from 'src/components/common'
import { HeaderOptions, renderDataCell } from 'src/components/data/data-utils'
import { icon } from 'src/components/icons'
import { TextInput } from 'src/components/input'
import { MenuButton, MenuTrigger } from 'src/components/PopupTrigger'
import { FlexTable, GridTable, HeaderCell, Resizable, Sortable, TextCell } from 'src/components/table'
import colors from 'src/libs/colors'
import * as Utils from 'src/libs/utils'


const iconSize = 24
export const addCountSuffix = (label, count = undefined) => {
  return label + (count === undefined ? '' : `: ${count}`)
}

export const statusType = {
  succeeded: {
    id: 'succeeded', // Must match variable name for collection unpacking.
    label: () => 'Succeeded',
    icon: style => icon('check', { size: iconSize, style: { color: colors.success(), ...style } })
  },
  failed: {
    id: 'failed', // Must match variable name for collection unpacking.
    label: () => 'Failed',
    icon: style => icon('warning-standard', { size: iconSize, style: { color: colors.danger(), ...style } })
  },
  running: {
    id: 'running', // Must match variable name for collection unpacking.
    label: () => 'Running',
    icon: style => icon('sync', { size: iconSize, style: { color: colors.dark(), ...style } })
  },
  submitted: {
    id: 'submitted', // Must match variable name for collection unpacking.
    label: () => 'Submitted',
    icon: style => icon('clock', { size: iconSize, style: { color: colors.dark(), ...style } })
  },
  waitingForQuota: {
    id: 'waitingForQuota', // Must match variable name for collection unpacking.
    label: () => 'Submitted, Awaiting Cloud Quota',
    icon: style => icon('error-standard', { size: iconSize, style: { color: colors.warning(), ...style } }),
    moreInfoLink: 'https://support.terra.bio/hc/en-us/articles/360029071251',
    moreInfoLabel: 'Learn more about cloud quota',
    tooltip: 'Delayed by Google Cloud Platform (GCP) quota limits. Contact Terra Support to request a quota increase.'
  },
  unknown: {
    id: 'unknown', // Must match variable name for collection unpacking.
    label: executionStatus => `Unexpected status (${executionStatus})`,
    icon: style => icon('question', { size: iconSize, style: { color: colors.dark(), ...style } })
  }
}

/**
 * Returns the rendered status line, based on icon function, label, and style.
 */
export const makeStatusLine = (iconFn, label, style) => div(
  { style: { display: 'flex', alignItems: 'center', fontSize: 14, ...style } },
  [iconFn({ marginRight: '0.5rem' }), label]
)


export const recordsTable = props => {
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


export const inputsTable = props => {
  const {
    selectedDataTable,
    method,
    configuredInputDefinition, setConfiguredInputDefinition,
    cachedInputSources, setCachedInputSources,
    inputTableSort, setInputTableSort
  } = props

  const dataTableAttributes = _.keyBy('name', selectedDataTable.attributes)

  const inputSourceLabels = {
    default: 'Use Default',
    literal: 'Type a Value',
    record_lookup: 'Fetch from Data Table'
  }
  const inputSourceTypes = _.invert(inputSourceLabels)

  const parseInputType = inputType => {
    const { primitive_type: primitiveType, optional_type: optionalType } = inputType
    return primitiveType ? primitiveType : `${optionalType.primitive_type} (optional)`
  }

  const recordLookupSelect = rowIndex => {
    return h(Select, {
      isDisabled: false,
      'aria-label': 'Select an Attribute',
      isClearable: false,
      value: _.get(`${rowIndex}.source.record_attribute`, configuredInputDefinition) || _.get(`${rowIndex}.record_attribute`, cachedInputSources),
      onChange: ({ value }) => {
        const newAttribute = _.get(`${value}.name`, dataTableAttributes)
        const newSource = {
          type: _.get(`${rowIndex}.source.type`, configuredInputDefinition),
          record_attribute: newAttribute
        }
        const newConfig = _.set(`${rowIndex}.source`, newSource, configuredInputDefinition)
        setConfiguredInputDefinition(newConfig)
        setCachedInputSources(_.set(`${rowIndex}.record_attribute`, newSource.record_attribute, cachedInputSources))
      },
      placeholder: 'Select Attribute',
      options: _.keys(dataTableAttributes),
      // ** https://stackoverflow.com/questions/55830799/how-to-change-zindex-in-react-select-drowpdown
      styles: { container: old => ({ ...old, display: 'inline-block' }), menuPortal: base => ({ ...base, zIndex: 9999 }) },
      menuPortalTarget: document.body,
      menuPlacement: 'top'
    })
  }

  const parameterValueSelect = rowIndex => {
    return h(TextCell, {}, [
      h(TextInput, {
        id: `literal-input-${rowIndex}`,
        style: { display: 'block', width: '100%' },
        placeholder: 'FOO',
        defaultValue: _.get(`${rowIndex}.parameter_value`, cachedInputSources) || null,
        onChange: value => {
          const newSource = {
            type: _.get(`${rowIndex}.source.type`, configuredInputDefinition),
            parameter_value: value
          }
          const newConfig = _.set(`${rowIndex}.source`, newSource, configuredInputDefinition)
          setConfiguredInputDefinition(newConfig)
          setCachedInputSources(_.set(`${rowIndex}.parameter_value`, newSource.parameter_value, cachedInputSources))
        }
      })
    ])
  }

  return h(AutoSizer, [({ width, height }) => {
    return h(FlexTable, {
      'aria-label': 'input-table',
      rowCount: configuredInputDefinition.length,
      sort: inputTableSort,
      readOnly: false,
      height,
      width,
      columns: [
        {
          size: { basis: 250, grow: 0 },
          field: 'taskVariable',
          headerRenderer: () => h(Sortable, { sort: inputTableSort, field: 'taskVariable', onSort: setInputTableSort }, [h(HeaderCell, ['Task name'])]),
          cellRenderer: () => {
            return h(TextCell, { style: { fontWeight: 500 } }, [method ? method.name : 'Loading...'])
          }
        },
        {
          size: { basis: 360, grow: 0 },
          field: 'workflowVariable',
          headerRenderer: () => h(Sortable, { sort: inputTableSort, field: 'workflowVariable', onSort: setInputTableSort }, [h(HeaderCell, ['Variable'])]),
          cellRenderer: ({ rowIndex }) => {
            return h(TextCell, {}, [configuredInputDefinition[rowIndex].input_name])
          }
        },
        {
          size: { basis: 160, grow: 0 },
          headerRenderer: () => h(HeaderCell, ['Type']),
          cellRenderer: ({ rowIndex }) => {
            return h(TextCell, {}, [parseInputType(configuredInputDefinition[rowIndex].input_type)]) // TODO: this needs to be more flexible
          }
        },
        {
          size: { basis: 350, grow: 0 },
          headerRenderer: () => h(HeaderCell, ['Input sources']),
          cellRenderer: ({ rowIndex }) => {
            return h(Select, {
              isDisabled: false,
              'aria-label': 'Select an Option',
              isClearable: false,
              value: _.get(_.get(`${rowIndex}.source.type`, configuredInputDefinition), inputSourceLabels) || null,
              onChange: ({ value }) => {
                const newType = _.get(value, inputSourceTypes)
                const param = newType === 'record_lookup' ? 'record_attribute' : 'parameter_value'
                const newSource = {
                  type: newType,
                  [param]: _.get(`${rowIndex}.${param}`, cachedInputSources)
                }
                const newConfig = _.set(`${rowIndex}.source`, newSource, configuredInputDefinition)
                setConfiguredInputDefinition(newConfig)
              },
              placeholder: 'Select Source',
              options: _.values(inputSourceLabels),
              // ** https://stackoverflow.com/questions/55830799/how-to-change-zindex-in-react-select-drowpdown
              styles: { container: old => ({ ...old, display: 'inline-block' }), menuPortal: base => ({ ...base, zIndex: 9999 }) },
              menuPortalTarget: document.body,
              menuPlacement: 'top'
            })
          }
        },
        {
          headerRenderer: () => h(Fragment, [
            h(HeaderCell, ['Attribute'])
          ]),
          cellRenderer: ({ rowIndex }) => {
            const source = _.get(`${rowIndex}.source`, configuredInputDefinition)
            return Utils.switchCase(source.type || 'default',
              ['record_lookup', () => recordLookupSelect(rowIndex)],
              ['literal', () => parameterValueSelect(rowIndex)],
              ['default', () => h(TextCell, {}, ['Use value from Workflow'])]
            )
          }
        }
      ]
    })
  }])
}
