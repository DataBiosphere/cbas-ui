import {
  convertToPrimitiveType,
  getDuration, inputsWithIncorrectValues, isPrimitiveTypeInputValid,
  isRunInTerminalState,
  isRunSetInTerminalState,
  resolveWdsUrl
} from 'src/components/submission-common'
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
})

describe('convertToPrimitiveType', () => {
  const testCases = [
    { primitiveType: 'Int', value: '123', expectedTypeof: 'number', convertedValue: 123 },
    { primitiveType: 'Float', value: '23.32', expectedTypeof: 'number', convertedValue: 23.32 },
    { primitiveType: 'Boolean', value: 'false', expectedTypeof: 'boolean', convertedValue: false },
    { primitiveType: 'String', value: 'hello world!', expectedTypeof: 'string', convertedValue: 'hello world!' },
    { primitiveType: 'File', value: 'https://abc.wdl', expectedTypeof: 'string', convertedValue: 'https://abc.wdl' }
  ]

  test.each(testCases)('converts value to $primitiveType type as expected', ({ primitiveType, value, expectedTypeof, convertedValue }) => {
    const result = convertToPrimitiveType(primitiveType, value)
    expect(typeof result).toBe(expectedTypeof)
    expect(result).toBe(convertedValue)
  })
})

describe('isPrimitiveTypeInputValid', () => {
  const testCases = [
    { primitiveType: 'Int', value: '123', expectedResult: true },
    { primitiveType: 'Int', value: '123xHello', expectedResult: false },
    { primitiveType: 'Int', value: 'Hello', expectedResult: false },
    { primitiveType: 'Int', value: '1234.45', expectedResult: false },
    { primitiveType: 'Float', value: '23.32', expectedResult: true },
    { primitiveType: 'Float', value: '23.0', expectedResult: true },
    { primitiveType: 'Float', value: '23', expectedResult: true },
    { primitiveType: 'Float', value: '23.0x', expectedResult: false },
    { primitiveType: 'Float', value: 'Hello', expectedResult: false },
    { primitiveType: 'Boolean', value: 'true', expectedResult: true },
    { primitiveType: 'Boolean', value: 'false', expectedResult: true },
    { primitiveType: 'Boolean', value: 'hello', expectedResult: false },
    { primitiveType: 'Boolean', value: '123', expectedResult: false },
    { primitiveType: 'String', value: 'hello world!', expectedResult: true },
    { primitiveType: 'String', value: '123.32', expectedResult: true },
    { primitiveType: 'File', value: 'https://abc.wdl', expectedResult: true }
  ]

  test.each(testCases)('returns if value for type $primitiveType is valid or not type as expected', ({ primitiveType, value, expectedResult }) => {
    expect(isPrimitiveTypeInputValid(primitiveType, value)).toBe(expectedResult)
  })
})

describe('inputsWithIncorrectValues', () => {
  const intInput = value => {
    return {
      input_name: 'test_workflow.foo_int',
      input_type: {
        type: 'primitive',
        primitive_type: 'Int'
      },
      source: {
        type: 'literal',
        parameter_value: value
      }
    }
  }

  const floatInput = value => {
    return {
      input_name: 'test_workflow.bar_float',
      input_type: {
        type: 'optional',
        optional_type: {
          type: 'primitive',
          primitive_type: 'Float'
        }
      },
      source: {
        type: 'literal',
        parameter_value: value
      }
    }
  }

  it('should return list of inputs with incorrect values', () => {
    const invalidIntInput = intInput('123x')
    const invalidFloatInput = floatInput('wrong_value')
    const inputsWithIncorrectValuesDefinition = [
      invalidIntInput,
      invalidFloatInput,
      {
        input_name: 'test_workflow.foo_boolean',
        input_type: {
          type: 'optional',
          optional_type: {
            type: 'primitive',
            primitive_type: 'Boolean'
          }
        },
        source: {
          type: 'literal',
          parameter_value: false
        }
      }
    ]

    const invalidInputs = inputsWithIncorrectValues(inputsWithIncorrectValuesDefinition)
    expect(invalidInputs.length).toBe(2)
    expect(invalidInputs).toContain(invalidIntInput)
    expect(invalidInputs).toContain(invalidFloatInput)
  })

  it('should return empty list for input definition with correct input values', () => {
    const inputsWithCorrectValuesDefinition = [
      intInput(1234),
      floatInput(23.32)
    ]

    const invalidInputs = inputsWithIncorrectValues(inputsWithCorrectValuesDefinition)
    expect(invalidInputs.length).toBe(0)
  })
})
