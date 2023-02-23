import 'setimmediate'

import { MatchersV3, PactV3, SpecificationVersion } from '@pact-foundation/pact'
import path from 'path'
import { fetchOk } from 'src/libs/ajax'

const {
  eachLike,
  integer,
  timestamp,
  string,
  regex,
  atLeastOneLike
} = MatchersV3

const attributesExpectation = {
  name: string('biosample_accession'),
  datatype: regex('STRING|ARRAY', 'STRING') // TODO: fill in real datatype options instead of STRING|ARRAY
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

const regexUUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
const regexApiVersion = 'v[0-9]+\.[0-9]+'
const exampleUUID = '388ea354-dd51-4a2d-8dc1-a5bb96921849'
const exampleApiVersion = 'v0.2'

describe('GET /wds/<instanceId>/types/<apiVersion>', () => {
  it('at least one type exists', async () => {
    // set up Pact interactions
    await provider.addInteraction({
      states: [
        { description: 'instances_>0' },
        { description: 'types_>0' }
      ],
      uponReceiving: 'get all types',
      withRequest: {
        method: 'GET',
        path: regex(
          `/${regexUUID}/types/${regexApiVersion}`,
          `/${exampleUUID}/types/${exampleApiVersion}`
        ),
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
      const result = await fetchOk(`${mockService.url}/${exampleUUID}/types/${exampleApiVersion}`, { method: 'GET', headers: { 'Content-Type': 'application/json; charset=utf-8' } })
      const resultJson = await result.json()
      expect(resultJson.length).toBeGreaterThan(0)
    })
  })
})

