import '@testing-library/jest-dom'
import { render } from '@testing-library/react'
import { h } from 'react-hyperscript-helpers'
import { SavedWorkflows } from 'src/pages/SavedWorkflows'

describe('Saved Workflows page', () => {
  it('should properly display 2 saved workflows', () => {
    const runsData = [
      {
        name: '1-simple-hello-world-1',
        state: 'Submitted',
        submission_date: '2022-01-27T22:27:15.591Z'
      },
      {
        name: '2-mock-abc-1',
        state: 'Failed',
        submission_date: '2022-07-14T22:22:15.591Z'
      }
    ]
    const { savedWorkflows } = render(h(SavedWorkflows(runsData)))
    const table = savedWorkflows('table')
    console.log(savedWorkflows)
  })
})
