import {
  reconstructToRawUrl
} from 'src/components/method-common'


jest.mock('src/libs/config', () => ({
  ...jest.requireActual('src/libs/config'),
  getConfig: jest.fn().mockReturnValue({})
}))

describe('reconstructToRawUrl', () => {
  const validRawUrl = 'https://raw.githubusercontent.com/broadinstitute/cromwell/develop/wdl/transforms/draft3/src/test/cases/simple_task.wdl'

  const testCases = [
    { url: 'lol.com', expectedUrl: 'lol.com' },
    { url: 'https://raw.githubusercontent.com/broadinstitute/cromwell/develop/wdl/transforms/draft3/src/test/cases/simple_task.wdl', expectedUrl: validRawUrl },
    { url: 'https://github.com/broadinstitute/cromwell/blob/develop/wdl/transforms/draft3/src/test/cases/simple_task.wdl', expectedUrl: validRawUrl }
  ]

  test.each(testCases)('returns reconstructed url', ({ url, expectedUrl }) => {
    const onDismiss = jest.fn()
    const reconstructedUrl = reconstructToRawUrl(url, onDismiss)
    expect(reconstructedUrl).toBe(expectedUrl)
  })
})
