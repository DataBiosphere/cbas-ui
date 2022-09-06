import '@testing-library/jest-dom'
import { makeCompleteDate } from 'src/libs/utils'

describe('makeCompleteDate', () => {
  it('converts string to Date', () => {
    expect(makeCompleteDate('2022-01-27T22:27:15.591Z').toString()).toEqual('Jan 27, 2022, 5:27 PM')
  })
})
