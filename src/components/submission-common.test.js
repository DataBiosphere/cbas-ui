import { getDuration, isRunInTerminalState, isRunSetInTerminalState, resolveWdsUrl } from 'src/components/submission-common'
import { getConfig } from 'src/libs/config'


jest.mock('src/libs/config', () => ({
  ...jest.requireActual('src/libs/config'),
  getConfig: jest.fn().mockReturnValue({})
}))

describe('getDuration', () => {
  const submissionTimestamp = '2023-02-15T20:46:06.242+00:00'
  const lastModifiedTimestamp = '2023-02-15T20:47:46.242+00:00'

  const terminalTestCases = [
    { type: 'Run Set', state: 'COMPLETE', stateCallback: isRunSetInTerminalState },
    { type: 'Run Set', state: 'ERROR', stateCallback: isRunSetInTerminalState },
    { type: 'Run', state: 'COMPLETE', stateCallback: isRunInTerminalState },
    { type: 'Run', state: 'CANCELED', stateCallback: isRunInTerminalState },
    { type: 'Run', state: 'SYSTEM_ERROR', stateCallback: isRunInTerminalState },
    { type: 'Run', state: 'ABORTED', stateCallback: isRunInTerminalState },
    { type: 'Run', state: 'EXECUTOR_ERROR', stateCallback: isRunInTerminalState }
  ]

  const nonTerminalTestCases = [
    { type: 'Run Set', state: 'UNKNOWN', stateCallback: isRunSetInTerminalState },
    { type: 'Run Set', state: 'RUNNING', stateCallback: isRunSetInTerminalState },
    { type: 'Run', state: 'INITIALIZING', stateCallback: isRunInTerminalState },
    { type: 'Run', state: 'QUEUED', stateCallback: isRunInTerminalState },
    { type: 'Run', state: 'RUNNING', stateCallback: isRunInTerminalState },
    { type: 'Run', state: 'PAUSED', stateCallback: isRunInTerminalState },
    { type: 'Run', state: 'CANCELING', stateCallback: isRunInTerminalState },
    { type: 'Run', state: 'UNKNOWN', stateCallback: isRunInTerminalState }
  ]

  test.each(terminalTestCases)('returns duration for $type in terminal state $state', ({ state, stateCallback }) => {
    expect(getDuration(state, submissionTimestamp, lastModifiedTimestamp, stateCallback)).toBe(100)
  })

  test.each(nonTerminalTestCases)('returns duration for $type in non-terminal state $state', ({ state, stateCallback }) => {
    // since run set is in non-terminal state, we get duration as difference in seconds between current time and submission_timestamp
    // so for testing purposes we deduct 20 seconds from current time and pass it as submission_timestamp
    const currentTime = new Date()
    expect(getDuration(state, currentTime.setTime(currentTime.getTime() - 20000), lastModifiedTimestamp, stateCallback)).toBe(20)
  })
})

describe('resolveWdsUrl', () => {
  const mockWdsProxyUrl = 'https://lzabc123.servicebus.windows.net/abc-proxy-url/wds'
  const firstWdsProxyUrl = 'https://lzabc123.servicebus.windows.net/first-wds-app-proxy-url/wds'

  const generateMockApp = (appType, status, wdsUrl, createdDate) => {
    return {
      appType, workspaceId: 'abc-123', appName: `wds-abc-123`, status, proxyUrls: { wds: wdsUrl }, auditInfo: {
        createdDate
      }
    }
  }

  const testCases = [
    { appStatus: 'RUNNING', expectedUrl: mockWdsProxyUrl },
    { appStatus: 'PROVISIONING', expectedUrl: '' },
    { appStatus: 'STOPPED', expectedUrl: '' },
    { appStatus: 'STOPPING', expectedUrl: '' },
    { appStatus: 'ERROR', expectedUrl: '' }
  ]

  beforeEach(() => {
    getConfig.mockReturnValue(({ wdsAppTypeName: 'CROMWELL' }))
  })

  test.each(testCases)('properly extracts the correct value for a WDS app in \'$appStatus\' state from the Leo response ', ({ appStatus, expectedUrl }) => {
    const mockAppList = [generateMockApp('CROMWELL', appStatus, mockWdsProxyUrl, '2022-01-24T14:27:28.740880Z')]
    expect(resolveWdsUrl(mockAppList)).toBe(expectedUrl)
  })

  it('returns empty string if no CROMWELL app exists but other apps are present', () => {
    const mockAppList = [generateMockApp('GALAXY', 'RUNNING', mockWdsProxyUrl, '2022-01-24T14:27:28.740880Z')]
    expect(resolveWdsUrl(mockAppList)).toBe('')
  })

  it('returns the earliest created RUNNING app url if more than one exists', () => {
    const mockAppList = [
      generateMockApp('CROMWELL', 'RUNNING', firstWdsProxyUrl, '2022-01-24T14:27:28.740880Z'),
      generateMockApp('CROMWELL', 'RUNNING', mockWdsProxyUrl, '2023-01-24T15:27:28.740880Z')
    ]
    expect(resolveWdsUrl(mockAppList)).toBe(firstWdsProxyUrl)
  })

  it.each(
    [
      { appStatus: 'RUNNING', expectedUrl: mockWdsProxyUrl },
      { appStatus: 'PROVISIONING', expectedUrl: '' },
      { appStatus: 'STOPPED', expectedUrl: '' },
      { appStatus: 'STOPPING', expectedUrl: '' }
    ]
  )('gives precedence to the WDS appType over the CROMWELL appType', ({ appStatus, expectedUrl }) => {
    const uuid = '123e4567-e89b-12d3-a456-426614174000'
    const testHealthyAppProxyUrlResponse: Array<Object> = [
      { appType: 'CROMWELL', appName: `wds-${uuid}`, status: 'RUNNING', proxyUrls: { wds: 'should_not_return' }, workspaceId: uuid },
      { appType: 'WDS', appName: `wds-${uuid}`, status: appStatus, proxyUrls: { wds: mockWdsProxyUrl }, workspaceId: uuid }
    ]
    expect(resolveWdsUrl(testHealthyAppProxyUrlResponse)).toBe(expectedUrl)
  })
})
