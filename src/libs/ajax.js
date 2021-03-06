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

const fetchCbas = withUrlPrefix(`${getConfig().cbasUrlRoot}/api/batch/v1/`, fetchOk)

const Cbas = signal => ({
  status: async () => {
    const res = await fetchOk(`${getConfig().cbasUrlRoot}/status`, { signal })
    return res.json()
  },
  submitRun: async (workflowUrl, inputs) => {
    const formData = new FormData()
    formData.set('workflow_url', workflowUrl)
    formData.set('workflow_params', inputs)
    const res = await fetchCbas(`runs`, { body: formData, signal, method: 'POST' })
    return res.json()
  }
})

export const Ajax = signal => {
  return {
    Cbas: Cbas(signal)
  }
}
