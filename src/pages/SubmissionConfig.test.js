import '@testing-library/jest-dom'

import { act, fireEvent, render, screen, within, waitFor } from '@testing-library/react'
import { h } from 'react-hyperscript-helpers'
import { Ajax } from 'src/libs/ajax'
import { SubmissionConfig } from 'src/pages/SubmissionConfig'
import selectEvent from 'react-select-event'



jest.mock('src/libs/ajax')

jest.mock('src/libs/notifications.js')

jest.mock('src/libs/config', () => ({
  ...jest.requireActual('src/libs/config'),
  getConfig: jest.fn().mockReturnValue({})
}))

const runSetResponse = {
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
  }
]

const searchResponse = { 
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

const submissionId = 'e8347247-4738-4ad1-a591-56c119f93f58'

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
    // Arrange
    const mockRunSetResponse = jest.fn(() => Promise.resolve(runSetResponse))
    const mockMethodsResponse = jest.fn(() => Promise.resolve(methodsResponse))
    const mockSearchResponse = jest.fn(() => Promise.resolve(searchResponse))
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

    // Needed: a way to wait for initialization to be done
    
    // don't use "act" unless we see warning spam from the test
    // "act" is a way of telling the test that some async things may be happening
    const { getByTestId, getByLabelText } = render(h(SubmissionConfig))

    await waitFor(() => {
      expect(mockRunSetResponse).toHaveBeenCalledTimes(1)
      expect(mockMethodsResponse).toHaveBeenCalledTimes(1)
      expect(mockTypesResponse).toHaveBeenCalledTimes(1)
      expect(mockSearchResponse).toHaveBeenCalledTimes(1)
    })

    const table = await screen.findByRole('table')
    
    const rows = within(table).queryAllByRole('row')
    expect(rows.length).toBe(5)

    const headers = within(rows[0]).queryAllByRole('columnheader')
    expect(headers.length).toBe(4)

    const cells = within(rows[1]).queryAllByRole('cell')
    expect(cells.length).toBe(4)
  })

  it('should rpopulate the record selector when the dropdown selection changes', async () => {
    // Arrange
    const mockRunSetResponse = jest.fn(() => Promise.resolve(runSetResponse))
    const mockMethodsResponse = jest.fn(() => Promise.resolve(methodsResponse))
    const mockSearchResponse = jest.fn(() => Promise.resolve(searchResponse))
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

    // Needed: a way to wait for initialization to be done
    
    // don't use "act" unless we see warning spam from the test
    // "act" is a way of telling the test that some async things may be happening
    const { getByTestId, getByLabelText } = render(h(SubmissionConfig))


    // render(h(SubmissionConfig))
    // findByText, queryByText, ... (there's a cheat sheet) ... all expect to be awaited. (there is a default timeout)
    const dropdown = await screen.findByRole('combobox')
    
    await act(async () => {
      await selectEvent.select(dropdown, ['FOO'])
    })

    await waitFor(() => {
      expect(mockRunSetResponse).toHaveBeenCalledTimes(1)
      expect(mockMethodsResponse).toHaveBeenCalledTimes(1)
      expect(mockTypesResponse).toHaveBeenCalledTimes(1)
      expect(mockSearchResponse).toHaveBeenCalledTimes(1)
    })

    const table = await screen.findByRole('table')
    
    const rows = within(table).queryAllByRole('row')
    expect(rows.length).toBe(5)

    const headers = within(rows[0]).queryAllByRole('columnheader')
    expect(headers.length).toBe(4)

    const cells = within(rows[1]).queryAllByRole('cell')
    expect(cells.length).toBe(4)
  })
})
