import _ from 'lodash/fp'
import * as qs from 'qs'
import { getConfig } from 'src/libs/config'
import { ajaxOverridesStore } from 'src/libs/state'
import * as Utils from 'src/libs/utils'


const jsonBody = body => ({ body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } })

const leoToken = () => {
  const cookies = document.cookie.split(';')
  const leoTokens = cookies.filter(c => c.startsWith('LeoToken=')).map(c => c.substring(9)) // token value starting after `LeoToken=`

  // only 1 LeoToken should have been sent to browser, hence return the first element in array
  return leoTokens[0]
}
const authHeader = { headers: { Authorization: `Bearer ${leoToken()}` } }

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
const fetchCromwell = withUrlPrefix(`${getConfig().cromwellUrlRoot}/api/workflows/v1/`, fetchOk)
const fetchWds = wdsProxyUrlRoot => withUrlPrefix(`${wdsProxyUrlRoot}/`, fetchOk)
const fetchLeo = withUrlPrefix(`${getConfig().leoUrlRoot}/`, fetchOk) // TODO: How to add this config to Cromwhelm?

const Cbas = signal => ({
  status: async () => {
    const res = await fetchOk(`${getConfig().cbasUrlRoot}/status`, { signal })
    return res.json()
  },
  runs: {
    get: async submissionId => {
      const keyParams = qs.stringify({ run_set_id: submissionId })
      const res = await fetchCbas(`runs?${keyParams}`, { signal, method: 'GET' })
      return res.json()
    }
  },
  runSets: {
    post: async payload => {
      const res = await fetchCbas(`run_sets`, _.mergeAll([{ signal, method: 'POST' }, jsonBody(payload)]))
      return res.json()
    },
    get: async () => {
      const res = await fetchCbas(`run_sets`, { signal, method: 'GET' })
      return res.json()
    },
    getForMethod: async (methodId, pageSize) => {
      const keyParams = qs.stringify({ method_id: methodId, page_size: pageSize }, { arrayFormat: 'repeat' })
      const res = await fetchCbas(`run_sets?${keyParams}`, { signal, method: 'GET' })
      return res.json()
    },
    cancel: async runSetId => {
      const keyParams = qs.stringify({ run_set_id: runSetId })
      const res = await fetchCbas(`run_sets/abort?${keyParams}`, { signal, method: 'POST' })
      return res.json()
    }
  },
  methods: {
    getWithoutVersions: async () => {
      const keyParams = qs.stringify({ show_versions: false })
      const res = await fetchCbas(`methods?${keyParams}`, { signal, method: 'GET' })
      return res.json()
    },
    getById: async methodId => {
      const keyParams = qs.stringify({ method_id: methodId })
      const res = await fetchCbas(`methods?${keyParams}`, { signal, method: 'GET' })
      return await res.json()
    },
    getByMethodVersionId: async methodVersionId => {
      const keyParams = qs.stringify({ method_version_id: methodVersionId })
      const res = await fetchCbas(`methods?${keyParams}`, { signal, method: 'GET' })
      return await res.json()
    },
    post: async payload => {
      const res = await fetchCbas(`methods`, _.mergeAll([{ signal, method: 'POST' }, jsonBody(payload)]))
      return res.json()
    }
  }
})

const Cromwell = signal => ({
  workflows: workflowId => {
    return {
      metadata: async (includeKey, excludeKey) => {
        const keyParams = qs.stringify({ includeKey, excludeKey }, { arrayFormat: 'repeat' })
        const res = await fetchCromwell(`${workflowId}/metadata?${keyParams}`, { signal, method: 'GET' })
        return res.json()
      }
    }
  }
})

// this hard-coded fallback UUID is a holdover from our local testing configuration.
const wdsInstanceId = getConfig().wdsInstanceId || '15f36863-30a5-4cab-91f7-52be439f1175'
const wdsApiVersion = getConfig().wdsApiVersion || 'v0.2'
const searchPayload = { limit: 100 }

const Wds = signal => ({
  types: {
    get: async wdsUrlRoot => {
      const res = await fetchWds(wdsUrlRoot)(`${wdsInstanceId}/types/${wdsApiVersion}`, { signal, method: 'GET' })
      return _.map(
        type => _.set('attributes', _.filter(attr => attr.name !== 'sys_name', type.attributes), type),
        await res.json()
      )
    }
  },
  search: {
    post: async (wdsUrlRoot, wdsType) => {
      const res = await fetchWds(wdsUrlRoot)(
        `${wdsInstanceId}/search/${wdsApiVersion}/${wdsType}`,
        _.mergeAll([{ signal, method: 'POST' }, jsonBody(searchPayload)])
      )
      const resultJson = await res.json()
      resultJson.records = _.map(_.unset('attributes.sys_name'), resultJson.records)
      return resultJson
    }
  }
})

const WorkflowScript = signal => ({
  get: async workflowUrl => {
    const res = await fetchOk(workflowUrl, { signal, method: 'GET' })
    return res.text()
  }
})

const Leonardo = signal => ({
  listAppsV2: async () => {
    const res = await fetchLeo(`api/apps/v2/${wdsInstanceId}`, _.mergeAll([authHeader, { signal, method: 'GET' }]))
    return res.json()
  }
})

export const Ajax = signal => {
  return {
    Cbas: Cbas(signal),
    Cromwell: Cromwell(signal),
    Wds: Wds(signal),
    WorkflowScript: WorkflowScript(signal),
    Leonardo: Leonardo(signal)
  }
}
