import '@testing-library/jest-dom'

import { getDockstoreUrlRoot, makeCompleteDate, renderTypeText } from 'src/libs/utils'


describe('makeCompleteDate', () => {
  it('converts string to Date', () => {
    // since the timestamp is being converted to Local timezone, it returns different time when run locally and in GitHub action.
    // Hence verifying only the date format for now.
    expect(makeCompleteDate('2022-01-27T22:27:15.591Z').toString()).toContain('Jan 27, 2022')
  })
})

describe('submission-common tests', () => {
  it('variable type text is rendered properly', () => {
    expect(renderTypeText({ type: 'primitive', primitive_type: 'File' })).toStrictEqual('File')
    expect(renderTypeText({ type: 'optional', optional_type: { type: 'primitive', primitive_type: 'String' } })).toStrictEqual('String')
    expect(renderTypeText({ type: 'array', array_type: { type: 'primitive', primitive_type: 'Int' } })).toStrictEqual('Array[Int]')
    expect(renderTypeText({ type: 'array', array_type: { type: 'optional', optional_type: { type: 'primitive', primitive_type: 'Int' } } })).toStrictEqual('Array[Int]')
    expect(renderTypeText({ type: 'optional', optional_type: { type: 'array', array_type: { type: 'optional', optional_type: { type: 'primitive', primitive_type: 'Int' } } } })).toStrictEqual('Array[Int]')
    expect(renderTypeText({ type: 'array', array_type: { type: 'array', array_type: { type: 'array', array_type: { type: 'primitive', primitive_type: 'Int' } } } })).toStrictEqual('Array[Array[Array[Int]]]')
    expect(renderTypeText({ type: 'struct', struct_type: 'File' })).toStrictEqual('Struct')
    expect(renderTypeText({
      type: 'map',
      key_type: 'File',
      value_type: {
        type: 'primitive',
        primitive_type: 'String'
      }
    })).toStrictEqual('Map[File, String]')
  })
})

describe('getDockstoreUrlRoot', () => {
  let env

  beforeAll(() => {
    env = process.env.NODE_ENV
  })

  afterAll(() => {
    process.env.NODE_ENV = env
  })

  it.each([
    { testEnv: 'development', url: 'https://staging.dockstore.org' },
    { testEnv: 'staging', url: 'https://staging.dockstore.org' },
    { testEnv: 'production', url: 'https://dockstore.org' },
    { testEnv: 'local', url: 'https://staging.dockstore.org' },
    { testEnv: 'alpha', url: 'https://staging.dockstore.org' }
  ])('returns proper url for given environment', ({ testEnv, url }) => {
    // Arrange
    process.env.NODE_ENV = testEnv

    // Assert
    expect(getDockstoreUrlRoot()).toBe(url)
  })
})
