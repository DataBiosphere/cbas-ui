import '@testing-library/jest-dom'
import {prettyDOM} from '@testing-library/dom'

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
  },
  {
    input_name: 'target_workflow_1.optional_var',
    input_type: {
      type: 'optional',
      optional_type: {
        type: 'primitive',
        primitive_type: 'String'
      }
    },
    source: {
      type: 'literal',
      parameter_value: 'Hello World'
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
      method_version_id: '50000000-0000-0000-0000-000000000006',
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
      method_id: '00000000-0000-0000-0000-000000000001',
      name: 'Target Workflow 1',
      description: 'Target Workflow 1',
      source: 'Github',
      source_url: 'https://raw.githubusercontent.com/DataBiosphere/cbas/main/useful_workflows/target_workflow_1/target_workflow_1.wdl',
      method_versions: [
        {
          method_version_id: '50000000-0000-0000-0000-000000000006',
          method_id: '00000000-0000-0000-0000-000000000001',
          name: '1.0',
          description: 'method description',
          created: '2023-01-26T19:45:50.419Z',
          url: 'https://raw.githubusercontent.com/DataBiosphere/cbas/main/useful_workflows/target_workflow_1/target_workflow_1.wdl',
          last_run: {
            previously_run: true,
            timestamp: '2023-01-26T19:45:50.419Z',
            run_set_id: '10000000-0000-0000-0000-000000000001',
            method_version_id: '50000000-0000-0000-0000-000000000006',
            method_version_name: 'string'
          }
        }
      ],
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

  it('should change record table sort order when column headers are clicked', async () => {
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
      expect(mockTypesResponse).toHaveBeenCalledTimes(1)
      expect(mockMethodsResponse).toHaveBeenCalledTimes(1)
      expect(mockSearchResponse).toHaveBeenCalledTimes(1)
    })

    const table = screen.getByRole('table')
    const rows = within(table).queryAllByRole('row')
    expect(rows.length).toBe(5)

    const headers = within(rows[0]).queryAllByRole('columnheader')
    expect(headers.length).toBe(4)

    const cells1 = within(rows[1]).queryAllByRole('cell')
    const cells2 = within(rows[2]).queryAllByRole('cell')
    const cells3 = within(rows[3]).queryAllByRole('cell')
    const cells4 = within(rows[4]).queryAllByRole('cell')

    await act(async () => {
      await fireEvent.click(within(headers[1]).getByRole('button'))
    })
    within(cells1[1]).getByText('FOO1')
    within(cells2[1]).getByText('FOO2')
    within(cells3[1]).getByText('FOO3')
    within(cells4[1]).getByText('FOO4')

    await act(async () => {
      await fireEvent.click(within(headers[1]).getByRole('button'))
    })
    within(cells1[1]).getByText('FOO4')
    within(cells2[1]).getByText('FOO3')
    within(cells3[1]).getByText('FOO2')
    within(cells4[1]).getByText('FOO1')

    await act(async () => {
      await fireEvent.click(within(headers[2]).getByRole('button'))
    })
    within(cells1[2]).getByText('30')
    within(cells2[2]).getByText('85')
    within(cells3[2]).getByText('999')
    within(cells4[2]).getByText('1000')

    await act(async () => {
      await fireEvent.click(within(headers[2]).getByRole('button'))
    })
    within(cells1[2]).getByText('1000')
    within(cells2[2]).getByText('999')
    within(cells3[2]).getByText('85')
    within(cells4[2]).getByText('30')
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

    expect(runSetInputDef.length).toBe(3)
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

    const thirdInputRow = within(rows[3]).queryAllByRole('cell')
    expect(thirdInputRow.length).toBe(5)
    expect(thirdInputRow[0].textContent).toBe('target_workflow_1')
    within(thirdInputRow[1]).getByText('optional_var')
    within(thirdInputRow[2]).getByText('String?')
    within(thirdInputRow[3]).getByText('Type a Value')
    within(thirdInputRow[4]).getByDisplayValue('Hello World')
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

    expect(runSetInputDef.length).toBe(3)
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

  it('should change input table sort order when column headers are clicked', async () => {
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
      expect(mockTypesResponse).toHaveBeenCalledTimes(1)
      expect(mockMethodsResponse).toHaveBeenCalledTimes(1)
      expect(mockSearchResponse).toHaveBeenCalledTimes(1)
    })

    const button = await screen.findByRole('button', { name: 'Inputs' })
    await fireEvent.click(button)

    const table = await screen.findByRole('table')
    const rows = within(table).queryAllByRole('row')
    const headers = within(rows[0]).queryAllByRole('columnheader')
    const cells1 = within(rows[1]).queryAllByRole('cell')
    const cells2 = within(rows[2]).queryAllByRole('cell')


    // sort ascending by column 0
    await act(async () => {
      await fireEvent.click(within(headers[0]).getByRole('button'))
    })

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

    // sort descending by column 0
    await act(async () => {
      await fireEvent.click(within(headers[0]).getByRole('button'))
    })

    within(cells1[0]).getByText('target_workflow_1')
    within(cells1[1]).getByText('bar_string_workflow_var')
    within(cells1[2]).getByText('String')
    within(cells1[3]).getByText('Fetch from Data Table')
    within(cells1[4]).getByText('bar_string')

    within(cells2[0]).getByText('foo')
    within(cells2[1]).getByText('foo_rating_workflow_var')
    within(cells2[2]).getByText('Int')
    within(cells2[3]).getByText('Fetch from Data Table')
    within(cells2[4]).getByText('foo_rating')
  })

  it('should change output table sort order when column headers are clicked', async () => {
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
      expect(mockTypesResponse).toHaveBeenCalledTimes(1)
      expect(mockMethodsResponse).toHaveBeenCalledTimes(1)
      expect(mockSearchResponse).toHaveBeenCalledTimes(1)
    })

    const button = await screen.findByRole('button', { name: 'Outputs' })
    await fireEvent.click(button)

    const table = await screen.findByRole('table')
    const rows = within(table).queryAllByRole('row')
    const headers = within(rows[0]).queryAllByRole('columnheader')
    const cells1 = within(rows[1]).queryAllByRole('cell')
    const cells2 = within(rows[2]).queryAllByRole('cell')

    // console.log(prettyDOM(cells1[3]))


    // sort ascending by column 2
    await act(async () => {
      await fireEvent.click(within(headers[2]).getByRole('button'))
    })

    within(cells1[0]).getByText('target_workflow_1')
    within(cells1[1]).getByText('file_output')
    within(cells1[2]).getByText('File')
    within(cells1[3]).getByDisplayValue('target_workflow_1_file_output')

    within(cells2[0]).getByText('target_workflow_1')
    within(cells2[1]).getByText('unused_output')
    within(cells2[2]).getByText('String')
    within(cells2[3]).getByDisplayValue('')

    // sort descending by column 0
    await act(async () => {
      await fireEvent.click(within(headers[2]).getByRole('button'))
    })

    within(cells2[0]).getByText('target_workflow_1')
    within(cells2[1]).getByText('file_output')
    within(cells2[2]).getByText('File')
    within(cells2[3]).getByDisplayValue('target_workflow_1_file_output')

    // within(cells2[0]).getByText('target_workflow_1')
    // within(cells2[1]).getByText('file_output')
    // within(cells2[2]).getByText('File')
    // within(cells2[3]).getByDisplayValue('target_workflow_1_file_output')
  })
})

describe('SubmissionConfig submitting a run set', () => {
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

  it('should call POST /run_sets endpoint with expected parameters', async () => {
    // ** ARRANGE **
    const mockRunSetResponse = jest.fn(() => Promise.resolve(runSetResponse))
    const mockMethodsResponse = jest.fn(() => Promise.resolve(methodsResponse))
    const mockSearchResponse = jest.fn(() => Promise.resolve(searchResponses['FOO']))
    const mockTypesResponse = jest.fn(() => Promise.resolve(typesResponse))

    const postRunSetFunction = jest.fn()

    await Ajax.mockImplementation(() => {
      return {
        Cbas: {
          runSets: {
            post: postRunSetFunction,
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
      expect(mockSearchResponse).toHaveBeenCalledTimes(1)
      expect(mockMethodsResponse).toHaveBeenCalledTimes(1)
    })

    // ** ACT **
    // user selects 'FOO1' record from Data Table
    const checkboxes = screen.getAllByRole('checkbox')
    const checkbox = checkboxes[1]
    fireEvent.click(checkbox)

    // ** ASSERT **
    // verify that the record was indeed selected
    expect(checkbox).toHaveAttribute('aria-checked', 'true')

    // ** ACT **
    // user clicks on Submit (inputs and outputs should be rendered based on previous submission)
    const button = screen.getByLabelText('Submit button')
    fireEvent.click(button)

    // ** ASSERT **
    // Launch modal should be displayed
    await screen.getByText('Send submission')
    const modalSubmitButton = await screen.getByLabelText('Launch Submission')

    // ** ACT **
    // user click on Submit button
    fireEvent.click(modalSubmitButton)

    // ** ASSERT **
    // assert POST /run_sets endpoint was called with expected parameters
    expect(postRunSetFunction).toHaveBeenCalled()
    expect(postRunSetFunction).toBeCalledWith(
      expect.objectContaining({
        method_version_id: runSetResponse.run_sets[0].method_version_id,
        workflow_input_definitions: runSetInputDef,
        workflow_output_definitions: runSetOutputDef,
        wds_records: {
          record_type: 'FOO',
          record_ids: [
            'FOO1'
          ]
        }
      })
    )
  })

  it('should call POST /run_sets endpoint with expected parameters after an optional input is set to None', async () => {
    // ** ARRANGE **
    const mockRunSetResponse = jest.fn(() => Promise.resolve(runSetResponse))
    const mockMethodsResponse = jest.fn(() => Promise.resolve(methodsResponse))
    const mockSearchResponse = jest.fn(() => Promise.resolve(searchResponses['FOO']))
    const mockTypesResponse = jest.fn(() => Promise.resolve(typesResponse))

    const postRunSetFunction = jest.fn()

    await Ajax.mockImplementation(() => {
      return {
        Cbas: {
          runSets: {
            post: postRunSetFunction,
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
      expect(mockSearchResponse).toHaveBeenCalledTimes(1)
      expect(mockMethodsResponse).toHaveBeenCalledTimes(1)
    })

    // ** ACT **
    // user selects 'FOO1' record from Data Table
    const checkboxes = screen.getAllByRole('checkbox')
    const checkbox = checkboxes[1]
    fireEvent.click(checkbox)

    // ** ASSERT **
    // verify that the record was indeed selected
    expect(checkbox).toHaveAttribute('aria-checked', 'true')

    // ** ACT **
    const inputsTabButton = await screen.findByRole('button', { name: 'Inputs' })
    await fireEvent.click(inputsTabButton)

    // ** ASSERT **
    const inputTable = await screen.findByRole('table')
    const rows = within(inputTable).queryAllByRole('row')
    expect(rows.length).toBe(runSetInputDef.length + 1) // one row for each input definition variable, plus headers


    // ** ACT **
    // user sets the source to 'None' for input 'optional_var'
    const thirdInputRow = within(rows[3]).queryAllByRole('cell')
    await userEvent.click(within(thirdInputRow[3]).getByText('Type a Value'))
    const selectOption = await screen.findByText('None')
    await userEvent.click(selectOption)

    // ** ASSERT **
    // check that the Attribute column has expected behavior
    within(thirdInputRow[4]).getByText('The workflow input will either be empty or use a default value from the workflow.')

    // ** ACT **
    // user clicks on Submit (inputs and outputs should be rendered based on previous submission)
    const button = screen.getByLabelText('Submit button')
    fireEvent.click(button)

    // ** ASSERT **
    // Launch modal should be displayed
    await screen.getByText('Send submission')
    const modalSubmitButton = await screen.getByLabelText('Launch Submission')

    // ** ACT **
    // user click on Submit button
    fireEvent.click(modalSubmitButton)

    // ** ASSERT **
    // assert POST /run_sets endpoint was called with expected parameters and input 'optional_var' has correct definition for source 'None'
    expect(postRunSetFunction).toHaveBeenCalled()
    expect(postRunSetFunction).toBeCalledWith(
      expect.objectContaining({
        method_version_id: runSetResponse.run_sets[0].method_version_id,
        workflow_input_definitions: [
          runSetInputDef[0],
          runSetInputDef[1],
          {
            input_name: 'target_workflow_1.optional_var',
            input_type: {
              optional_type: {
                primitive_type: 'String',
                type: 'primitive'
              },
              type: 'optional'
            },
            source: {
              type: 'none'
            }
          }
        ],
        workflow_output_definitions: runSetOutputDef,
        wds_records: {
          record_type: 'FOO',
          record_ids: [
            'FOO1'
          ]
        }
      })
    )
  })
})
