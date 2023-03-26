import _ from 'lodash/fp'
import { useEffect, useState } from 'react'
import { div, h } from 'react-hyperscript-helpers'
import { AutoSizer } from 'react-virtualized'
import { Link } from 'src/components/common'
import Modal from 'src/components/Modal'
import {
  inputsMissingRequiredAttributes,
  InputSourceSelect,
  ParameterValueTextInput,
  RecordLookupSelect,
  requiredInputsWithoutSource,
  SelectWithWarnings,
  StructBuilderLink
} from 'src/components/submission-common'
import { FlexTable, HeaderCell, TextCell } from 'src/components/table'
import * as Utils from 'src/libs/utils'


const buildStructTypePath = indexPath => _.join('.', _.map(row => `fields.${row}.field_type`, indexPath))
const buildStructSourcePath = indexPath => _.join('.', _.map(row => `fields.${row}.source`, indexPath))
const buildStructNamePath = indexPath => _.replace(/\.field_type$/, '.field_name', buildStructTypePath(indexPath))

export const buildStructBreadcrumbs = (indexPath, structType) => _.map(
  // map slices of the indexPath (e.g. [0, 1, 2] -> [0], [0, 1], [0, 1, 2])
  // onto their corresponding field_names within structType, via buildStructNamePath
  end => _.get(buildStructNamePath(_.slice(0, end + 1, indexPath)), structType),
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
  const structTypePath = buildStructTypePath(structIndexPath)
  const structSourcePath = buildStructSourcePath(structIndexPath)
  const structNamePath = buildStructNamePath(structIndexPath)

  const currentStructName = structNamePath ? _.get(structNamePath, structType) : structName
  const currentStructType = structTypePath ? _.get(structTypePath, structType) : structType
  const currentStructSource = structSourcePath ? _.get(structSourcePath, structSource) : structSource
  const setCurrentStructSource = structSourcePath ? source => setStructSource(_.set(structSourcePath, source, structSource)) : setStructSource

  const structInputDefinition = _.map(([source, type]) => _.merge(source, type), _.zip(currentStructSource.fields, currentStructType.fields))
  console.log('structInputDefinition', structInputDefinition)
  const currentStructBreadcrumbs = buildStructBreadcrumbs(structIndexPath, structType)

  const [missingExpectedAttributes, setMissingExpectedAttributes] = useState([])
  const [missingRequiredInputs, setMissingRequiredInputs] = useState([])

  useEffect(() => {
    const validate = () => {
      setMissingExpectedAttributes(_.uniq([
        ...missingExpectedAttributes,
        ..._.map(i => i.name, inputsMissingRequiredAttributes(structInputDefinition, dataTableAttributes))
      ]))

      setMissingRequiredInputs(_.uniq([
        ...missingExpectedAttributes,
        ..._.map(i => i.name, requiredInputsWithoutSource(structInputDefinition))
      ]))
    }
    validate()
  }, [])


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
      return h(FlexTable, {
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
            headerRenderer: () => h(HeaderCell, ['Field']),
            cellRenderer: ({ rowIndex }) => {
              return h(TextCell, { }, [currentStructType.fields[rowIndex].field_name])
            }
          },
          {
            size: { basis: 160, grow: 0 },
            field: 'type',
            headerRenderer: () => h(HeaderCell, ['Type']),
            cellRenderer: ({ rowIndex }) => {
              return h(TextCell, {}, [Utils.renderTypeText(currentStructType.fields[rowIndex].field_type)])
            }
          },
          {
            size: { basis: 350, grow: 0 },
            headerRenderer: () => h(HeaderCell, ['Input sources']),
            cellRenderer: ({ rowIndex }) => {
              const typePath = buildStructTypePath([rowIndex])
              const sourcePath = buildStructSourcePath([rowIndex])
              return InputSourceSelect({
                source: _.get(sourcePath, currentStructSource),
                inputType: _.get(typePath, currentStructType),
                updateSource: source => setCurrentStructSource(_.set(sourcePath, source, currentStructSource))
              })
            }
          },
          {
            headerRenderer: () => h(HeaderCell, ['Attribute']),
            cellRenderer: ({ rowIndex }) => {
              const sourcePath = buildStructSourcePath([rowIndex])
              const innerStructSource = _.get(sourcePath, currentStructSource)
              const setInnerStructSource = source => setCurrentStructSource(_.set(sourcePath, source, currentStructSource))
              return Utils.switchCase(innerStructSource.type || 'none',
                ['literal',
                  () => ParameterValueTextInput({
                    id: `structbuilder-table-attribute-select-${rowIndex}`,
                    source: innerStructSource,
                    updateSource: setInnerStructSource
                  })],
                ['record_lookup',
                  () => SelectWithWarnings({
                    select: RecordLookupSelect({
                      source: innerStructSource,
                      updateSource: setInnerStructSource,
                      dataTableAttributes
                    }),
                    currentInputName: structInputDefinition[rowIndex].name,
                    missingRequiredInputs,
                    missingExpectedAttributes
                  })],
                ['object_builder',
                  () => SelectWithWarnings({
                    select: StructBuilderLink({
                      onClick: () => setStructIndexPath([...structIndexPath, rowIndex])
                    }),
                    currentInputName: structInputDefinition[rowIndex].name,
                    missingRequiredInputs,
                    missingExpectedAttributes
                  })],
                ['none', () => h(TextCell, { style: { fontStyle: 'italic' } }, ['Optional'])]
              )
            }
          }
        ]
      })
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
