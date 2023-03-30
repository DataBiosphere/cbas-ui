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
  StructBuilderLink,
  WithWarnings
} from 'src/components/submission-common'
import { FlexTable, HeaderCell, Sortable, TextCell } from 'src/components/table'
import * as Utils from 'src/libs/utils'
import { isInputOptional } from 'src/libs/utils'


const InputsTable = props => {
  const {
    selectedDataTable,
    configuredInputDefinition, setConfiguredInputDefinition,
    inputTableSort, setInputTableSort,
    missingRequiredInputs, missingExpectedAttributes
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
    const selectedInputName = _.get(`${rowIndex}.input_name`, inputTableData)
    const source = _.get(`${inputTableData[rowIndex].configurationIndex}.source`, configuredInputDefinition)
    const setSource = source => {
      setConfiguredInputDefinition(
        _.set(`${inputTableData[rowIndex].configurationIndex}.source`, source, configuredInputDefinition))
    }

    return WithWarnings({
      baseComponent: RecordLookupSelect({
        source,
        setSource,
        dataTableAttributes
      }),
      selectedInputName,
      warnings: {
        'This attribute is required': missingRequiredInputs,
        'This attribute doesn\'t exist in data table': missingExpectedAttributes
      }
    })
  }

  const parameterValueSelectWithWarnings = rowIndex => {
    return WithWarnings({
      baseComponent: ParameterValueTextInput({
        id: `input-table-value-select-${rowIndex}`,
        source: _.get(`${inputTableData[rowIndex].configurationIndex}.source`, configuredInputDefinition),
        setSource: source => {
          setConfiguredInputDefinition(_.set(`${inputTableData[rowIndex].configurationIndex}.source`, source, configuredInputDefinition))
        }
      }),
      selectedInputName: _.get(`${rowIndex}.input_name`, inputTableData),
      warnings: {
        'This attribute is required': missingRequiredInputs
      }
    })
  }

  const structBuilderLink = rowIndex => {
    const selectedInputName = _.get(`${rowIndex}.input_name`, inputTableData)
    return WithWarnings({
      baseComponent: h(StructBuilderLink, {
        structBuilderVisible,
        onClick: () => {
          setStructBuilderVisible(true)
          setStructBuilderRow(rowIndex)
        }
      }),
      selectedInputName,
      warnings: {
        'One of this struct\'s required attributes is missing': missingRequiredInputs,
        'One of this struct\'s attributes doesn\'t exist in the data table': missingExpectedAttributes
      }
    })
  }

  const sourceNoneWithWarnings = rowIndex => {
    return WithWarnings({
      baseComponent:
        // inputTableData[rowIndex].input_type.type === 'struct' ?
        // h(StructBuilderLink, {
        //   structBuilderVisible,
        //   onClick: () => {
        //     setStructBuilderVisible(true)
        //     setStructBuilderRow(rowIndex)
        //   }
        // }) :
        h(TextCell,
          { style: Utils.inputTypeStyle(inputTableData[rowIndex].input_type) },
          [isInputOptional(inputTableData[rowIndex].input_type) ? 'Optional' : 'This input is required']
        ),
      selectedInputName: _.get(`${rowIndex}.input_name`, inputTableData),
      warnings: {
        'This attribute is required': missingRequiredInputs
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
              return h(TextCell, { style: Utils.inputTypeStyle(inputTableData[rowIndex].input_type) }, [inputTableData[rowIndex].variable])
            }
          },
          {
            size: { basis: 160, grow: 0 },
            field: 'inputTypeStr',
            headerRenderer: () => h(HeaderCell, ['Type']),
            cellRenderer: ({ rowIndex }) => {
              return h(TextCell, { style: Utils.inputTypeStyle(inputTableData[rowIndex].input_type) }, [inputTableData[rowIndex].inputTypeStr])
            }
          },
          {
            size: { basis: 350, grow: 0 },
            headerRenderer: () => h(HeaderCell, ['Input sources']),
            cellRenderer: ({ rowIndex }) => {
              return InputSourceSelect({
                source: _.get('source', inputTableData[rowIndex]),
                inputType: _.get('input_type', inputTableData[rowIndex]),
                setSource: source => setConfiguredInputDefinition(
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
                ['literal', () => parameterValueSelectWithWarnings(rowIndex)],
                ['object_builder', () => structBuilderLink(rowIndex)],
                ['none', () => sourceNoneWithWarnings(rowIndex)]
              )
            }
          }
        ]
      })
    ])
  }])
}

export default InputsTable
