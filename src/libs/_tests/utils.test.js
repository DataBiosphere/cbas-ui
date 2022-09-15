import { makeCompleteDate } from 'src/libs/utils'
import '@testing-library/jest-dom'

describe('makeCompleteDate', () => {
  it('converts string to Date', () => {
    // since the timestamp is being converted to Local timezone, it returns different time when run locally and in GitHub action.
    // Hence verifying only the date format for now.
    expect(makeCompleteDate('2022-01-27T22:27:15.591Z').toString()).toContain('Jan 27, 2022')
  })
})
