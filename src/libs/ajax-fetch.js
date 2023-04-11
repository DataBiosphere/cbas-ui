import _ from 'lodash/fp'
import { getConfig } from 'src/libs/config'
import { ajaxOverridesStore } from 'src/libs/state'
import * as Utils from 'src/libs/utils'

// Allows use of ajaxOverrideStore to stub responses for testing
const withInstrumentation = wrappedFetch => (...args) => {
  return _.flow(
    ..._.map('fn', _.filter(({ filter }) => {
      const [url, { method = 'GET' } = {}] = args
      return _.isFunction(filter) ? filter(...args) : url.match(filter.url) && (!filter.method || filter.method === method)
    }, ajaxOverridesStore.get()))
  )(wrappedFetch)(...args)
}

// Ignores cancellation error when request is cancelled
const withCancellation = wrappedFetch => async (...args) => {
  try {
    return await wrappedFetch(...args)
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return Utils.abandonedPromise()
    } else {
      throw error
    }
  }
}

// Converts non-200 responses to exceptions
const withErrorRejection = wrappedFetch => async (...args) => {
  const res = await wrappedFetch(...args)
  if (res.ok) {
    return res
  } else {
    throw res
  }
}

const withUrlPrefix = _.curry((prefix, wrappedFetch) => (path, ...args) => {
  return wrappedFetch(prefix + path, ...args)
})

export const fetchOk = _.flow(withInstrumentation, withCancellation, withErrorRejection)(fetch)
export const fetchCbas = withUrlPrefix(`${getConfig().cbasUrlRoot}/api/batch/v1/`, fetchOk)
export const fetchCromwell = withUrlPrefix(`${getConfig().cromwellUrlRoot}/api/workflows/v1/`, fetchOk)
export const fetchLeo = withUrlPrefix(`${getConfig().leoUrlRoot}/`, fetchOk) // TODO: How to add this config to Cromwhelm?
export const fetchWds = wdsUrlRoot => withUrlPrefix(`${wdsUrlRoot}/`, fetchOk)
