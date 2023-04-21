import 'setimmediate'

import { MatchersV3, PactV3, SpecificationVersion } from '@pact-foundation/pact'
import path from 'path'
import { Ajax } from 'src/libs/ajax'
import { fetchCbas } from 'src/libs/ajax-fetch'
import { 
  runSetInputDef, 
  runSetOutputDef, 
  runSetInputDefWithSourceNone, 
  runSetInputDefWithStruct 
} from 'src/libs/mock-responses'

jest.mock('src/libs/ajax-fetch')

jest.mock('src/libs/config', () => ({
  ...jest.requireActual('src/libs/config'),
  getConfig: jest.fn().mockReturnValue({})
}))

const {
  timestamp,
  string,
  regex,
  boolean,
  integer,
  fromProviderState
} = MatchersV3

const UUID_REGEX = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'

const cbasPact = new PactV3({
  consumer: 'cbas-ui',
  provider: 'cbas',
  log: path.resolve(process.cwd(), 'logs', 'pact.log'),
  logLevel: 'warn',
  dir: path.resolve(process.cwd(), 'pacts'),
  spec: SpecificationVersion.SPECIFICATION_VERSION_V3
})

describe('Ajax tests', () => {
  it('should GET run_sets with method ID 00000000-0000-0000-0000-000000000009', async () => {
    const expectedResponse = {
      fully_updated: boolean(true),
      run_sets: [
        {
          run_set_id: regex(UUID_REGEX, '10000000-0000-0000-0000-000000000009'),
          method_id: regex(UUID_REGEX, '00000000-0000-0000-0000-000000000009'),
          method_version_id: regex(UUID_REGEX, '90000000-0000-0000-0000-000000000009'),
          is_template: boolean(true),
          run_set_name: string('struct_workflow_test template run set'),
          run_set_description: string('struct_workflow_test template submission'),
          state: regex('RUNNING|COMPLETE', 'COMPLETE'),
          record_type: string('sample'),
          submission_timestamp: timestamp('yyyy-MM-dd\'T\'HH:mm:ss.SSSXXX', '2023-03-28T13:05:02.690+00:00'),
          last_modified_timestamp: timestamp('yyyy-MM-dd\'T\'HH:mm:ss.SSSXXX', '2023-03-28T13:05:02.690+00:00'),
          run_count: integer(0),
          error_count: integer(0),
          input_definition: string('[...]'),
          output_definition: string('[...]')
        }
      ]
    }

    await cbasPact.addInteraction({
      states: [{ description: 'at least one run set exists with method_id 00000000-0000-0000-0000-000000000009' }],
      uponReceiving: 'get run set with method_id=00000000-0000-0000-0000-000000000009 and page_size=1',
      withRequest: { method: 'GET', path: '/api/batch/v1/run_sets', query: { method_id: '00000000-0000-0000-0000-000000000009', page_size: 1 } },
      willRespondWith: { status: 200, body: expectedResponse }
    })

    await cbasPact.executeTest(async mockService => {
      // ARRANGE
      fetchCbas.mockImplementation(async path => await fetch(`${mockService.url}/api/batch/v1/${path}`))

      // ACT
      const response = await Ajax('fakeSignal').Cbas.runSets.getForMethod('00000000-0000-0000-0000-000000000009', 1)

      // ASSERT
      expect(response).toBeDefined()
      expect(fetchCbas).toBeCalledTimes(1)
      expect(fetchCbas).toBeCalledWith('run_sets?method_id=00000000-0000-0000-0000-000000000009&page_size=1', { method: 'GET', signal: 'fakeSignal' })
      expect(response).toHaveProperty('run_sets')
      expect(response).toHaveProperty('fully_updated')
      expect(response.run_sets.length).toEqual(1)
    })
  })

  it('should successfully POST a simple run_set', async () => {
    const expectedResponse = {
      run_set_id: fromProviderState('${run_set_id}', '00000000-0000-0000-0000-000000000000'),
      runs: [
        {
          run_id: fromProviderState('${run_id}', '00000000-0000-0000-0000-000000000000'),
          state: regex('.*', 'RUNNING'),
          errors: regex('.*', 'some arbitrary string')
        }
      ],
      state: regex('.*', 'RUNNING')
    }

    const payload = {
      run_set_name: 'myRunSet',
      run_set_description: 'myRunSet description',
      method_version_id: '90000000-0000-0000-0000-000000000009',
      wds_records: { record_type: 'FOO', record_ids: [ 'FOO1' ] },
      workflow_input_definitions: runSetInputDef,
      workflow_output_definitions: runSetOutputDef
    }

    const body = JSON.stringify(payload)
    const headers = { 'Content-Type': 'application/json' }

    await cbasPact.addInteraction({
      states: [{ description: "initialize" }, { description: "post run sets" }],
      uponReceiving: 'post a simple run set',
      withRequest: { path: '/api/batch/v1/run_sets', method: 'POST', body, headers },
      willRespondWith: { status: 200, body: expectedResponse }
    })

    await cbasPact.executeTest(async mockService => {
      // ARRANGE
      const signal = 'fakeSignal'

      fetchCbas.mockImplementation(async path => await fetch(
        `${mockService.url}/api/batch/v1/${path}`, { method: 'POST', body, headers }))

      // ACT
      const response = await Ajax(signal).Cbas.runSets.post(payload)

      // ASSERT
      expect(response).toBeDefined()
      expect(fetchCbas).toBeCalledTimes(1)
      expect(fetchCbas).toBeCalledWith('run_sets', { body, headers, method: 'POST', signal })
      // expect(response).toHaveProperty('run_sets')
      // expect(response).toHaveProperty('fully_updated')
      // expect(response.run_sets.length).toEqual(1)
    })
  })

  it('should successfully POST a run_set containing a "none" source', async () => {
    const expectedResponse = {
      run_set_id: fromProviderState('${run_set_id}', '00000000-0000-0000-0000-000000000000'),
      runs: [
        {
          run_id: fromProviderState('${run_id}', '00000000-0000-0000-0000-000000000000'),
          state: regex('.*', 'RUNNING'),
          errors: regex('.*', 'some arbitrary string')
        }
      ],
      state: regex('.*', 'RUNNING')
    }

    const payload = {
      run_set_name: 'myRunSet',
      run_set_description: 'myRunSet description',
      method_version_id: '90000000-0000-0000-0000-000000000009',
      wds_records: { record_type: 'FOO', record_ids: [ 'FOO1' ] },
      workflow_input_definitions: runSetInputDefWithSourceNone,
      workflow_output_definitions: runSetOutputDef
    }

    const body = JSON.stringify(payload)
    const headers = { 'Content-Type': 'application/json' }

    await cbasPact.addInteraction({
      states: [{ description: "initialize" }, { description: "post run sets" }],
      uponReceiving: 'post a run set with a "none" source',
      withRequest: { path: '/api/batch/v1/run_sets', method: 'POST', body, headers },
      willRespondWith: { status: 200, body: expectedResponse }
    })

    await cbasPact.executeTest(async mockService => {
      // ARRANGE
      const signal = 'fakeSignal'

      fetchCbas.mockImplementation(async path => await fetch(
        `${mockService.url}/api/batch/v1/${path}`, { method: 'POST', body, headers }))

      // ACT
      const response = await Ajax(signal).Cbas.runSets.post(payload)

      // ASSERT
      expect(response).toBeDefined()
      expect(fetchCbas).toBeCalledTimes(1)
      expect(fetchCbas).toBeCalledWith('run_sets', { body, headers, method: 'POST', signal })
      // expect(response).toHaveProperty('run_sets')
      // expect(response).toHaveProperty('fully_updated')
      // expect(response.run_sets.length).toEqual(1)
    })
  })

  it('should successfully POST a run_set containing a struct input', async () => {
    const expectedResponse = {
      run_set_id: fromProviderState('${run_set_id}', '00000000-0000-0000-0000-000000000000'),
      runs: [
        {
          run_id: fromProviderState('${run_id}', '00000000-0000-0000-0000-000000000000'),
          state: regex('.*', 'RUNNING'),
          errors: regex('.*', 'some arbitrary string')
        }
      ],
      state: regex('.*', 'RUNNING')
    }

    const payload = {
      run_set_name: 'myRunSet',
      run_set_description: 'myRunSet description',
      method_version_id: '90000000-0000-0000-0000-000000000009',
      wds_records: { record_type: 'FOO', record_ids: [ 'FOO1' ] },
      workflow_input_definitions: runSetInputDefWithStruct,
      workflow_output_definitions: runSetOutputDef
    }

    const body = JSON.stringify(payload)
    const headers = { 'Content-Type': 'application/json' }

    await cbasPact.addInteraction({
      states: [{ description: "initialize" }, { description: "post run sets" }],
      uponReceiving: 'post a run set with a struct source',
      withRequest: { path: '/api/batch/v1/run_sets', method: 'POST', body, headers },
      willRespondWith: { status: 200, body: expectedResponse }
    })

    await cbasPact.executeTest(async mockService => {
      // ARRANGE
      const signal = 'fakeSignal'

      fetchCbas.mockImplementation(async path => await fetch(
        `${mockService.url}/api/batch/v1/${path}`, { method: 'POST', body, headers }))

      // ACT
      const response = await Ajax(signal).Cbas.runSets.post(payload)

      // ASSERT
      expect(response).toBeDefined()
      expect(fetchCbas).toBeCalledTimes(1)
      expect(fetchCbas).toBeCalledWith('run_sets', { body, headers, method: 'POST', signal })
      // expect(response).toHaveProperty('run_sets')
      // expect(response).toHaveProperty('fully_updated')
      // expect(response.run_sets.length).toEqual(1)
    })
  })
})
