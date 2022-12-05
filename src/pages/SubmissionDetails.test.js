import '@testing-library/jest-dom'

import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { h } from 'react-hyperscript-helpers'
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
  // mock out the height and width so that when AutoSizer asks for the width and height of "browser" it can use the mocked
  // values and render the component properly. Without this the tests will be break.
  // (see https://github.com/bvaughn/react-virtualized/issues/493 and https://stackoverflow.com/a/62214834)
  const originalOffsetHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetHeight')
  const originalOffsetWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetWidth')

  const runsData = {
    runs: [
      {
        run_id: 'ea001565-1cd6-4e43-b446-932ac1918081',
        record_id: '00000000-0000-0000-0000-000000000001',
        state: 'COMPLETE',
        submission_date: '2022-11-23 15:03:28.202094',
        workflow_url: 'https://abc.wdl',
        last_modified_timestamp: '2022-11-23 15:04:15.359591',
        workflow_params: '[{"parameter_name":"workflow_input_foo","parameter_type":"String","source":{"type":"literal","entity_attribute":"helloworld"}},{"parameter_name":"workflow_input_foo_rating","parameter_type":"Int","source":{"type":"entity_lookup","entity_attribute":"entity_field_foo_rating"}}]'
      },
      {
        run_id: 'b7234aae-6f43-405e-bb3a-71f924e09825',
        record_id: '00000000-0000-0000-0000-000000000002',
        state: 'SYSTEM_ERROR',
        submission_date: '2022-07-14T22:22:15.591Z',
        workflow_url: 'https://xyz.wdl',
        last_modified_timestamp: '2022-07-14T23:14:25.791Z',
        workflow_params: '[{"parameter_name":"workflow_input_foo","parameter_type":"String","source":{"type":"literal","entity_attribute":"helloworld"}},{"parameter_name":"workflow_input_foo_rating","parameter_type":"Int","source":{"type":"entity_lookup","entity_attribute":"entity_field_foo_rating"}}]'
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
    // Act
    await act(async () => {
      await render(h(SubmissionDetails))
    })

    const table = screen.getByRole('table')

    // Assert
    expect(table).toHaveAttribute('aria-colcount', '7')
    expect(table).toHaveAttribute('aria-rowcount', '3')

    const rows = within(table).queryAllByRole('row')
    expect(rows.length).toBe(3)

    const headers = within(rows[0]).queryAllByRole('columnheader')
    expect(headers.length).toBe(7)
    within(headers[0]).getByText('Record Entry')
    within(headers[1]).getByText('Engine Details')
    within(headers[2]).getByText('Status')
    within(headers[3]).getByText('Submission date')
    within(headers[4]).getByText('Duration')
    within(headers[5]).getByText('Data')
    within(headers[6]).getByText('Logs')


    const cellsFromDataRow2 = within(rows[1]).queryAllByRole('cell')
    expect(cellsFromDataRow2.length).toBe(7)
    within(cellsFromDataRow2[0]).getByText('00000000-0000-0000-0000-000000000001')
    within(cellsFromDataRow2[1]).getByText('Workflow Dashboard')
    within(cellsFromDataRow2[2]).getByText('COMPLETE')
    within(cellsFromDataRow2[3]).getByText('Nov 23, 2022, 3:03 PM')
    within(cellsFromDataRow2[4]).getByText('47 seconds')
    within(cellsFromDataRow2[5]).getByText('View inputs')
    within(cellsFromDataRow2[6]).getByText('View workflow log file')

    // check data rows are rendered as expected
    const cellsFromDataRow1 = within(rows[2]).queryAllByRole('cell')
    expect(cellsFromDataRow1.length).toBe(7)
    within(cellsFromDataRow1[0]).getByText('00000000-0000-0000-0000-000000000002')
    within(cellsFromDataRow1[1]).getByText('Workflow Dashboard')
    within(cellsFromDataRow1[2]).getByText('Failed with error')
    within(cellsFromDataRow1[3]).getByText(/Jul 14, 2022/)
    within(cellsFromDataRow1[4]).getByText('52 minutes 10 seconds')
    within(cellsFromDataRow1[5]).getByText('View inputs')
    within(cellsFromDataRow1[6]).getByText('View workflow log file')
  })


  it('should sort columns properly', async () => {
    // Act - click on sort button on Submitted column to sort submission timestamp by ascending order
    await act(async () => {
      await render(h(SubmissionDetails))
    })

    const table = screen.getByRole('table')
    const rows = within(table).queryAllByRole('row')
    expect(rows.length).toBe(3)
    const headers = within(rows[0]).queryAllByRole('columnheader')

    // Columns sorted by in this test:
    within(headers[3]).getByText('Submission date')
    within(headers[2]).getByText('Status')

    // Make sure column with index 3 is still submission date:
    await act(async () => {
      await fireEvent.click(within(headers[3]).getByRole('button'))
    })

    // Assert - rows are now sorted by submission timestamp in ascending order
    const cellsFromUpdatedDataRow1 = within(rows[2]).queryAllByRole('cell')
    expect(cellsFromUpdatedDataRow1.length).toBe(7)
    within(cellsFromUpdatedDataRow1[0]).getByText('00000000-0000-0000-0000-000000000001')

    const cellsFromUpdatedDataRow2 = within(rows[1]).queryAllByRole('cell')
    expect(cellsFromUpdatedDataRow2.length).toBe(7)
    within(cellsFromUpdatedDataRow2[0]).getByText('00000000-0000-0000-0000-000000000002')

    // Act - click on sort button on Status column
    await act(async () => {
      await fireEvent.click(within(headers[2]).getByRole('button'))
    })

    // Assert that sort by Status worked
    const updatedDataRow1Cells = within(rows[2]).queryAllByRole('cell')
    expect(updatedDataRow1Cells.length).toBe(7)
    within(updatedDataRow1Cells[0]).getByText('00000000-0000-0000-0000-000000000002')

    const updatedDataRow2Cells = within(rows[1]).queryAllByRole('cell')
    expect(updatedDataRow2Cells.length).toBe(7)
    within(updatedDataRow2Cells[0]).getByText('00000000-0000-0000-0000-000000000001')
  })

  it('display run set id', async () => {
    // Act
    await act(async () => {
      await render(h(SubmissionDetails, { submissionId }))
    })

    await screen.getByText(/Submission e8347247-4738-4ad1-a591-56c119f93f58/)
  })
})
