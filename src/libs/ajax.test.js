import { Ajax } from 'src/libs/ajax'
import { fetchCbas } from 'src/libs/ajax-fetch'


jest.mock('src/libs/ajax-fetch')

jest.mock('src/libs/config', () => ({
  ...jest.requireActual('src/libs/config'),
  getConfig: jest.fn().mockReturnValue({})
}))

describe('Ajax tests', () => {
  it('should get back a run set with id 00000000-00000000-00000000-00000000', async () => {
    // ARRANGE
    const mockedResponses = {
      'GET runs?run_set_id=00000000-00000000-00000000-00000000': {
        runs: [
          {
            run_id: '6ad0568c-61be-4339-b458-89bca258316f',
            engine_id: '637ce42e-5390-49bb-a6a8-1775b8d62980',
            run_set_id: '00000000-00000000-00000000-00000000',
            record_id: 'ERR4868270',
            workflow_url: 'https://raw.githubusercontent.com/broadinstitute/viral-pipelines/master/pipes/WDL/workflows/fetch_sra_to_bam.wdl',
            state: 'RUNNING',
            workflow_params: '[{...}]',
            workflow_outputs: '[{...}]',
            submission_date: '2023-02-24T21:32:03.656+00:00',
            last_modified_timestamp: '2023-02-24T21:32:03.656+00:00'
          }
        ]
      }
    }
    fetchCbas.mockImplementation((url, options) => new Response(JSON.stringify(mockedResponses[`${options.method} ${url}`])))

    // ACT
    const response = await Ajax('fakeSignal').Cbas.runs.get('00000000-00000000-00000000-00000000')

    // ASSERT
    expect(response).toBeDefined()
    expect(fetchCbas).toBeCalledTimes(1)
    expect(fetchCbas).toBeCalledWith('runs?run_set_id=00000000-00000000-00000000-00000000', { method: 'GET', signal: 'fakeSignal' })
    expect(response).toHaveProperty('runs')
    expect(response.runs.length).toEqual(1)
    expect(response.runs[0]).toMatchObject({ run_set_id: '00000000-00000000-00000000-00000000' })
  })
})
