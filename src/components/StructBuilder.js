import _ from 'lodash/fp'
import { div, h } from 'react-hyperscript-helpers'
import { AutoSizer } from 'react-virtualized'
import { Link } from 'src/components/common'
import { InputSourceSelect, ParameterValueTextInput, RecordLookupSelect, StructBuilderLink } from 'src/components/submission-common'
import { FlexTable, HeaderCell, TextCell } from 'src/components/table'
import * as Utils from 'src/libs/utils'


export const StructBuilder = props => {
  const {
    structBuilderName,
    structBuilderBreadcrumbs,
    structBuilderInputType,
    dataTableAttributes,
    structBuilderSource, setStructBuilderSource,
    structBuilderPath, setStructBuilderPath
  } = props
  const structBuilderFields = structBuilderInputType.fields

  const breadcrumbsHeight = 35

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
        ..._.map(([i, name]) => h(Link, {
          onClick: () => {
            const end = parseInt(i) + 1
            const newPath = _.slice(0, end, structBuilderPath)
            setStructBuilderPath(newPath)
          }
        }, `${name} / `), _.toPairs(structBuilderBreadcrumbs)),
        structBuilderName
      ])
    ]),
    h(AutoSizer, [({ width, height }) => {
      return h(FlexTable, {
        'aria-label': 'struct-table',
        rowCount: _.size(structBuilderFields),
        readOnly: false,
        height: height - breadcrumbsHeight,
        width,
        columns: [
          {
            size: { basis: 250, grow: 0 },
            field: 'struct',
            headerRenderer: () => h(HeaderCell, ['Struct']),
            cellRenderer: () => {
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
              console.log('structBuilderFields', structBuilderFields[rowIndex])
              return h(TextCell, {}, [Utils.renderTypeText(structBuilderFields[rowIndex].field_type)])
            }
          },
          {
            size: { basis: 350, grow: 0 },
            headerRenderer: () => h(HeaderCell, ['Input sources']),
            cellRenderer: ({ rowIndex }) => {
              return InputSourceSelect({
                source: _.get(`fields.[${rowIndex}].source`, structBuilderSource),
                inputType: _.get(`fields.[${rowIndex}].field_type`, structBuilderInputType),
                updateSource: source => setStructBuilderSource(_.set(`fields.[${rowIndex}].source`, source, structBuilderSource))
              })
            }
          },
          {
            headerRenderer: () => h(HeaderCell, ['Attribute']),
            cellRenderer: ({ rowIndex }) => {
              const source = _.get(`fields.[${rowIndex}].source`, structBuilderSource)
              const id = `structbuilder-table-attribute-select-${rowIndex}`
              const updateSource = source => setStructBuilderSource(_.set(`fields.[${rowIndex}].source`, source, structBuilderSource))
              return Utils.switchCase(source.type || 'none',
                ['literal', () => ParameterValueTextInput({ id, source, updateSource })],
                ['record_lookup', () => RecordLookupSelect({ source, dataTableAttributes, updateSource })],
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
