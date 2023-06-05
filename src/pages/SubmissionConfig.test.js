import '@testing-library/jest-dom'

import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { h } from 'react-hyperscript-helpers'
import selectEvent from 'react-select-event'
import { Ajax } from 'src/libs/ajax'
import { getConfig } from 'src/libs/config'
import {
  badRecordTypeRunSetResponse,
  methodsResponse,
  mockApps,
  myStructInput,
  runSetInputDef,
  runSetInputDefWithStruct,
  runSetOutputDef,
  runSetResponse,
  runSetResponseForNewMethod, runSetResponseSameInputNames,
  runSetResponseWithStruct,
  searchResponses,
  typesResponse,
  typesResponseWithoutFooRating,
  undefinedRecordTypeRunSetResponse
} from 'src/libs/mock-responses.js'
import { SubmissionConfig } from 'src/pages/SubmissionConfig'


jest.mock('src/libs/ajax')

jest.mock('src/libs/notifications.js')

jest.mock('src/libs/config', () => ({
  ...jest.requireActual('src/libs/config'),
  getConfig: jest.fn().mockReturnValue({})
}))

// SubmissionConfig component uses AutoSizer to determine the right size for table to be displayed. As a result we need to
// mock out the height and width so that when AutoSizer asks for the width and height of "browser" it can use the mocked
// values and render the component properly. Without this the tests will be break.
// (see https://github.com/bvaughn/react-virtualized/issues/493 and https://stackoverflow.com/a/62214834)
const originalOffsetHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetHeight')
const originalOffsetWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetWidth')


describe('SubmissionConfig workflow details', () => {
  beforeAll(() => {
    Object.defineProperty(HTMLElement.prototype, 'offsetHeight', { configurable: true, value: 1000 })
    Object.defineProperty(HTMLElement.prototype, 'offsetWidth', { configurable: true, value: 800 })
  })

  beforeEach(() => {
    getConfig.mockReturnValue(({ wdsUrlRoot: 'http://localhost:3000/wds' }))
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  afterAll(() => {
    Object.defineProperty(HTMLElement.prototype, 'offsetHeight', originalOffsetHeight)
    Object.defineProperty(HTMLElement.prototype, 'offsetWidth', originalOffsetWidth)
  })

  it('should render workflow details', async () => {
    // ** ARRANGE **
    const mockRunSetResponse = jest.fn(() => Promise.resolve(runSetResponse))
    const mockMethodsResponse = jest.fn(() => Promise.resolve(methodsResponse))
    const mockSearchResponse = jest.fn((_, recordType) => Promise.resolve(searchResponses[recordType]))
    const mockTypesResponse = jest.fn(() => Promise.resolve(typesResponse))
    const mockWdlResponse = jest.fn(() => Promise.resolve('mock wdl response'))
    const mockLeoResponse = jest.fn(() => Promise.resolve(mockApps))

    Ajax.mockImplementation(() => {
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
        },
        WorkflowScript: {
          get: mockWdlResponse
        },
        Leonardo: {
          listAppsV2: mockLeoResponse
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
      expect(mockWdlResponse).toHaveBeenCalledTimes(1)
      expect(mockLeoResponse).toHaveBeenCalledTimes(0)
    })

    expect(screen.getByText('Workflow Version:')).toBeInTheDocument()
    expect(screen.getByText('1.0')).toBeInTheDocument()

    expect(screen.getByText('Workflow source URL:')).toBeInTheDocument()
    expect(screen.getByText('https://raw.githubusercontent.com/DataBiosphere/cbas/main/useful_workflows/target_workflow_1/target_workflow_1.wdl')).toBeInTheDocument()

    const workflowScriptLink = screen.getByRole('button', { name: 'View Workflow Script' })
    expect(workflowScriptLink).toBeInTheDocument()
    expect(workflowScriptLink.getAttribute('aria-disabled')).toBe('false')

    // ** ACT **
    // user clicks on View Workflow Script to open the modal
    await act(async () => {
      await userEvent.click(workflowScriptLink)
    })

    // ** ASSERT **
    // verify that modal was rendered on screen
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Workflow Script')).toBeInTheDocument()
  })
})

describe('SubmissionConfig records selector', () => {
  beforeAll(() => {
    Object.defineProperty(HTMLElement.prototype, 'offsetHeight', { configurable: true, value: 1000 })
    Object.defineProperty(HTMLElement.prototype, 'offsetWidth', { configurable: true, value: 800 })
  })

  beforeEach(() => {
    getConfig.mockReturnValue(({ wdsUrlRoot: 'http://localhost:3000/wds' }))
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
    const mockSearchResponse = jest.fn((_, recordType) => Promise.resolve(searchResponses[recordType]))
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
    const mockSearchResponse = jest.fn((_, recordType) => Promise.resolve(searchResponses[recordType]))
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
    const mockSearchResponse = jest.fn((_, recordType) => Promise.resolve(searchResponses[recordType]))
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
    const mockSearchResponse = jest.fn((_, recordType) => Promise.resolve(searchResponses[recordType]))
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
    const mockSearchResponse = jest.fn((_, recordType) => Promise.resolve(searchResponses[recordType]))
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
    })

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
    })
  })

  it('should change record table sort order when column headers are clicked', async () => {
    const mockRunSetResponse = jest.fn(() => Promise.resolve(runSetResponse))
    const mockMethodsResponse = jest.fn(() => Promise.resolve(methodsResponse))
    const mockSearchResponse = jest.fn((_, recordType) => Promise.resolve(searchResponses[recordType]))
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
    const mockSearchResponse = jest.fn((_, recordType) => Promise.resolve(searchResponses[recordType]))
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
      expect(mockMethodsResponse).toHaveBeenCalledTimes(1)
      expect(mockSearchResponse).toHaveBeenCalledTimes(1)
    })
    await screen.getByText(/Data table not found: BADFOO/)
  })

  it('should display select message when record type is undefined', async () => {
    const mockRunSetResponse = jest.fn(() => Promise.resolve(undefinedRecordTypeRunSetResponse))
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
      expect(mockMethodsResponse).toHaveBeenCalledTimes(1)
      expect(mockSearchResponse).toHaveBeenCalledTimes(1)
    })
    const warning = screen.getByLabelText('warning message')
    expect(warning).toContainHTML('Select a data table')
  })

  it('should toggle between different states of checked boxes', async () => {
    const mockRunSetResponse = jest.fn(() => Promise.resolve(runSetResponse))
    const mockMethodsResponse = jest.fn(() => Promise.resolve(methodsResponse))
    const mockSearchResponse = jest.fn((_, recordType) => Promise.resolve(searchResponses[recordType]))
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

    // ** ASSERT **
    await waitFor(() => {
      expect(mockRunSetResponse).toHaveBeenCalledTimes(1)
      expect(mockTypesResponse).toHaveBeenCalledTimes(1)
      expect(mockMethodsResponse).toHaveBeenCalledTimes(1)
      expect(mockSearchResponse).toHaveBeenCalledTimes(1)
    })

    const checkboxes = screen.getAllByRole('checkbox')
    const checkbox = checkboxes[0]
    expect(checkbox).not.toBeChecked()

    // Checking all the checkboxes
    fireEvent.click(checkbox)
    expect(checkbox).toBeChecked()

    for (const checkbox in checkboxes) {
      const singleCheckbox = checkboxes[checkbox]
      expect(singleCheckbox).toBeChecked()
    }

    // Unchecking all the checkboxes
    fireEvent.click(checkbox)
    for (const checkbox in checkboxes) {
      const singleCheckbox = checkboxes[checkbox]
      expect(singleCheckbox).not.toBeChecked()
    }
  })
})

describe('Input source and requirements validation', () => {
  beforeAll(() => {
    Object.defineProperty(HTMLElement.prototype, 'offsetHeight', { configurable: true, value: 1000 })
    Object.defineProperty(HTMLElement.prototype, 'offsetWidth', { configurable: true, value: 800 })
  })

  beforeEach(() => {
    getConfig.mockReturnValue(({ wdsUrlRoot: 'http://localhost:3000/wds' }))
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  afterAll(() => {
    Object.defineProperty(HTMLElement.prototype, 'offsetHeight', originalOffsetHeight)
    Object.defineProperty(HTMLElement.prototype, 'offsetWidth', originalOffsetWidth)
  })

  const buildAjaxMocks = runSetResponse => {
    const mockRunSetResponse = jest.fn(() => Promise.resolve(runSetResponse))
    const mockMethodsResponse = jest.fn(() => Promise.resolve(methodsResponse))
    const mockSearchResponse = jest.fn((_, recordType) => Promise.resolve(searchResponses[recordType]))
    const mockTypesResponse = jest.fn(() => Promise.resolve(typesResponseWithoutFooRating))

    Ajax.mockImplementation(() => {
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

    return { mockRunSetResponse, mockMethodsResponse, mockSearchResponse, mockTypesResponse }
  }

  it('should display warning icon for required inputs with missing attributes and disappear when attribute is supplied', async () => {
    // ** ARRANGE **
    const { mockRunSetResponse, mockMethodsResponse, mockSearchResponse, mockTypesResponse } = buildAjaxMocks(runSetResponseWithStruct)

    // ** ACT **
    render(h(SubmissionConfig))

    // ** ASSERT **
    await waitFor(() => {
      expect(mockRunSetResponse).toHaveBeenCalledTimes(1)
      expect(mockTypesResponse).toHaveBeenCalledTimes(1)
      expect(mockMethodsResponse).toHaveBeenCalledTimes(1)
      expect(mockSearchResponse).toHaveBeenCalledTimes(1)
    })

    const button = await screen.findByRole('button', { name: 'Inputs' })

    // ** ACT **
    await fireEvent.click(button)

    // ** ASSERT **
    const table = await screen.findByRole('table')
    const rows = within(table).queryAllByRole('row')

    expect(rows.length).toBe(runSetInputDefWithStruct.length + 1) // one row for each input definition variable, plus headers

    const cellsFoo = within(rows[1]).queryAllByRole('cell')
    expect(cellsFoo.length).toBe(5)
    within(cellsFoo[0]).getByText('foo')
    within(cellsFoo[1]).getByText('foo_rating_workflow_var')
    within(cellsFoo[2]).getByText('Int')
    within(cellsFoo[3]).getByText('Fetch from Data Table')
    // input configuration expects attribute 'foo_rating' to be present, but it isn't available in the data table.
    // Hence, the select box will be empty and defaulted to the attribute name as its placeholder,
    // but there will be a warning message next to it

    within(cellsFoo[4]).getByText('foo_rating')
    const warningMessageActive = within(cellsFoo[4]).queryByText("This attribute doesn't exist in data table")
    expect(warningMessageActive).not.toBeNull()

    // ** ACT **
    // user selects the attribute 'rating_for_foo' for input 'foo_rating_workflow_var'
    await userEvent.click(within(cellsFoo[4]).getByText('foo_rating'))
    const selectOption = await screen.findByText(`rating_for_foo`)
    await userEvent.click(selectOption)

    // ** ASSERT **
    within(cellsFoo[4]).getByText('rating_for_foo')
    const warningMessageInactive = within(cellsFoo[4]).queryByText("This attribute doesn't exist in data table")
    expect(warningMessageInactive).toBeNull() // once user has selected an attribute, warning message should disappear
  })

  it('should display warning icon/message at each level of the struct builder when a field has a missing attribute', async () => {
    // ** ARRANGE **
    const { mockRunSetResponse, mockMethodsResponse, mockSearchResponse, mockTypesResponse } = buildAjaxMocks(runSetResponseWithStruct)

    // ** ACT **
    render(h(SubmissionConfig))

    // ** ASSERT **
    await waitFor(() => {
      expect(mockRunSetResponse).toHaveBeenCalledTimes(1)
      expect(mockTypesResponse).toHaveBeenCalledTimes(1)
      expect(mockMethodsResponse).toHaveBeenCalledTimes(1)
      expect(mockSearchResponse).toHaveBeenCalledTimes(1)
    })

    // ** ACT **
    const button = await screen.findByRole('button', { name: 'Inputs' })
    await fireEvent.click(button)

    // ** ASSERT **
    const table = await screen.findByRole('table')
    const rows = within(table).queryAllByRole('row')
    const viewStructLink = within(rows[2]).getByText('View Struct')
    const inputWarningMessageActive = within(rows[2]).queryByText("One of this struct's inputs has an invalid configuration")
    expect(inputWarningMessageActive).not.toBeNull()

    // ** ACT **
    await fireEvent.click(viewStructLink)

    // ** ASSERT **
    const structTable = await screen.getByLabelText('struct-table')
    const structRows = within(structTable).queryAllByRole('row')
    expect(structRows.length).toBe(6)

    const structCells = within(structRows[5]).queryAllByRole('cell')
    within(structCells[1]).getByText('myInnerStruct')
    const viewMyInnerStructLink = within(structCells[4]).getByText('View Struct')
    const structWarningMessageActive = within(structCells[4]).queryByText("One of this struct's inputs has an invalid configuration")
    expect(structWarningMessageActive).not.toBeNull()

    // ** ACT **
    await fireEvent.click(viewMyInnerStructLink)


    // ** ASSERT **
    const innerStructTable = await screen.getByLabelText('struct-table')
    const innerStructRows = within(innerStructTable).queryAllByRole('row')
    expect(innerStructRows.length).toBe(3)

    const innerStructCells = within(innerStructRows[2]).queryAllByRole('cell')
    within(innerStructCells[1]).getByText('myInnermostRecordLookup')
    within(innerStructCells[4]).getByText('foo_rating')
    const innerStructWarningMessageActive = within(innerStructCells[4]).queryByText("This attribute doesn't exist in the data table")
    expect(innerStructWarningMessageActive).not.toBeNull()

    // ** ACT **
    // user selects the attribute 'rating_for_foo' for input 'foo_rating_workflow_var'
    await userEvent.click(within(innerStructCells[4]).getByText('foo_rating'))
    const selectOption = await screen.findByText(`rating_for_foo`)
    await userEvent.click(selectOption)

    // ** ASSERT **
    within(innerStructCells[4]).getByText('rating_for_foo')
    const innerStructWarningMessageInactive = within(innerStructCells[4]).queryByText("This attribute doesn't exist in data table")
    expect(innerStructWarningMessageInactive).toBeNull() // once user has selected an attribute, warning message should disappear
  })

  it('should display warning for required inputs for a newly imported method', async () => {
    // ** ARRANGE **
    const { mockRunSetResponse, mockMethodsResponse, mockSearchResponse, mockTypesResponse } = buildAjaxMocks(runSetResponseForNewMethod)

    // ** ACT **
    render(h(SubmissionConfig))

    // ** ASSERT **
    await waitFor(() => {
      expect(mockRunSetResponse).toHaveBeenCalledTimes(1)
      expect(mockTypesResponse).toHaveBeenCalledTimes(1)
      expect(mockMethodsResponse).toHaveBeenCalledTimes(1)
      expect(mockSearchResponse).toHaveBeenCalledTimes(1)
    })

    // ** ACT **
    // user selects a record from Data Table
    const checkboxes = screen.getAllByRole('checkbox')
    const checkbox = checkboxes[1]
    fireEvent.click(checkbox)

    // ** ASSERT **
    // check that tooltip indicating missing required fields is present for Submit button
    screen.getByText('One or more inputs have missing values')

    // ** ACT **
    const button = await screen.findByRole('button', { name: 'Inputs' })
    await fireEvent.click(button)

    // ** ASSERT **
    // check that warnings appear next to empty required inputs
    const table = await screen.findByRole('table')
    const rows = within(table).queryAllByRole('row')

    // inputs sorted according to task name -> variable name
    const firstInputRowCells = within(rows[1]).queryAllByRole('cell')
    within(firstInputRowCells[4]).getByText('This input is required')

    const thirdInputRowCells = within(rows[3]).queryAllByRole('cell')
    within(thirdInputRowCells[4]).getByText('Optional')

    // struct input
    const secondInputRowCells = within(rows[2]).queryAllByRole('cell')
    within(secondInputRowCells[4]).getByText('This input is required')

    // ** ACT **
    // user sets the source to 'Fetch from data table' for struct input
    await userEvent.click(within(secondInputRowCells[3]).getByText('Select Source'))
    const selectOption1 = await screen.findByText('Fetch from Data Table')
    await userEvent.click(selectOption1)

    // ** ASSERT **
    // check that the warning message for struct input has changed since no attribute has been selected yet
    within(secondInputRowCells[4]).getByText('This attribute doesn\'t exist in data table')

    // ** ACT **
    // user sets the source to 'Use Struct Builder' for struct input
    await userEvent.click(within(secondInputRowCells[3]).getByText('Fetch from Data Table'))
    const selectOption2 = await screen.findByText('Use Struct Builder')
    await userEvent.click(selectOption2)

    // ** ASSERT **
    // check that the warning message for struct input has changed
    within(secondInputRowCells[4]).getByText('One of this struct\'s inputs has an invalid configuration')

    // ** ACT **
    // click on View struct to open modal
    const viewStructLink = within(secondInputRowCells[4]).getByText('View Struct')
    await fireEvent.click(viewStructLink)

    // ** ASSERT **
    const innerStructTable = await screen.getByLabelText('struct-table')
    const innerStructRows = within(innerStructTable).queryAllByRole('row')
    expect(innerStructRows.length).toBe(3)

    // check that warnings appear next to empty required inputs inside struct modal
    const innerStructRow1Cells = within(innerStructRows[1]).queryAllByRole('cell')
    within(innerStructRow1Cells[4]).getByText('This input is required')

    const innerStructRow2Cells = within(innerStructRows[2]).queryAllByRole('cell')
    within(innerStructRow2Cells[4]).getByText('Optional')

    // ** ACT **
    // user sets the source to 'Fetch from data table' for required struct input
    await userEvent.click(within(innerStructRow1Cells[3]).getByText('Select Source'))
    const selectOptionForStructInput = await screen.findByText('Fetch from Data Table')
    await userEvent.click(selectOptionForStructInput)

    // user exits the struct modal
    await userEvent.click(screen.getByText('Done'))

    // ** ASSERT **
    // check that the warning message for struct input still exists as it still has invalid input configurations
    within(secondInputRowCells[4]).getByText('One of this struct\'s inputs has an invalid configuration')
  })

  it('should display warning icon for input with value not matching expected type', async () => {
    // ** ARRANGE **
    const { mockRunSetResponse, mockMethodsResponse, mockSearchResponse, mockTypesResponse } = buildAjaxMocks(runSetResponseForNewMethod)

    // ** ACT **
    render(h(SubmissionConfig))

    // ** ASSERT **
    await waitFor(() => {
      expect(mockRunSetResponse).toHaveBeenCalledTimes(1)
      expect(mockTypesResponse).toHaveBeenCalledTimes(1)
      expect(mockMethodsResponse).toHaveBeenCalledTimes(1)
      expect(mockSearchResponse).toHaveBeenCalledTimes(1)
    })

    const button = await screen.findByRole('button', { name: 'Inputs' })

    // ** ACT **
    await fireEvent.click(button)

    const table = await screen.findByRole('table')
    const rows = within(table).queryAllByRole('row')

    const firstInputRowCells = within(rows[1]).queryAllByRole('cell')

    // user sets the source to 'Type a Value' for Int input
    await userEvent.click(within(firstInputRowCells[3]).getByText('Select Source'))
    const selectOption = await screen.findByText('Type a Value')
    await userEvent.click(selectOption)

    // ** ASSERT **
    // check that the warning message for input exists
    within(firstInputRowCells[4]).getByText('This attribute is required')

    // ** ACT **
    // user types value for the Int input
    await userEvent.type(screen.getByLabelText('Enter a value'), '123X')

    // ** ASSERT **
    // check that the warning message for incorrect value is displayed
    within(firstInputRowCells[4]).getByText('Value is either empty or doesn\'t match expected input type')

    // ** ACT **
    // user deletes the extra character
    await userEvent.type(screen.getByLabelText('Enter a value'), '{backspace}')

    // ** ASSERT **
    // check that the warning message for incorrect value is gone
    expect(within(firstInputRowCells[4]).queryByText('Value is either empty or doesn\'t match expected input type')).toBeNull()
  })
})

describe('SubmissionConfig inputs/outputs definitions', () => {
  beforeAll(() => {
    Object.defineProperty(HTMLElement.prototype, 'offsetHeight', { configurable: true, value: 1000 })
    Object.defineProperty(HTMLElement.prototype, 'offsetWidth', { configurable: true, value: 800 })
  })

  beforeEach(() => {
    getConfig.mockReturnValue(({ wdsUrlRoot: 'http://localhost:3000/wds' }))
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
    const mockSearchResponse = jest.fn((_, recordType) => Promise.resolve(searchResponses[recordType]))
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

    const button = await screen.findByRole('button', { name: 'Inputs' })

    // ** ACT **
    await fireEvent.click(button)

    // ** ASSERT **
    const table = await screen.findByRole('table')
    const rows = within(table).queryAllByRole('row')

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
    within(thirdInputRow[2]).getByText('String')
    within(thirdInputRow[3]).getByText('Type a Value')
    within(thirdInputRow[4]).getByDisplayValue('Hello World')
  })

  it('should initially populate the outputs definition table with attributes determined by the previously executed run set', async () => {
    // ** ARRANGE **
    const mockRunSetResponse = jest.fn(() => Promise.resolve(runSetResponse))
    const mockMethodsResponse = jest.fn(() => Promise.resolve(methodsResponse))
    const mockSearchResponse = jest.fn((_, recordType) => Promise.resolve(searchResponses[recordType]))
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
    const mockSearchResponse = jest.fn((_, recordType) => Promise.resolve(searchResponses[recordType]))
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

    // sort ascending by column 1
    await act(async () => {
      await fireEvent.click(within(headers[1]).getByRole('button'))
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

    within(cells3[0]).getByText('target_workflow_1')
    within(cells3[1]).getByText('optional_var')
    within(cells3[2]).getByText('String')
    within(cells3[3]).getByText('Type a Value')
    within(cells3[4]).getByDisplayValue('Hello World')

    // sort descending by column 1
    await act(async () => {
      await fireEvent.click(within(headers[1]).getByRole('button'))
    })

    within(cells1[0]).getByText('target_workflow_1')
    within(cells1[1]).getByText('optional_var')
    within(cells1[2]).getByText('String')
    within(cells1[3]).getByText('Type a Value')
    within(cells1[4]).getByDisplayValue('Hello World')

    within(cells2[0]).getByText('foo')
    within(cells2[1]).getByText('foo_rating_workflow_var')
    within(cells2[2]).getByText('Int')
    within(cells2[3]).getByText('Fetch from Data Table')
    within(cells2[4]).getByText('foo_rating')

    within(cells3[0]).getByText('target_workflow_1')
    within(cells3[1]).getByText('bar_string_workflow_var')
    within(cells3[2]).getByText('String')
    within(cells3[3]).getByText('Fetch from Data Table')
    within(cells3[4]).getByText('bar_string')
  })

  it('should populate fields from data table on click', async () => {
    const mockRunSetResponse = jest.fn(() => Promise.resolve(runSetResponseSameInputNames))
    const mockMethodsResponse = jest.fn(() => Promise.resolve(methodsResponse))
    const mockSearchResponse = jest.fn((_, recordType) => Promise.resolve(searchResponses[recordType]))
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
    const cells1 = within(rows[1]).queryAllByRole('cell')
    const cells2 = within(rows[2]).queryAllByRole('cell')
    const cells3 = within(rows[3]).queryAllByRole('cell')

    screen.getByText('Set (2) from data table')

    within(cells1[0]).getByText('foo')
    within(cells1[1]).getByText('foo_rating')
    within(cells1[2]).getByText('Int')
    within(cells1[3]).getByText('None')
    within(cells1[4]).getByText(/Use /)
    const inputFillButton = within(cells1[4]).getByText('foo_rating')
    within(cells1[4]).getByText(/ from data table?/)

    within(cells2[0]).getByText('target_workflow_1')
    within(cells2[1]).getByText('bar_string')
    within(cells2[2]).getByText('String')
    within(cells2[3]).getByText('Select Source')
    within(cells2[4]).getByText(/Use /)
    within(cells2[4]).getByText('bar_string')
    within(cells2[4]).getByText(/ from data table?/)
    within(cells2[4]).getByText('This attribute is required')

    within(cells3[0]).getByText('target_workflow_1')
    within(cells3[1]).getByText('not_in_table')
    within(cells3[2]).getByText('String')
    within(cells3[3]).getByText('None')
    within(cells3[4]).getByText('Optional')

    // fill single input from click
    await act(async () => {
      await fireEvent.click(inputFillButton)
    })

    screen.getByText('Set (1) from data table')

    within(cells1[0]).getByText('foo')
    within(cells1[1]).getByText('foo_rating')
    within(cells1[2]).getByText('Int')
    const selectSourceDropdown = within(cells1[3]).getByText('Fetch from Data Table')
    within(cells1[4]).getByText('foo_rating')

    within(cells2[0]).getByText('target_workflow_1')
    within(cells2[1]).getByText('bar_string')
    within(cells2[2]).getByText('String')
    within(cells2[4]).getByText(/Use /)
    within(cells2[4]).getByText('bar_string')
    within(cells2[4]).getByText(/ from data table?/)

    within(cells3[0]).getByText('target_workflow_1')
    within(cells3[1]).getByText('not_in_table')
    within(cells3[2]).getByText('String')
    within(cells3[3]).getByText('None')
    within(cells3[4]).getByText('Optional')

    // reset input
    await act(async () => {
      await userEvent.click(selectSourceDropdown)
      const selectOptionNone = within(screen.getByRole('listbox')).getByText('None')
      await userEvent.click(selectOptionNone)
    })

    within(cells1[0]).getByText('foo')
    within(cells1[1]).getByText('foo_rating')
    within(cells1[2]).getByText('Int')
    within(cells1[3]).getByText('None')
    within(cells1[4]).getByText(/Use /)
    within(cells1[4]).getByText('foo_rating')
    within(cells1[4]).getByText(/ from data table?/)

    within(cells2[0]).getByText('target_workflow_1')
    within(cells2[1]).getByText('bar_string')
    within(cells2[2]).getByText('String')
    within(cells2[4]).getByText(/Use /)
    within(cells2[4]).getByText('bar_string')
    within(cells2[4]).getByText(/ from data table?/)

    within(cells3[0]).getByText('target_workflow_1')
    within(cells3[1]).getByText('not_in_table')
    within(cells3[2]).getByText('String')
    within(cells3[3]).getByText('None')
    within(cells3[4]).getByText('Optional')

    // fill all from data table
    await act(async () => {
      const fillAllButton = await screen.findByText('Set (2) from data table')
      await fireEvent.click(fillAllButton)
    })

    expect(screen.queryByText(/Set \([0-9]+\) from data table/)).not.toBeInTheDocument()

    within(cells1[0]).getByText('foo')
    within(cells1[1]).getByText('foo_rating')
    within(cells1[2]).getByText('Int')
    within(cells1[3]).getByText('Fetch from Data Table')
    within(cells1[4]).getByText('foo_rating')

    within(cells2[0]).getByText('target_workflow_1')
    within(cells2[1]).getByText('bar_string')
    within(cells2[2]).getByText('String')
    within(cells2[3]).getByText('Fetch from Data Table')
    within(cells2[4]).getByText('bar_string')

    within(cells3[0]).getByText('target_workflow_1')
    within(cells3[1]).getByText('not_in_table')
    within(cells3[2]).getByText('String')
    within(cells3[3]).getByText('None')
    within(cells3[4]).getByText('Optional')
  })

  it('should hide/show optional inputs when respective button is clicked', async () => {
    const mockRunSetResponse = jest.fn(() => Promise.resolve(runSetResponse))
    const mockMethodsResponse = jest.fn(() => Promise.resolve(methodsResponse))
    const mockSearchResponse = jest.fn((_, recordType) => Promise.resolve(searchResponses[recordType]))
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

    // hide optional inputs (defaults to showing optional inputs)
    const hideButton = await screen.getByText('Hide optional inputs')
    await act(async () => {
      await fireEvent.click(hideButton)
    })
    await screen.findByText('Show optional inputs')

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

    // show optional inputs again
    const showButton = await screen.getByText('Show optional inputs')
    await act(async () => {
      await fireEvent.click(showButton)
    })
    await screen.findByText('Hide optional inputs')

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
  })

  it('should change output table sort order when column headers are clicked', async () => {
    const mockRunSetResponse = jest.fn(() => Promise.resolve(runSetResponse))
    const mockMethodsResponse = jest.fn(() => Promise.resolve(methodsResponse))
    const mockSearchResponse = jest.fn((_, recordType) => Promise.resolve(searchResponses[recordType]))
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

    within(cells1[0]).getByText('target_workflow_1')
    within(cells1[1]).getByText('file_output')
    within(cells1[2]).getByText('File')
    within(cells1[3]).getByDisplayValue('target_workflow_1_file_output')

    within(cells2[0]).getByText('target_workflow_1')
    within(cells2[1]).getByText('unused_output')
    within(cells2[2]).getByText('String')
    within(cells2[3]).getByDisplayValue('')

    // sort ascending by column 1
    await act(async () => {
      await fireEvent.click(within(headers[1]).getByRole('button'))
    })

    within(cells1[0]).getByText('target_workflow_1')
    within(cells1[1]).getByText('file_output')
    within(cells1[2]).getByText('File')
    within(cells1[3]).getByDisplayValue('target_workflow_1_file_output')

    within(cells2[0]).getByText('target_workflow_1')
    within(cells2[1]).getByText('unused_output')
    within(cells2[2]).getByText('String')
    within(cells2[3]).getByDisplayValue('')

    // sort descending by column 1
    await act(async () => {
      await fireEvent.click(within(headers[1]).getByRole('button'))
    })

    within(cells1[0]).getByText('target_workflow_1')
    within(cells1[1]).getByText('unused_output')
    within(cells1[2]).getByText('String')
    within(cells1[3]).getByDisplayValue('')

    within(cells2[0]).getByText('target_workflow_1')
    within(cells2[1]).getByText('file_output')
    within(cells2[2]).getByText('File')
    within(cells2[3]).getByDisplayValue('target_workflow_1_file_output')
  })

  it('should display struct builder modal when "view struct builder" link is clicked', async () => {
    // ** ARRANGE **
    const mockRunSetResponse = jest.fn(() => Promise.resolve(runSetResponseWithStruct))
    const mockMethodsResponse = jest.fn(() => Promise.resolve(methodsResponse))
    const mockSearchResponse = jest.fn((_, recordType) => Promise.resolve(searchResponses[recordType]))
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

    const button = await screen.findByRole('button', { name: 'Inputs' })

    // ** ACT **
    await fireEvent.click(button)

    // ** ASSERT **
    await screen.findByRole('table') // there should be only one table at this point

    const viewStructLink = await screen.getByText('View Struct')
    await fireEvent.click(viewStructLink)
    await screen.getByText('myOptional')
    await screen.getByText('myInnerStruct')

    const structTable = await screen.getByLabelText('struct-table')
    const structRows = within(structTable).queryAllByRole('row')
    expect(structRows.length).toBe(6)

    const headers = within(structRows[0]).queryAllByRole('columnheader')
    within(headers[0]).getByText('Struct')
    within(headers[1]).getByText('Variable')
    within(headers[2]).getByText('Type')
    within(headers[3]).getByText('Input sources')
    within(headers[4]).getByText('Attribute')

    const structCells = within(structRows[5]).queryAllByRole('cell')
    within(structCells[1]).getByText('myInnerStruct')
    const viewMyInnerStructLink = within(structCells[4]).getByText('View Struct')

    await fireEvent.click(viewMyInnerStructLink)
    const myInnerStructTable = await screen.getByLabelText('struct-table')
    const myInnerStructRows = within(myInnerStructTable).queryAllByRole('row')
    expect(myInnerStructRows.length).toBe(3)

    const myInnerStructBreadcrumbs = await screen.getByLabelText('struct-breadcrumbs')
    const myInnerStructBreadcrumbsButtons = within(myInnerStructBreadcrumbs).queryAllByRole('button')
    expect(myInnerStructBreadcrumbsButtons.length).toBe(1)
    await fireEvent.click(myInnerStructBreadcrumbsButtons[0])

    const structTable2ndView = await screen.getByLabelText('struct-table')
    const structRows2ndView = within(structTable2ndView).queryAllByRole('row')
    expect(structRows2ndView.length).toBe(6)

    const modalDoneButton = await screen.getByText('Done')
    fireEvent.click(modalDoneButton)
    await screen.findByRole('table') // there should be only one table again
  })
})

describe('SubmissionConfig submitting a run set', () => {
  beforeAll(() => {
    Object.defineProperty(HTMLElement.prototype, 'offsetHeight', { configurable: true, value: 1000 })
    Object.defineProperty(HTMLElement.prototype, 'offsetWidth', { configurable: true, value: 800 })
  })

  beforeEach(() => {
    getConfig.mockReturnValue(({ wdsUrlRoot: 'http://localhost:3000/wds' }))
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
    within(thirdInputRow[4]).getByText('Optional')

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

  it('should call POST /run_sets endpoint with expected parameters after struct has been updated', async () => {
    // ** ARRANGE **
    const mockRunSetResponse = jest.fn(() => Promise.resolve(runSetResponseWithStruct))
    const mockMethodsResponse = jest.fn(() => Promise.resolve(methodsResponse))
    const mockSearchResponse = jest.fn((_, recordType) => Promise.resolve(searchResponses[recordType]))
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
      expect(mockMethodsResponse).toHaveBeenCalledTimes(1)
      expect(mockSearchResponse).toHaveBeenCalledTimes(1)
    })


    // ** ACT **
    // user selects 'FOO1' record from Data Table
    const checkboxes = screen.getAllByRole('checkbox')
    const checkbox = checkboxes[1]
    fireEvent.click(checkbox)

    // ** ASSERT **
    // verify that the record was indeed selected
    expect(checkbox).toHaveAttribute('aria-checked', 'true')

    const inputsTabButton = await screen.findByRole('button', { name: 'Inputs' })

    // ** ACT **
    await fireEvent.click(inputsTabButton)

    // ** ASSERT **
    await screen.findByRole('table') // there should be only one table at this point

    const viewStructLink = await screen.getByText('View Struct')
    await fireEvent.click(viewStructLink)
    await screen.getByText('myInnerStruct')

    const structTable = await screen.getByLabelText('struct-table')
    const structRows = within(structTable).queryAllByRole('row')
    expect(structRows.length).toBe(6)

    // ** ACT **
    // Update the top-level struct field myPrimitive
    const myPrimitiveRowCells = within(structRows[1]).queryAllByRole('cell')
    within(myPrimitiveRowCells[1]).getByText('myPrimitive')
    const myPrimitiveInput = within(myPrimitiveRowCells[4]).getByDisplayValue('Fiesty')
    await fireEvent.change(myPrimitiveInput, { target: { value: 'Docile' } })
    within(myPrimitiveRowCells[4]).getByDisplayValue('Docile')

    // ** ACT **
    // Navigate the struct builder to myInnerStruct
    const myInnerStructRowCells = within(structRows[5]).queryAllByRole('cell')
    within(myInnerStructRowCells[1]).getByText('myInnerStruct')
    const viewMyInnerStructLink = within(myInnerStructRowCells[4]).getByText('View Struct')
    await fireEvent.click(viewMyInnerStructLink)

    const myInnerStructTable = await screen.getByLabelText('struct-table')
    const myInnerStructRows = within(myInnerStructTable).queryAllByRole('row')
    expect(myInnerStructRows.length).toBe(3)

    // ** ACT **
    // Update the struct within myInnerStruct
    const myInnermostPrimitiveRowCells = within(myInnerStructRows[1]).queryAllByRole('cell')
    within(myInnermostPrimitiveRowCells[1]).getByText('myInnermostPrimitive')
    const myInnermostPrimitiveInput = within(myInnermostPrimitiveRowCells[4]).getByDisplayValue('foo')
    await fireEvent.change(myInnermostPrimitiveInput, { target: { value: 'bar' } })
    within(myInnermostPrimitiveRowCells[4]).getByDisplayValue('bar')


    // ** ACT **
    // Exit the modal and submit
    const modalDoneButton = await screen.getByText('Done')
    fireEvent.click(modalDoneButton)
    await screen.findByRole('table') // there should be only one table again

    // ** ACT **
    // user clicks on Submit (inputs and outputs should be rendered based on previous submission)
    const submitButton = screen.getByLabelText('Submit button')
    fireEvent.click(submitButton)

    // ** ASSERT **
    // Launch modal should be displayed
    await screen.getByText('Send submission')
    const modalSubmitButton = await screen.getByLabelText('Launch Submission')

    // ** ACT **
    // user click on Submit button
    fireEvent.click(modalSubmitButton)

    // ** ASSERT **
    // assert POST /run_sets endpoint was called with expected parameters, with struct input sources updated
    expect(postRunSetFunction).toHaveBeenCalled()
    expect(postRunSetFunction).toBeCalledWith(
      expect.objectContaining({
        method_version_id: runSetResponseWithStruct.run_sets[0].method_version_id,
        workflow_input_definitions: [
          ...runSetInputDef,
          {
            input_name: myStructInput.input_name,
            input_type: myStructInput.input_type,
            source: {
              type: 'object_builder',
              fields: [
                {
                  name: 'myPrimitive',
                  source: {
                    type: 'literal',
                    parameter_value: 'Docile'
                  }
                },
                {
                  name: 'myOptional',
                  source: {
                    type: 'literal',
                    parameter_value: 'Meh'
                  }
                },
                {
                  name: 'myArray',
                  source: {
                    type: 'literal',
                    parameter_value: []
                  }
                },
                {
                  name: 'myMap',
                  source: {
                    type: 'literal',
                    parameter_value: {}
                  }
                },
                {
                  name: 'myInnerStruct',
                  source: {
                    type: 'object_builder',
                    fields: [
                      {
                        name: 'myInnermostPrimitive',
                        source: {
                          type: 'literal',
                          parameter_value: 'bar'
                        }
                      },
                      {
                        name: 'myInnermostRecordLookup',
                        source: {
                          type: 'record_lookup',
                          record_attribute: 'foo_rating'
                        }
                      }
                    ]
                  }
                }
              ]
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

describe('SubmissionConfig gets WDS url from Leo and render config page', () => {
  beforeAll(() => {
    Object.defineProperty(HTMLElement.prototype, 'offsetHeight', { configurable: true, value: 1000 })
    Object.defineProperty(HTMLElement.prototype, 'offsetWidth', { configurable: true, value: 800 })
  })

  beforeEach(() => {
    getConfig.mockReturnValue(({ leoUrlRoot: 'https://leonardo.mock.org/', wdsAppTypeNames: ['WDS', 'CROMWELL'] }))
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  afterAll(() => {
    Object.defineProperty(HTMLElement.prototype, 'offsetHeight', originalOffsetHeight)
    Object.defineProperty(HTMLElement.prototype, 'offsetWidth', originalOffsetWidth)
  })

  it('should call Leo to get WDS url and render data details', async () => {
    // ** ARRANGE **
    const mockRunSetResponse = jest.fn(() => Promise.resolve(runSetResponse))
    const mockMethodsResponse = jest.fn(() => Promise.resolve(methodsResponse))
    const mockSearchResponse = jest.fn((_, recordType) => Promise.resolve(searchResponses[recordType]))
    const mockTypesResponse = jest.fn(() => Promise.resolve(typesResponse))
    const mockWdlResponse = jest.fn(() => Promise.resolve('mock wdl response'))
    const mockLeoResponse = jest.fn(() => Promise.resolve(mockApps))

    Ajax.mockImplementation(() => {
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
        },
        WorkflowScript: {
          get: mockWdlResponse
        },
        Leonardo: {
          listAppsV2: mockLeoResponse
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
      expect(mockWdlResponse).toHaveBeenCalledTimes(1)
      expect(mockLeoResponse).toHaveBeenCalledTimes(1)
    })

    expect(screen.getByText('FOO')).toBeInTheDocument()

    const table = await screen.findByRole('table')

    const rows = within(table).queryAllByRole('row')
    expect(rows.length).toBe(5)

    const headers = within(rows[0]).queryAllByRole('columnheader')
    expect(headers.length).toBe(4)

    const cells = within(rows[1]).queryAllByRole('cell')
    expect(cells.length).toBe(4)
  })
})
