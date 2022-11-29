import _ from 'lodash/fp'
import PropTypes from 'prop-types'
import { Fragment, useRef, useState } from 'react'
import { button, div, h, label, option, select } from 'react-hyperscript-helpers'
import Pagination from 'react-paginating'
import { Grid as RVGrid } from 'react-virtualized'
import { Clickable, IdContainer } from 'src/components/common'
import { icon } from 'src/components/icons'
import Interactive from 'src/components/Interactive'
import TooltipTrigger from 'src/components/TooltipTrigger'
import colors from 'src/libs/colors'
import { useLabelAssert, useOnMount } from 'src/libs/react-utils'
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
     }, //_.map(([i, { size, headerRenderer, field }]) => {
    //   return div({
    //     key: i,
    //     role: 'columnheader',
    //     // ARIA row and column indexes start with 1 rather than 0 https://www.digitala11y.com/aria-colindexproperties/
    //     'aria-rowindex': 1, // The header row is 1
    //     'aria-colindex': i + 1, // The first column is 1
    //     'aria-sort': ariaSort(sort, field),
    //     style: {
    //       ...styles.flexCell(size),
    //       ...(variant === 'light' ? {} : styles.header(i * 1, columns.length, { border })),
    //       ...(styleHeader ? styleHeader({ columnIndex: i }) : {})
    //     }
    //   }, [headerRenderer({ columnIndex: i })])
    /* }, Utils.toIndexPairs(columns))*/),
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
    headerRenderer: PropTypes.func,
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
