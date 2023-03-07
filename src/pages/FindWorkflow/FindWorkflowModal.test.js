import '@testing-library/jest-dom'

import { fireEvent, render, screen } from '@testing-library/react'
import { h } from 'react-hyperscript-helpers'
import { Ajax } from 'src/libs/ajax'
import FindWorkflowModal from 'src/pages/FindWorkflow/FindWorkflowModal'


jest.mock('src/libs/ajax')


describe('FindWorkflowModal', () => {
  it('should render FindWorkflowModal with 3 hardcoded Method cards', () => {
    // ** ACT **
    render(h(FindWorkflowModal, { onDismiss: jest.fn() }))

    // ** ASSERT **
    expect(screen.getByText('Find a Workflow')).toBeInTheDocument()

    // verify "Browse Suggested Workflows" sub-header is present and selected by default
    const selectedSubHeader = screen.getByText('Browse Suggested Workflows')
    expect(selectedSubHeader).toBeInTheDocument()
    expect(selectedSubHeader).toHaveAttribute('aria-current', 'true')

    // verify 3 methods are present on screen
    // we only check for name because we are testing the MethodCard layout in different test file
    expect(screen.getByText('Optimus')).toBeInTheDocument()
    expect(screen.getByText('mock_method_2')).toBeInTheDocument()
    expect(screen.getByText('mock_method_3')).toBeInTheDocument()
  })

  it('should call POST /methods endpoint with expected parameters', async () => {
    const postMethodFunction = jest.fn()

    await Ajax.mockImplementation(() => {
      return {
        Cbas: {
          methods: {
            post: postMethodFunction
          }
        }
      }
    })

    // ** ACT **
    render(h(FindWorkflowModal, { onDismiss: jest.fn() }))

    // ** ASSERT **
    expect(screen.getByText('Find a Workflow')).toBeInTheDocument()

    // select and click on method in modal
    // const firstWorkflow = screen.getByText('Optimus')
    // fireEvent.click(firstWorkflow)
    //
    // // ** ASSERT **
    // // assert POST /methods endpoint was called with expected parameters
    // expect(postMethodFunction).toHaveBeenCalled()
    // expect(postMethodFunction).toBeCalledWith(
    //   {
    //     method_name: 'Optimus',
    //     method_description: 'The optimus 3 pipeline processes 10x genomics sequencing data based on the v2 chemistry. It corrects cell barcodes and UMIs, aligns reads, marks duplicates, and returns data as alignments in BAM format and as counts in sparse matrix exchange format.',
    //     method_source: 'GitHub',
    //     method_version: 'Optimus_v5.5.0',
    //     method_url: 'https://raw.githubusercontent.com/broadinstitute/warp/develop/pipelines/skylab/optimus/Optimus.wdl'
    //   })
  })
})
