import _ from 'lodash/fp'
import { useState } from 'react'
import { div, h } from 'react-hyperscript-helpers'
import { AutoSizer } from 'react-virtualized'
import { Link } from 'src/components/common'
import Modal from 'src/components/Modal'
import { InputSourceSelect, ParameterValueTextInput, RecordLookupSelect, StructBuilderLink } from 'src/components/submission-common'
import { FlexTable, HeaderCell, TextCell } from 'src/components/table'
import * as Utils from 'src/libs/utils'


export const buildStructTypePath = path => _.join('.', _.map(row => `fields.${row}.field_type`, path))
export const buildStructSourcePath = path => _.join('.', _.map(row => `fields.${row}.source`, path))
export const buildStructNamePath = path => _.replace(/\.field_type$/, '.field_name', buildStructTypePath(path))

export const StructBuilder = props => {
  const {
    structName,
    structType,
    structSource,
    setStructSource,
    dataTableAttributes
  } = props

  const [structBuilderPath, setStructBuilderPath] = useState([])

  const structTypePath = buildStructTypePath(structBuilderPath)
  const structSourcePath = buildStructSourcePath(structBuilderPath)
  const structNamePath = buildStructNamePath(structBuilderPath)

  const currentStructName = structNamePath ? _.get(structNamePath, structType) : structName
  const currentStructType = structTypePath ? _.get(structTypePath, structType) : structType
  const currentStructSource = structSourcePath ? _.get(structSourcePath, structSource) : structSource
  const setCurrentStructSource = structSourcePath ? source => setStructSource(_.set(structSourcePath, source, structSource)) : setStructSource

  const currentStructBreadcrumbs = _.map(
    // map slices of the structBuilderPath (e.g. [0, 1, 2] -> [0], [0, 1], [0, 1, 2])
    // onto their corresponding field_names within structType, via buildStructNamePath
    end => _.get(buildStructNamePath(_.slice(0, end + 1, structBuilderPath)), structType),
    _.range(0, structBuilderPath.length)
  )

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
          onClick: () => setStructBuilderPath(_.slice(0, i, structBuilderPath))
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
                ['record_lookup', () => RecordLookupSelect({ source: innerStructSource, dataTableAttributes, updateSource: setInnerStructSource })],
                ['object_builder', () => StructBuilderLink({ onClick: () => setStructBuilderPath([...structBuilderPath, rowIndex]) })],
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
