import _ from 'lodash/fp'
import { div, h, span } from 'react-hyperscript-helpers'
import { AutoSizer } from 'react-virtualized'
import { Link, Select } from 'src/components/common'
import { InputSourceSelect, ParameterValueTextInput, RecordLookupSelect, StructBuilderLink } from 'src/components/submission-common'
import { FlexTable, HeaderCell, TextCell } from 'src/components/table'
import * as Utils from 'src/libs/utils'


export const StructBuilder = props => {
  const {
    structBuilderName,
    structBuilderSource,
    structBuilderInputType,
    inputSourceTypes,
    inputSourceLabels,
    dataTableAttributes,
    updateSource
  } = props

  const structBuilderFields = structBuilderInputType.fields

  const updateStructBuilderSource = rowIndex => newSource => {
    const newStructBuilderSource = _.set(`fields.[${rowIndex}].source`, newSource, structBuilderSource)
    updateSource(newStructBuilderSource)
  }

  const breadcrumbsHeight = 35
  // const structBuilderPath

  return h(div, { style: { height: 500 } }, [
    h(div, {
      style: {
        height: breadcrumbsHeight,
        fontSize: 15,
        display: 'flex',
        alignItems: 'center'
      }
    }, [
      h(TextCell, {}, [
        h(Link, {}, `myStruct`),
        h(span, {}, ' / '),
        h(Link, { onClick: () => console.log('clicked species') }, `species`)
      ])
    ]),
    h(AutoSizer, [({ width, height }) => {
      return h(FlexTable, {
        'aria-label': 'struct-table',
        rowCount: 2,
        readOnly: false,
        height: height - breadcrumbsHeight,
        width,
        columns: [
          {
            size: { basis: 250, grow: 0 },
            field: 'struct',
            headerRenderer: () => h(HeaderCell, ['Struct']),
            cellRenderer: ({ rowIndex }) => {
              return h(TextCell, { style: { fontWeight: 500 } }, [structBuilderName])
            }
          },
          {
            size: { basis: 160, grow: 0 },
            field: 'field',
            headerRenderer: () => h(HeaderCell, ['Field']),
            cellRenderer: ({ rowIndex }) => {
              return h(TextCell, { }, [structBuilderFields[rowIndex].field_name])
            }
          },
          {
            size: { basis: 160, grow: 0 },
            field: 'type',
            headerRenderer: () => h(HeaderCell, ['Type']),
            cellRenderer: ({ rowIndex }) => {
              return h(TextCell, {}, [Utils.renderTypeText(structBuilderFields[rowIndex].field_type)])
            }
          },
          {
            size: { basis: 350, grow: 0 },
            headerRenderer: () => h(HeaderCell, ['Input sources']),
            cellRenderer: ({ rowIndex }) => {
              return InputSourceSelect({
                inputDefinitionIndex: rowIndex,
                source: _.get(`fields.[${rowIndex}].source`, structBuilderSource),
                inputType: _.get(`fields.[${rowIndex}].field_type.type`, structBuilderInputType),
                update: updateStructBuilderSource(rowIndex)
              })
            }
          },
          {
            headerRenderer: () => h(HeaderCell, ['Attribute']),
            cellRenderer: ({ rowIndex }) => {
              const source = _.get(`fields.[${rowIndex}].source`, structBuilderSource)
              const input_type = _.get(`fields.[${rowIndex}].field_type`, structBuilderInputType)
              return Utils.switchCase(source.type || 'none',
                ['literal', () => ParameterValueTextInput({ source, update: updateStructBuilderSource(rowIndex) })],
                ['record_lookup', () => RecordLookupSelect({ source, dataTableAttributes, update: updateStructBuilderSource(rowIndex) })],
                ['object_builder', () => StructBuilderLink({ onClick: console.log('TODO: update struct to ', source, input_type) })],
                ['none', () => h(TextCell, { style: { fontStyle: 'italic' } }, ['Optional'])]
              )
              return h(TextCell, { style: { fontStyle: 'italic' } }, [`<attribute ${rowIndex}>, <type ${source.type}>`])
            }
          }
        ]
      })
    }])
  ])
}
