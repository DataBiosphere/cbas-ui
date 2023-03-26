import _ from 'lodash/fp'
import { useState } from 'react'
import { div, h } from 'react-hyperscript-helpers'
import { AutoSizer } from 'react-virtualized'
import { StructBuilderModal } from 'src/components/StructBuilder'
import {
  InputSourceSelect,
  ParameterValueTextInput,
  parseMethodString,
  RecordLookupSelect,
  SelectWithWarnings,
  StructBuilderLink
} from 'src/components/submission-common'
import { FlexTable, HeaderCell, Sortable, TextCell } from 'src/components/table'
import * as Utils from 'src/libs/utils'


const InputsTable = props => {
  const {
    selectedDataTable,
    configuredInputDefinition, setConfiguredInputDefinition,
    inputTableSort, setInputTableSort,
    missingExpectedAttributes, missingRequiredInputs
  } = props

  const [structBuilderVisible, setStructBuilderVisible] = useState(false)
  const [structBuilderRow, setStructBuilderRow] = useState(null)

  const dataTableAttributes = _.keyBy('name', selectedDataTable.attributes)

  const inputTableData = _.flow(
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

  const recordLookupWithWarnings = rowIndex => {
    const currentInputName = _.get(`${rowIndex}.input_name`, inputTableData)
    const source = _.get(`${inputTableData[rowIndex].configurationIndex}.source`, configuredInputDefinition)
    const updateSource = source => {
      setConfiguredInputDefinition(
        _.set(`${inputTableData[rowIndex].configurationIndex}.source`, source, configuredInputDefinition))
    }

    return SelectWithWarnings({
      select: RecordLookupSelect({
        source,
        updateSource,
        dataTableAttributes
      }),
      currentInputName,
      warnings: {
        'This attribute is required': missingRequiredInputs,
        'This attribute doesn\'t exist in data table': missingExpectedAttributes
      }
    })
  }

  const parameterValueSelect = rowIndex => {
    return ParameterValueTextInput({
      id: `input-table-value-select-${rowIndex}`,
      source: _.get(`${inputTableData[rowIndex].configurationIndex}.source`, configuredInputDefinition),
      updateSource: source => {
        setConfiguredInputDefinition(
          _.set(`${inputTableData[rowIndex].configurationIndex}.source`, source, configuredInputDefinition))
      }
    })
  }

  const structBuilderLink = rowIndex => {
    const currentInputName = _.get(`${rowIndex}.input_name`, inputTableData)
    return SelectWithWarnings({
      select: h(StructBuilderLink, {
        structBuilderVisible,
        onClick: () => {
          setStructBuilderVisible(true)
          setStructBuilderRow(rowIndex)
        }
      }),
      currentInputName,
      warnings: {
        'An attribute within this Struct is required': missingRequiredInputs,
        'An attribute within this Struct doesn\'t exist in data table': missingExpectedAttributes
      }
    })
  }

  return h(AutoSizer, [({ width, height }) => {
    return h(div, {}, [
      structBuilderVisible && h(StructBuilderModal, {
        structName: _.get('variable', inputTableData[structBuilderRow]),
        structType: _.get('input_type', inputTableData[structBuilderRow]),
        structSource: _.get('source', inputTableData[structBuilderRow]),
        setStructSource: source => setConfiguredInputDefinition(
          _.set(`${inputTableData[structBuilderRow].configurationIndex}.source`, source, configuredInputDefinition)
        ),
        dataTableAttributes,
        onDismiss: () => {
          setStructBuilderVisible(false)
        }
      }),
      h(FlexTable, {
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
              return InputSourceSelect({
                source: _.get('source', inputTableData[rowIndex]),
                inputType: _.get('input_type', inputTableData[rowIndex]),
                updateSource: source => setConfiguredInputDefinition(
                  _.set(`[${inputTableData[rowIndex].configurationIndex}].source`, source, configuredInputDefinition))
              })
            }
          },
          {
            headerRenderer: () => h(HeaderCell, ['Attribute']),
            cellRenderer: ({ rowIndex }) => {
              const source = _.get(`${rowIndex}.source`, inputTableData)
              return Utils.switchCase(source.type || 'none',
                ['record_lookup', () => recordLookupWithWarnings(rowIndex)],
                ['literal', () => parameterValueSelect(rowIndex)],
                ['object_builder', () => structBuilderLink(rowIndex)],
                ['none', () => h(TextCell, { style: { fontStyle: 'italic' } }, ['Optional'])]
              )
            }
          }
        ]
      })
    ])
  }])
}

export default InputsTable
