import _ from 'lodash/fp'
import { useState } from 'react'
import { div, h } from 'react-hyperscript-helpers'
import { AutoSizer } from 'react-virtualized'
import { icon } from 'src/components/icons'
import {
  InputSourceSelect,
  ParameterValueTextInput,
  parseMethodString,
  RecordLookupSelect,
  StructBuilderLink
} from 'src/components/submission-common'
import { FlexTable, HeaderCell, Sortable, TextCell } from 'src/components/table'
import TooltipTrigger from 'src/components/TooltipTrigger'
import colors from 'src/libs/colors'
import * as Utils from 'src/libs/utils'
import { StructBuilderModal } from 'src/pages/StructBuilderModal'


const buildStructPath = ({ structBuilderPath, headTemplate, pathTemplate, lastTemplate }) => {
  // structBuilderPath is an array of indices corresponding to a row, within each hierarchical layer of a nested struct.
  // e.g. [2, 3] represents the 3rd field of the struct found in the input table's 2nd row.
  // this function returns a string that can be used to retrieve the object represented by structBuilderPath from the input table data.
  const pathParts = [
    headTemplate(_.head(structBuilderPath)),
    ..._.size(structBuilderPath) > 2 ? _.map(pathTemplate, _.initial(_.tail(structBuilderPath))) : [],
    ..._.size(structBuilderPath) > 1 ? [lastTemplate(_.last(structBuilderPath))] : []
  ]
  return _.join('.', pathParts)
}

// each of these functions (that call buildStructPath) accept "head", "path", and "last" string template functions
// that specify how the object path should be constructed based on the struct schema within the input configuration.
// the head (first), path (middle) and last segments of the path are constructed with slight variations,
// depending on the type of data being retrieved.
export const buildStructInputTypePath = structBuilderPath => buildStructPath({
  structBuilderPath,
  headTemplate: head => `${head}.input_type`,
  pathTemplate: path => `fields.${path}.field_type`,
  lastTemplate: last => `fields.${last}.field_type`
})

export const buildStructSourcePath = structBuilderPath => buildStructPath({
  structBuilderPath,
  headTemplate: head => `${head}.source`,
  pathTemplate: path => `fields.${path}.source`,
  lastTemplate: last => `fields.${last}.source`
})

export const buildStructNamePath = structBuilderPath => buildStructPath({
  structBuilderPath,
  headTemplate: head => _.size(structBuilderPath) === 1 ? `${head}.variable` : `${head}.input_type`,
  pathTemplate: path => `fields.${path}.field_type`,
  lastTemplate: last => `fields.${last}.field_name`
})

export const buildStructBuilderBreadcrumbs = (structBuilderPath, inputTableData) => {
  const breadcrumbs = []
  for (let end = 1; end < structBuilderPath.length + 1; end++) {
    const structNamePath = buildStructNamePath(_.slice(0, end, structBuilderPath))
    const crumb = _.get(structNamePath, inputTableData)
    breadcrumbs.push(crumb)
  }
  return breadcrumbs
}

const InputsTable = props => {
  const {
    selectedDataTable,
    configuredInputDefinition, setConfiguredInputDefinition,
    inputTableSort, setInputTableSort,
    missingRequiredInputs, missingExpectedAttributes
  } = props

  const [structBuilderVisible, setStructBuilderVisible] = useState(false)
  const [structBuilderPath, setStructBuilderPath] = useState([])

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

    return div({ style: { display: 'flex', alignItems: 'center', width: '100%', paddingTop: '0.5rem', paddingBottom: '0.5rem' } }, [
      RecordLookupSelect({
        source: _.get(`${inputTableData[rowIndex].configurationIndex}.source`, configuredInputDefinition),
        dataTableAttributes,
        updateSource: source => {
          setConfiguredInputDefinition(
            _.set(`${inputTableData[rowIndex].configurationIndex}.source`, source, configuredInputDefinition))
        }
      }),
      missingRequiredInputs.includes(currentInputName) && h(TooltipTrigger, { content: 'This attribute is required' }, [
        icon('error-standard', {
          size: 14, style: { marginLeft: '0.5rem', color: colors.warning(), cursor: 'help' }
        })
      ]),
      missingExpectedAttributes.includes(currentInputName) && h(TooltipTrigger, { content: 'This attribute doesn\'t exist in data table' }, [
        icon('error-standard', {
          size: 14, style: { marginLeft: '0.5rem', color: colors.warning(), cursor: 'help' }
        })
      ])
    ])
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
    return h(StructBuilderLink, {
      structBuilderVisible,
      onClick: () => {
        setStructBuilderVisible(true)
        setStructBuilderPath([rowIndex])
      }
    })
  }

  return h(AutoSizer, [({ width, height }) => {
    return h(div, {}, [
      structBuilderVisible && h(StructBuilderModal, {
        structBuilderName: _.get(buildStructNamePath(structBuilderPath), inputTableData),
        structBuilderBreadcrumbs: buildStructBuilderBreadcrumbs(structBuilderPath, inputTableData),
        structBuilderInputType: _.get(buildStructInputTypePath(structBuilderPath), inputTableData),
        dataTableAttributes,
        structBuilderSource: _.get(buildStructSourcePath(structBuilderPath), inputTableData),
        setStructBuilderSource: source => {
          const sourcePath = buildStructSourcePath(structBuilderPath)
          setConfiguredInputDefinition(_.set(sourcePath, source, configuredInputDefinition))
        },
        structBuilderPath, setStructBuilderPath,
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
