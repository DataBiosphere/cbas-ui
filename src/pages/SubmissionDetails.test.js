import '@testing-library/jest-dom'

import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { h } from 'react-hyperscript-helpers'
import selectEvent from 'react-select-event'
import { Ajax } from 'src/libs/ajax'
import { SubmissionDetails } from 'src/pages/SubmissionDetails'


jest.mock('src/libs/ajax')

jest.mock('src/libs/notifications.js')

jest.mock('src/libs/config', () => ({
  ...jest.requireActual('src/libs/config'),
  getConfig: jest.fn().mockReturnValue({})
}))

describe('Submission Details page', () => {
  // SubmissionDetails component uses AutoSizer to determine the right size for table to be displayed. As a result we need to
  // mock out the height and width so that when AutoSizer asks for the width and height of 'browser' it can use the mocked
  // values and render the component properly. Without this the tests will be break.
  // (see https://github.com/bvaughn/react-virtualized/issues/493 and https://stackoverflow.com/a/62214834)
  const originalOffsetHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetHeight')
  const originalOffsetWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetWidth')

  const runsData = {
    runs: [
      {
        run_id: 'b7234aae-6f43-405e-bb3a-71f924e09825',
        engine_id: 'b29e84b1-ad1b-4462-a9a0-7ec849bf30a8',
        run_set_id: '0cd15673-7342-4cfa-883d-819660184a16',
        record_id: 'FOO2',
        workflow_url: 'https://xyz.wdl',
        state: 'SYSTEM_ERROR',
        workflow_params: '[{\'input_name\':\'wf_hello.hello.addressee\',\'input_type\':{\'type\':\'primitive\',\'primitive_type\':\'String\'},\'source\':{\'type\':\'record_lookup\',\'record_attribute\':\'foo_name\'}}]',
        workflow_outputs: '[]',
        submission_date: '2022-07-14T22:22:15.591Z',
        last_modified_timestamp: '2022-07-14T23:14:25.791Z',
        error_messages: ['failed workflow']
      },
      {
        run_id: '55b36a53-2ff3-41d0-adc4-abc08aea88ad',
        engine_id: 'd16721eb-8745-4aa2-b71e-9ade2d6575aa',
        run_set_id: '0cd15673-7342-4cfa-883d-819660184a16',
        record_id: 'FOO1',
        workflow_url: 'https://raw.githubusercontent.com/broadinstitute/cromwell/a40de672c565c4bbd40f57ff96d4ee520dc2b4fc/centaur/src/main/resources/standardTestCases/hello/hello.wdl',
        state: 'COMPLETE',
        workflow_params: '[{\'input_name\':\'wf_hello.hello.addressee\',\'input_type\':{\'type\':\'primitive\',\'primitive_type\':\'String\'},\'source\':{\'type\':\'record_lookup\',\'record_attribute\':\'foo_name\'}}]',
        workflow_outputs: '[]',
        submission_date: '2022-12-08T23:29:18.675+00:00',
        last_modified_timestamp: '2022-12-08T23:29:55.695+00:00'
      }
    ]
  }

  const runSetData = {
    run_sets: [
      {
        run_set_id: 'e8347247-4738-4ad1-a591-56c119f93f58',
        method_id: '00000000-0000-0000-0000-000000000004',
        method_version_id: '20000000-0000-0000-0000-000000000004',
        is_template: false,
        run_set_name: 'hello world',
        run_set_description: 'test',
        state: 'COMPLETE',
        record_type: 'FOO',
        submission_timestamp: '2022-12-08T23:28:50.280+00:00',
        last_modified_timestamp: '2022-12-09T16:30:50.280+00:00',
        run_count: 1,
        error_count: 0,
        input_definition: '[{\'input_name\':\'wf_hello.hello.addressee\',\'input_type\':{\'type\':\'primitive\',\'primitive_type\':\'String\'},\'source\':{\'type\':\'record_lookup\',\'record_attribute\':\'foo_name\'}}]',
        output_definition: '[]'
      }
    ]
  }

  const methodData = {
    methods: [
      {
        method_id: '00000000-0000-0000-0000-000000000004',
        name: 'Hello world',
        description: 'Add description',
        source: 'Github',
        source_url: 'https://raw.githubusercontent.com/broadinstitute/cromwell/a40de672c565c4bbd40f57ff96d4ee520dc2b4fc/centaur/src/main/resources/standardTestCases/hello/hello.wdl',
        created: '2022-12-08T23:28:50.280+00:00',
        last_run: {
          run_previously: false,
          timestamp: '2022-12-08T23:28:50.280+00:00',
          run_set_id: 'e8347247-4738-4ad1-a591-56c119f93f58',
          method_version_id: '20000000-0000-0000-0000-000000000004',
          method_version_name: '1.0'
        }
      }
    ]
  }

  const submissionId = 'e8347247-4738-4ad1-a591-56c119f93f58'

  beforeAll(() => {
    Object.defineProperty(HTMLElement.prototype, 'offsetHeight', { configurable: true, value: 1000 })
    Object.defineProperty(HTMLElement.prototype, 'offsetWidth', { configurable: true, value: 800 })
  })

  beforeEach(() => {
    const getRunsMethod = jest.fn(() => Promise.resolve(runsData))
    Ajax.mockImplementation(() => {
      return {
        Cbas: {
          runs: {
            get: getRunsMethod
          }
        }
      }
    })
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  afterAll(() => {
    Object.defineProperty(HTMLElement.prototype, 'offsetHeight', originalOffsetHeight)
    Object.defineProperty(HTMLElement.prototype, 'offsetWidth', originalOffsetWidth)
  })

  it('should correctly display previous 2 runs', async () => {
    const getRuns = jest.fn(() => Promise.resolve(runsData))
    const getRunsSets = jest.fn(() => Promise.resolve(runSetData))
    const getMethods = jest.fn(() => Promise.resolve(methodData))
    Ajax.mockImplementation(() => {
      return {
        Cbas: {
          runs: {
            get: getRuns
          },
          runSets: {
            get: getRunsSets
          },
          methods: {
            getByMethodVersionId: getMethods
          }
        }
      }
    })

    // Act
    await act(async () => {
      await render(h(SubmissionDetails))
    })

    await waitFor(() => {
      expect(getRuns).toHaveBeenCalledTimes(1)
      expect(getRunsSets).toHaveBeenCalledTimes(3)
      expect(getMethods).toHaveBeenCalledTimes(1)
    })

    const table = screen.getByRole('table')

    // Assert
    expect(table).toHaveAttribute('aria-colcount', '4')
    expect(table).toHaveAttribute('aria-rowcount', '3')

    const rows = within(table).queryAllByRole('row')
    expect(rows.length).toBe(3)

    const headers = within(rows[0]).queryAllByRole('columnheader')
    expect(headers.length).toBe(4)
    within(headers[0]).getByText('ID')
    within(headers[1]).getByText('Status')
    within(headers[2]).getByText('Duration')
    within(headers[3]).getByText('Workflow ID')

    // check data rows are rendered as expected (default sorting is by duration in desc order)
    const cellsFromDataRow1 = within(rows[1]).queryAllByRole('cell')
    expect(cellsFromDataRow1.length).toBe(4)
    within(cellsFromDataRow1[0]).getByText('FOO2')
    within(cellsFromDataRow1[1]).getByText('Failed with error(s)')
    within(cellsFromDataRow1[2]).getByText('52 minutes 10 seconds')
    within(cellsFromDataRow1[3]).getByText('b29e84b1-ad1b-4462-a9a0-7ec849bf30a8')

    const cellsFromDataRow2 = within(rows[2]).queryAllByRole('cell')
    expect(cellsFromDataRow2.length).toBe(4)
    within(cellsFromDataRow2[0]).getByText('FOO1')
    within(cellsFromDataRow2[1]).getByText('Succeeded')
    within(cellsFromDataRow2[2]).getByText('37 seconds')
    within(cellsFromDataRow2[3]).getByText('d16721eb-8745-4aa2-b71e-9ade2d6575aa')
  })

  it('should display standard message when there are no saved workflows', async () => {
    const getRuns = jest.fn(() => Promise.resolve([]))
    const getRunsSets = jest.fn(() => Promise.resolve(runSetData))
    const getMethods = jest.fn(() => Promise.resolve(methodData))
    Ajax.mockImplementation(() => {
      return {
        Cbas: {
          runs: {
            get: getRuns
          },
          runSets: {
            get: getRunsSets
          },
          methods: {
            getByMethodVersionId: getMethods
          }
        }
      }
    })

    // Act
    await act(async () => {
      await render(h(SubmissionDetails, { submissionId }))
    })

    await waitFor(() => {
      expect(getRuns).toHaveBeenCalledTimes(1)
      expect(getRunsSets).toHaveBeenCalledTimes(3)
      expect(getMethods).toHaveBeenCalledTimes(1)
    })

    const table = screen.getByRole('table')

    // Assert
    expect(table).toHaveAttribute('aria-colcount', '4')
    expect(table).toHaveAttribute('aria-rowcount', '1')

    // check that noContentMessage shows up as expected
    screen.getByText('Nothing here yet! Your previously run workflows will be displayed here.')
  })

  it('should sort by duration column properly', async () => {
    const getRuns = jest.fn(() => Promise.resolve(runsData))
    Ajax.mockImplementation(() => {
      return {
        Cbas: {
          runs: {
            get: getRuns
          }
        }
      }
    })

    // Act
    await act(async () => {
      await render(h(SubmissionDetails))
    })

    // Assert
    const table = screen.getByRole('table')
    const rows = within(table).queryAllByRole('row')
    expect(rows.length).toBe(3)

    const headers = within(rows[0]).queryAllByRole('columnheader')
    expect(headers.length).toBe(4)

    // Act - click on sort button on Duration column to sort by ascending order
    await act(async () => {
      await fireEvent.click(within(headers[2]).getByRole('button'))
    })

    // Assert
    // check that rows are now sorted by duration in ascending order
    const cellsFromDataRow1 = within(rows[1]).queryAllByRole('cell')
    expect(cellsFromDataRow1.length).toBe(4)
    within(cellsFromDataRow1[0]).getByText('FOO1')
    within(cellsFromDataRow1[1]).getByText('Succeeded')
    within(cellsFromDataRow1[2]).getByText('37 seconds')
    within(cellsFromDataRow1[3]).getByText('d16721eb-8745-4aa2-b71e-9ade2d6575aa')

    const cellsFromDataRow2 = within(rows[2]).queryAllByRole('cell')
    expect(cellsFromDataRow2.length).toBe(4)
    within(cellsFromDataRow2[0]).getByText('FOO2')
    within(cellsFromDataRow2[1]).getByText('Failed with error(s)')
    within(cellsFromDataRow2[2]).getByText('52 minutes 10 seconds')
    within(cellsFromDataRow2[3]).getByText('b29e84b1-ad1b-4462-a9a0-7ec849bf30a8')

    // Act - click on sort button on Duration column to sort by descending order
    await act(async () => {
      await fireEvent.click(within(headers[2]).getByRole('button'))
    })

    // Assert
    // check that rows are now sorted by duration in descending order
    const cellsFromUpdatedDataRow1 = within(rows[1]).queryAllByRole('cell')
    expect(cellsFromUpdatedDataRow1.length).toBe(4)
    within(cellsFromUpdatedDataRow1[0]).getByText('FOO2')
    within(cellsFromUpdatedDataRow1[1]).getByText('Failed with error(s)')
    within(cellsFromUpdatedDataRow1[2]).getByText('52 minutes 10 seconds')
    within(cellsFromUpdatedDataRow1[3]).getByText('b29e84b1-ad1b-4462-a9a0-7ec849bf30a8')

    const cellsFromUpdatedDataRow2 = within(rows[2]).queryAllByRole('cell')
    expect(cellsFromUpdatedDataRow2.length).toBe(4)
    within(cellsFromUpdatedDataRow2[0]).getByText('FOO1')
    within(cellsFromUpdatedDataRow2[1]).getByText('Succeeded')
    within(cellsFromUpdatedDataRow2[2]).getByText('37 seconds')
    within(cellsFromUpdatedDataRow2[3]).getByText('d16721eb-8745-4aa2-b71e-9ade2d6575aa')
  })

  it('display run set details', async () => {
    const getRuns = jest.fn(() => Promise.resolve(runsData))
    const getRunsSets = jest.fn(() => Promise.resolve(runSetData))
    const getMethods = jest.fn(() => Promise.resolve(methodData))
    await Ajax.mockImplementation(() => {
      return {
        Cbas: {
          runs: {
            get: getRuns
          },
          runSets: {
            get: getRunsSets
          },
          methods: {
            getByMethodVersionId: getMethods
          }
        }
      }
    })

    render(h(SubmissionDetails, { submissionId }))

    await waitFor(() => {
      expect(getRunsSets).toHaveBeenCalledTimes(3)
      expect(getMethods).toHaveBeenCalledTimes(1)
    })


    await screen.getByText(/Submission e8347247-4738-4ad1-a591-56c119f93f58/)
    await screen.getByText(/Submission name: hello world/)
    await screen.getByText(/Workflow name: Hello world/)
    await screen.getByText(/Submission date: Dec 8, 2022/)
    await screen.getByText(/Duration: 17 hours 2 minutes/)
  })

  it('should correctly set default option', async () => {
    await act(async () => {
      await render(h(SubmissionDetails))
    })

    await screen.getByText(/None selected/)
  })


  it('should correctly select and change results', async () => {
    const getRuns = jest.fn(() => Promise.resolve(runsData))
    const getRunsSets = jest.fn(() => Promise.resolve(runSetData))
    const getMethods = jest.fn(() => Promise.resolve(methodData))
    Ajax.mockImplementation(() => {
      return {
        Cbas: {
          runs: {
            get: getRuns
          },
          runSets: {
            get: getRunsSets
          },
          methods: {
            getByMethodVersionId: getMethods
          }
        }
      }
    })

    await act(async () => {
      await render(h(SubmissionDetails))
    })

    await waitFor(() => {
      expect(getRuns).toHaveBeenCalledTimes(1)
      expect(getRunsSets).toHaveBeenCalledTimes(3)
      expect(getMethods).toHaveBeenCalledTimes(1)
    })

    await act(async () => {
      const dropdown = screen.getByLabelText('Filter selection')
      await selectEvent.select(dropdown, ['Error'])
    })

    const table = screen.getByRole('table')

    // Assert
    expect(table).toHaveAttribute('aria-colcount', '4')
    expect(table).toHaveAttribute('aria-rowcount', '2')


    const rows = within(table).queryAllByRole('row')
    expect(rows.length).toBe(2)

    const headers = within(rows[0]).queryAllByRole('columnheader')
    expect(headers.length).toBe(4)
    within(headers[0]).getByText('ID')
    within(headers[1]).getByText('Status')
    within(headers[2]).getByText('Duration')
    within(headers[3]).getByText('Workflow ID')

    // check data rows are rendered as expected
    const cellsFromDataRow1 = within(rows[1]).queryAllByRole('cell')
    expect(cellsFromDataRow1.length).toBe(4)
    within(cellsFromDataRow1[0]).getByText('FOO2')
    within(cellsFromDataRow1[1]).getByText('Failed with error(s)')
    within(cellsFromDataRow1[2]).getByText('52 minutes 10 seconds')
    within(cellsFromDataRow1[3]).getByText('b29e84b1-ad1b-4462-a9a0-7ec849bf30a8')
  })

  it('should correctly display a very recently started run', async () => {
    const recentRunsData = {
      runs: [
        {
          run_id: 'b29e84b1-ad1b-4462-a9a0-7ec849bf30a8',
          engine_id: 'b29e84b1-ad1b-4462-a9a0-7ec849bf30a8',
          run_set_id: '0cd15673-7342-4cfa-883d-819660184a16',
          record_id: 'FOO2',
          workflow_url: 'https://xyz.wdl',
          state: 'UNKNOWN',
          workflow_params: '[{\'input_name\':\'wf_hello.hello.addressee\',\'input_type\':{\'type\':\'primitive\',\'primitive_type\':\'String\'},\'source\':{\'type\':\'record_lookup\',\'record_attribute\':\'foo_name\'}}]',
          workflow_outputs: '[]',
          submission_date: new Date().toISOString(),
          last_modified_timestamp: new Date().toISOString(),
          error_messages: []
        }
      ]
    }

    const getRecentRunsMethod = jest.fn(() => Promise.resolve(recentRunsData))
    Ajax.mockImplementation(() => {
      return {
        Cbas: {
          runs: {
            get: getRecentRunsMethod
          }
        }
      }
    })

    // Act
    await act(async () => {
      await render(h(SubmissionDetails))
    })

    const table = screen.getByRole('table')

    // Assert
    expect(table).toHaveAttribute('aria-colcount', '4')
    expect(table).toHaveAttribute('aria-rowcount', '2')

    const rows = within(table).queryAllByRole('row')
    expect(rows.length).toBe(2)

    const headers = within(rows[0]).queryAllByRole('columnheader')
    expect(headers.length).toBe(4)
    within(headers[0]).getByText('ID')
    within(headers[1]).getByText('Status')
    within(headers[2]).getByText('Duration')
    within(headers[3]).getByText('Workflow ID')

    // check data rows are rendered as expected
    const cellsFromDataRow1 = within(rows[1]).queryAllByRole('cell')
    expect(cellsFromDataRow1.length).toBe(4)
    within(cellsFromDataRow1[0]).getByText('FOO2')
    within(cellsFromDataRow1[1]).getByText('Initializing') // Note: not UNKNOWN!
    // << Don't validate duration here since it depends on the test rendering time and is not particularly relevant >>
    within(cellsFromDataRow1[3]).getByText('b29e84b1-ad1b-4462-a9a0-7ec849bf30a8')
  })
})
