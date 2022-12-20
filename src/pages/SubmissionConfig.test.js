import '@testing-library/jest-dom'

import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { h } from 'react-hyperscript-helpers'
import selectEvent from 'react-select-event'
import { Ajax } from 'src/libs/ajax'
import { SubmissionConfig } from 'src/pages/SubmissionConfig'


jest.mock('src/libs/ajax')

jest.mock('src/libs/notifications.js')

jest.mock('src/libs/config', () => ({
  ...jest.requireActual('src/libs/config'),
  getConfig: jest.fn().mockReturnValue({})
}))

const runSetResponse = {
  run_sets: [
    {
      run_set_id: '10000000-0000-0000-0000-000000000001',
      method_id: '00000000-0000-0000-0000-000000000001',
      is_template: true,
      run_set_name: 'Target workflow 1, run 1',
      run_set_description: 'Example run for target workflow 1',
      state: 'COMPLETE',
      record_type: 'FOO',
      submission_timestamp: '2022-12-07T17:26:53.153+00:00',
      last_modified_timestamp: '2022-12-07T17:26:53.153+00:00',
      run_count: 1,
      error_count: 0,
      input_definition: '[\n  {\n    "input_name": "target_workflow_1.foo.input_file_1",\n    "input_type": { "type": "primitive", "primitive_type": "File" },\n    "source": {\n      "type": "record_lookup",\n      "record_attribute": "target_workflow_1_input_file_1"\n    }\n  },\n  {\n    "input_name": "target_workflow_1.foo.input_file_2",\n    "input_type": { "type": "primitive", "primitive_type": "File" },\n    "source": {\n      "type": "record_lookup",\n      "record_attribute": "target_workflow_1_input_file_2"\n    }\n  },\n  {\n    "input_name": "target_workflow_1.foo.input_string_1",\n    "input_type": { "type": "primitive", "primitive_type": "String" },\n    "source": {\n      "type": "record_lookup",\n      "record_attribute": "target_workflow_1_input_string_1"\n    }\n  },\n  {\n    "input_name": "target_workflow_1.foo.input_string_2",\n    "input_type": { "type": "primitive", "primitive_type": "String" },\n    "source": {\n      "type": "record_lookup",\n      "record_attribute": "target_workflow_1_input_string_2"\n    }\n  },\n  {\n    "input_name": "target_workflow_1.foo.input_string_3",\n    "input_type": { "type": "optional", "optional_type": { "type": "primitive", "primitive_type": "String" } },\n    "source": {\n      "type": "record_lookup",\n      "record_attribute": "target_workflow_1_input_string_3"\n    }\n  },\n  {\n    "input_name": "target_workflow_1.foo.input_string_4",\n    "input_type": { "type": "primitive", "primitive_type": "String" },\n    "source": {\n      "type": "record_lookup",\n      "record_attribute": "target_workflow_1_input_string_4"\n    }\n  },\n  {\n    "input_name": "target_workflow_1.foo.input_string_5",\n    "input_type": { "type": "primitive", "primitive_type": "String" },\n    "source": {\n      "type": "record_lookup",\n      "record_attribute": "target_workflow_1_input_string_5"\n    }\n  },\n  {\n    "input_name": "target_workflow_1.foo.input_string_6",\n    "input_type": { "type": "primitive", "primitive_type": "String" },\n    "source": {\n      "type": "record_lookup",\n      "record_attribute": "target_workflow_1_input_string_6"\n    }\n  },\n  {\n    "input_name": "target_workflow_1.foo.input_string_7",\n    "input_type": { "type": "primitive", "primitive_type": "String" },\n    "source": {\n      "type": "record_lookup",\n      "record_attribute": "target_workflow_1_input_string_7"\n    }\n  }\n]\n',
      output_definition: '[\n  {\n    "output_name": "target_workflow_1.file_output",\n    "output_type": { "type": "primitive", "primitive_type": "String" },\n    "record_attribute": "target_workflow_1_file_output"\n  }\n]\n'
    }
  ]
}

const methodsResponse = {
  methods: [
    {
      method_id: '00000000-0000-0000-0000-000000000001',
      name: 'Target Workflow 1',
      description: 'Target Workflow 1',
      source: 'Github',
      source_url: 'https://raw.githubusercontent.com/DataBiosphere/cbas/main/useful_workflows/target_workflow_1/target_workflow_1.wdl',
      created: '2022-12-07T17:26:53.131+00:00'
    }
  ]
}

const typesResponse = [
  {
    name: 'FOO',
    attributes: [
      {
        name: 'foo_rating',
        datatype: 'NUMBER'
      },
      {
        name: 'sys_name',
        datatype: 'STRING'
      }
    ],
    count: 4,
    primaryKey: 'sys_name'
  },
  {
    name: 'BAR',
    attributes: [
      {
        name: 'bar_rating',
        datatype: 'NUMBER'
      },
      {
        name: 'sys_name',
        datatype: 'STRING'
      }
    ],
    count: 4,
    primaryKey: 'sys_name'
  }
]

const searchResponseFOO = {
  searchRequest: {
    limit: 10,
    offset: 0,
    sort: 'ASC',
    sortAttribute: null
  },
  records: [
    {
      id: 'FOO1', type: 'FOO', attributes: { sys_name: 'FOO1', foo_rating: 1000 }
    },
    {
      id: 'FOO2', type: 'FOO', attributes: { sys_name: 'FOO2', foo_rating: 999 }
    },
    {
      id: 'FOO3', type: 'FOO', attributes: { sys_name: 'FOO3', foo_rating: 85 }
    },
    {
      id: 'FOO4', type: 'FOO', attributes: { sys_name: 'FOO4', foo_rating: 30 }
    }
  ],
  totalRecords: 4
}

const searchResponseBAR = {
  searchRequest: {
    limit: 10,
    offset: 0,
    sort: 'ASC',
    sortAttribute: null
  },
  records: [
    {
      id: 'BAR1', type: 'BAR', attributes: { sys_name: 'BAR1', bar_rating: 1000 }
    },
    {
      id: 'BAR2', type: 'BAR', attributes: { sys_name: 'BAR2', bar_rating: 999 }
    }
  ],
  totalRecords: 2
}

const searchResponses = {
  FOO: searchResponseFOO,
  BAR: searchResponseBAR
}

describe('SubmissionConfig records selector', () => {
  // SubmissionConfig component uses AutoSizer to determine the right size for table to be displayed. As a result we need to
  // mock out the height and width so that when AutoSizer asks for the width and height of "browser" it can use the mocked
  // values and render the component properly. Without this the tests will be break.
  // (see https://github.com/bvaughn/react-virtualized/issues/493 and https://stackoverflow.com/a/62214834)
  const originalOffsetHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetHeight')
  const originalOffsetWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetWidth')

  beforeAll(() => {
    Object.defineProperty(HTMLElement.prototype, 'offsetHeight', { configurable: true, value: 1000 })
    Object.defineProperty(HTMLElement.prototype, 'offsetWidth', { configurable: true, value: 800 })
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  afterAll(() => {
    Object.defineProperty(HTMLElement.prototype, 'offsetHeight', originalOffsetHeight)
    Object.defineProperty(HTMLElement.prototype, 'offsetWidth', originalOffsetWidth)
  })

  it('should initially populate the record selector with records determined by the previously executed run set', async () => {
    // ** ARRANGE **
    const mockRunSetResponse = jest.fn(() => Promise.resolve(runSetResponse))
    const mockMethodsResponse = jest.fn(() => Promise.resolve(methodsResponse))
    const mockSearchResponse = jest.fn(recordType => Promise.resolve(searchResponses[recordType]))
    const mockTypesResponse = jest.fn(() => Promise.resolve(typesResponse))

    await Ajax.mockImplementation(() => {
      return {
        Cbas: {
          runSets: {
            getForMethod: mockRunSetResponse
          },
          methods: {
            get: mockMethodsResponse
          }
        },
        Wds: {
          search: {
            post: mockSearchResponse
          },
          types: {
            get: mockTypesResponse
          }
        }
      }
    })

    // ** ACT **
    render(h(SubmissionConfig))

    // ** ASSERT **
    await waitFor(() => {
      expect(mockRunSetResponse).toHaveBeenCalledTimes(1)
      expect(mockMethodsResponse).toHaveBeenCalledTimes(1)
      expect(mockTypesResponse).toHaveBeenCalledTimes(1)
      expect(mockSearchResponse).toHaveBeenCalledTimes(0)
    })
    const table = await screen.findByRole('table')

    // after the initial render (not before), records data should have been retrieved once
    await waitFor(() => {
      expect(mockSearchResponse).toHaveBeenCalledTimes(1)
    })

    const rows = within(table).queryAllByRole('row')
    expect(rows.length).toBe(5)

    const headers = within(rows[0]).queryAllByRole('columnheader')
    expect(headers.length).toBe(4)

    const cells = within(rows[1]).queryAllByRole('cell')
    expect(cells.length).toBe(4)
  })
  it('should repopulate the record selector when the dropdown selection changes', async () => {
    // ** ARRANGE **
    const mockRunSetResponse = jest.fn(() => Promise.resolve(runSetResponse))
    const mockMethodsResponse = jest.fn(() => Promise.resolve(methodsResponse))
    const mockSearchResponse = jest.fn(recordType => Promise.resolve(searchResponses[recordType]))
    const mockTypesResponse = jest.fn(() => Promise.resolve(typesResponse))

    await Ajax.mockImplementation(() => {
      return {
        Cbas: {
          runSets: {
            getForMethod: mockRunSetResponse
          },
          methods: {
            get: mockMethodsResponse
          }
        },
        Wds: {
          search: {
            post: mockSearchResponse
          },
          types: {
            get: mockTypesResponse
          }
        }
      }
    })

    // ** ACT **
    render(h(SubmissionConfig))

    // ** ASSERT **
    await waitFor(() => {
      expect(mockRunSetResponse).toHaveBeenCalledTimes(1)
      expect(mockMethodsResponse).toHaveBeenCalledTimes(1)
      expect(mockTypesResponse).toHaveBeenCalledTimes(1)
      expect(mockSearchResponse).toHaveBeenCalledTimes(0)
    })
    const table = await screen.findByRole('table')
    // after the initial render (not before), records data should have been retrieved once
    await waitFor(() => {
      expect(mockSearchResponse).toHaveBeenCalledTimes(1)
    })

    // ** ACT **
    const dropdown = await screen.findByRole('combobox')
    await act(async () => {
      await selectEvent.select(dropdown, ['BAR'])
    })

    // ** ASSERT **
    // selecting a dropdown option should trigger a re-render, and a second call to records data
    await waitFor(() => {
      expect(mockSearchResponse).toHaveBeenCalledTimes(2)
    })
    const rowsBAR = within(table).queryAllByRole('row')
    expect(rowsBAR.length).toBe(3)
    const headers = within(rowsBAR[0]).queryAllByRole('columnheader')
    expect(headers.length).toBe(4)
    const cells = within(rowsBAR[1]).queryAllByRole('cell')
    expect(cells.length).toBe(4)

    // ** ACT **
    await act(async () => {
      await selectEvent.select(dropdown, ['FOO'])
    })

    // ** ASSERT **
    // selecting a dropdown option should (again) trigger a re-render, and a third call to records data
    await waitFor(() => {
      expect(mockSearchResponse).toHaveBeenCalledTimes(3)
    })
    const rowsFOO = within(table).queryAllByRole('row')
    expect(rowsFOO.length).toBe(5)
  })

  it('should display modal when Submit button is clicked', async () => {
    const mockRunSetResponse = jest.fn(() => Promise.resolve(runSetResponse))
    const mockMethodsResponse = jest.fn(() => Promise.resolve(methodsResponse))
    const mockSearchResponse = jest.fn(recordType => Promise.resolve(searchResponses[recordType]))
    const mockTypesResponse = jest.fn(() => Promise.resolve(typesResponse))

    await Ajax.mockImplementation(() => {
      return {
        Cbas: {
          runSets: {
            getForMethod: mockRunSetResponse
          },
          methods: {
            get: mockMethodsResponse
          }
        },
        Wds: {
          search: {
            post: mockSearchResponse
          },
          types: {
            get: mockTypesResponse
          }
        }
      }
    })

    render(h(SubmissionConfig))

    await waitFor(() => {
      expect(mockRunSetResponse).toHaveBeenCalledTimes(1)
    })

    const button = screen.getByLabelText('Submit button')
    fireEvent.click(button)
    await screen.getByText('Send submission')
  })
})
