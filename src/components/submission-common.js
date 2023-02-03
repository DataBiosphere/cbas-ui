import _ from 'lodash/fp'
import { Fragment } from 'react'
import { div, h, span } from 'react-hyperscript-helpers'
import { AutoSizer } from 'react-virtualized'
import { Checkbox, Clickable, Select } from 'src/components/common'
import { icon } from 'src/components/icons'
import { TextInput } from 'src/components/input'
import { MenuButton, MenuTrigger } from 'src/components/PopupTrigger'
import { FlexTable, GridTable, HeaderCell, Resizable, Sortable, TextCell } from 'src/components/table'
import TooltipTrigger from 'src/components/TooltipTrigger'
import colors from 'src/libs/colors'
import * as Utils from 'src/libs/utils'


export const AutoRefreshInterval = 1000 * 60 // 1 minute

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
    dataTableColumnWidths, setDataTableColumnWidths,
    dataTableRef,
    records,
    selectedRecords, setSelectedRecords,
    selectedDataTable,
    recordsTableSort, setRecordsTableSort
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

  const resizeColumn = (currentWidth, delta, columnKey) => {
    setDataTableColumnWidths(_.set(columnKey, currentWidth + delta))
  }

  const withDataTableNamePrefix = columnName => `${selectedDataTable.name}/${columnName}`

  const recordsTableData = _.flow(
    // _.filter(({ namespace, name }) => Utils.textMatch(filter, `${namespace}/${name}`)),
    _.map(row => _.merge(row, _.forEach(a => _.set(a, _.get(`attributes.${a}`, row), row), row.attributes))),
    _.orderBy(
      [
        ({ [recordsTableSort.field]: field }) => field * 1, // converts field to int, float, or NaN (if field is a string)
        ({ [recordsTableSort.field]: field }) => _.lowerCase(field)
      ],
      [recordsTableSort.direction]
    )
  )(records)

  return h(AutoSizer, [({ width, height }) => {
    return h(GridTable, {
      'aria-label': `${selectedDataTable.name} data table`,
      ref: dataTableRef,
      width,
      height,
      sort: recordsTableSort,
      // // Keeping these properties here as a reminder: can we use them?
      // noContentMessage: DEFAULT,
      // noContentRenderer: DEFAULT,
      rowCount: recordsTableData.length,
      columns: [
        {
          width: 70,
          headerRenderer: () => {
            return h(Fragment, [
              h(Checkbox, {
                checked: () => pageSelected(),
                disabled: !recordsTableData.length,
                onChange: () => pageSelected() ? deselectPage : selectPage,
                'aria-label': 'Select all'
              }),
              h(MenuTrigger, {
                closeOnClick: true,
                content: h(Fragment, [
                  h(MenuButton, { onClick: selectPage }, ['Page']),
                  h(MenuButton, { onClick: selectAll }, [`All (${recordsTableData.length})`]),
                  h(MenuButton, { onClick: selectNone }, ['None'])
                ]),
                side: 'bottom'
              }, [
                h(Clickable, { 'aria-label': '"Select All" options' }, [icon('caretDown')])
              ])
            ])
          },
          cellRenderer: ({ rowIndex }) => {
            const thisRecord = recordsTableData[rowIndex]
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
          width: dataTableColumnWidths[withDataTableNamePrefix('id')] || 300,
          headerRenderer: () => {
            const columnWidth = dataTableColumnWidths[withDataTableNamePrefix('id')] || 300
            return h(Resizable, {
              width: columnWidth,
              onWidthChange: delta => resizeColumn(columnWidth, delta, withDataTableNamePrefix('id'))
            }, [
              h(Sortable, {
                sort: recordsTableSort,
                field: 'id',
                onSort: setRecordsTableSort
              }, [
                h(HeaderCell, ['ID'])
              ])
            ])
          },
          cellRenderer: ({ rowIndex }) => {
            return h(TextCell, {}, [_.get('id', recordsTableData[rowIndex])])
          }
        },
        ..._.map(({ name: attributeName }) => {
          const columnWidth = dataTableColumnWidths[withDataTableNamePrefix(attributeName)] || 300
          const [, columnNamespace, columnName] = /(.+:)?(.+)/.exec(attributeName)
          return {
            field: attributeName,
            width: columnWidth,
            headerRenderer: () => h(Resizable, {
              width: columnWidth,
              onWidthChange: delta => resizeColumn(columnWidth, delta, withDataTableNamePrefix(attributeName))
            }, [
              h(Sortable, {
                sort: recordsTableSort,
                field: attributeName,
                onSort: setRecordsTableSort
              }, [
                h(HeaderCell, [
                  !!columnNamespace && span({ style: { fontStyle: 'italic', color: colors.dark(0.75), paddingRight: '0.2rem' } }, [columnNamespace]),
                  columnName
                ])
              ])
            ]),
            cellRenderer: ({ rowIndex }) => {
              return h(TextCell, {}, [
                _.get(attributeName, recordsTableData[rowIndex])
              ])
            }
          }
        }, selectedDataTable.attributes)
      ]
    }, [])
  }])
}

const parseMethodString = methodString => {
  const methodNameParts = methodString.split('.')
  return {
    workflow: methodNameParts[0],
    call: methodNameParts.length === 3 ? methodNameParts[1] : '',
    variable: methodNameParts[methodNameParts.length - 1]
  }
}

export const inputsTable = props => {
  const {
    selectedDataTable,
    configuredInputDefinition, setConfiguredInputDefinition,
    inputTableSort, setInputTableSort,
    missingRequiredInputs
  } = props

  const dataTableAttributes = _.keyBy('name', selectedDataTable.attributes)

  const inputSourceLabels = {
    literal: 'Type a Value',
    record_lookup: 'Fetch from Data Table',
    none: 'None'
  }
  const inputSourceTypes = _.invert(inputSourceLabels)

  const recordLookupSelect = rowIndex => {
    const currentInputName = _.get(`${rowIndex}.input_name`, inputTableData)

    return div({ style: { display: 'flex', alignItems: 'center', width: '100%', paddingTop: '0.5rem', paddingBottom: '0.5rem' } }, [
      h(Select, {
        isDisabled: false,
        'aria-label': 'Select an Attribute',
        isClearable: false,
        value: _.get(`${rowIndex}.source.record_attribute`, inputTableData),
        onChange: ({ value }) => {
          const newAttribute = _.get(`${value}.name`, dataTableAttributes)
          const newSource = {
            type: _.get(`${rowIndex}.source.type`, inputTableData),
            record_attribute: newAttribute
          }
          const newConfig = _.set(`${rowIndex}.source`, newSource, inputTableData)
          setConfiguredInputDefinition(newConfig)
        },
        placeholder: 'Select Attribute',
        options: _.keys(dataTableAttributes),
        // ** https://stackoverflow.com/questions/55830799/how-to-change-zindex-in-react-select-drowpdown
        styles: { container: old => ({ ...old, display: 'inline-block', width: '100%' }), menuPortal: base => ({ ...base, zIndex: 9999 }) },
        menuPortalTarget: document.body,
        menuPlacement: 'top'
      }),
      missingRequiredInputs.includes(currentInputName) && h(TooltipTrigger, { content: 'This attribute is required' }, [
        icon('error-standard', {
          size: 14, style: { marginLeft: '0.5rem', color: colors.warning(), cursor: 'help' }
        })
      ])
    ])
  }

  const parameterValueSelect = rowIndex => {
    return h(TextInput, {
      id: `literal-input-${rowIndex}`,
      style: { display: 'block', width: '100%' },
      value: _.get(`${rowIndex}.source.parameter_value`, inputTableData) || null,
      onChange: value => {
        const newSource = {
          type: _.get(`${rowIndex}.source.type`, inputTableData),
          parameter_value: value
        }
        const newConfig = _.set(`${rowIndex}.source`, newSource, inputTableData)
        setConfiguredInputDefinition(newConfig)
      }
    })
  }

  const inputTableData = _.flow(
    // _.filter(({ namespace, name }) => Utils.textMatch(filter, `${namespace}/${name}`)),
    _.entries,
    _.map(([index, row]) => {
      const { workflow, call, variable } = parseMethodString(row.input_name)
      return _.flow([
        _.set('taskName', call || workflow || ''),
        _.set('variable', variable || ''),
        _.set('inputTypeStr', Utils.renderTypeText(row.input_type)),
        _.set('configurationIndex', parseInt(index))
      ])(row)
    }),
    _.orderBy([({ [inputTableSort.field]: field }) => _.lowerCase(field)], [inputTableSort.direction])
  )(configuredInputDefinition)


  return h(AutoSizer, [({ width, height }) => {
    return h(FlexTable, {
      'aria-label': 'input-table',
      rowCount: inputTableData.length,
      sort: inputTableSort,
      readOnly: false,
      height,
      width,
      columns: [
        {
          size: { basis: 250, grow: 0 },
          field: 'taskName',
          headerRenderer: () => h(Sortable, { sort: inputTableSort, field: 'taskName', onSort: setInputTableSort }, [h(HeaderCell, ['Task name'])]),
          cellRenderer: ({ rowIndex }) => {
            return h(TextCell, { style: { fontWeight: 500 } }, [inputTableData[rowIndex].taskName])
          }
        },
        {
          size: { basis: 360, grow: 0 },
          field: 'variable',
          headerRenderer: () => h(Sortable, { sort: inputTableSort, field: 'variable', onSort: setInputTableSort }, [h(HeaderCell, ['Variable'])]),
          cellRenderer: ({ rowIndex }) => {
            return h(TextCell, { style: Utils.typeStyle(inputTableData[rowIndex].input_type) }, [inputTableData[rowIndex].variable])
          }
        },
        {
          size: { basis: 160, grow: 0 },
          field: 'inputTypeStr',
          headerRenderer: () => h(HeaderCell, ['Type']),
          cellRenderer: ({ rowIndex }) => {
            return h(TextCell, { style: Utils.typeStyle(inputTableData[rowIndex].input_type) }, [inputTableData[rowIndex].inputTypeStr])
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
              value: _.get(_.get(`${rowIndex}.source.type`, inputTableData), inputSourceLabels) || null,
              onChange: ({ value }) => {
                const newType = _.get(value, inputSourceTypes)
                let newSource
                if (newType === 'none') {
                  newSource = {
                    type: newType
                  }
                } else {
                  const param = newType === 'record_lookup' ? 'record_attribute' : 'parameter_value'
                  newSource = {
                    type: newType,
                    [param]: ''
                  }
                }
                const newConfig = _.set(`${inputTableData[rowIndex].configurationIndex}.source`, newSource, configuredInputDefinition)
                setConfiguredInputDefinition(newConfig)
              },
              placeholder: 'Select Source',
              options: _.values(
                _.has('optional_type', inputTableData[rowIndex].input_type) ?
                  inputSourceLabels :
                  _.omit('none', inputSourceLabels)
              ),
              // ** https://stackoverflow.com/questions/55830799/how-to-change-zindex-in-react-select-drowpdown
              styles: { container: old => ({ ...old, display: 'inline-block', width: '100%' }), menuPortal: base => ({ ...base, zIndex: 9999 }) },
              menuPortalTarget: document.body,
              menuPlacement: 'top'
            })
          }
        },
        {
          headerRenderer: () => h(HeaderCell, ['Attribute']),
          cellRenderer: ({ rowIndex }) => {
            const source = _.get(`${rowIndex}.source`, inputTableData)
            return Utils.switchCase(source.type || 'none',
              ['record_lookup', () => recordLookupSelect(rowIndex)],
              ['literal', () => parameterValueSelect(rowIndex)],
              ['none', () => h(TextCell, {}, ['The workflow input will either be empty or use a default value from the workflow.'])]
            )
          }
        }
      ]
    })
  }])
}

export const outputsTable = props => {
  const {
    configuredOutputDefinition, setConfiguredOutputDefinition,
    outputTableSort, setOutputTableSort
  } = props

  const outputTableData = _.flow(
    _.entries,
    _.map(([index, row]) => {
      const { workflow, call, variable } = parseMethodString(row.output_name)
      return _.flow([
        _.set('taskName', call || workflow || ''),
        _.set('variable', variable || ''),
        _.set('outputTypeStr', Utils.renderTypeText(row.output_type)),
        _.set('configurationIndex', parseInt(index))
      ])(row)
    }),
    _.orderBy([({ [outputTableSort.field]: field }) => _.lowerCase(field)], [outputTableSort.direction])
  )(configuredOutputDefinition)

  return h(AutoSizer, [({ width, height }) => {
    return h(FlexTable, {
      'aria-label': 'output-table',
      rowCount: outputTableData.length,
      sort: outputTableSort,
      readOnly: false,
      height,
      width,
      columns: [
        {
          size: { basis: 250, grow: 0 },
          field: 'taskName',
          headerRenderer: () => h(Sortable, { sort: outputTableSort, field: 'taskName', onSort: setOutputTableSort }, [h(HeaderCell, ['Task name'])]),
          cellRenderer: ({ rowIndex }) => {
            return h(TextCell, { style: { fontWeight: 500 } }, [outputTableData[rowIndex].taskName])
          }
        },
        {
          size: { basis: 360, grow: 0 },
          field: 'variable',
          headerRenderer: () => h(Sortable, { sort: outputTableSort, field: 'variable', onSort: setOutputTableSort }, [h(HeaderCell, ['Variable'])]),
          cellRenderer: ({ rowIndex }) => {
            return h(TextCell, {}, [outputTableData[rowIndex].variable])
          }
        },
        {
          size: { basis: 160, grow: 0 },
          field: 'outputTypeStr',
          headerRenderer: () => h(HeaderCell, ['Type']),
          cellRenderer: ({ rowIndex }) => {
            return h(TextCell, {}, [outputTableData[rowIndex].outputTypeStr])
          }
        },
        {
          headerRenderer: () => h(HeaderCell, ['Attribute']),
          cellRenderer: ({ rowIndex }) => {
            const outputValue = configurationIndex => {
              const destType = _.get('destination.type', configuredOutputDefinition[configurationIndex])
              if (destType === 'record_update') {
                return _.get('destination.record_attribute', configuredOutputDefinition[configurationIndex])
              }
              return ''
            }

            return h(TextInput, {
              id: `output-parameter-${rowIndex}`,
              style: { display: 'block', width: '100%' },
              value: outputValue(outputTableData[rowIndex].configurationIndex),
              placeholder: '[Enter an attribute name to save this output to your data table]',
              onChange: value => {
                const configurationIndex = outputTableData[rowIndex].configurationIndex
                if (!!value && value !== '') {
                  setConfiguredOutputDefinition(_.set(`${configurationIndex}.destination`, { type: 'record_update', record_attribute: value }, configuredOutputDefinition))
                } else {
                  setConfiguredOutputDefinition(_.set(`${configurationIndex}.destination`, { type: 'none' }, configuredOutputDefinition))
                }
              }
            })
          }
        }
      ]
    })
  }])
}
