import '@testing-library/jest-dom'

import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { h } from 'react-hyperscript-helpers'
import { Ajax } from 'src/libs/ajax'
import { SubmissionHistory } from 'src/pages/SubmissionHistory'

// Necessary to mock the AJAX module.
jest.mock('src/libs/ajax')

jest.mock('src/libs/notifications.js')

jest.mock('src/libs/config', () => ({
  ...jest.requireActual('src/libs/config'),
  getConfig: jest.fn().mockReturnValue({})
}))

// Note: Since the timestamps in the data is being converted to Local timezone, it returns different time when the tests
//       are run locally and in GitHub action. Hence everywhere in this file we are verifying only the date format for now.
describe('SubmissionHistory page', () => {
  // SubmissionHistory component uses AutoSizer to determine the right size for table to be displayed. As a result we need to
  // mock out the height and width so that when AutoSizer asks for the width and height of "browser" it can use the mocked
  // values and render the component properly. Without this the tests will be break.
  // (see https://github.com/bvaughn/react-virtualized/issues/493 and https://stackoverflow.com/a/62214834)
  const originalOffsetHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetHeight')
  const originalOffsetWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetWidth')

  const runSetData = {
    run_sets: [
      {
        error_count: 0,
        submission_timestamp:    '2022-01-01T12:00:00.000+00:00',
        last_modified_timestamp: '2022-01-02T13:01:01.000+00:00',
        record_type: "FOO",
        run_count: 1,
        run_set_id: 'ea001565-1cd6-4e43-b446-932ac1918081',
        state: 'COMPLETE',
      },
      {
        error_count: 1,
        submission_timestamp:    '2021-07-10T12:00:00.000+00:00',
        last_modified_timestamp: '2021-08-11T13:01:01.000+00:00',
        record_type: "FOO",
        run_count: 2,
        run_set_id: 'b7234aae-6f43-405e-bb3a-71f924e09825',
        state: 'ERROR',
      }
    ]
  }

  beforeAll(() => {
    Object.defineProperty(HTMLElement.prototype, 'offsetHeight', { configurable: true, value: 1000 })
    Object.defineProperty(HTMLElement.prototype, 'offsetWidth', { configurable: true, value: 800 })
  })

  beforeEach(() => {
    const getRunSetsMethod = jest.fn(() => Promise.resolve(runSetData))
    Ajax.mockImplementation(() => {
      return {
        Cbas: {
          runSets: {
            get: getRunSetsMethod // todo: change this to latest API
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

  it('should display no content message when there are no previous runs', async () => {
    // Arrange
    const getRunSetsMethod = jest.fn(() => Promise.resolve([]))
    Ajax.mockImplementation(() => {
      return {
        Cbas: {
          runSets: {
            get: getRunSetsMethod
          }
        }
      }
    })

    // Act
    render(h(SubmissionHistory))

    // Assert
    expect(getRunSetsMethod).toBeCalledTimes(1)

    const table = screen.getByRole('table')
    expect(table).toHaveAttribute('aria-colcount', '6')
    expect(table).toHaveAttribute('aria-rowcount', '1')
    
    const rows = within(table).queryAllByRole('cell')
    within(rows[0]).findByText('Nothing here yet! Your previously run submissions will be displayed here.')
  })

  it('should correctly display previous 2 runs', async () => {
    // Act
    await act(async () => {
      await render(h(SubmissionHistory))
    })

    const table = screen.getByRole('table')

    // Assert
    expect(table).toHaveAttribute('aria-colcount', '6')
    expect(table).toHaveAttribute('aria-rowcount', '3')

    const rows = within(table).queryAllByRole('row')
    expect(rows.length).toBe(3)

    const headers = within(rows[0]).queryAllByRole('columnheader')
    expect(headers.length).toBe(6)
    within(headers[0]).getByText('Actions')
    within(headers[1]).getByText('Submission')
    within(headers[2]).getByText('Status')
    within(headers[3]).getByText('Date Submitted')
    within(headers[4]).getByText('Duration')
    within(headers[5]).getByText('Comment')

    // check data rows are rendered as expected
    const cellsFromDataRow1 = within(rows[1]).queryAllByRole('cell')
    expect(cellsFromDataRow1.length).toBe(6)
    within(cellsFromDataRow1[1]).getByText(/Data used: FOO/) // enclosing slashes indicates a substring
    within(cellsFromDataRow1[1]).getByText(/1 workflows/)
    within(cellsFromDataRow1[2]).getByText(/Success/)
    within(cellsFromDataRow1[3]).getByText(/Jan 1, 2022/)
    within(cellsFromDataRow1[4]).getByText("1 day 1 hour 1 minute 1 second")

    const cellsFromDataRow2 = within(rows[2]).queryAllByRole('cell')
    expect(cellsFromDataRow2.length).toBe(6)
    within(cellsFromDataRow2[1]).getByText(/Data used: FOO/)
    within(cellsFromDataRow2[2]).getByText(/Failed with 1 errors/)
    within(cellsFromDataRow2[3]).getByText(/Jul 10, 2021/)
    within(cellsFromDataRow2[4]).getByText("1 month 1 day 1 hour 1 minute 1 second")
  })

  it('should sort columns properly', async () => {
    // Act - click on sort button on Submitted column to sort submission timestamp by ascending order
    await act(async () => {
      await render(h(SubmissionHistory))
    })

    const table = screen.getByRole('table')
    const rows = within(table).queryAllByRole('row')
    expect(rows.length).toBe(3)

    const headers = within(rows[0]).queryAllByRole('columnheader')
    expect(headers.length).toBe(5)

    await act(async () => {
      await fireEvent.click(within(headers[4]).getByRole('button'))
    })

    // Assert - rows are now sorted by submission timestamp in ascending order
    const cellsFromUpdatedDataRow1 = within(rows[1]).queryAllByRole('cell')
    expect(cellsFromUpdatedDataRow1.length).toBe(5)
    within(cellsFromUpdatedDataRow1[0]).getByText('ea001565-1cd6-4e43-b446-932ac1918081')
    within(cellsFromUpdatedDataRow1[1]).getByText('Submitted')
    within(cellsFromUpdatedDataRow1[2]).getByText(/Jan 28, 2022/)
    within(cellsFromUpdatedDataRow1[4]).getByText(/Jan 27, 2022/)

    const cellsFromUpdatedDataRow2 = within(rows[2]).queryAllByRole('cell')
    expect(cellsFromUpdatedDataRow2.length).toBe(5)
    within(cellsFromUpdatedDataRow2[0]).getByText('b7234aae-6f43-405e-bb3a-71f924e09825')
    within(cellsFromUpdatedDataRow2[1]).getByText('Failed')
    within(cellsFromUpdatedDataRow2[2]).getByText(/Jul 14, 2022/)
    within(cellsFromUpdatedDataRow2[4]).getByText(/Jul 14, 2022/)

    // Act - click on sort button on Status column
    await act(async () => {
      await fireEvent.click(within(headers[1]).getByRole('button'))
    })

    // Assert that sort by Status worked
    const updatedDataRow1Cells = within(rows[1]).queryAllByRole('cell')
    expect(updatedDataRow1Cells.length).toBe(5)
    within(updatedDataRow1Cells[0]).getByText('b7234aae-6f43-405e-bb3a-71f924e09825')
    within(updatedDataRow1Cells[1]).getByText('Failed')
    within(updatedDataRow1Cells[2]).getByText(/Jul 14, 2022/)
    within(updatedDataRow1Cells[4]).getByText(/Jul 14, 2022/)

    const updatedDataRow2Cells = within(rows[2]).queryAllByRole('cell')
    expect(updatedDataRow2Cells.length).toBe(5)
    within(updatedDataRow2Cells[0]).getByText('ea001565-1cd6-4e43-b446-932ac1918081')
    within(updatedDataRow2Cells[1]).getByText('Submitted')
    within(updatedDataRow2Cells[2]).getByText(/Jan 28, 2022/)
    within(updatedDataRow2Cells[4]).getByText(/Jan 27, 2022/)
  })
})
