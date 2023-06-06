import _ from 'lodash/fp'
import PropTypes from 'prop-types'
import { Fragment, useImperativeHandle, useRef, useState } from 'react'
import Draggable from 'react-draggable'
import { button, div, h, label, option, select } from 'react-hyperscript-helpers'
import Pagination from 'react-paginating'
import { defaultCellRangeRenderer, Grid as RVGrid, ScrollSync as RVScrollSync } from 'react-virtualized'
import { Clickable, IdContainer, Link } from 'src/components/common'
import { icon } from 'src/components/icons'
import Interactive from 'src/components/Interactive'
import TooltipTrigger from 'src/components/TooltipTrigger'
import colors from 'src/libs/colors'
import { forwardRefWithName, useLabelAssert, useOnMount } from 'src/libs/react-utils'
import * as Style from 'src/libs/style'
import * as Utils from 'src/libs/utils'


const paginatorButton = (props, label) => button(_.merge({
  style: {
    margin: '0 2px', padding: '0.25rem 0.5rem',
    display: 'flex', justifyContent: 'center', alignItems: 'center',
    border: '1px solid #ccc', borderRadius: 3,
    color: props.disabled ? colors.dark(0.7) : colors.accent(), backgroundColor: 'white',
    cursor: props.disabled ? 'not-allowed' : 'pointer'
  }
}, props), label)

/**
 * @param {number} props.filteredDataLength
 * @param {number} props.pageNumber
 * @param {function(number)} props.setPageNumber
 * @param {function(number)} [props.setItemsPerPage]
 * @param {number} props.itemsPerPage
 * @param {number[]} [props.itemsPerPageOptions=[10,25,50,100]]
 */
export const paginator = ({
  filteredDataLength, unfilteredDataLength, pageNumber, setPageNumber, setItemsPerPage,
  itemsPerPage, itemsPerPageOptions = [10, 25, 50, 100]
}) => {
  return h(Pagination, {
    total: filteredDataLength,
    limit: itemsPerPage,
    pageCount: 5,
    currentPage: pageNumber
  }, [
    ({ pages, currentPage, hasNextPage, hasPreviousPage, previousPage, nextPage, totalPages, getPageItemProps }) => h(Fragment,
      [
        div({ style: { display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginRight: '1rem' } }, [
          `${(pageNumber - 1) * itemsPerPage + 1} - ${_.min([filteredDataLength, pageNumber * itemsPerPage])} of ${filteredDataLength}`,
          unfilteredDataLength && filteredDataLength !== unfilteredDataLength && ` (filtered from ${unfilteredDataLength} total)`,
          div({ style: { display: 'inline-flex', padding: '0 1rem' } }, [

            paginatorButton(
              _.merge({ 'aria-label': 'First page', disabled: currentPage === 1, style: { marginRight: '0.5rem' } },
                getPageItemProps({ pageValue: 1, onPageChange: setPageNumber })),
              [icon('angle-double-left', { size: 12 })]
            ),

            paginatorButton(
              _.merge({ 'aria-label': 'Previous page', disabled: !hasPreviousPage, style: { marginRight: '1rem' } },
                getPageItemProps({ pageValue: previousPage, onPageChange: setPageNumber })),
              [icon('angle-left', { size: 12 })]
            ),

            _.map(num => paginatorButton(
              _.merge({
                key: num,
                'aria-current': currentPage === num ? 'page' : undefined,
                style: {
                  minWidth: '2rem',
                  backgroundColor: currentPage === num ? colors.accent() : undefined,
                  color: currentPage === num ? 'white' : colors.accent(),
                  border: currentPage === num ? colors.accent() : undefined
                }
              },
              getPageItemProps({ pageValue: num, onPageChange: setPageNumber })),
              num), pages
            ),

            paginatorButton(
              _.merge({ 'aria-label': 'Next page', disabled: !hasNextPage, style: { marginLeft: '1rem' } },
                getPageItemProps({ pageValue: nextPage, onPageChange: setPageNumber })),
              [icon('angle-right', { size: 12 })]
            ),

            paginatorButton(
              _.merge({ 'aria-label': 'Last page', disabled: currentPage === totalPages, style: { marginLeft: '0.5rem' } },
                getPageItemProps({ pageValue: totalPages, onPageChange: setPageNumber })),
              [icon('angle-double-right', { size: 12 })]
            )
          ]),

          setItemsPerPage && h(IdContainer, [id => h(Fragment, [
            label({ htmlFor: id }, ['Items per page:']),
            select({
              id,
              style: { marginLeft: '0.5rem' },
              onChange: e => setItemsPerPage(parseInt(e.target.value, 10)),
              value: itemsPerPage
            },
            _.map(i => option({ value: i }, i),
              itemsPerPageOptions))
          ])])
        ])
      ]
    )
  ])
}

const cellStyles = {
  display: 'flex',
  alignItems: 'center',
  paddingLeft: '1rem',
  paddingRight: '1rem'
}

const styles = {
  cell: (col, total, { border } = {}) => ({
    ...cellStyles,
    borderBottom: `1px solid ${colors.dark(0.2)}`,
    borderLeft: !border && col === 0 ? undefined : `1px solid ${colors.dark(0.2)}`,
    borderRight: border && col === total - 1 ? `1px solid ${colors.dark(0.2)}` : undefined
  }),
  header: (col, total, { border } = {}) => ({
    ...cellStyles,
    backgroundColor: colors.light(0.5),
    borderTop: border ? `1px solid ${colors.dark(0.2)}` : undefined,
    borderBottom: `1px solid ${colors.dark(0.2)}`,
    borderLeft: !border && col === 0 ? undefined : `1px solid ${colors.dark(0.2)}`,
    borderRight: border && col === total - 1 ? `1px solid ${colors.dark(0.2)}` : undefined,
    borderTopLeftRadius: border && col === 0 ? '5px' : undefined,
    borderTopRightRadius: border && col === total - 1 ? '5px' : undefined
  }),
  flexCell: ({ basis = 0, grow = 1, shrink = 1, min = 0, max } = {}) => ({
    flexGrow: grow,
    flexShrink: shrink,
    flexBasis: basis,
    minWidth: min,
    maxWidth: max
  }),
  columnSelector: {
    position: 'absolute', top: 0, right: 0, width: 48, height: 48,
    display: 'flex', justifyContent: 'center', alignItems: 'center',
    color: colors.accent(), backgroundColor: colors.light(0.4),
    border: `1px solid ${colors.dark(0.2)}`,
    borderRadius: 5
  },
  columnHandle: {
    paddingRight: '0.25rem', cursor: 'move',
    display: 'flex', alignItems: 'center'
  }
}

// Calculate a suitable pixel height for a table, capped at a certain number of rows.
// Note: We always need 1 extra row's worth of height for the table header row:
export const tableHeight = ({ actualRows, maxRows, heightPerRow = 48 }) => (_.min([actualRows, maxRows]) + 1) * heightPerRow

/**
 * Return the sorting direction for a column identified by its field name, and using the same
 * state object as the {@link Sortable} renderer. The output will be suitable for use in an
 * `aria-sort` attribute https://www.digitala11y.com/aria-sort-properties/
 *
 * @param sort A state object containing the current sort order
 * @param sort.field An identifier for the field name currently being sorted.
 * @param sort.direction 'asc' or 'desc'
 * @param field The identifier of the field to check
 * @return 'ascending' or 'descending' if currently sorting by the given field,
 *  'none' if the given field is sortable but the table is currently sorted by a different field,
 *  null if the table or column is not sortable.
 */
export const ariaSort = (sort, field) => {
  if (sort && field) {
    // If we're currently sorting by this column, return the sort direction
    if (sort.field === field) {
      return sort.direction === 'asc' ? 'ascending' : 'descending'
    }
    // Otherwise this column is sortable but we're currently sorting by a different column
    return 'none'
  }
  // Otherwise this column is not sortable
  return null
}

export const TextCell = ({ children, ...props }) => {
  return div(_.merge({ style: Style.noWrapEllipsis }, props), [children])
}

export const TooltipCell = ({ children, tooltip, ...props }) => h(TooltipTrigger, {
  content: tooltip || children
}, [h(TextCell, props, [children])])

export const HeaderCell = props => {
  return h(TextCell, _.merge({ style: { fontWeight: 600 } }, props))
}

export const Sortable = ({ sort, field, onSort, children }) => {
  return h(IdContainer, [id => h(Clickable, {
    style: { flex: 1, display: 'flex', alignItems: 'center', cursor: 'pointer', width: '100%', height: '100%' },
    onClick: () => onSort(Utils.nextSort(sort, field)),
    'aria-describedby': id
  }, [
    children,
    sort.field === field && div({
      style: { color: colors.accent(), marginLeft: '0.1rem' }
    }, [
      icon(sort.direction === 'asc' ? 'long-arrow-alt-down' : 'long-arrow-alt-up')
    ]),
    div({ id, style: { display: 'none' } }, ['Click to sort by this column'])
  ])])
}

export const Resizable = ({ onWidthChange, width, minWidth = 100, children }) => {
  const [dragAmount, setDragAmount] = useState(undefined)
  const [lastX, setLastX] = useState(undefined)

  return div({
    style: { flex: 1, display: 'flex', alignItems: 'center', position: 'relative', width: '100%' }
  }, [
    children,
    h(Draggable, {
      axis: 'x',
      onStart: e => {
        setLastX(e.clientX)
        setDragAmount(0)
      },
      onDrag: e => {
        const deltaX = e.clientX - lastX
        if (deltaX !== 0 && width + dragAmount + deltaX > minWidth) {
          setDragAmount(dragAmount + deltaX)
          setLastX(e.clientX)
        }
      },
      onStop: () => {
        setDragAmount(undefined)
        onWidthChange(dragAmount)
      },
      position: { x: 0, y: 0 }
    }, [
      icon('columnGrabber', {
        size: 24,
        style: { position: 'absolute', right: -20, cursor: 'ew-resize' }
      })
    ]),
    !!dragAmount && icon('columnGrabber', {
      size: 24,
      style: { position: 'absolute', right: -20 - dragAmount, zIndex: 1, opacity: '0.5', cursor: 'ew-resize' }
    })
  ])
}

const NoContentRow = ({ noContentMessage, noContentRenderer = _.noop, numColumns }) => div({
  role: 'row',
  className: 'table-row',
  style: { marginTop: '1rem', textAlign: 'center', fontStyle: 'italic' }
}, [
  div({
    role: 'cell',
    className: 'table-cell',
    'aria-colspan': numColumns
  }, [
    noContentMessage || noContentRenderer() || 'Nothing to display'
  ])
])

export const InputsButtonRow = ({
  showRow = true, optionalButtonProps: { includeOptionalInputs, setIncludeOptionalInputs },
  setFromDataTableButtonProps: { inputRowsInDataTable, setConfiguredInputDefinition } = {}, ...props
}) => {
  return showRow && h(div, { ...props }, [
    h(Link,
      {
        style: { marginRight: 'auto' },
        onClick: () => setIncludeOptionalInputs(includeOptionalInputs => !includeOptionalInputs)
      },
      [includeOptionalInputs ? 'Hide optional inputs' : 'Show optional inputs']
    ),
    inputRowsInDataTable && h(Link,
      {
        style: { marginLeft: 'auto' },
        onClick: () => _.forEach(
          row => setConfiguredInputDefinition(_.set(`[${row.configurationIndex}].source`, { type: 'record_lookup', record_attribute: row.variable }))
        )(inputRowsInDataTable),
        tooltip: _.flow(_.map(row => `${row.taskName}.${row.variable}`), _.join('\n'))(inputRowsInDataTable)
      },
      [`Set (${inputRowsInDataTable.length}) from data table`]
    )
  ])
}

export const flexTableDefaultRowHeight = 48

/**
 * A virtual table with a fixed header and flexible column widths. Intended to take up the full
 * available container width, without horizontal scrolling.
 */
export const FlexTable = ({
  initialY = 0, width, height, rowCount, variant, columns = [], hoverHighlight = false,
  onScroll = _.noop, noContentMessage, noContentRenderer = _.noop, headerHeight = flexTableDefaultRowHeight, rowHeight = flexTableDefaultRowHeight,
  styleCell = () => ({}), styleHeader = () => ({}), 'aria-label': ariaLabel, sort = null, readOnly = false,
  border = true,
  ...props
}) => {
  useLabelAssert('FlexTable', { 'aria-label': ariaLabel, allowLabelledBy: false })

  const [scrollbarSize, setScrollbarSize] = useState(0)
  const body = useRef()

  useOnMount(() => {
    body.current.scrollToPosition({ scrollTop: initialY })
  })

  return div({
    role: 'table',
    'aria-rowcount': rowCount + 1, // count the header row too
    'aria-colcount': columns.length,
    'aria-label': ariaLabel,
    'aria-readonly': readOnly || undefined,
    className: 'flex-table'
  }, [
    div({
      style: {
        ...styles.headerRow,
        width: width - scrollbarSize,
        height: headerHeight,
        display: 'flex'
      },
      role: 'row'
    }, _.map(([i, { size, headerRenderer, field }]) => {
      return div({
        key: i,
        role: 'columnheader',
        // ARIA row and column indexes start with 1 rather than 0 https://www.digitala11y.com/aria-colindexproperties/
        'aria-rowindex': 1, // The header row is 1
        'aria-colindex': i + 1, // The first column is 1
        'aria-sort': ariaSort(sort, field),
        style: {
          ...styles.flexCell(size),
          ...(variant === 'light' ? {} : styles.header(i * 1, columns.length, { border })),
          ...(styleHeader ? styleHeader({ columnIndex: i }) : {})
        }
      }, [headerRenderer({ columnIndex: i })])
    }, Utils.toIndexPairs(columns))),
    h(RVGrid, {
      ref: body,
      role: 'rowgroup',
      containerRole: 'presentation', // Clear out unnecessary ARIA roles
      'aria-label': `${ariaLabel} content`, // The whole table is a tab stop so it needs a label
      'aria-readonly': null, // Clear out ARIA properties which should be at the table level, not here
      width,
      height: height - headerHeight,
      columnWidth: width - scrollbarSize,
      rowHeight,
      rowCount,
      columnCount: 1,
      onScrollbarPresenceChange: ({ vertical, size }) => {
        setScrollbarSize(vertical ? size : 0)
      },
      cellRenderer: data => {
        return h(Interactive, {
          key: data.key,
          role: 'row',
          as: 'div',
          className: 'table-row',
          style: { ...data.style, backgroundColor: 'white', display: 'flex' },
          hover: hoverHighlight ? { backgroundColor: colors.light(0.4) } : undefined
        }, [
          _.map(([i, { size, cellRenderer }]) => {
            return div({
              key: i,
              role: 'cell',
              // ARIA row and column indexes start with 1 https://www.digitala11y.com/aria-colindexproperties/
              'aria-rowindex': data.rowIndex + 2, // The header row is 1, so the first body row is 2
              'aria-colindex': i + 1, // The first column is 1
              className: 'table-cell',
              style: {
                ...styles.flexCell(size),
                ...(variant === 'light' ? {} : styles.cell(i * 1, columns.length, { border })),
                ...(styleCell ? styleCell({ ...data, columnIndex: i, rowIndex: data.rowIndex }) : {})
              }
            }, [cellRenderer({ ...data, columnIndex: i, rowIndex: data.rowIndex })])
          }, Utils.toIndexPairs(columns))
        ])
      },
      style: { outline: 'none' },
      onScroll: ({ scrollTop }) => onScroll(scrollTop),
      noContentRenderer: () => {
        return h(NoContentRow, { noContentMessage, noContentRenderer, numColumns: columns.length })
      },
      ...props
    })
  ])
}

FlexTable.propTypes = {
  width: PropTypes.number.isRequired,
  height: PropTypes.number.isRequired,
  initialY: PropTypes.number,
  rowCount: PropTypes.number.isRequired,
  variant: PropTypes.oneOf(['light']),
  noContentMessage: PropTypes.node,
  noContentRenderer: PropTypes.func,
  columns: PropTypes.arrayOf(PropTypes.shape({
    field: PropTypes.string,
    headerRenderer: PropTypes.func.isRequired,
    cellRenderer: PropTypes.func.isRequired,
    size: PropTypes.shape({
      basis: PropTypes.number, // flex-basis in px, default 0
      grow: PropTypes.number, // flex-grow, default 1
      max: PropTypes.number, // max-width in px
      min: PropTypes.number, // min-width in px, default 0
      shrink: PropTypes.number // flex-shrink, default 1
    })
  })),
  hoverHighlight: PropTypes.bool,
  onScroll: PropTypes.func,
  headerHeight: PropTypes.number,
  rowHeight: PropTypes.number,
  styleHeader: PropTypes.func,
  styleCell: PropTypes.func,
  'aria-label': PropTypes.string.isRequired,
  sort: PropTypes.shape({
    field: PropTypes.string,
    direction: PropTypes.string
  }),
  readOnly: PropTypes.bool
}

/**
 * A virtual table with a fixed header and explicit column widths. Intended for displaying large
 * datasets which may require horizontal scrolling.
 */
export const GridTable = forwardRefWithName('GridTable', ({
  width, height, initialX = 0, initialY = 0, rowHeight = 48, headerHeight = 48,
  noContentMessage, noContentRenderer = _.noop,
  rowCount, columns, numFixedColumns = 0, styleCell = () => ({}), styleHeader = () => ({}), onScroll: customOnScroll = _.noop,
  'aria-label': ariaLabel, sort = null, readOnly = false,
  border = true
}, ref) => {
  useLabelAssert('GridTable', { 'aria-label': ariaLabel, allowLabelledBy: false })

  const [scrollbarSize, setScrollbarSize] = useState(0)
  const header = useRef()
  const body = useRef()
  const scrollSync = useRef()

  useOnMount(() => {
    if (rowCount > 0) {
      body.current.measureAllCells()

      scrollSync.current._onScroll({ scrollLeft: initialX }) //BEWARE: utilizing private method from scrollSync that is not intended to be used

      body.current.scrollToPosition({ scrollLeft: initialX, scrollTop: initialY }) // waiting to let ScrollSync initialize
    }
  })

  useImperativeHandle(ref, () => ({
    recomputeColumnSizes: () => {
      header.current.recomputeGridSize()
      body.current.recomputeGridSize()
      body.current.measureAllCells()
    },
    scrollToTop: () => {
      body.current.scrollToPosition({ scrollTop: 0, scrollLeft: 0 })
    }
  }))

  const fixedColumns = _.slice(0, numFixedColumns, columns)
  const totalFixedColumnsWidth = _.sum(_.map('width', fixedColumns))
  // The value at index i in this array is a sum of the widths of columns to the left of the column at index i.
  const fixedColumnOffsets = _.transform((offsets, column) => { offsets.push(column.width + _.last(offsets)) }, [0])(fixedColumns)

  const unfixedColumns = _.slice(numFixedColumns, _.size(columns), columns)

  // columnIndex in this function is an index in the original columns array.
  const renderHeaderCell = ({ key, columnIndex, rowIndex, style }) => {
    const field = columns[columnIndex].field
    return div({
      key,
      role: 'columnheader',
      // ARIA row and column indexes start with 1 rather than 0 https://www.digitala11y.com/aria-colindexproperties/
      'aria-rowindex': 1, // The header row is 1
      'aria-colindex': columnIndex + 1, // The first column is 1
      'aria-sort': ariaSort(sort, field),
      className: 'table-cell',
      style: {
        ...style,
        ...styles.header(columnIndex, columns.length, { border }),
        ...styleHeader({ columnIndex, rowIndex })
      }
    }, [
      columns[columnIndex].headerRenderer({ columnIndex, rowIndex })
    ])
  }

  // columnIndex in this function is an index in the original columns array.
  const renderCell = ({ key, columnIndex, rowIndex, style }) => {
    return div({
      key,
      role: 'cell',
      // ARIA row and column indexes start with 1 rather than 0 https://www.digitala11y.com/aria-colindexproperties/
      'aria-rowindex': rowIndex + 2, // The header row is 1, so the first body row is 2
      'aria-colindex': columnIndex + 1, // The first column is 1
      className: 'table-cell',
      style: {
        ...style,
        ...styles.cell(columnIndex, columns.length, { border }),
        backgroundColor: 'white',
        ...styleCell({ columnIndex, rowIndex })
      }
    }, [
      columns[columnIndex].cellRenderer({ columnIndex, rowIndex })
    ])
  }

  return h(RVScrollSync, {
    ref: scrollSync
  }, [
    ({ onScroll, scrollLeft }) => {
      return div({
        role: 'table',
        'aria-label': ariaLabel,
        'aria-rowcount': rowCount + 1, // count the header row too
        'aria-colcount': columns.length,
        'aria-readonly': readOnly || undefined,
        className: 'grid-table',
        style: {
          width, height,
          // Setting contain: strict on this element allows positioning fixed columns relative to this element
          // instead of RVGrid's inner scroll container.
          // https://developer.mozilla.org/en-US/docs/Web/CSS/Containing_block#identifying_the_containing_block
          contain: 'strict'
        }
      }, [
        h(RVGrid, {
          ref: header,
          role: 'rowgroup',
          containerRole: 'row',
          'aria-label': `${ariaLabel} header row`, // The whole table is a tab stop so it needs a label
          'aria-readonly': null, // Clear out ARIA properties which have been moved one level up
          // Leave space for fixed columns.
          width: width - scrollbarSize - totalFixedColumnsWidth,
          height: headerHeight,
          columnWidth: ({ index }) => unfixedColumns[index].width,
          rowHeight: headerHeight,
          rowCount: 1,
          columnCount: unfixedColumns.length,
          cellRenderer: ({ columnIndex, ...cell }) => {
            // columnIndex here is an index in the unfixedColumns array.
            // Offset it to pass an index in the original columns array to renderHeaderCell.
            return renderHeaderCell({ ...cell, columnIndex: columnIndex + numFixedColumns })
          },
          cellRangeRenderer: data => {
            // The default renderer returns a flat array of all of the cells to render in the DOM
            const cells = defaultCellRangeRenderer(data)

            const {
              horizontalOffsetAdjustment,
              rowSizeAndPositionManager,
              verticalOffsetAdjustment
            } = data

            const rowDatum = rowSizeAndPositionManager.getSizeAndPositionOfCell(0)

            return [
              ..._.map(columnIndex => {
                return renderHeaderCell({
                  key: `fixed-${columnIndex}`,
                  columnIndex,
                  rowIndex: 0,
                  style: {
                    height: rowDatum.size,
                    left: fixedColumnOffsets[columnIndex] + horizontalOffsetAdjustment,
                    position: 'fixed',
                    top: rowDatum.offset + verticalOffsetAdjustment,
                    width: fixedColumns[columnIndex].width,
                    // Show header cell above body cells in fixed columns when vertically scrolling the grid.
                    zIndex: 2
                  }
                })
              }, _.range(0, numFixedColumns)),
              ...cells
            ]
          },
          style: {
            // Leave space for fixed columns.
            marginLeft: totalFixedColumnsWidth,
            outline: 'none',
            // overflow: hidden prevents additional scrollbars from appearing in the header row
            // while scrolling the grid.
            // overflowX and overflowY must be set separately because RVGrid also sets them.
            // Using the overflow: hidden shorthand results in a React warning:
            // "Updating a style property during rerender (overflowX) when a conflicting property
            // is set (overflow) can lead to styling bugs"
            overflowX: 'hidden',
            overflowY: 'hidden',
            // Override will-change: transform set in RVGrid. This allows positioning fixed columns
            // relative to GridTable's container instead of the RVGrid's inner scroll container.
            willChange: 'auto'
          },
          scrollLeft,
          onScroll
        }),
        h(RVGrid, {
          ref: body,
          role: 'rowgroup',
          containerRole: 'presentation',
          'aria-label': `${ariaLabel} content`, // The whole table is a tab stop so it needs a label
          'aria-readonly': null, // Clear out ARIA properties which have been moved one level up
          // Leave space for fixed columns.
          width: width - totalFixedColumnsWidth,
          height: height - headerHeight,
          columnWidth: ({ index }) => unfixedColumns[index].width,
          rowHeight,
          rowCount,
          columnCount: unfixedColumns.length,
          onScrollbarPresenceChange: ({ vertical, size }) => {
            setScrollbarSize(vertical ? size : 0)
          },
          cellRenderer: ({ columnIndex, rowIndex, ...cell }) => {
            return {
              // Cells will be grouped by row by the cellRangeRenderer
              rowIndex,
              // columnIndex here is an index in the unfixedColumns array.
              // Offset it to pass an index in the original columns array to renderHeaderCell.
              cell: renderCell({ ...cell, columnIndex: columnIndex + numFixedColumns, rowIndex })
            }
          },
          cellRangeRenderer: data => {
            // The default renderer returns a flat array of all of the cells to render in the DOM
            const cells = defaultCellRangeRenderer(data)

            const {
              horizontalOffsetAdjustment,
              rowSizeAndPositionManager,
              verticalOffsetAdjustment,
              scrollTop
            } = data

            // Group the cells into rows to support a11y
            // Elements with role "cell" are required to be nested in an element with role "row".
            // https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles/cell_role
            return _.flow(
              _.groupBy('rowIndex'),
              Utils.toIndexPairs,
              _.map(([rowIndex, cells]) => {
                const rowDatum = rowSizeAndPositionManager.getSizeAndPositionOfCell(rowIndex)
                return div({
                  key: `row-${rowIndex}`,
                  role: 'row'
                }, [
                  ..._.map(columnIndex => {
                    return renderCell({
                      key: `fixed-${rowIndex}-${columnIndex}`,
                      columnIndex,
                      rowIndex,
                      style: {
                        height: rowDatum.size,
                        left: fixedColumnOffsets[columnIndex] + horizontalOffsetAdjustment,
                        position: 'fixed',
                        top: headerHeight + rowDatum.offset + verticalOffsetAdjustment - scrollTop,
                        width: fixedColumns[columnIndex].width,
                        // Show fixed columns above unfixed columns when horizontally scrolling the grid.
                        zIndex: 1
                      }
                    })
                  }, _.range(0, numFixedColumns)),
                  ..._.map('cell', cells)
                ])
              })
            )(cells)
          },
          style: {
            // Leave space for fixed columns.
            marginLeft: totalFixedColumnsWidth,
            outline: 'none',
            // Override will-change: transform set in RVGrid. This allows positioning fixed columns
            // relative to GridTable's container instead of the RVGrid's inner scroll container.
            willChange: 'auto'
          },
          scrollLeft,
          onScroll: details => {
            onScroll(details)
            const { scrollLeft, scrollTop } = details
            customOnScroll(scrollLeft, scrollTop)
          },
          noContentRenderer: () => h(NoContentRow, { noContentMessage, noContentRenderer, numColumns: columns.length })
        })
      ])
    }
  ])
})

GridTable.propTypes = {
  width: PropTypes.number.isRequired,
  height: PropTypes.number.isRequired,
  initialX: PropTypes.number,
  initialY: PropTypes.number,
  rowCount: PropTypes.number.isRequired,
  styleHeader: PropTypes.func,
  styleCell: PropTypes.func,
  noContentMessage: PropTypes.node,
  noContentRenderer: PropTypes.func,
  columns: PropTypes.arrayOf(PropTypes.shape({
    field: PropTypes.string,
    width: PropTypes.number.isRequired,
    headerRenderer: PropTypes.func.isRequired,
    cellRenderer: PropTypes.func.isRequired
  })),
  onScroll: PropTypes.func,
  headerHeight: PropTypes.number,
  rowHeight: PropTypes.number,
  'aria-label': PropTypes.string.isRequired,
  sort: PropTypes.shape({
    field: PropTypes.string,
    direction: PropTypes.string
  }),
  readOnly: PropTypes.bool
}
