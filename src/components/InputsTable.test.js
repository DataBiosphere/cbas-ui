import '@testing-library/jest-dom'

import { buildStructBuilderBreadcrumbs, buildStructInputTypePath, buildStructNamePath, buildStructSourcePath } from 'src/components/InputsTable'


describe('InputTable unit tests', () => {
  it('should build struct paths for input type', () => {
    expect(buildStructInputTypePath([2])).toBe('2.input_type')
    expect(buildStructInputTypePath([2, 1])).toBe('2.input_type.fields.1.field_type')
    expect(buildStructInputTypePath([2, 1, 3, 5])).toBe('2.input_type.fields.1.field_type.fields.3.field_type.fields.5.field_type')
  })

  it('should build struct paths for source', () => {
    expect(buildStructSourcePath([2])).toBe('2.source')
    expect(buildStructSourcePath([2, 1])).toBe('2.source.fields.1.source')
    expect(buildStructSourcePath([2, 1, 3, 5])).toBe('2.source.fields.1.source.fields.3.source.fields.5.source')
  })

  it('should build struct paths for name', () => {
    expect(buildStructNamePath([2])).toBe('2.variable')
    expect(buildStructNamePath([2, 1])).toBe('2.input_type.fields.1.field_name')
    expect(buildStructNamePath([2, 1, 3, 5])).toBe('2.input_type.fields.1.field_type.fields.3.field_type.fields.5.field_name')
  })

  it('should build breadcrumbs given a struct path', () => {
    const inputTableData = [{
      input_name: 'myWorkflow.myTask.myStruct',
      input_type: {
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
      },
      variable: 'myStruct'
    }]

    expect(buildStructBuilderBreadcrumbs([0], inputTableData)).toEqual(['myStruct'])
    expect(buildStructBuilderBreadcrumbs([0, 1], inputTableData)).toEqual(['myStruct', 'species'])
    expect(buildStructBuilderBreadcrumbs([0, 1, 2], inputTableData)).toEqual(['myStruct', 'species', 'breed_characteristics'])
  })
})
