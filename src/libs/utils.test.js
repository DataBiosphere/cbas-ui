import '@testing-library/jest-dom'

import { makeCompleteDate, renderTypeText } from 'src/libs/utils'


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
    expect(renderTypeText({ type: 'optional', optional_type: { type: 'primitive', primitive_type: 'String' } })).toStrictEqual('String (optional)')
    expect(renderTypeText({ type: 'array', array_type: { type: 'primitive', primitive_type: 'Int' } })).toStrictEqual('Array[Int]')
    expect(renderTypeText({ type: 'array', array_type: { optional_type: { primitive_type: 'Int' } } })).toStrictEqual('Array[Int (optional)]')
    expect(renderTypeText({ type: 'array', array_type: { array_type: { array_type: { primitive_type: 'Int' } } } })).toStrictEqual('Array[Array[Array[Int]]]')
  })
})
