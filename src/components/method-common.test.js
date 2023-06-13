import {
  convertToRawUrl
} from 'src/components/method-common'
import { Ajax } from 'src/libs/ajax'


jest.mock('src/libs/config', () => ({
  ...jest.requireActual('src/libs/config'),
  getConfig: jest.fn().mockReturnValue({})
}))

jest.mock('src/libs/ajax')

describe('convertToRawUrl', () => {
  const nonDockstoreValidTestCases = [
    {
      methodPath: 'https://raw.githubusercontent.com/broadinstitute/cromwell/develop/wdl/transforms/draft3/src/test/cases/simple_task.wdl',
      methodVersion: 'develop',
      methodSource: 'GitHub',
      expectedRawUrl: 'https://raw.githubusercontent.com/broadinstitute/cromwell/develop/wdl/transforms/draft3/src/test/cases/simple_task.wdl'
    },
    {
      methodPath: 'https://github.com/broadinstitute/cromwell/blob/develop/wdl/transforms/draft3/src/test/cases/simple_task.wdl',
      methodVersion: 'develop',
      methodSource: 'GitHub',
      expectedRawUrl: 'https://raw.githubusercontent.com/broadinstitute/cromwell/develop/wdl/transforms/draft3/src/test/cases/simple_task.wdl'
    }
  ]

  test.each(nonDockstoreValidTestCases)('returns raw URL for GitHub source', ({ methodPath, methodVersion, methodSource, expectedRawUrl }) => {
    expect(convertToRawUrl(methodPath, methodVersion, methodSource)).toBe(expectedRawUrl)
  })


  it('should call Dockstore to retrive raw URL', async () => {
    const mockDockstoreResponse = 'https://raw.githubusercontent.com/broadinstitute/viral-pipelines/master/pipes/WDL/workflows/fetch_sra_to_bam.wdl'

    const methodPath = 'github.com/broadinstitute/viral-pipelines/fetch_sra_to_bam'
    const methodVersion = 'master'
    const methodSource = 'Dockstore'
    const expectedRawUrl = 'https://raw.githubusercontent.com/broadinstitute/viral-pipelines/master/pipes/WDL/workflows/fetch_sra_to_bam.wdl'

    const mockDockstoreWfSourceMethod = jest.fn(() => Promise.resolve(mockDockstoreResponse))

    Ajax.mockImplementation(() => {
      return {
        Dockstore: {
          getWorkflowSourceUrl: mockDockstoreWfSourceMethod
        }
      }
    })

    const actualUrl = await convertToRawUrl(methodPath, methodVersion, methodSource)

    expect(mockDockstoreWfSourceMethod).toBeCalledTimes(1)
    expect(mockDockstoreWfSourceMethod).toHaveBeenCalledWith(methodPath, methodVersion)
    expect(actualUrl).toBe(expectedRawUrl)
  })

  it('should throw error for unknown method source', () => {
    const methodPath = 'https://my-website/hello-world.wdl'
    const methodVersion = 'develop'
    const methodSource = 'MySource'

    try {
      convertToRawUrl(methodPath, methodVersion, methodSource)
    } catch (e) {
      expect(e.message).toBe("Unknown method source 'MySource'. Currently supported method sources are [GitHub, Dockstore].")
    }
  })
})
