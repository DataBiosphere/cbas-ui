import 'setimmediate'

import { MatchersV3, PactV3, SpecificationVersion } from '@pact-foundation/pact'
import path from 'path'
import { fetchOk } from 'src/libs/ajax'

import responses from './mockResponses.json'


const {
  eachLike,
  integer,
  timestamp,
  string,
  regex,
  constrainedArrayLike
} = MatchersV3

const runSetBodyExample = responses['GET /api/batch/v1/run_sets'].run_sets[0]

const runSetBodyExpectation = {
  error_count: integer(0),
  last_modified_timestamp: timestamp(
    'yyyy-MM-dd\'T\'HH:mm:ss.SSSXXX',
    runSetBodyExample.last_modified_timestamp
  ),
  record_type: string(
    runSetBodyExample.record_type
  ),
  run_count: integer(
    runSetBodyExample.run_count
  ),
  run_set_id: regex(
    '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}',
    runSetBodyExample.run_set_id
  ),
  state: regex(
    'UNKNOWN|RUNNING|COMPLETE|ERROR',
    runSetBodyExample.state
  ),
  submission_timestamp: timestamp(
    'yyyy-MM-dd\'T\'HH:mm:ss.SSSXXX',
    runSetBodyExample.submission_timestamp
  )
}

const provider = new PactV3({
  consumer: 'cbas-ui',
  provider: 'cbas',
  log: path.resolve(process.cwd(), 'logs', 'pact.log'),
  logLevel: 'warn',
  dir: path.resolve(process.cwd(), 'pacts'),
  spec: SpecificationVersion.SPECIFICATION_VERSION_V3
})

describe('get run sets', () => {
  it('at least one runset exists', async () => {
    // set up Pact interactions
    await provider.addInteraction({
      states: [
        { description: 'at_least_one_runset_exists' }
      ],
      uponReceiving: 'get all run sets',
      withRequest: {
        method: 'GET',
        path: '/api/batch/v1/run_sets',
        headers: { 'Content-Type': 'application/json; charset=utf-8' }
      },
      willRespondWith: {
        status: 200,
        headers: {
          'Content-Type': 'application/json'
        },
        body: { run_sets: constrainedArrayLike(runSetBodyExpectation, 1, 999, 5) }
      }
    })

    await provider.executeTest(async mockService => {
      // make request to Pact mock server
      const result = await fetchOk(`${mockService.url}/api/batch/v1/run_sets`, { method: 'GET', headers: { 'Content-Type': 'application/json; charset=utf-8' } })
      const resultJson = await result.json()
      expect(resultJson.run_sets.length).toBeGreaterThan(0)
    })
  })
})
