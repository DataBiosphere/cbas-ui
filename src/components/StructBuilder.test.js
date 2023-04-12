import '@testing-library/jest-dom'

import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { h } from 'react-hyperscript-helpers'
import { buildStructBreadcrumbs, StructBuilder } from 'src/components/StructBuilder'


describe('unit tests', () => {
  it('should build breadcrumbs given a struct path', () => {
    const inputType = {
      type: 'struct',
      name: 'Pet',
      fields: [
        {
          field_name: 'name',
          field_type: {
            type: 'primitive',
            primitive_type: 'String'
          }
        },
        {
          field_name: 'species',
          field_type: {
            type: 'struct',
            name: 'PetSpecies',
            fields: [
              {
                field_name: 'species_name',
                field_type: {
                  type: 'primitive',
                  primitive_type: 'String'
                }
              },
              {
                field_name: 'breed_name',
                field_type: {
                  type: 'primitive',
                  primitive_type: 'String'
                }
              },
              {
                field_name: 'breed_characteristics',
                field_type: {
                  type: 'struct',
                  name: 'Characteristics',
                  fields: [
                    {
                      field_name: 'temperament',
                      field_type: {
                        type: 'primitive',
                        primitive_type: 'String'
                      }
                    },
                    {
                      field_name: 'intelligence',
                      field_type: {
                        type: 'optional',
                        optional_type: {
                          type: 'primitive',
                          primitive_type: 'String'
                        }
                      }
                    },
                    {
                      field_name: 'good_with_kids',
                      field_type: {
                        type: 'primitive',
                        primitive_type: 'String'
                      }
                    }
                  ]
                }
              }
            ]
          }
        }
      ]
    }

    expect(buildStructBreadcrumbs([1], inputType)).toEqual(['species'])
    expect(buildStructBreadcrumbs([1, 1], inputType)).toEqual(['species', 'breed_name'])
    expect(buildStructBreadcrumbs([1, 2, 0], inputType)).toEqual(['species', 'breed_characteristics', 'temperament'])
  })
})

describe('Configuration tests', () => {
  const structType = {
    type: 'struct',
    name: 'Pet',
    fields: [
      {
        field_name: 'pet_age',
        field_type: { type: 'primitive', primitive_type: 'Int' }
      }
    ]
  }

  beforeAll(() => {
    Object.defineProperty(HTMLElement.prototype, 'offsetHeight', { configurable: true, value: 1000 })
    Object.defineProperty(HTMLElement.prototype, 'offsetWidth', { configurable: true, value: 800 })
  })

  it('when an input source is selected, and the source field is empty, adopt the name found in the corresponding type specification', async () => {
    // ** ARRANGE **
    const setStructSource = jest.fn()

    // ** ACT **
    render(h(StructBuilder, {
      structType,
      setStructSource,
      structName: 'myStruct',
      structSource: {
        type: 'object_builder',
        fields: []
      },
      dataTableAttributes: {}
    }))

    // use the struct builder to set an input type, and attribute, and assert that the payload has all the required fields

    // ** ASSERT **
    const structTable = await screen.getByLabelText('struct-table')
    const structRows = within(structTable).queryAllByRole('row')
    expect(structRows.length).toBe(2)
    expect(setStructSource).toHaveBeenCalledTimes(0)

    const structCells = within(structRows[1]).queryAllByRole('cell')
    await userEvent.click(within(structCells[3]).getByText('Select Source'))
    const selectOption = await screen.findByText(`Type a Value`)
    await userEvent.click(selectOption)

    // upon selecting the source type of a previously empty source specification,
    // the struct builder source should adopt the `name` field given by the input type specification
    expect(setStructSource).toHaveBeenCalledTimes(1)
    expect(setStructSource).toHaveBeenCalledWith({
      type: 'object_builder',
      fields: [{
        name: 'pet_age',
        source: {
          parameter_value: '',
          type: 'literal'
        }
      }]
    })
  })

  it('when an input source is selected, and the source field has no name property, adopt the name found in the corresponding type specification', async () => {
    // ** ARRANGE **
    const setStructSource = jest.fn()

    // ** ACT **
    render(h(StructBuilder, {
      structType,
      setStructSource,
      structName: 'myStruct',
      structSource: {
        type: 'object_builder',
        fields: [{
          source: {
            parameter_value: '',
            type: 'literal'
          }
        }]
      },
      dataTableAttributes: {}
    }))

    // ** ASSERT **
    const structTable = await screen.getByLabelText('struct-table')
    const structRows = within(structTable).queryAllByRole('row')
    expect(structRows.length).toBe(2)
    expect(setStructSource).toHaveBeenCalledTimes(0)

    const structCells = within(structRows[1]).queryAllByRole('cell')
    await userEvent.click(within(structCells[3]).getByText('Type a Value'))
    const selectOption = await screen.findByText(`Fetch from Data Table`)
    await userEvent.click(selectOption)

    // upon selecting the source type of a previously empty source specification,
    // the struct builder source should adopt the `name` field given by the input type specification
    expect(setStructSource).toHaveBeenCalledTimes(1)
    expect(setStructSource).toHaveBeenCalledWith({
      type: 'object_builder',
      fields: [{
        name: 'pet_age',
        source: {
          record_attribute: '',
          type: 'record_lookup'
        }
      }]
    })
  })
})
