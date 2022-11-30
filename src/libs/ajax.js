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
    }
  },
  methods: {
    get: async () => {
      return [
        {
          "method_id": "64b5bc5e-85cf-4aff-b522-01471b88b950",
          "name": "fastq_to_ubam-test",
          "description": "our first target workflow",
          "source": "github",
          "source_url": "https://raw.githubusercontent.com/broadinstitute/viral-pipelines/master/pipes/WDL/workflows/fastq_to_ubam.wdl",
          "created": "2017-07-21T17:32:28Z",
          "last_run": "2017-07-21T17:32:28Z"
        },
        {
          "method_id": "e77003d2-091a-46ac-bee3-51634c8ab61d",
          "name": "assemble_refbased",
          "description": "our second target workflow",
          "source": "github",
          "source_url": "https://raw.githubusercontent.com/broadinstitute/viral-pipelines/master/pipes/WDL/workflows/assemble_refbased.wdl",
          "created": "2017-07-21T17:32:28Z",
          "last_run": "2017-07-21T17:32:28Z"
        },
        {
          "method_id": "1486add2-70ae-4add-b843-a1f6bdbcebca",
          "name": "sarscov2_nextstraing",
          "description": "our third target workflow",
          "source": "github",
          "source_url": "https://google.com",
          "created": "2017-07-21T17:32:28Z",
          "last_run": "2017-07-21T17:32:28Z"
        }
      ]
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
      return [
        {
          "name": "Covid19_DataTable",
          "attributes": [
            {
              "name": "assemble_refbased_mock_call_10_input_file_optional",
              "datatype": "STRING"
            },
            {
              "name": "assemble_refbased_mock_call_12_input_bool_default_1",
              "datatype": "BOOLEAN"
            },
            {
              "name": "assemble_refbased_mock_call_12_input_int_default_1",
              "datatype": "NUMBER"
            },
            {
              "name": "assemble_refbased_mock_input_file_array",
              "datatype": "ARRAY_OF_STRING"
            },
            {
              "name": "assemble_refbased_mock_output_float_array",
              "datatype": "ARRAY_OF_NUMBER"
            },
          ],
          "count": 1,
          "primaryKey": "sys_name"
        },
        {
          "name": "SomeOtherDataset",
          "attributes": [],
          "count": 1,
          "primaryKey": "sys_name"
        }
      ]
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
