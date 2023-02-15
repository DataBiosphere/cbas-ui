import { getDuration, isRunInTerminalState, isRunSetInTerminalState } from 'src/components/submission-common'


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
    expect(getDuration(state, currentTime.setTime(currentTime.getTime() - 20000), "doesn't matter what is passed here", stateCallback)).toBe(20)
  })
})
