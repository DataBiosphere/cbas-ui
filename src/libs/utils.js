// import { isToday, isYesterday } from 'date-fns'
// import { differenceInCalendarMonths } from 'date-fns/fp'
// import _ from 'lodash/fp'
// import * as qs from 'qs'
// import { div, span } from 'react-hyperscript-helpers'
// import { v4 as uuid } from 'uuid'

import _ from 'lodash/fp'


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
