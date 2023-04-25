import _ from 'lodash/fp'
import { Fragment, useState } from 'react'
import { div, h, h2 } from 'react-hyperscript-helpers'
import { ButtonPrimary, Clickable, Link } from 'src/components/common'
import HelpfulLinksBox from 'src/components/HelpfulLinksBox'
import { centeredSpinner, icon } from 'src/components/icons'
import { TextInput } from 'src/components/input'
import ModalDrawer from 'src/components/ModalDrawer'
import { Ajax } from 'src/libs/ajax'
import colors from 'src/libs/colors'
import { getConfig } from 'src/libs/config'
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
    method_name: 'ExomeGermlineSingleSample',
    method_description: 'Processes germline exome/targeted sequencing data',
    method_source: 'GitHub',
    method_version: 'ExomeGermlineSingleSample_v3.0.0',
    method_url: 'https://raw.githubusercontent.com/broadinstitute/warp/ExomeGermlineSingleSample_v3.0.0/pipelines/broad/dna_seq/germline/single_sample/exome/ExomeGermlineSingleSample.wdl'
  }
]


const FindWorkflowModal = ({ onDismiss }) => {
  const [selectedSubHeader, setSelectedSubHeader] = useState('browse-suggested-workflows')
  const [loading, setLoading] = useState()
  const [workflowName, setWorkflowName] = useState('')
  const [versionName, setVersionName] = useState('')
  const [methodUrl, setMethodUrl] = useState('')

  const signal = useCancellation()

  const submitMethod = withBusyState(setLoading, async method => {
    try {
      const rawGithubUrl = reconstructToRawUrl(method.method_url)

      const methodPayload = {
        method_name: method.method_name,
        method_description: method.method_description,
        method_source: method.method_source,
        method_version: method.method_version,
        method_url: rawGithubUrl
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

  const reconstructToRawUrl = url => {
    // mapping of searchValues (key) and their replaceValue (value)
    const mapObj = {
      github: 'raw.githubusercontent',
      'blob/': ''
    }
    try {
      url = url.replace(/\b(?:github|blob\/)\b/gi, matched => mapObj[matched])
    } catch (error) {
      notify('error', 'Error creating new method', { detail: (error instanceof Response ? error.text() : error) })
      onDismiss()
    }

    return url
  }

  const subHeadersMap = {
    'browse-suggested-workflows': 'Browse Suggested Workflows',
    ...(getConfig().isURLEnabled && { 'add-a-workflow-link': 'Add a Workflow Link' })
  }

  const isSubHeaderActive = subHeader => selectedSubHeader === subHeader

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
          _.map(method => h(MethodCard, { method, onClick: () => submitMethod(method), key: method.method_name }), suggestedWorkflowsList)
        ])
      ]),
      getConfig().isURLEnabled && isSubHeaderActive('add-a-workflow-link') && div({ style: { marginLeft: '4rem' } }, [
        div({ style: { width: 500 } }, [h2(['Workflow Link'])]),
        div({}, [
          h(TextInput, {
            style: { width: 500 },
            placeholder: 'Paste Github Link',
            value: methodUrl,
            onChange: u => setMethodUrl(u),
            'aria-label': 'Github link input'
          })
        ]),
        div({ style: { marginTop: '3rem', width: 500 } }, [
          h2(['New Workflow Name / Version'])
        ]),
        div({}, [h(Fragment, [
          h(TextInput, {
            style: { width: 200 },
            placeholder: 'Workflow name',
            value: workflowName,
            onChange: w => setWorkflowName(w),
            'aria-label': 'Workflow name input'
          }), ' / ',
          h(TextInput, {
            style: { width: 200 },
            placeholder: 'Version',
            value: versionName,
            onChange: v => setVersionName(v),
            'aria-label': 'Version name input'
          })
        ])]),
        div({}, [h(ButtonPrimary, {
          style: { marginTop: '2rem' },
          'aria-label': 'Add to Workspace button',
          onClick: () => submitMethod({ method_name: workflowName, method_version: versionName, method_url: methodUrl, method_source: 'GitHub' })
        }, ['Add to Workspace'])])
      ]),
      div({ style: { marginLeft: '3rem', marginRight: '1.5rem', width: '100%' } }, [h(HelpfulLinksBox)])
    ])
  ])
}

export default FindWorkflowModal
