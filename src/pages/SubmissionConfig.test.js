import '@testing-library/jest-dom'

import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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

const runSetInputDef = [
  {
    input_name: 'target_workflow_1.foo.foo_rating_workflow_var',
    input_type: { type: 'primitive', primitive_type: 'Int' },
    source: {
      type: 'record_lookup',
      record_attribute: 'foo_rating'
    }
  },
  {
    input_name: 'target_workflow_1.bar_string_workflow_var',
    input_type: { type: 'primitive', primitive_type: 'String' },
    source: {
      type: 'record_lookup',
      record_attribute: 'bar_string'
    }
  }
]

const runSetOutputDef = [
  {
    output_name: 'target_workflow_1.file_output',
    output_type: { type: 'primitive', primitive_type: 'File' },
    destination: {
      type: 'record_update',
      record_attribute: 'target_workflow_1_file_output'
    }
  },
  {
    output_name: 'target_workflow_1.unused_output',
    output_type: { type: 'primitive', primitive_type: 'String' },
    destination: {
      type: 'none'
    }
  }
]

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
      input_definition: JSON.stringify(runSetInputDef),
      output_definition: JSON.stringify(runSetOutputDef)
    }
  ]
}

const badRecordTypeRunSetResponse = {
  run_sets: [
    {
      run_set_id: '20000000-0000-0000-0000-000000000002',
      method_id: '00000000-0000-0000-0000-000000000002',
      method_version_id: '50000000-0000-0000-0000-000000000005',
      is_template: true,
      run_set_name: 'Target workflow 2, run 1',
      run_set_description: 'Example run for target workflow 2',
      state: 'COMPLETE',
      record_type: 'BADFOO',
      submission_timestamp: '2022-12-07T17:26:53.153+00:00',
      last_modified_timestamp: '2022-12-07T17:26:53.153+00:00',
      run_count: 1,
      error_count: 0,
      input_definition: JSON.stringify(runSetInputDef),
      output_definition: JSON.stringify(runSetOutputDef)
    }
  ]
}

const methodsResponse = {
  methods: [
    {
      method_id: '00000000-0000-0000-0000-000000000002',
      name: 'Target Workflow 2',
      description: 'Target Workflow 2',
      source: 'Github',
      source_url: 'https://raw.githubusercontent.com/DataBiosphere/cbas/main/useful_workflows/target_workflow_2/target_workflow_2.wdl',
      method_versions: [
        {
          method_version_id: '50000000-0000-0000-0000-000000000005',
          method_id: '00000000-0000-0000-0000-000000000002',
          name: '1.0',
          description: 'method description',
          created: '2023-01-26T19:45:50.419Z',
          url: 'https://raw.githubusercontent.com/DataBiosphere/cbas/main/useful_workflows/target_workflow_2/target_workflow_2.wdl',
          last_run: {
            previously_run: true,
            timestamp: '2023-01-26T19:45:50.419Z',
            run_set_id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
            method_version_id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
            method_version_name: 'string'
          }
        }
      ],
      created: '2022-12-07T17:26:53.131+00:00',
      last_run: {
        run_previously: false
      }
    },
    {
      method_id: '00000000-0000-0000-0000-000000000001',
      name: 'Target Workflow 1',
      description: 'Target Workflow 1',
      source: 'Github',
      source_url: 'https://raw.githubusercontent.com/DataBiosphere/cbas/main/useful_workflows/target_workflow_1/target_workflow_1.wdl',
      created: '2022-12-07T17:26:53.131+00:00',
      last_run: {
        run_previously: false
      }
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
        name: 'bar_string',
        datatype: 'STRING'
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

const typesResponseWithoutFooRating = [
  {
    name: 'FOO',
    attributes: [
      {
        name: 'rating_for_foo',
        datatype: 'NUMBER'
      },
      {
        name: 'bar_string',
        datatype: 'STRING'
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
            getById: mockMethodsResponse
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
      expect(mockTypesResponse).toHaveBeenCalledTimes(1)
      expect(mockMethodsResponse).toHaveBeenCalledTimes(0)
      expect(mockSearchResponse).toHaveBeenCalledTimes(0)
    })
    const table = await screen.findByRole('table')

    // after the initial render (not before), records data should have been retrieved once
    await waitFor(() => {
      expect(mockSearchResponse).toHaveBeenCalledTimes(1)
      expect(mockMethodsResponse).toHaveBeenCalledTimes(1)
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
            getById: mockMethodsResponse
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
      expect(mockTypesResponse).toHaveBeenCalledTimes(1)
      expect(mockMethodsResponse).toHaveBeenCalledTimes(0)
      expect(mockSearchResponse).toHaveBeenCalledTimes(0)
    })
    const table = await screen.findByRole('table')
    // after the initial render (not before), records data should have been retrieved once
    await waitFor(() => {
      expect(mockSearchResponse).toHaveBeenCalledTimes(1)
      expect(mockMethodsResponse).toHaveBeenCalledTimes(1)
    })

    // ** ACT **
    const dropdown = await screen.findByLabelText('Select a data table')
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

  it('should resize the columns and new widths should be preserved when data table selection changes within given workflow', async () => {
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
            getById: mockMethodsResponse
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
      expect(mockTypesResponse).toHaveBeenCalledTimes(1)
      expect(mockMethodsResponse).toHaveBeenCalledTimes(1)
      expect(mockSearchResponse).toHaveBeenCalledTimes(1)
    })
    const table = await screen.findByRole('table')

    const fooRows1 = within(table).queryAllByRole('row')
    expect(fooRows1.length).toBe(5)

    const fooHeaders1 = within(fooRows1[0]).queryAllByRole('columnheader')
    expect(fooHeaders1.length).toBe(4)
    within(fooHeaders1[1]).getByText('ID')
    expect(getComputedStyle(fooHeaders1[1]).width).toBe('300px') // initial column width

    // ** ACT **
    // simulate user resizing the column 'ID' for data table 'FOO'
    const fooDraggableIcon = fooHeaders1[1].querySelector("[data-icon='columnGrabber']")
    fireEvent.mouseDown(fooDraggableIcon)
    fireEvent.mouseMove(fooDraggableIcon, { clientX: 200, clientY: 0 }) // user moves the icon 200px to right
    fireEvent.mouseUp(fooDraggableIcon)

    // ** ASSERT **
    // new width of column 'ID' for data table 'FOO' should be 500
    expect(getComputedStyle(fooHeaders1[1]).width).toBe('500px')

    // ** ACT **
    // Change Data Table to 'BAR'
    const dropdown1 = await screen.findByLabelText('Select a data table')
    await act(async () => {
      await selectEvent.select(dropdown1, ['BAR'])
    })

    // ** ASSERT **
    const barRows = within(table).queryAllByRole('row')
    expect(barRows.length).toBe(3)
    const barHeaders = within(barRows[0]).queryAllByRole('columnheader')
    expect(barHeaders.length).toBe(4)
    within(barHeaders[1]).getByText('ID')
    // even though both 'FOO' and 'BAR' data tables have 'ID' columns their widths can be different
    expect(getComputedStyle(barHeaders[1]).width).toBe('300px') // initial column width

    // ** ACT **
    // simulate user resizing the column 'ID' for data table 'BAR'
    const barDraggableIcon = barHeaders[1].querySelector("[data-icon='columnGrabber']")
    fireEvent.mouseDown(barDraggableIcon)
    fireEvent.mouseMove(barDraggableIcon, { clientX: 50, clientY: 0 }) // user moves the icon 50px to right
    fireEvent.mouseUp(barDraggableIcon)

    // ** ASSERT **
    // new width of column 'ID' for data table 'BAR' should be 350
    expect(getComputedStyle(barHeaders[1]).width).toBe('350px')

    // ** ACT **
    // Change Data Table back to 'FOO'
    const dropdown2 = await screen.findByLabelText('Select a data table')
    await act(async () => {
      await selectEvent.select(dropdown2, ['FOO'])
    })

    // ** ASSERT **
    // verify that the width of column 'ID' has been preserved from previous resizing
    const fooRows2 = within(table).queryAllByRole('row')
    const fooHeaders2 = within(fooRows2[0]).queryAllByRole('columnheader')
    expect(getComputedStyle(fooHeaders2[1]).width).toBe('500px')
  })

  it('when records are selected, should display modal when Submit button is clicked', async () => {
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
            getById: mockMethodsResponse
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

    const checkboxes = screen.getAllByRole('checkbox')
    const checkbox = checkboxes[1]
    fireEvent.click(checkbox)
    expect(checkbox).toHaveAttribute('aria-checked', 'true')

    const button = screen.getByLabelText('Submit button')
    fireEvent.click(button)
    await screen.getByText('Send submission')
  })

  it('clear selected records when data type is changed', async () => {
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
            getById: mockMethodsResponse
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

    const checkboxes = screen.getAllByRole('checkbox')
    const checkbox = checkboxes[1]
    fireEvent.click(checkbox)
    expect(checkbox).toHaveAttribute('aria-checked', 'true')

    const button = screen.getByLabelText('Submit button')
    expect(button).toHaveAttribute('aria-disabled', 'false')
    expect(button).not.toHaveAttribute('disabled')
    expect(screen.queryByText('No records selected')).toBeNull()

    // Change the selected data types
    const dropdown1 = await screen.findByLabelText('Select a data table')
    await act(async () => {
      await selectEvent.select(dropdown1, ['BAR'])
    })

    const checkboxesAfterRecordTypeChange = screen.getAllByRole('checkbox')
    for (const checkboxesAfterRecordTypeChangeKey in checkboxesAfterRecordTypeChange) {
      const checkboxAfterRecordTypeChange = checkboxesAfterRecordTypeChange[checkboxesAfterRecordTypeChangeKey]
      expect(checkboxAfterRecordTypeChange).not.toBeChecked()
    }

    const buttonAfterRecordTypeChange = screen.getByLabelText('Submit button')
    await waitFor(() => {
      expect(buttonAfterRecordTypeChange).toHaveAttribute('aria-disabled', 'true')
      expect(buttonAfterRecordTypeChange).toHaveAttribute('disabled')
      expect(screen.queryByText('No records selected')).not.toBeNull()
    }, { 'timeout': 3000 })

    // Change the selected data type back
    await act(async () => {
      await selectEvent.select(dropdown1, ['FOO'])
    })

    const checkboxesAfterRecordTypeChange2 = screen.getAllByRole('checkbox')
    for (const checkboxesAfterRecordTypeChangeKey in checkboxesAfterRecordTypeChange2) {
      const checkboxAfterRecordTypeChange = checkboxesAfterRecordTypeChange2[checkboxesAfterRecordTypeChangeKey]
      expect(checkboxAfterRecordTypeChange).not.toBeChecked()
    }

    const buttonAfterRecordTypeChange2 = screen.getByLabelText('Submit button')
    await waitFor(() => {
      // Still no records selected, so this all should still be true:
      expect(buttonAfterRecordTypeChange2).toHaveAttribute('aria-disabled', 'true')
      expect(buttonAfterRecordTypeChange2).toHaveAttribute('disabled')
      expect(screen.queryByText('No records selected')).not.toBeNull()
    }, { 'timeout': 3000 })
  })

  it('should display error message when WDS is unable to find a record type', async () => {
    const mockRunSetResponse = jest.fn(() => Promise.resolve(badRecordTypeRunSetResponse))
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
            getById: mockMethodsResponse
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

    await waitFor(() => {
      expect(mockRunSetResponse).toHaveBeenCalledTimes(1)
      expect(mockTypesResponse).toHaveBeenCalledTimes(1)
      expect(mockMethodsResponse).toHaveBeenCalledTimes(0)
      expect(mockSearchResponse).toHaveBeenCalledTimes(0)
    })

    await waitFor(() => {
      expect(mockMethodsResponse).toHaveBeenCalledTimes(1)
      expect(mockSearchResponse).toHaveBeenCalledTimes(1)
    })

    await screen.getByText(/Data table not found: BADFOO/)
  })
})

describe('SubmissionConfig inputs/outputs definitions', () => {
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

  it('should initially populate the inputs definition table with attributes determined by the previously executed run set', async () => {
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
            getById: mockMethodsResponse
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
      expect(mockTypesResponse).toHaveBeenCalledTimes(1)

      // At initial render these two shouldn't be called. See below for a follow-up await for them to be triggered via callbacks
      expect(mockMethodsResponse).toHaveBeenCalledTimes(0)
      expect(mockSearchResponse).toHaveBeenCalledTimes(0)
    })

    // after the initial render (not before), records data should have been retrieved once
    await waitFor(() => {
      expect(mockSearchResponse).toHaveBeenCalledTimes(1)
      expect(mockMethodsResponse).toHaveBeenCalledTimes(1)
    })

    const button = await screen.findByRole('button', { name: 'Inputs' })

    // ** ACT **
    await fireEvent.click(button)

    // ** ASSERT **
    const table = await screen.findByRole('table')
    const rows = within(table).queryAllByRole('row')

    expect(runSetInputDef.length).toBe(2)
    expect(rows.length).toBe(runSetInputDef.length + 1) // one row for each input definition variable, plus headers

    const headers = within(rows[0]).queryAllByRole('columnheader')
    expect(headers.length).toBe(5)

    const cellsFoo = within(rows[1]).queryAllByRole('cell')
    expect(cellsFoo.length).toBe(5)
    within(cellsFoo[0]).getByText('foo')
    within(cellsFoo[1]).getByText('foo_rating_workflow_var')
    within(cellsFoo[2]).getByText('Int')
    within(cellsFoo[3]).getByText('Fetch from Data Table')
    within(cellsFoo[4]).getByText('foo_rating')


    const cellsBar = within(rows[2]).queryAllByRole('cell')
    expect(cellsBar.length).toBe(5)
    expect(cellsBar[0].textContent).toBe('target_workflow_1')
    within(cellsBar[1]).getByText('bar_string_workflow_var')
    within(cellsBar[2]).getByText('String')
    within(cellsBar[3]).getByText('Fetch from Data Table')
    within(cellsBar[4]).getByText('bar_string')
  })

  it('should display warning icon for required inputs with missing attributes and disappear when attribute is supplied', async () => {
    // ** ARRANGE **
    const mockRunSetResponse = jest.fn(() => Promise.resolve(runSetResponse))
    const mockMethodsResponse = jest.fn(() => Promise.resolve(methodsResponse))
    const mockSearchResponse = jest.fn(recordType => Promise.resolve(searchResponses[recordType]))
    const mockTypesResponse = jest.fn(() => Promise.resolve(typesResponseWithoutFooRating))

    await Ajax.mockImplementation(() => {
      return {
        Cbas: {
          runSets: {
            getForMethod: mockRunSetResponse
          },
          methods: {
            getById: mockMethodsResponse
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
      expect(mockTypesResponse).toHaveBeenCalledTimes(1)

      // At initial render these two shouldn't be called. See below for a follow-up await for them to be triggered via callbacks
      expect(mockMethodsResponse).toHaveBeenCalledTimes(0)
      expect(mockSearchResponse).toHaveBeenCalledTimes(0)
    })

    // after the initial render (not before), records data should have been retrieved once
    await waitFor(() => {
      expect(mockSearchResponse).toHaveBeenCalledTimes(1)
      expect(mockMethodsResponse).toHaveBeenCalledTimes(1)
    })

    const button = await screen.findByRole('button', { name: 'Inputs' })

    // ** ACT **
    await fireEvent.click(button)

    // ** ASSERT **
    const table = await screen.findByRole('table')
    const rows = within(table).queryAllByRole('row')

    expect(runSetInputDef.length).toBe(2)
    expect(rows.length).toBe(runSetInputDef.length + 1) // one row for each input definition variable, plus headers

    const cellsFoo = within(rows[1]).queryAllByRole('cell')
    expect(cellsFoo.length).toBe(5)
    within(cellsFoo[0]).getByText('foo')
    within(cellsFoo[1]).getByText('foo_rating_workflow_var')
    within(cellsFoo[2]).getByText('Int')
    within(cellsFoo[3]).getByText('Fetch from Data Table')
    // input configuration expects attribute 'foo_rating' to be present, but it isn't available in the data table.
    // Hence, the select box will be empty and defaulted to 'Select Attribute' and orange warning icon will be present next to it
    within(cellsFoo[4]).getByText('Select Attribute')
    within(cellsFoo[4]).queryByRole('img', { 'data-icon': 'error-standard' })

    // ** ACT **
    // user selects the attribute 'rating_for_foo' for input 'foo_rating_workflow_var'
    await userEvent.click(within(cellsFoo[4]).getByText('Select Attribute'))
    const selectOption = await screen.findByText(`rating_for_foo`)
    await userEvent.click(selectOption)

    // ** ASSERT **
    within(cellsFoo[4]).getByText('rating_for_foo')
    const warningIcon = within(cellsFoo[4]).queryByRole('img', { 'data-icon': 'error-standard' })
    expect(warningIcon).toBeNull() // once user has selected an attribute, warning icon should disappear
  })

  it('should initially populate the outputs definition table with attributes determined by the previously executed run set', async () => {
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
            getById: mockMethodsResponse
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
      expect(mockTypesResponse).toHaveBeenCalledTimes(1)

      // At initial render these two shouldn't be called. See below for a follow-up await for them to be triggered via callbacks
      expect(mockMethodsResponse).toHaveBeenCalledTimes(0)
      expect(mockSearchResponse).toHaveBeenCalledTimes(0)
    })

    // after the initial render (not before), records data should have been retrieved once
    await waitFor(() => {
      expect(mockSearchResponse).toHaveBeenCalledTimes(1)
      expect(mockMethodsResponse).toHaveBeenCalledTimes(1)
    })

    const button = await screen.findByRole('button', { name: 'Outputs' })

    // ** ACT **
    await fireEvent.click(button)

    // ** ASSERT **
    const table = await screen.findByRole('table')
    const rows = within(table).queryAllByRole('row')

    expect(runSetOutputDef.length).toBe(2)
    expect(rows.length).toBe(runSetOutputDef.length + 1) // one row for each output definition variable, plus headers

    const headers = within(rows[0]).queryAllByRole('columnheader')
    expect(headers.length).toBe(4)

    const row1cells = within(rows[1]).queryAllByRole('cell')
    expect(row1cells.length).toBe(4)
    expect(row1cells[0].textContent).toBe('target_workflow_1')
    within(row1cells[1]).getByText('file_output')
    within(row1cells[2]).getByText('File')
    within(row1cells[3]).getByDisplayValue('target_workflow_1_file_output')

    const row2cells = within(rows[2]).queryAllByRole('cell')
    expect(row2cells.length).toBe(4)
    expect(row2cells[0].textContent).toBe('target_workflow_1')
    within(row2cells[1]).getByText('unused_output')
    within(row2cells[2]).getByText('String')
    within(row2cells[3]).getByDisplayValue('')
  })
})
