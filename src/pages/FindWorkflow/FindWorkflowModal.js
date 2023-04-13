import _ from 'lodash/fp'
import { Fragment, useState } from 'react'
import { div, h } from 'react-hyperscript-helpers'
import { ButtonOutline, ButtonPrimary, Clickable, Link } from 'src/components/common'
import { centeredSpinner, icon } from 'src/components/icons'
import Modal from 'src/components/Modal'
import ModalDrawer from 'src/components/ModalDrawer'
import { Ajax } from 'src/libs/ajax'
import colors from 'src/libs/colors'
import * as Nav from 'src/libs/nav'
import { notify } from 'src/libs/notifications'
import { useCancellation } from 'src/libs/react-utils'
import * as Style from 'src/libs/style'
import { withBusyState } from 'src/libs/utils'
import { MethodCard } from 'src/pages/FindWorkflow/MethodCard'


const styles = {
  findWorkflowSubHeader: selected => {
    return {
      ...Style.findWorkflowNavList.itemContainer(selected),
      ...Style.findWorkflowNavList.item(selected),
      ...(selected ? { backgroundColor: colors.accent(0.2) } : {}),
      paddingLeft: '3rem'
    }
  }
}

const suggestedWorkflowsList = [
  {
    method_name: 'Optimus',
    method_description: 'The optimus 3 pipeline processes 10x genomics sequencing data based on the v2 chemistry. It corrects cell barcodes and UMIs, aligns reads, marks duplicates, and returns data as alignments in BAM format and as counts in sparse matrix exchange format.',
    method_source: 'GitHub',
    method_version: 'Optimus_v5.5.0',
    method_url: 'https://raw.githubusercontent.com/broadinstitute/warp/develop/pipelines/skylab/optimus/Optimus.wdl'
  },
  {
    method_name: 'SmartSeq2SingleSample',
    method_description: 'Process SmartSeq2 scRNA-Seq data, include reads alignment, QC metrics collection, and gene expression quantitication.',
    method_source: 'GitHub',
    method_version: 'smartseq2_v5.1.1',
    method_url: 'https://raw.githubusercontent.com/broadinstitute/warp/develop/pipelines/skylab/smartseq2_single_sample/SmartSeq2SingleSample.wdl'
  },
  {
    method_name: 'MultiSampleSmartSeq2',
    method_description: 'The MultiSampleSmartSeq2 pipeline runs multiple SS2 samples in a single pipeline invocation',
    method_source: 'GitHub',
    method_version: 'MultiSampleSmartSeq2_v2.2.1',
    method_url: 'https://raw.githubusercontent.com/broadinstitute/warp/4fc16dc61ddc2e72cede479607643047fecf1dde/pipelines/skylab/smartseq2_multisample/MultiSampleSmartSeq2.wdl'
  },
  {
    method_name: 'MultiSampleSmartSeq2SingleNucleus',
    method_description: 'The MultiSampleSmartSeq2SingleNucleus pipeline runs multiple snSS2 samples in a single pipeline invocation',
    method_source: 'GitHub',
    method_version: 'MultiSampleSmartSeq2SingleNuclei_v1.2.14',
    method_url: 'https://raw.githubusercontent.com/broadinstitute/warp/develop/pipelines/skylab/smartseq2_single_nucleus_multisample/MultiSampleSmartSeq2SingleNucleus.wdl'
  },
  {
    method_name: 'scATAC',
    method_description: 'Processing of single-cell ATAC-seq data with the scATAC pipeline.',
    method_source: 'GitHub',
    method_version: 'scATAC 1.2.0',
    method_url: 'https://raw.githubusercontent.com/broadinstitute/warp/develop/pipelines/skylab/scATAC/scATAC.wdl'
  },
  {
    method_name: 'WholeGenomeGermlineSingleSample',
    method_description: 'Processes germline whole genome sequencing data.',
    method_source: 'GitHub',
    method_version: 'WholeGenomeGermlineSingleSample_v3.1.6',
    method_url: 'https://raw.githubusercontent.com/broadinstitute/warp/WholeGenomeGermlineSingleSample_v3.1.6/pipelines/broad/dna_seq/germline/single_sample/wgs/WholeGenomeGermlineSingleSample.wdl'
  },
  {
    method_name: 'ExomeGermlineSingleSample ',
    method_description: 'Processes germline exome/targeted sequencing data',
    method_source: 'GitHub',
    method_version: 'ExomeGermlineSingleSample_v3.0.0',
    method_url: 'https://raw.githubusercontent.com/broadinstitute/warp/ExomeGermlineSingleSample_v3.0.0/pipelines/broad/dna_seq/germline/single_sample/exome/ExomeGermlineSingleSample.wdl'
  }
]


const FindWorkflowModal = ({ onDismiss }) => {
  const [selectedSubHeader, setSelectedSubHeader] = useState('browse-suggested-workflows')
  const [loading, setLoading] = useState()
  const [workflowDescriptionModal, setWorkflowDescriptionModal] = useState(false)
  const [selectedMethod, setSelectedMethod] = useState()

  const signal = useCancellation()

  const submitMethod = withBusyState(setLoading, async method => {
    try {
      const methodPayload = {
        method_name: method.method_name,
        method_description: method.method_description,
        method_source: method.method_source,
        method_version: method.method_version,
        method_url: method.method_url
      }

      const methodObject = await Ajax(signal).Cbas.methods.post(methodPayload)
      onDismiss()
      Nav.goToPath('submission-config', {
        methodId: methodObject.method_id
      })
    } catch (error) {
      notify('error', 'Error creating new method', { detail: await (error instanceof Response ? error.text() : error) })
      onDismiss()
    }
  })

  const subHeadersMap = {
    'browse-suggested-workflows': 'Browse Suggested Workflows'
  }

  const isSubHeaderActive = subHeader => selectedSubHeader === subHeader

  const renderDetails = method => {
    // TODO: Get these values from somewhere
    //const { synopsis, managers, documentation } = selectedWorkflowDetails || {}
    const managers = ['Chris, Katrina, Michael, Saloni']

    return h(Fragment, [
      div({ style: { display: 'flex' } }, [
        div({ style: { flexGrow: 1 } }, [
          div({ style: { fontSize: 18, fontWeight: 600, margin: '1rem 0 0.5rem' } }, ['Synopsis']),
          div(['synopsis' || ('None')]),
          div({ style: { fontSize: 18, fontWeight: 600, margin: '1rem 0 0.5rem' } }, ['Method Owner']),
          div([_.join(',', managers)])
        ]),
        div({ style: { margin: '0 1rem', display: 'flex', flexDirection: 'column' } }, [
          h(ButtonPrimary,
            {
              'aria-label': 'workflow description button',
              style: { marginBottom: '0.5rem' },
              onClick: () => {
                setSelectedMethod(undefined)
                submitMethod(method)
              }
            }, ['Add to Workspace']),
          h(ButtonOutline, {
            'aria-label': 'workflow description button',
            onClick: () => {
              setSelectedMethod(undefined)
            }
          }, ['Return to List']),
          h(ButtonOutline, {
            'aria-label': 'workflow description button',
            style: { whiteSpace: 'pre-wrap', height: '3rem', textAlign: 'center', marginTop: '0.5rem' },
            onClick: () => {
              alert('download sample data alert')
            }
          }, ['Download sample data \nto run with the workflow'])
        ])
      ]),
      div({ style: { fontSize: 18, fontWeight: 600, margin: '1rem 0 0.5rem' } }, ['Documentation']),
      // documentation && h(MarkdownViewer, { style: { maxHeight: 600, overflowY: 'auto' } }, [documentation]), // TODO: needed for future iterations to view documentation
      // (!selectedWorkflowDetails || exporting) && spinnerOverlay
      div(['None'])
    ])
  }

  return h(ModalDrawer, {
    'aria-label': 'find-workflow-modal', isOpen: true, width: '70%',
    onDismiss
  }, [
    div({ style: { display: 'flex', alignItems: 'center', flex: 'none', padding: '0 20px 20px', margin: '1.5rem 0 .5rem 0rem' } }, [
      div({ style: { fontSize: 18, fontWeight: 600 } }, ['Find a Workflow']),
      div({ style: { marginLeft: 'auto', display: 'flex' } }, [
        onDismiss && h(Link, {
          'aria-label': 'Close',
          style: { marginLeft: '2rem' },
          tabIndex: 0,
          onClick: onDismiss
        }, [icon('times', { size: 30 })])
      ])
    ]),
    div({ role: 'main', style: { display: 'flex', flex: 1, height: `calc(100% - 66px)`, paddingLeft: '20px' } }, [
      div({ style: { minWidth: 330, maxWidth: 330, overflowY: 'auto' } }, [
        _.map(([subHeaderKey, subHeaderName]) => {
          const isActive = isSubHeaderActive(subHeaderKey)
          return loading ? centeredSpinner() : h(Clickable, {
            'aria-label': `${subHeaderKey}-header-button`,
            style: { ...styles.findWorkflowSubHeader(isActive), color: isActive ? colors.accent(1.1) : colors.accent(), fontSize: 16 },
            onClick: () => setSelectedSubHeader(subHeaderKey),
            hover: Style.findWorkflowNavList.itemHover(isActive),
            'aria-current': isActive,
            key: subHeaderKey
          }, [subHeaderName])
        }, Object.entries(subHeadersMap))
      ]),
      isSubHeaderActive('browse-suggested-workflows') && div({ style: { overflowY: 'auto', flexGrow: 1, display: 'flex', flexDirection: 'column', paddingLeft: '20px' } }, [
        div({ style: { display: 'flex', flexWrap: 'wrap', overflowY: 'auto', paddingBottom: 5, paddingLeft: 5 } }, [
          _.map(method => h(MethodCard, {
            method,
            onClick: () => {
              setWorkflowDescriptionModal(true)
              setSelectedMethod(method)
            },
            key: method.method_name
          }), suggestedWorkflowsList)
        ])
      ]),
      selectedMethod && workflowDescriptionModal && h(Modal, { title: `Workflow: ${selectedMethod.method_name}`, width: 900, onDismiss, showButtons: false, showX: true }, [renderDetails(selectedMethod)])
    ])
  ])
}

export default FindWorkflowModal
