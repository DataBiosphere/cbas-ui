import _ from 'lodash/fp'
import * as qs from 'qs'
import { fetchCbas, fetchCromwell, fetchLeo, fetchOk, fetchWds } from 'src/libs/ajax-fetch'
import { getConfig } from 'src/libs/config'


const jsonBody = body => ({ body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } })

export const extractLeoTokenFromCookies = cookieString => {
  const cookies = cookieString.split(';')
  return _.flow(
    _.map(c => c.trim()),
    _.filter(c => c.startsWith('LeoToken=')),
    _.map(c => c.substring(9)),
    _.first)(cookies)
}

const leoToken = () => {
  const cookieString = document.cookie
  return extractLeoTokenFromCookies(cookieString)
}
const authHeader = { headers: { Authorization: `Bearer ${leoToken()}` } }


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
