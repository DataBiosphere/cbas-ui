import { formatDuration, intervalToDuration } from 'date-fns'
import { differenceInSeconds, parseJSON } from 'date-fns/fp'
import _ from 'lodash/fp'
import { div } from 'react-hyperscript-helpers'


export const newTabLinkProps = { target: '_blank', rel: 'noopener noreferrer' } // https://mathiasbynens.github.io/rel-noopener/

const completeDateFormat = new Intl.DateTimeFormat('default', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: 'numeric' })
export const makeCompleteDate = dateString => completeDateFormat.format(new Date(dateString))

/**
 * Returns difference in seconds between current time and supplied JSON formatted date (which is assumed to be older).
 */
export const differenceFromNowInSeconds = jsonDateString => {
  return differenceInSeconds(parseJSON(jsonDateString), Date.now())
}

export const differenceFromDatesInSeconds = (jsonDateStringStart, jsonDateStringEnd) => {
  return differenceInSeconds(parseJSON(jsonDateStringStart), parseJSON(jsonDateStringEnd))
}

export const customFormatDuration = seconds => {
  const durations = intervalToDuration({ start: 0, end: seconds * 1000 }) // this function expects milliseconds
  return formatDuration(durations)
}

export const subscribable = () => {
  let subscribers = []
  return {
    subscribe: fn => {
      subscribers = append(fn, subscribers)
      return {
        unsubscribe: () => {
          subscribers = _.without([fn], subscribers)
        }
      }
    },
    next: (...args) => {
      _.forEach(fn => fn(...args), subscribers)
    }
  }
}

/**
 * A simple state container inspired by clojure atoms. Method names were chosen based on similarity
 * to lodash and Immutable. (deref => get, reset! => set, swap! => update, reset to go back to initial value)
 * Implements the Store interface
 */
export const atom = initialValue => {
  let value = initialValue
  const { subscribe, next } = subscribable()
  const get = () => value
  const set = newValue => {
    const oldValue = value
    value = newValue
    next(newValue, oldValue)
  }
  return { subscribe, get, set, update: fn => set(fn(get())), reset: () => set(initialValue) }
}

// Returns a promise that will never resolve or reject. Useful for cancelling async flows.
export const abandonedPromise = () => {
  return new Promise(() => {})
}

export const delay = ms => {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export const append = _.curry((value, arr) => _.concat(arr, [value]))

export const maybeParseJSON = maybeJSONString => {
  try {
    return JSON.parse(maybeJSONString)
  } catch {
    return undefined
  }
}

const maybeCall = maybeFn => _.isFunction(maybeFn) ? maybeFn() : maybeFn

/**
 * Takes any number of [predicate, value] pairs, followed by an optional default value.
 * Returns value() for the first truthy predicate, otherwise returns the default value().
 * Returns undefined if no predicate matches and there is no default value.
 *
 * DEPRECATED: If a value is not a function, it will be returned directly instead.
 * This behavior is deprecated, and will be removed in the future.
 */
export const cond = (...args) => {
  console.assert(_.every(arg => {
    return _.isFunction(arg) || (_.isArray(arg) && arg.length === 2 && _.isFunction(arg[1]))
  }, args), 'Invalid arguments to Utils.cond')
  for (const arg of args) {
    if (_.isArray(arg)) {
      const [predicate, value] = arg
      if (predicate) return maybeCall(value)
    } else {
      return maybeCall(arg)
    }
  }
}

export const DEFAULT = Symbol()

export const switchCase = (value, ...pairs) => {
  const match = _.find(([v]) => v === value || v === DEFAULT, pairs)
  return match && match[1]()
}

export const summarizeErrors = errors => {
  const errorList = cond(
    [_.isPlainObject(errors), () => _.flatMap(_.values, errors)],
    [_.isArray(errors), () => errors],
    () => []
  )
  if (errorList.length) {
    return _.map(([k, v]) => {
      return div({ key: k, style: { marginTop: k !== '0' ? '0.5rem' : undefined } }, [v])
    }, _.toPairs(errorList))
  }
}

export const toIndexPairs = _.flow(_.toPairs, _.map(([k, v]) => [k * 1, v]))

export const nextSort = ({ field, direction }, newField) => {
  return newField === field ?
    { field, direction: direction === 'asc' ? 'desc' : 'asc' } :
    { field: newField, direction: 'asc' }
}

// Transforms an async function so that it updates a busy flag via the provided callback 'setBusy'
// Note that 'fn' does not get called during the transformation.
export const withBusyState = _.curry((setBusy, fn) => async (...args) => {
  try {
    setBusy(true)
    return await fn(...args)
  } finally {
    setBusy(false)
  }
})

/**
 * Converts a value to a type. Auto-curries.
 * @param {string} type - 'string', 'number', or 'boolean'
 * @param value
 */
export const convertValue = _.curry((type, value) => {
  switch (type) {
    case 'string':
      // known issue where toString is incorrectly flagged:
      // eslint-disable-next-line lodash-fp/preferred-alias
      return _.toString(value)
    case 'number':
      return _.toNumber(value)
    case 'boolean':
      return !['false', 'no', '0', ''].includes(_.lowerCase(value))
    default:
      throw new Error('unknown type for convertValue')
  }
})

export const renderTypeText = iotype => {
  if (_.has('primitive_type', iotype)) {
    return iotype.primitive_type
  }
  if (_.has('optional_type', iotype)) {
    return `${_.get('optional_type.primitive_type', iotype)} (optional)`
  }
  if (_.has('array_type', iotype)) {
    return `Array[${renderTypeText(_.get('array_type', iotype))}]`
  }
  if (_.get('type', iotype) === 'map') {
    return `Map[${_.get('key_type', iotype)}, ${renderTypeText(_.get('value_type', iotype))}]`
  }
  return 'Unsupported Type'
}
