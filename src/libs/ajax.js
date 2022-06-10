// import { getDefaultProperties } from '@databiosphere/bard-client'
import _ from 'lodash/fp'
// import * as qs from 'qs'
// import { getDisplayName, tools } from 'src/components/notebook-utils'
// import { version } from 'src/data/machines'
// import { ensureAuthSettled, getUser } from 'src/libs/auth'
import { getConfig } from 'src/libs/config'
// import { withErrorIgnoring } from 'src/libs/error'
// import * as Nav from 'src/libs/nav'
import { ajaxOverridesStore, authStore, knownBucketRequesterPaysStatuses, requesterPaysProjectStore, workspaceStore } from 'src/libs/state'
import * as Utils from 'src/libs/utils'
// import { v4 as uuid } from 'uuid'

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

export const fetchOk = _.flow(withInstrumentation, withCancellation, withErrorRejection)(fetch)

const Cbas = signal => ({
  status: async () => {
    const res = await fetchOk(`${getConfig().cbasUrlRoot}/status`, { signal })
    return res.json()
  }
})

export const Ajax = signal => {
  return {
    Cbas: Cbas(signal)
  }
}
