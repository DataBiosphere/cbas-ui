import '@testing-library/jest-dom'

import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import _ from 'lodash/fp'
import { h } from 'react-hyperscript-helpers'
import InputsTable from 'src/components/InputsTable'
import { runSetInputDef, typesResponse } from 'src/libs/mock-responses'
import { delay } from 'src/libs/utils'


describe('Input table source updates', () => {
  beforeAll(() => {
    Object.defineProperty(HTMLElement.prototype, 'offsetHeight', { configurable: true, value: 1000 })
    Object.defineProperty(HTMLElement.prototype, 'offsetWidth', { configurable: true, value: 800 })
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('Record lookup only shows attributes with matching type', async () => {
    const selectedDataTable = typesResponse[0]
    const configuredInputDefinition = runSetInputDef
    const setConfiguredInputDefinition = jest.fn()
    const inputValidations = _.map(({ input_name: name }) => ({ name, type: 'none' }))(runSetInputDef)

    render(h(InputsTable, {
      selectedDataTable,
      configuredInputDefinition, setConfiguredInputDefinition,
      inputValidations
    }))

    const table = await screen.findByRole('table')
    const rows = within(table).queryAllByRole('row')
    expect(rows.length).toBe(4)
    const cells1 = within(rows[1]).queryAllByRole('cell')
    const cells2 = within(rows[2]).queryAllByRole('cell')

    within(cells1[0]).getByText('foo')
    within(cells1[1]).getByText('foo_rating_workflow_var')
    within(cells1[2]).getByText('Int')
    within(cells1[3]).getByText('Fetch from Data Table')
    const fooRecord = within(cells1[4]).getByText('foo_rating')

    within(cells2[0]).getByText('target_workflow_1')
    within(cells2[1]).getByText('bar_string_workflow_var')
    within(cells2[2]).getByText('String')
    within(cells2[3]).getByText('Fetch from Data Table')
    const barRecord = within(cells2[4]).getByText('bar_string')

    // see what records are available for Int input (foo)
    // foo_rating is the only NUMBER attribute
    await userEvent.click(fooRecord)
    const fooRecordOptions = within(screen.getByRole('listbox')).getAllByText(/[[a-z]|[A-Z]|[0-9]]+/i)
    expect(fooRecordOptions).toHaveLength(1)

    // see what records are available for String input (bar)
    // bar_string and sys_name are STRING attributes, and foo_rating (NUMBER) can be coerced to string
    await userEvent.click(barRecord)
    const barRecordOptions = within(screen.getByRole('listbox')).getAllByText(/[[a-z]|[A-Z]|[0-9]]+/i)
    expect(barRecordOptions).toHaveLength(3)
  })
})


describe('Input table filters', () => {
  beforeAll(() => {
    Object.defineProperty(HTMLElement.prototype, 'offsetHeight', { configurable: true, value: 1000 })
    Object.defineProperty(HTMLElement.prototype, 'offsetWidth', { configurable: true, value: 800 })
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('Searching filters the displayed rows', async () => {
    const selectedDataTable = typesResponse[0]
    const configuredInputDefinition = runSetInputDef
    const setConfiguredInputDefinition = jest.fn()
    const inputValidations = _.map(({ input_name: name }) => ({ name, type: 'none' }))(runSetInputDef)

    render(h(InputsTable, {
      selectedDataTable,
      configuredInputDefinition, setConfiguredInputDefinition,
      inputValidations
    }))

    const table = await screen.findByRole('table')
    const rows = within(table).queryAllByRole('row')
    expect(rows.length).toBe(4)
    const cells1 = within(rows[1]).queryAllByRole('cell')
    const cells2 = within(rows[2]).queryAllByRole('cell')
    const cells3 = within(rows[3]).queryAllByRole('cell')

    within(cells1[0]).getByText('foo')
    within(cells1[1]).getByText('foo_rating_workflow_var')
    within(cells1[2]).getByText('Int')
    within(cells1[3]).getByText('Fetch from Data Table')
    within(cells1[4]).getByText('foo_rating')

    within(cells2[0]).getByText('target_workflow_1')
    within(cells2[1]).getByText('bar_string_workflow_var')
    within(cells2[2]).getByText('String')
    within(cells2[3]).getByText('Fetch from Data Table')
    within(cells2[4]).getByText('bar_string')

    within(cells3[0]).getByText('target_workflow_1')
    within(cells3[1]).getByText('optional_var')
    within(cells3[2]).getByText('String')
    within(cells3[3]).getByText('Type a Value')
    within(cells3[4]).getByDisplayValue('Hello World')

    // search for inputs belonging to target_workflow_1 task (removes foo_rating_workflow_var)
    const searchInput = await screen.getByLabelText('Search inputs')
    await userEvent.type(searchInput, 'target_wor')
    await delay(300) // debounced search

    expect(within(table).queryAllByRole('row').length).toBe(3)

    within(cells1[0]).getByText('target_workflow_1')
    within(cells1[1]).getByText('bar_string_workflow_var')
    within(cells1[2]).getByText('String')
    within(cells1[3]).getByText('Fetch from Data Table')
    within(cells1[4]).getByText('bar_string')

    within(cells2[0]).getByText('target_workflow_1')
    within(cells2[1]).getByText('optional_var')
    within(cells2[2]).getByText('String')
    within(cells2[3]).getByText('Type a Value')
    within(cells2[4]).getByDisplayValue('Hello World')

    // search for inputs with rating in name
    await userEvent.clear(searchInput)
    await userEvent.type(searchInput, 'rating')
    await delay(300) // debounced search

    expect(within(table).queryAllByRole('row').length).toBe(2)

    within(cells1[0]).getByText('foo')
    within(cells1[1]).getByText('foo_rating_workflow_var')
    within(cells1[2]).getByText('Int')
    within(cells1[3]).getByText('Fetch from Data Table')
    within(cells1[4]).getByText('foo_rating')
  })
})
