import _ from 'lodash/fp'
import { Fragment, useState } from 'react'
import { div, h, h2, span } from 'react-hyperscript-helpers'
import { ButtonOutline, ButtonPrimary, headerBar } from 'src/components/common'
import { Ajax } from 'src/libs/ajax'
import * as Nav from 'src/libs/nav'
import { notify } from 'src/libs/notifications'
import { useCancellation, useOnMount } from 'src/libs/react-utils'
import { SavedWorkflows } from 'src/pages/SavedWorkflows'
import { WorkflowInputs } from 'src/pages/WorkflowInputs'
import { WorkflowSource } from 'src/pages/WorkflowSource'


export const SubmitWorkflow = () => {
  // State
  const [workflowUrl, setWorkflowUrl] = useState()
  const [workflowInputsDefinition, setWorkflowInputsDefinition] = useState()
  const [workflowOutputsDefinition, setWorkflowOutputsDefinition] = useState()
  const [recordType, setRecordType] = useState('')
  const [recordId, setRecordId] = useState('')
  const [showInputsPage, setShowInputsPage] = useState(false)
  const [cbasStatus, setCbasStatus] = useState()
  const [runsData, setRunsData] = useState()

  const signal = useCancellation()

  useOnMount(() => {
    const loadCbasStatus = async () => {
      const cbasStatus = await Ajax(signal).Cbas.status()
      setCbasStatus(cbasStatus)
    }

    const loadRunsData = async () => {
      try {
        const runs = await Ajax(signal).Cbas.methods.get()
        setRunsData(runs.methods)
      } catch (error) {
        notify('error', 'Error loading saved workflows', { detail: await (error instanceof Response ? error.text() : error) })
      }
    }

    loadCbasStatus()
    loadRunsData()
  })

  const submitRun = async () => {
    try {
      const runSetsPayload = {
        workflow_url: workflowUrl,
        workflow_input_definitions: JSON.parse(workflowInputsDefinition),
        workflow_output_definitions: _.isEmpty(workflowOutputsDefinition) ? [] : JSON.parse(workflowOutputsDefinition),
        wds_records: {
          record_type: recordType,
          record_ids: JSON.parse(recordId)
        }
      }

      await Ajax(signal).Cbas.runSets.post(runSetsPayload)
      notify('success', 'Workflow successfully submitted', { message: 'You may check on the progress of workflow on this page anytime.', timeout: 5000 })
      Nav.goToPath('submission-history')
    } catch (error) {
      notify('error', 'Error submitting workflow', { detail: await (error instanceof Response ? error.text() : error) })
    }
  }

  return div([
    headerBar(),
    div({ style: { margin: '4rem' } }, [
      div({ style: { display: 'flex', marginTop: '1rem', justifyContent: 'space-between' } }, [
        h2(['Submit a workflow']),
        h(ButtonOutline, {
          onClick: () => Nav.goToPath('submission-history')
        }, ['Submission history'])
      ]),
      div(['Run a workflow in Terra using Cromwell engine. Full feature workflow submission coming soon.']),
      div({ style: { marginTop: '3rem' } }, [
        !showInputsPage && h(Fragment, [
          h(SavedWorkflows,  { runsData, setWorkflowUrl, setShowInputsPage })
        ]),
        showInputsPage && h(Fragment, [
          h(WorkflowInputs, { workflowUrl, recordType, setRecordType, recordId, setRecordId, workflowInputsDefinition, setWorkflowInputsDefinition, workflowOutputsDefinition, setWorkflowOutputsDefinition }),
          div({ style: { display: 'flex', marginTop: '1rem', justifyContent: 'space-between' } }, [
            'Outputs will be saved to cloud storage',
            div([
              h(ButtonOutline, {
                onClick: () => setShowInputsPage(false)
              }, ['Change selected workflow']),
              h(ButtonPrimary, {
                style: { marginLeft: '1rem' },
                disabled: !workflowInputsDefinition,
                onClick: () => submitRun()
              }, ['Run workflow'])
            ])
          ])
        ]),
        div({ style: { bottom: 0, position: 'absolute', marginBottom: '1em' } }, [
          span(['CBAS Status OK: ']),
          cbasStatus && span([JSON.stringify(cbasStatus.ok)])
        ])
      ])
    ])
  ])
}

// For now, this will be our Landing page. It might be changed later on.
export const navPaths = [
  {
    name: 'root',
    path: '/',
    component: SubmitWorkflow,
    public: true
  }
]
