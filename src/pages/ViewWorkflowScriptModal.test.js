import '@testing-library/jest-dom'

import ViewWorkflowScriptModal from 'src/pages/ViewWorkflowScriptModal'
import { render, screen } from '@testing-library/react'
import { h } from 'react-hyperscript-helpers'


describe('ViewWorkflowScriptModal', () => {

  it('should render workflow details', async () => {
    // ** ARRANGE **
    // WDL location: https://raw.githubusercontent.com/broadinstitute/cromwell/develop/centaur/src/main/resources/standardTestCases/hello/hello.wdl
    const helloWdlScript = "task hello {,  String addressee,  command {,    echo \"Hello ${addressee}!\",  },  output {,    String salutation = read_string(stdout()),  },  runtime {,    docker: \"ubuntu@sha256:71cd81252a3563a03ad8daee81047b62ab5d892ebbfbf71cf53415f29c130950\",  },},,workflow wf_hello {,  call hello,  output {,     hello.salutation,  },}"

    // ** ACT **
    render(h(ViewWorkflowScriptModal, { workflowScript: helloWdlScript, onDismiss: jest.fn() }))

    // ** ASSERT **
    expect(screen.getByText('Workflow Script')).toBeInTheDocument()
    expect(screen.findByRole('code')).toBeTruthy()

    // WdlViewer has different class for each type of element in the WDL (keyword, punctuation, string, operator, etc.).
    // As a result it is not possible to search for entire strings like "task hello" even though they appear on same line when rendered.
    // React testing library also doesn't provide an easy way to get elements by class. Hence, instead we check that unique text does indeed render on screen as expected
    expect(screen.getByText('task')).toBeInTheDocument()
    expect(screen.getByText('workflow')).toBeInTheDocument()
    expect(screen.getByText('command')).toBeInTheDocument()
    expect(screen.getByText('"Hello ${addressee}!"')).toBeInTheDocument()
    expect(screen.getByText('wf_hello')).toBeInTheDocument()
    expect(screen.getByText('"ubuntu@sha256:71cd81252a3563a03ad8daee81047b62ab5d892ebbfbf71cf53415f29c130950"')).toBeInTheDocument()
  })
})
