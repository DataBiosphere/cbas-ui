import '@testing-library/jest-dom'

import { buildStructBreadcrumbs } from 'src/components/StructBuilder'


describe('InputTable unit tests', () => {
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
