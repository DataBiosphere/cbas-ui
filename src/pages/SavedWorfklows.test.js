import '@testing-library/jest-dom'

import { fireEvent, render, screen, within } from '@testing-library/react'
import { h } from 'react-hyperscript-helpers'
import { SavedWorkflows } from 'src/pages/SavedWorkflows'


// Note: Since the timestamps in the data is being converted to Local timezone, it returns different time when the tests
//       are run locally and in GitHub action. Hence everywhere in this file we are verifying only the date format for now.
describe('Saved Workflows component', () => {
  // SavedWorkflows component uses AutoSizer to determine the right size for table to be displayed. As a result we need to
  // mock out the height and width so that when AutoSizer asks for the width and height of "browser" it can use the mocked
  // values and render the component properly. Without this the tests will be break.
  // (see https://github.com/bvaughn/react-virtualized/issues/493 and https://stackoverflow.com/a/62214834)
  const originalOffsetHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetHeight')
  const originalOffsetWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetWidth')

  const runsData = [
    {
      run_id: 'ea001565-1cd6-4e43-b446-932ac1918081',
      state: 'Submitted',
      submission_date: '2022-01-27T22:27:15.591Z',
      workflow_url: 'https://abc.wdl',
      workflow_params: '[{"parameter_name":"workflow_input_foo","parameter_type":"String","source":{"type":"literal","entity_attribute":"helloworld"}},{"parameter_name":"workflow_input_foo_rating","parameter_type":"Int","source":{"type":"entity_lookup","entity_attribute":"entity_field_foo_rating"}}]'
    },
    {
      run_id: 'b7234aae-6f43-405e-bb3a-71f924e09825',
      state: 'Failed',
      submission_date: '2022-07-14T22:22:15.591Z',
      workflow_url: 'https://xyz.wdl',
      workflow_params: '[{"parameter_name":"workflow_input_foo","parameter_type":"String","source":{"type":"literal","entity_attribute":"helloworld"}},{"parameter_name":"workflow_input_foo_rating","parameter_type":"Int","source":{"type":"entity_lookup","entity_attribute":"entity_field_foo_rating"}}]'
    }
  ]

  beforeAll(() => {
    Object.defineProperty(HTMLElement.prototype, 'offsetHeight', { configurable: true, value: 1000 })
    Object.defineProperty(HTMLElement.prototype, 'offsetWidth', { configurable: true, value: 800 })
  })

  afterAll(() => {
    Object.defineProperty(HTMLElement.prototype, 'offsetHeight', originalOffsetHeight)
    Object.defineProperty(HTMLElement.prototype, 'offsetWidth', originalOffsetWidth)
  })

  it('should display standard message when there are no saved workflows', () => {
    // Arrange
    // mock out variables we don't care about in this test
    const setWorkflowUrl = jest.fn()
    const setShowInputsPage = jest.fn()

    const runsData = []

    // Act
    render(h(SavedWorkflows, { runsData, setWorkflowUrl, setShowInputsPage }))
    const table = screen.getByRole('table')

    // Assert
    expect(table).toHaveAttribute('aria-colcount', '3')
    expect(table).toHaveAttribute('aria-rowcount', '1')

    // check that noContentMessage shows up as expected
    screen.getByText('Nothing here yet! Your previously run workflows will be saved here.')
  })

  it('should properly display 2 saved workflows', () => {
    // Arrange
    // mock out variables we don't care about in this test
    const setWorkflowUrl = jest.fn()
    const setShowInputsPage = jest.fn()

    // Act
    render(h(SavedWorkflows, { runsData, setWorkflowUrl, setShowInputsPage }))
    const table = screen.getByRole('table')

    // Assert
    expect(table).toHaveAttribute('aria-colcount', '3')
    expect(table).toHaveAttribute('aria-rowcount', '3')

    const rows = within(table).queryAllByRole('row')
    expect(rows.length).toBe(3)

    // check that header row is rendered as expected
    const headers = within(rows[0]).queryAllByRole('columnheader')
    expect(headers.length).toBe(3)
    within(headers[0]).getByText('Workflow Link')
    within(headers[1]).getByText('Last Run')

    // check that first data row is rendered as expected (data should be sorted by submission timestamp in desc order)
    const cellsFromDataRow1 = within(rows[1]).queryAllByRole('cell')
    expect(cellsFromDataRow1.length).toBe(3)
    within(cellsFromDataRow1[0]).getByText('https://xyz.wdl')
    within(cellsFromDataRow1[1]).getByText(/Jul 14, 2022/)

    // check that second data row is rendered as expected
    const cellsFromDataRow2 = within(rows[2]).queryAllByRole('cell')
    expect(cellsFromDataRow2.length).toBe(3)
    within(cellsFromDataRow2[0]).getByText('https://abc.wdl')
    within(cellsFromDataRow2[1]).getByText(/Jan 27, 2022/)
  })

  it('should update workflowUrl and display inputs page when button is clicked', () => {
    // Arrange
    // mock out variables we don't care about in this test
    const setWorkflowUrl = jest.fn()
    const setShowInputsPage = jest.fn()

    // Act
    render(h(SavedWorkflows, { runsData, setWorkflowUrl, setShowInputsPage }))

    const table = screen.getByRole('table')
    const rows = within(table).queryAllByRole('row')
    expect(rows.length).toBe(3)

    // click 'Use Workflow' button on first data row in table
    const cellsFromDataRow1 = within(rows[1]).queryAllByRole('cell')
    fireEvent.click(within(cellsFromDataRow1[2]).getByText('Use Workflow'))

    // Assert
    // check that upon clicking 'Use Workflow' button the workflow URL in the row should be selected and the inputs page should be displayed
    expect(setShowInputsPage).toHaveBeenCalledTimes(1)
    expect(setShowInputsPage).toHaveBeenCalledWith(true)
    expect(setWorkflowUrl).toHaveBeenCalledTimes(1)
    expect(setWorkflowUrl).toHaveBeenCalledWith('https://xyz.wdl')
  })

  it('should be able to sort rows', () => {
    // Arrange
    // mock out variables we don't care about in this test
    const setWorkflowUrl = jest.fn()
    const setShowInputsPage = jest.fn()

    // Act
    render(h(SavedWorkflows, { runsData, setWorkflowUrl, setShowInputsPage }))

    const table = screen.getByRole('table')
    const rows = within(table).queryAllByRole('row')
    expect(rows.length).toBe(3)

    // Assert - rows are sorted by submission timestamp in descending order
    const cellsFromDataRow1 = within(rows[1]).queryAllByRole('cell')
    within(cellsFromDataRow1[0]).getByText('https://xyz.wdl')
    within(cellsFromDataRow1[1]).getByText(/Jul 14, 2022/)

    const cellsFromDataRow2 = within(rows[2]).queryAllByRole('cell')
    within(cellsFromDataRow2[0]).getByText('https://abc.wdl')
    within(cellsFromDataRow2[1]).getByText(/Jan 27, 2022/)

    // Act - click on sort button on Last Run column to sort submission timestamp by ascending order
    const headers = within(rows[0]).queryAllByRole('columnheader')
    expect(headers.length).toBe(3)
    fireEvent.click(within(headers[1]).getByRole('button'))

    // Assert - rows are now sorted by submission timestamp in ascending order
    const cellsFromUpdatedDataRow1 = within(rows[1]).queryAllByRole('cell')
    within(cellsFromUpdatedDataRow1[0]).getByText('https://abc.wdl')
    within(cellsFromUpdatedDataRow1[1]).getByText(/Jan 27, 2022/)

    const cellsFromUpdatedDataRow2 = within(rows[2]).queryAllByRole('cell')
    within(cellsFromUpdatedDataRow2[0]).getByText('https://xyz.wdl')
    within(cellsFromUpdatedDataRow2[1]).getByText(/Jul 14, 2022/)
  })
})
