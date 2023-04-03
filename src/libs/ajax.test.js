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
  regex
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
  it('should get back a run with id 00000000-0000-0000-0000-000000000000', async () => {
    // ARRANGE
    const mockedResponses = {
      'GET runs?run_set_id=00000000-0000-0000-0000-000000000000': {
        runs: [
          {
            run_id: regex(UUID_REGEX, '6ad0568c-61be-4339-b458-89bca258316f'),
            engine_id: regex(UUID_REGEX, '637ce42e-5390-49bb-a6a8-1775b8d62980'),
            run_set_id: regex(UUID_REGEX, '00000000-0000-0000-0000-000000000000'),
            record_id: string('ERR4868270'),
            workflow_url: regex('https://.*', 'https://raw.githubusercontent.com/broadinstitute/viral-pipelines/master/pipes/WDL/workflows/fetch_sra_to_bam.wdl'),
            state: regex('RUNNING|COMPLETE', 'RUNNING'),
            workflow_params: string('[{...}]'),
            workflow_outputs: string('[{...}]'),
            submission_date: timestamp('yyyy-MM-dd\'T\'HH:mm:ss.SSSXXX', '2023-02-24T21:32:03.656+00:00'),
            last_modified_timestamp: timestamp('yyyy-MM-dd\'T\'HH:mm:ss.SSSXXX', '2023-02-24T21:32:03.656+00:00')
          }
        ]
      }
    }
    await cbasPact.addInteraction({
      states: [{ description: 'at_least_one_run_exists' }],
      uponReceiving: 'get run set with ID 00000000-0000-0000-0000-000000000000',
      withRequest: { method: 'GET', path: '/api/batch/v1/runs', query: { run_set_id: '00000000-0000-0000-0000-000000000000' } },
      willRespondWith: { status: 200, body: mockedResponses['GET runs?run_set_id=00000000-0000-0000-0000-000000000000'] }
    })

    await cbasPact.executeTest(async mockService => {
    // ARRANGE
      fetchCbas.mockImplementation(async path => await fetch(`${mockService.url}/api/batch/v1/${path}`))

      // ACT
      const response = await Ajax('fakeSignal').Cbas.runs.get('00000000-0000-0000-0000-000000000000')

      // ASSERT
      expect(response).toBeDefined()
      expect(fetchCbas).toBeCalledTimes(1)
      expect(fetchCbas).toBeCalledWith('runs?run_set_id=00000000-0000-0000-0000-000000000000', { method: 'GET', signal: 'fakeSignal' })
      expect(response).toHaveProperty('runs')
      expect(response.runs.length).toEqual(1)
      expect(response.runs[0]).toMatchObject({ run_set_id: '00000000-0000-0000-0000-000000000000' })
    })
  })
})
