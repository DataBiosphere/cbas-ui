import _ from 'lodash/fp'
import { useState } from 'react'
import { div, h } from 'react-hyperscript-helpers'
import { AutoSizer } from 'react-virtualized'
import { Link } from 'src/components/common'
import Modal from 'src/components/Modal'
import {
  InputSourceSelect,
  ParameterValueTextInput,
  RecordLookupSelect,
  StructBuilderLink,
  validateInputs,
  WithWarnings
} from 'src/components/submission-common'
import { FlexTable, HeaderCell, InputsButtonRow, TextCell } from 'src/components/table'
import { tableButtonRowStyle } from 'src/libs/style'
import * as Utils from 'src/libs/utils'
import { isInputOptional } from 'src/libs/utils'


const buildStructTypePath = indexPath => _.join('.', _.map(row => `fields.${row}.field_type`, indexPath))
const buildStructSourcePath = indexPath => _.join('.', _.map(row => `fields.${row}.source`, indexPath))
const buildStructTypeNamePath = indexPath => _.replace(/\.field_type$/, '.field_name', buildStructTypePath(indexPath))
const buildStructSourceNamePath = indexPath => _.replace(/\.source$/, '.name', buildStructSourcePath(indexPath))

export const buildStructBreadcrumbs = (indexPath, structType) => _.map(
  // map slices of the indexPath (e.g. [0, 1, 2] -> [0], [0, 1], [0, 1, 2])
  // onto their corresponding field_names within structType, via buildStructTypeNamePath
  end => _.get(buildStructTypeNamePath(_.slice(0, end + 1, indexPath)), structType),
  _.range(0, indexPath.length)
)

export const StructBuilder = props => {
  const {
    structName,
    structType,
    structSource,
    setStructSource,
    dataTableAttributes
  } = props

  const [structIndexPath, setStructIndexPath] = useState([])
  const [includeOptionalInputs, setIncludeOptionalInputs] = useState(true)
  const structTypePath = buildStructTypePath(structIndexPath)
  const structSourcePath = buildStructSourcePath(structIndexPath)
  const structTypeNamePath = buildStructTypeNamePath(structIndexPath)

  const currentStructTypeNoFilter = structTypePath ? _.get(structTypePath, structType) : structType
  const currentStructSourceNoFilter = structSourcePath ? _.get(structSourcePath, structSource) : structSource
  const [currentStructTypeFilteredFields, currentStructSourceFilteredFields] = _.flow(
    _.zip,
    _.filter(([{ field_type: { type } }, _source]) => includeOptionalInputs || type !== 'optional'),
    _.unzip
  )(currentStructTypeNoFilter.fields, currentStructSourceNoFilter.fields)
  const currentStructType = { ...currentStructTypeNoFilter, fields: currentStructTypeFilteredFields }
  const currentStructSource = { ...currentStructSourceNoFilter, fields: currentStructSourceFilteredFields }
  const currentStructName = structTypeNamePath ? _.get(structTypeNamePath, structType) : structName

  const setCurrentStructSource = structSourcePath ? source => setStructSource(_.set(structSourcePath, source, structSource)) : setStructSource

  const structInputDefinition = _.map(([source, type]) => _.merge(source, type), _.zip(currentStructSource.fields, currentStructType.fields))
  const currentStructBreadcrumbs = buildStructBreadcrumbs(structIndexPath, structType)

  const inputsWithMessages = validateInputs(structInputDefinition, dataTableAttributes)

  const breadcrumbsHeight = 35
  return h(div, { 'aria-label': 'struct-breadcrumbs', style: { height: 500 } }, [
    h(div, {
      style: {
        height: breadcrumbsHeight,
        fontSize: 15,
        display: 'flex',
        alignItems: 'center'
      }
    }, [
      h(TextCell, {}, [
        ..._.map(([i, name]) => h(Link, {
          onClick: () => setStructIndexPath(_.slice(0, i, structIndexPath))
        }, `${name} / `), _.toPairs(_.initial([structName, ...currentStructBreadcrumbs]))),
        currentStructName
      ])
    ]),
    h(AutoSizer, [({ width, height }) => {
      return h(div, {}, [
        h(InputsButtonRow, {
          style: tableButtonRowStyle({ width, height }),
          showRow: !includeOptionalInputs || _.some(row => row.field_type.type === 'optional', currentStructType.fields),
          optionalButtonProps: {
            includeOptionalInputs, setIncludeOptionalInputs
          }
        }),
        h(FlexTable, {
          'aria-label': 'struct-table',
          rowCount: _.size(currentStructType.fields),
          readOnly: false,
          height: height - breadcrumbsHeight,
          width,
          columns: [
            {
              size: { basis: 250, grow: 0 },
              field: 'struct',
              headerRenderer: () => h(HeaderCell, ['Struct']),
              cellRenderer: () => {
                return h(TextCell, { style: { fontWeight: 500 } }, [currentStructName])
              }
            },
            {
              size: { basis: 160, grow: 0 },
              field: 'field',
              headerRenderer: () => h(HeaderCell, ['Variable']),
              cellRenderer: ({ rowIndex }) => {
                return h(TextCell, { style: Utils.inputTypeStyle(currentStructType.fields[rowIndex].field_type) }, [currentStructType.fields[rowIndex].field_name])
              }
            },
            {
              size: { basis: 160, grow: 0 },
              field: 'type',
              headerRenderer: () => h(HeaderCell, ['Type']),
              cellRenderer: ({ rowIndex }) => {
                return h(TextCell, { style: Utils.inputTypeStyle(currentStructType.fields[rowIndex].field_type) }, [Utils.renderTypeText(currentStructType.fields[rowIndex].field_type)])
              }
            },
            {
              size: { basis: 350, grow: 0 },
              headerRenderer: () => h(HeaderCell, ['Input sources']),
              cellRenderer: ({ rowIndex }) => {
                const typePath = buildStructTypePath([rowIndex])
                const typeNamePath = buildStructTypeNamePath([rowIndex])
                const sourcePath = buildStructSourcePath([rowIndex])
                const sourceNamePath = buildStructSourceNamePath([rowIndex])
                return InputSourceSelect({
                  source: _.get(sourcePath, currentStructSource),
                  setSource: source => {
                    const newSource = _.flow([
                      _.set(sourceNamePath, _.get(sourceNamePath, currentStructSource) || _.get(typeNamePath, currentStructType)),
                      _.set(sourcePath, source)
                    ])(currentStructSource)
                    setCurrentStructSource(newSource)
                  },
                  inputType: _.get(typePath, currentStructType)
                })
              }
            },
            {
              headerRenderer: () => h(HeaderCell, ['Attribute']),
              cellRenderer: ({ rowIndex }) => {
                const typeNamePath = buildStructTypeNamePath([rowIndex])
                const sourcePath = buildStructSourcePath([rowIndex])
                const sourceNamePath = buildStructSourceNamePath([rowIndex])
                const innerStructSource = _.get(sourcePath, currentStructSource)
                const inputName = structInputDefinition[rowIndex].field_name
                const setInnerStructSource = source => {
                  const newSource = _.flow([
                    _.set(sourceNamePath, _.get(sourceNamePath, currentStructSource) || _.get(typeNamePath, currentStructType)),
                    _.set(sourcePath, source)
                  ])(currentStructSource)
                  setCurrentStructSource(newSource)
                }
                return h(WithWarnings, {
                  baseComponent: Utils.switchCase(innerStructSource ? innerStructSource.type : 'none',
                    ['literal',
                      () => h(ParameterValueTextInput, {
                        id: `structbuilder-table-attribute-select-${rowIndex}`,
                        inputType: currentStructType.fields[rowIndex].field_type,
                        source: innerStructSource,
                        setSource: setInnerStructSource
                      })],
                    ['record_lookup',
                      () => h(RecordLookupSelect, {
                        source: innerStructSource,
                        setSource: setInnerStructSource,
                        dataTableAttributes
                      })],
                    ['object_builder',
                      () => h(StructBuilderLink, {
                        onClick: () => setStructIndexPath([...structIndexPath, rowIndex])
                      })],
                    ['none', () => h(TextCell,
                      { style: Utils.inputTypeStyle(currentStructType.fields[rowIndex].field_type) },
                      [isInputOptional(currentStructType.fields[rowIndex].field_type) ? 'Optional' : 'This input is required']
                    )]
                  ),
                  message: _.find(message => message.name === inputName)(inputsWithMessages)
                })
              }
            }
          ]
        })
      ])
    }])
  ])
}

export const StructBuilderModal = ({ onDismiss, ...props }) => {
  return h(Modal,
    {
      title: 'Struct Builder',
      onDismiss,
      showCancel: false,
      showX: true,
      okButton: 'Done',
      width: '90%'
    }, [
      h(StructBuilder, { ...props }, [])
    ]
  )
}
