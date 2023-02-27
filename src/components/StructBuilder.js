import _ from 'lodash/fp'
import { div, h, span } from 'react-hyperscript-helpers'
import { AutoSizer } from 'react-virtualized'
import { Link, Select } from 'src/components/common'
import { FlexTable, HeaderCell, TextCell } from 'src/components/table'
import * as Utils from 'src/libs/utils'


export const StructBuilder = props => {
  const {
    inputSourceLabels
  } = props

  const structBuilderData = [
    {
      input_type: { type: 'struct' },
      variable: 'foo',
      inputTypeStr: 'Struct',
      source: {
        type: 'literal',
        parameter_value: 'some value'
      }
    },
    {
      input_type: { type: 'struct' },
      variable: 'bar',
      inputTypeStr: 'Struct',
      source: {
        type: 'literal',
        parameter_value: 'some value'
      }
    }
  ]

  const breadcrumbsHeight = 35

  return h(div, { ...props }, [
    h(div, {
      style: {
        height: breadcrumbsHeight,
        fontSize: 15,
        display: 'flex',
        alignItems: 'center'
      }
    }, [
      h(TextCell, {}, [
        h(Link, {}, `SRA_ID`),
        h(span, {}, ' / '),
        h(Link, {}, `some-inner-field`)
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
            field: 'taskName',
            headerRenderer: () => h(HeaderCell, ['Struct name']),
            cellRenderer: ({ rowIndex }) => {
              return h(TextCell, { style: { fontWeight: 500 } }, [`<struct name ${rowIndex}>`])
            }
          },
          {
            size: { basis: 360, grow: 0 },
            field: 'variable',
            headerRenderer: () => h(HeaderCell, ['Variable']),
            cellRenderer: ({ rowIndex }) => {
              return h(TextCell, { style: Utils.typeStyle(structBuilderData[rowIndex].input_type) }, [structBuilderData[rowIndex].variable])
            }
          },
          {
            size: { basis: 160, grow: 0 },
            field: 'inputTypeStr',
            headerRenderer: () => h(HeaderCell, ['Type']),
            cellRenderer: ({ rowIndex }) => {
              return h(TextCell, { style: Utils.typeStyle(structBuilderData[rowIndex].input_type) }, [structBuilderData[rowIndex].inputTypeStr])
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
                value: _.get(_.get(`${rowIndex}.source.type`, structBuilderData), inputSourceLabels) || null,
                // onChange: ({ value }) => {
                //   const newType = _.get(value, inputSourceTypes)
                //   let newSource
                //   if (newType === 'none') {
                //     newSource = {
                //       type: newType
                //     }
                //   } else {
                //     const param = newType === 'record_lookup' ? 'record_attribute' : 'parameter_value'
                //     newSource = {
                //       type: newType,
                //       [param]: ''
                //     }
                //   }
                //   const newConfig = _.set(`${inputTableData[rowIndex].configurationIndex}.source`, newSource, configuredInputDefinition)
                //   setConfiguredInputDefinition(newConfig)
                // },
                placeholder: 'Select Source',
                options: _.values(
                  _.has('optional_type', structBuilderData[rowIndex].input_type) ?
                    inputSourceLabels :
                    _.omit('none', inputSourceLabels)
                ),
                // options: ['a', 'b', 'c'],
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
              // const source = _.get(`${rowIndex}.source`, inputTableData)
              // const isStruct = inputTableData[rowIndex].input_type.type === 'primitive' // 'struct'
              // return Utils.switchCase(source.type || 'none',
              //   ['record_lookup', () => recordLookupSelect(rowIndex)],
              //   ['literal', () => isStruct ? structBuilderSelect(rowIndex) : parameterValueSelect(rowIndex)],
              //   ['none', () => h(TextCell, { style: { fontStyle: 'italic' } }, ['Optional'])]
              // )
              return h(TextCell, { style: { fontStyle: 'italic' } }, [`<attribute ${rowIndex}>`])
            }
          }
        ]
      })
    }])
  ])
}
