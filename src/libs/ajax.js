import _ from 'lodash/fp'
import * as qs from 'qs'
import { getConfig } from 'src/libs/config'
import { ajaxOverridesStore } from 'src/libs/state'
import * as Utils from 'src/libs/utils'


const jsonBody = body => ({ body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } })

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
const fetchCromwell = withUrlPrefix(`${getConfig().cbasUrlRoot}/cromwell/api/workflows/v1/`, fetchOk)

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
    }
  },
  methods: {
    get: async () => {
      const res = await fetchCbas('methods', { signal, method: 'GET' })
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

const Wds = signal => ({
  types: {
    get: async () => {
      console.log('mock WDS endpoint')
      console.log(`log ${signal} to avoid linter errors while we mock some data`)
      const resJson = await (() => [
        {
          name: 'Covid19_DataTable',
          attributes: [
            {
              name: 'assemble_refbased_mock_call_10_input_file_optional',
              datatype: 'STRING'
            },
            {
              name: 'assemble_refbased_mock_call_12_input_bool_default_1',
              datatype: 'BOOLEAN'
            },
            {
              name: 'assemble_refbased_mock_call_12_input_int_default_1',
              datatype: 'NUMBER'
            },
            {
              name: 'assemble_refbased_mock_input_file_array',
              datatype: 'ARRAY_OF_STRING'
            },
            {
              name: 'assemble_refbased_mock_output_float_array',
              datatype: 'ARRAY_OF_NUMBER'
            }
          ],
          count: 1,
          primaryKey: 'sys_name'
        },
        {
          name: 'SomeOtherDataset',
          attributes: [],
          count: 1,
          primaryKey: 'sys_name'
        },
        {
          name: 'FOO',
          attributes: [],
          count: 3,
          primaryKey: 'FOO_ID'
        }
      ])()
      return resJson
    }
  }
})

export const Ajax = signal => {
  return {
    Cbas: Cbas(signal),
    Cromwell: Cromwell(signal),
    Wds: Wds(signal)
  }
}
