import 'setimmediate'

import { MatchersV3, PactV3, SpecificationVersion } from '@pact-foundation/pact'
import path from 'path'
import { Ajax } from 'src/libs/ajax'
import { fetchCbas } from 'src/libs/ajax-fetch'


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
  integer
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
  it('should get run_sets with method ID 00000000-0000-0000-0000-000000000009', async () => {
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
})
