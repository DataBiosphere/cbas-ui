import 'setimmediate'

import { MatchersV3, PactV3, SpecificationVersion } from '@pact-foundation/pact'
import path from 'path'
import { fetchOk } from 'src/libs/ajax'

import responses from './mockResponses.json'

const {
  integer,
  timestamp,
  string,
  regex,
  eachLike,
  atLeastOneLike
} = MatchersV3

const typesBodyExample1 = responses['GET /<instanceId>/types/<apiVersion>'][0]

const attributesExpectation = {
  name: string('biosample_accession'),
  datatype: regex('STRING|ARRAY', 'STRING')
}

const typesBodyExpectation = {
  name: string('sample'),
  attributes: eachLike(attributesExpectation),
  count: integer(6),
  primaryKey: string('sra_id')
}

const provider = new PactV3({
  consumer: 'cbas-ui',
  provider: 'wds',
  log: path.resolve(process.cwd(), 'logs', 'pact.log'),
  logLevel: 'warn',
  dir: path.resolve(process.cwd(), 'pacts'),
  spec: SpecificationVersion.SPECIFICATION_VERSION_V3
})

describe('get types', () => {
  it('at least one type exists', async () => {
    // set up Pact interactions
    await provider.addInteraction({
      states: [
        { description: 'at_least_one_type_exists_in_instance' }
      ],
      uponReceiving: 'get all types',
      withRequest: {
        method: 'GET',
        path: '/_instanceId/types/_apiVersion',
        headers: { 'Content-Type': 'application/json; charset=utf-8' }
      },
      willRespondWith: {
        status: 200,
        headers: {
          'Content-Type': 'application/json'
        },
        body: [atLeastOneLike(typesBodyExpectation)]
      }
    })

    await provider.executeTest(async mockService => {
      // make request to Pact mock server
      const result = await fetchOk(`${mockService.url}/_instanceId/types/_apiVersion`, { method: 'GET', headers: { 'Content-Type': 'application/json; charset=utf-8' } })
      const resultJson = await result.json()
      expect(resultJson.length).toBeGreaterThan(0)
    })
  })
})
