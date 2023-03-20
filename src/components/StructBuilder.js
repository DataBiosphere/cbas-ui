import _ from 'lodash/fp'
import { div, h } from 'react-hyperscript-helpers'
import { AutoSizer } from 'react-virtualized'
import { Link } from 'src/components/common'
import { InputSourceSelect, ParameterValueTextInput, RecordLookupSelect, StructBuilderLink } from 'src/components/submission-common'
import { FlexTable, HeaderCell, TextCell } from 'src/components/table'
import * as Utils from 'src/libs/utils'


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

export const StructBuilder = props => {
  const {
    inputTableData,
    dataTableAttributes,
    configuredInputDefinition, setConfiguredInputDefinition,
    structBuilderPath, setStructBuilderPath
  } = props


  const structBuilderName = _.get(buildStructNamePath(structBuilderPath), inputTableData)
  const structBuilderBreadcrumbs = buildStructBuilderBreadcrumbs(structBuilderPath, inputTableData)
  const structBuilderInputType = _.get(buildStructInputTypePath(structBuilderPath), inputTableData)
  const structBuilderSource = _.get(buildStructSourcePath(structBuilderPath), inputTableData)
  const setStructBuilderSource = source => {
    const sourcePath = buildStructSourcePath(structBuilderPath)
    setConfiguredInputDefinition(_.set(sourcePath, source, configuredInputDefinition))
  }

  const structBuilderFields = structBuilderInputType.fields

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
          onClick: () => {
            const end = parseInt(i) + 1
            const newPath = _.slice(0, end, structBuilderPath)
            setStructBuilderPath(newPath)
          }
        }, `${name} / `), _.toPairs(_.initial(structBuilderBreadcrumbs))),
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
