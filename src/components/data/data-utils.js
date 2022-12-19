import _ from 'lodash/fp'
import { Fragment } from 'react'
import { div, h, span } from 'react-hyperscript-helpers'
import { Link } from 'src/components/common'
import { icon } from 'src/components/icons'
import { MenuButton, MenuTrigger } from 'src/components/PopupTrigger'
import { Sortable, TextCell } from 'src/components/table'
import colors from 'src/libs/colors'
import * as Utils from 'src/libs/utils'


export const HeaderOptions = ({ sort, field, onSort, extraActions, children }) => {
  const columnMenu = span({ onClick: e => e.stopPropagation() }, [
    h(MenuTrigger, {
      closeOnClick: true,
      side: 'bottom',
      content: h(Fragment, [
        h(MenuButton, { onClick: () => onSort({ field, direction: 'asc' }) }, ['Sort Ascending']),
        h(MenuButton, { onClick: () => onSort({ field, direction: 'desc' }) }, ['Sort Descending']),
        _.map(({ label, disabled, tooltip, onClick }) => h(MenuButton, { key: label, disabled, tooltip, onClick }, [label]), extraActions)
      ])
    }, [
      h(Link, { 'aria-label': 'Column menu' }, [
        icon('cardMenuIcon', { size: 16 })
      ])
    ])
  ])

  return h(Sortable, {
    sort, field, onSort
  }, [
    children,
    div({ style: { marginRight: '0.5rem', marginLeft: 'auto' } }, [columnMenu])
  ])
}

export const renderDataCell = attributeValue => {
  const renderCell = datum => Utils.convertValue('string', datum)
  const renderArray = items => {
    return _.map(([i, v]) => h(Fragment, { key: i }, [
      renderCell(v), i < (items.length - 1) && span({ style: { marginRight: '0.5rem', color: colors.dark(0.85) } }, ',')
    ]), Utils.toIndexPairs(items))
  }

  const { type, isList } = getAttributeType(attributeValue)

  const tooltip = Utils.cond(
    [type === 'json' && _.isArray(attributeValue) && !_.some(_.isObject, attributeValue), () => _.join(', ', attributeValue)],
    [type === 'json', () => JSON.stringify(attributeValue, undefined, 1)],
    [type === 'reference' && isList, () => _.join(', ', _.map('entityName', attributeValue.items))],
    [type === 'reference', () => attributeValue.entityName],
    [isList, () => _.join(', ', attributeValue.items)],
    () => attributeValue?.toString()
  )

  return h(TextCell, { title: tooltip }, [
    Utils.cond(
      [type === 'json' && _.isArray(attributeValue) && !_.some(_.isObject, attributeValue), () => renderArray(attributeValue)],
      [type === 'json', () => JSON.stringify(attributeValue, undefined, 1)],
      [type === 'reference' && isList, () => renderArray(_.map('entityName', attributeValue.items))],
      [type === 'reference', () => attributeValue.entityName],
      [isList, () => renderArray(attributeValue.items)],
      () => renderCell(attributeValue)
    )
  ])
}

export const getAttributeType = attributeValue => {
  const isList = Boolean(_.isObject(attributeValue) && attributeValue.items)

  const isReference = _.isObject(attributeValue) && (attributeValue.entityType || attributeValue.itemsType === 'EntityReference')
  const type = Utils.cond(
    [isReference, () => 'reference'],
    // explicit double-equal to check for null and undefined, since entity attribute lists can contain nulls
    // eslint-disable-next-line eqeqeq
    [(isList ? attributeValue.items[0] : attributeValue) == undefined, () => 'string'],
    [isList, () => typeof attributeValue.items[0]],
    [typeof attributeValue === 'object', () => 'json'],
    () => typeof attributeValue
  )

  return { type, isList }
}
