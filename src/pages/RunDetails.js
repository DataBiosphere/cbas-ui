
import { countBy, every, filter, flattenDepth, flow, includes, isEmpty, keys, map, min, sortBy, startCase, values } from 'lodash/fp'
import { Fragment, useMemo, useRef, useState } from 'react'
import { div, h } from 'react-hyperscript-helpers'
import ReactJson from 'react-json-view'
import Collapse from 'src/components/Collapse'
import { ClipboardButton, Link, Navbar } from 'src/components/common'
import { centeredSpinner, icon } from 'src/components/icons'
import {
  collapseCromwellStatus, collapseStatus,
  HeaderSection,
  makeSection, makeStatusLine, statusType,
  SubmitNewWorkflowButton
} from 'src/components/job-common'
//  Q4-2022 Disable log-viewing
//import UriViewer from 'src/components/UriViewer'
import WDLViewer from 'src/components/WDLViewer'
import { Ajax } from 'src/libs/ajax'
import { useCancellation, useOnMount } from 'src/libs/react-utils'
import { codeFont, elements } from 'src/libs/style'
import { cond, makeCompleteDate, newTabLinkProps } from 'src/libs/utils'
import CallTable from 'src/pages/workspaces/workspace/jobHistory/CallTable'


const commonStatuses = ['submitted', 'waitingForQuota', 'running', 'succeeded', 'failed']

const styles = {
  sectionTableLabel: { fontWeight: 600 }
}

// Note: this can take a while with large data inputs. Consider memoization if the page ever needs re-rendering.
const groupCallStatuses = flow(
  values,
  flattenDepth(1),
  countBy(a => {
    const collapsedStatus = collapseCromwellStatus(a.executionStatus, a.backendStatus)
    return collapsedStatus !== statusType.unknown ? collapsedStatus.id : collapsedStatus.label(a.executionStatus)
  })
)

const statusCell = ({ calls }) => {
  const statusGroups = groupCallStatuses(calls)
  const makeRow = (count, status, labelOverride) => {
    const seeMore = !!status.moreInfoLink ? h(Link, { href: status.moreInfoLink, style: { marginLeft: '0.50rem' }, ...newTabLinkProps },
      [status.moreInfoLabel, icon('pop-out', { size: 12, style: { marginLeft: '0.25rem' } })]) : ''
    return !!count && div({ style: { display: 'flex', alignItems: 'center', marginTop: '0.25rem' } }, [
      status.icon(),
      ` ${count} ${!!labelOverride ? labelOverride : status.label()}`,
      seeMore
    ])
  }
  const status = commonStatuses.filter(
    s => statusGroups[s]).map(s => makeRow(statusGroups[s], statusType[s]))
  return h(Fragment, status)
}

// Filter function that only displays rows based on task name search parameters
// NOTE: the viewable call should have the task name stored on the call instance itself, should be done via pre-processing step
export const taskNameFilterFn = searchTerm => filter(call => call?.taskName?.includes(searchTerm))
export const statusFilterFn = status => filter(call => call.uiStatusLabel.toLocaleLowerCase() === status.toLocaleLowerCase())

//Helper function to generate base table data for unfiltered view
//Filter functions/selections should act on this data, not the workflow source data
//Flag the latest attempt as latest for table row updates
export const generateCallTableData = tasks => {
  const clonedTasks = structuredClone(tasks)
  const taskNames = Object.keys(clonedTasks)
  return taskNames.flatMap(taskName => {
    const attempts = clonedTasks[taskName]
    const maxAttempt = attempts.length
    const calls = attempts.map(call => {
      call.taskName = taskName
      //Nullish coalescing operator to set latest to true if attempt value is the max attempt
      call.latest ??= call.attempt === maxAttempt
      //assigning status styling object for use in call table
      const cromwellStatusObj = collapseCromwellStatus(call.executionStatus, call.backendStatus)
      call.statusObj = cromwellStatusObj
      return call
    })
    //localeCompare returns a negative, positive, or 0 when comparing strings
    //so the line before is a shorthand for sorting by taskName, then by attempt
    return calls.sort((a, b) => a.taskName.localeCompare(b.taskName) || b.attempt - a.attempt)
  })
}

export const RunDetails = ({ submissionId, workflowId }) => {
  /*
   * State setup
   */
  const [workflow, setWorkflow] = useState()
  const [tableData, setTableData] = useState([])
  //Q4-2022 Disable log-viewing
  //const [showLog, setShowLog] = useState(false)

  const signal = useCancellation()
  const stateRefreshTimer = useRef()

  /*
   * Data fetchers
   */

  useOnMount(() => {
    const loadWorkflow = async () => {
      const includeKey = [
        'end', 'executionStatus', 'failures', 'start', 'status', 'submittedFiles:workflow', 'workflowLog', 'workflowRoot',
        'backendStatus'
      ]
      const excludeKey = []

      //NOTE: below is mock metadata for local development
      //Remove before submitting PR
      const metadata = {
        workflowName: 'fetch_sra_to_bam',
        workflowProcessingEvents: [
          {
            cromwellId: 'cromid-bbd63bf',
            description: 'Finished',
            timestamp: '2023-04-20T14:27:29.669Z',
            cromwellVersion: '86-b568fac'
          },
          {
            cromwellId: 'cromid-bbd63bf',
            description: 'PickedUp',
            timestamp: '2023-04-20T14:16:46.886Z',
            cromwellVersion: '86-b568fac'
          }
        ],
        actualWorkflowLanguageVersion: '1.0',
        submittedFiles: {
          workflow:
            'version 1.0\n\nimport "../tasks/tasks_ncbi_tools.wdl" as ncbi_tools\n\nworkflow fetch_sra_to_bam {\n    meta {\n        description: "Retrieve reads from the NCBI Short Read Archive in unaligned BAM format with relevant metadata encoded."\n        author: "Broad Viral Genomics"\n        email:  "viral-ngs@broadinstitute.org"\n        allowNestedInputs: true\n    }\n\n    call ncbi_tools.Fetch_SRA_to_BAM\n\n    output {\n        File   reads_ubam                = Fetch_SRA_to_BAM.reads_ubam\n        String sequencing_center         = Fetch_SRA_to_BAM.sequencing_center\n        String sequencing_platform       = Fetch_SRA_to_BAM.sequencing_platform\n        String sequencing_platform_model = Fetch_SRA_to_BAM.sequencing_platform_model\n        String biosample_accession       = Fetch_SRA_to_BAM.biosample_accession\n        String library_id                = Fetch_SRA_to_BAM.library_id\n        String run_date                  = Fetch_SRA_to_BAM.run_date\n        String sample_collection_date    = Fetch_SRA_to_BAM.sample_collection_date\n        String sample_collected_by       = Fetch_SRA_to_BAM.sample_collected_by\n        String sample_strain             = Fetch_SRA_to_BAM.sample_strain\n        String sample_geo_loc            = Fetch_SRA_to_BAM.sample_geo_loc\n        File   sra_metadata              = Fetch_SRA_to_BAM.sra_metadata\n    }\n}\n',
          root: '',
          options:
            '{\n  "final_workflow_log_dir": "https://lz0d5275bdd36d3e6a22a130.blob.core.windows.net/sc-af87d167-4fcf-43f4-8447-555010fc2ac8/workspace-services/cbas/wds-af87d167-4fcf-43f4-8447-555010fc2ac8/cromwell-workflow-logs"\n}',
          inputs: '{"fetch_sra_to_bam.Fetch_SRA_to_BAM.SRA_ID":"SRR11954115"}',
          workflowUrl: 'https://raw.githubusercontent.com/broadinstitute/viral-pipelines/v2.1.33.16/pipes/WDL/workflows/fetch_sra_to_bam.wdl',
          labels: '{}'
        },
        calls: {
          'fetch_sra_to_bam.Fetch_SRA_to_BAM': [
            {
              executionStatus: 'Done',
              stdout:
                'https://lz0d5275bdd36d3e6a22a130.blob.core.windows.net/sc-af87d167-4fcf-43f4-8447-555010fc2ac8/workspace-services/cbas/wds-af87d167-4fcf-43f4-8447-555010fc2ac8/fetch_sra_to_bam/56ee000a-3e05-4f21-b4c7-772627729b02/call-Fetch_SRA_to_BAM/execution/stdout',
              commandLine:
                "set -e\n# fetch SRA metadata on this record\nesearch -db sra -q \"SRR11954115\" | efetch -mode json -json > SRA.json\ncp SRA.json \"SRR11954115.json\"\n\n# pull reads from SRA and make a fully annotated BAM -- must succeed\nCENTER=$(jq -r .EXPERIMENT_PACKAGE_SET.EXPERIMENT_PACKAGE.SUBMISSION.center_name SRA.json)\nPLATFORM=$(jq -r '.EXPERIMENT_PACKAGE_SET.EXPERIMENT_PACKAGE.EXPERIMENT.PLATFORM | keys[] as $k | \"\\($k)\"' SRA.json)\nMODEL=$(jq -r \".EXPERIMENT_PACKAGE_SET.EXPERIMENT_PACKAGE.EXPERIMENT.PLATFORM.$PLATFORM.INSTRUMENT_MODEL\" SRA.json)\nSAMPLE=$(jq -r '.EXPERIMENT_PACKAGE_SET.EXPERIMENT_PACKAGE.SAMPLE.IDENTIFIERS.EXTERNAL_ID|select(.namespace == \"BioSample\")|.content' SRA.json)\nLIBRARY=$(jq -r .EXPERIMENT_PACKAGE_SET.EXPERIMENT_PACKAGE.EXPERIMENT.alias SRA.json)\nRUNDATE=$(jq -r '.EXPERIMENT_PACKAGE_SET.EXPERIMENT_PACKAGE.RUN_SET.RUN.SRAFiles|if (.SRAFile|type) == \"object\" then .SRAFile.date else [.SRAFile[]|select(.supertype == \"Original\")][0].date end' SRA.json | cut -f 1 -d ' ')\n\nif [ \"$PLATFORM\" = \"OXFORD_NANOPORE\" ]; then\n    # per the SAM/BAM specification\n    SAM_PLATFORM=\"ONT\"\nelse\n    SAM_PLATFORM=\"$PLATFORM\"\nfi\n\nsam-dump --unaligned --header \"SRR11954115\" \\\n    | samtools view -bhS - \\\n    > temp.bam\npicard AddOrReplaceReadGroups \\\n    I=temp.bam \\\n    O=\"SRR11954115.bam\" \\\n    RGID=1 \\\n    RGLB=\"$LIBRARY\" \\\n    RGSM=\"$SAMPLE\" \\\n    RGPL=\"$SAM_PLATFORM\" \\\n    RGPU=\"$LIBRARY\" \\\n    RGPM=\"$MODEL\" \\\n    RGDT=\"$RUNDATE\" \\\n    RGCN=\"$CENTER\" \\\n    VALIDATION_STRINGENCY=SILENT\nrm temp.bam\nsamtools view -H \"SRR11954115.bam\"\n\n# emit numeric WDL outputs\necho $CENTER > OUT_CENTER\necho $PLATFORM > OUT_PLATFORM\necho $SAMPLE > OUT_BIOSAMPLE\necho $LIBRARY > OUT_LIBRARY\necho $RUNDATE > OUT_RUNDATE\nsamtools view -c \"SRR11954115.bam\" | tee OUT_NUM_READS\n\n# pull other metadata from SRA -- allow for silent failures here!\ntouch OUT_MODEL OUT_COLLECTION_DATE OUT_STRAIN OUT_COLLECTED_BY OUT_GEO_LOC\nset +e\njq -r \\\n    .EXPERIMENT_PACKAGE_SET.EXPERIMENT_PACKAGE.EXPERIMENT.PLATFORM.\"$PLATFORM\".INSTRUMENT_MODEL \\\n    SRA.json | tee OUT_MODEL\njq -r \\\n    '.EXPERIMENT_PACKAGE_SET.EXPERIMENT_PACKAGE.SAMPLE.SAMPLE_ATTRIBUTES.SAMPLE_ATTRIBUTE[]|select(.TAG == \"collection_date\" or .TAG==\"collection date\")|.VALUE' \\\n    SRA.json | tee OUT_COLLECTION_DATE\njq -r \\\n    '.EXPERIMENT_PACKAGE_SET.EXPERIMENT_PACKAGE.SAMPLE.SAMPLE_ATTRIBUTES.SAMPLE_ATTRIBUTE[]|select(.TAG == \"strain\")|.VALUE' \\\n    SRA.json | tee OUT_STRAIN\njq -r \\\n    '.EXPERIMENT_PACKAGE_SET.EXPERIMENT_PACKAGE.SAMPLE.SAMPLE_ATTRIBUTES.SAMPLE_ATTRIBUTE[]|select(.TAG == \"collected_by\" or .TAG == \"collecting institution\")|.VALUE' \\\n    SRA.json | tee OUT_COLLECTED_BY\njq -r \\\n    '.EXPERIMENT_PACKAGE_SET.EXPERIMENT_PACKAGE.SAMPLE.SAMPLE_ATTRIBUTES.SAMPLE_ATTRIBUTE[]|select(.TAG == \"geo_loc_name\" or .TAG == \"geographic location (country and/or sea)\")|.VALUE' \\\n    SRA.json | tee OUT_GEO_LOC\njq -r \\\n    '.EXPERIMENT_PACKAGE_SET.EXPERIMENT_PACKAGE.EXPERIMENT.DESIGN.LIBRARY_DESCRIPTOR.LIBRARY_STRATEGY' \\\n    SRA.json | tee OUT_LIBRARY_STRATEGY\n\nset -e\npython3 << CODE\nimport json\nwith open('SRA.json', 'rt') as inf:\n    meta = json.load(inf)\n# reorganize to look more like a biosample attributes tsv\nbiosample = dict((x['TAG'],x['VALUE']) for x in meta['EXPERIMENT_PACKAGE_SET']['EXPERIMENT_PACKAGE']['SAMPLE']['SAMPLE_ATTRIBUTES']['SAMPLE_ATTRIBUTE'])\nbiosample['accession'] = meta['EXPERIMENT_PACKAGE_SET']['EXPERIMENT_PACKAGE']['SAMPLE']['IDENTIFIERS']['EXTERNAL_ID']['content']\nbiosample['message'] = 'Successfully loaded'\nbiosample['bioproject_accession'] = meta['EXPERIMENT_PACKAGE_SET']['EXPERIMENT_PACKAGE']['STUDY']['IDENTIFIERS']['EXTERNAL_ID']['content']\nbiosample['sample_name'] = biosample['isolate']\nfor k,v in biosample.items():\n    if v == 'not provided':\n        biosample[k] = ''\n\n# British to American conversions (NCBI vs ENA)\nus_to_uk = {\n    'sample_name': 'Sample Name',\n    'isolate': 'Sample Name',\n    'collected_by': 'collecting institution',\n    'collection_date': 'collection date',\n    'geo_loc_name': 'geographic location (country and/or sea)',\n    'host': 'host scientific name',\n}\nfor key_us, key_uk in us_to_uk.items():\n    if not biosample.get(key_us,''):\n        biosample[key_us] = biosample.get(key_uk,'')\n\n# write outputs\nwith open('SRR11954115-biosample_attributes.json', 'wt') as outf:\n    json.dump(biosample, outf)\nCODE",
              shardIndex: -1,
              outputs: {
                library_id: 'SAMN14938612_Next_1_ERCC-42',
                sample_collection_date: '2020-03-10',
                biosample_accession: 'SAMN14938612',
                run_date: '2020-06-08',
                sra_metadata:
                  'https://lz0d5275bdd36d3e6a22a130.blob.core.windows.net/sc-af87d167-4fcf-43f4-8447-555010fc2ac8/workspace-services/cbas/wds-af87d167-4fcf-43f4-8447-555010fc2ac8/fetch_sra_to_bam/56ee000a-3e05-4f21-b4c7-772627729b02/call-Fetch_SRA_to_BAM/execution/SRR11954115.json',
                library_strategy: 'RNA-Seq',
                num_reads: 405900,
                sequencing_center: 'Broad Institute of Harvard and MIT',
                reads_ubam:
                  'https://lz0d5275bdd36d3e6a22a130.blob.core.windows.net/sc-af87d167-4fcf-43f4-8447-555010fc2ac8/workspace-services/cbas/wds-af87d167-4fcf-43f4-8447-555010fc2ac8/fetch_sra_to_bam/56ee000a-3e05-4f21-b4c7-772627729b02/call-Fetch_SRA_to_BAM/execution/SRR11954115.bam',
                sample_strain: 'not applicable',
                biosample_attributes_json:
                  'https://lz0d5275bdd36d3e6a22a130.blob.core.windows.net/sc-af87d167-4fcf-43f4-8447-555010fc2ac8/workspace-services/cbas/wds-af87d167-4fcf-43f4-8447-555010fc2ac8/fetch_sra_to_bam/56ee000a-3e05-4f21-b4c7-772627729b02/call-Fetch_SRA_to_BAM/execution/SRR11954115-biosample_attributes.json',
                sample_geo_loc: 'USA: Massachusetts',
                sequencing_platform: 'ILLUMINA',
                sample_collected_by: 'Massachusetts General Hospital',
                sequencing_platform_model: 'Illumina HiSeq 2500'
              },
              runtimeAttributes: {
                preemptible: 'true',
                disk: '750 GB',
                failOnStderr: 'false',
                disks: 'local-disk 750 LOCAL',
                continueOnReturnCode: '0',
                docker: 'quay.io/broadinstitute/ncbi-tools:2.10.7.10',
                maxRetries: '2',
                cpu: '2',
                memory: '6 GB'
              },
              callCaching: {
                allowResultReuse: false,
                effectiveCallCachingMode: 'CallCachingOff'
              },
              inputs: {
                docker: 'quay.io/broadinstitute/ncbi-tools:2.10.7.10',
                disk_size: 750,
                SRA_ID: 'SRR11954115',
                machine_mem_gb: null
              },
              returnCode: 0,
              jobId: '56ee000a_06b7b2d4bcdb4598a7df6b6acc60418a',
              backend: 'TES',
              start: '2023-04-20T14:16:48.086Z',
              backendStatus: 'Complete',
              compressedDockerSize: 1339143280,
              end: '2023-04-20T14:27:27.707Z',
              dockerImageUsed: 'quay.io/broadinstitute/ncbi-tools@sha256:c6228528a9fa7d3abd78d40821231ec49c122f8c10bb27ae603540c46fc05797',
              stderr:
                'https://lz0d5275bdd36d3e6a22a130.blob.core.windows.net/sc-af87d167-4fcf-43f4-8447-555010fc2ac8/workspace-services/cbas/wds-af87d167-4fcf-43f4-8447-555010fc2ac8/fetch_sra_to_bam/56ee000a-3e05-4f21-b4c7-772627729b02/call-Fetch_SRA_to_BAM/execution/stderr',
              callRoot:
                'https://lz0d5275bdd36d3e6a22a130.blob.core.windows.net/sc-af87d167-4fcf-43f4-8447-555010fc2ac8/workspace-services/cbas/wds-af87d167-4fcf-43f4-8447-555010fc2ac8/fetch_sra_to_bam/56ee000a-3e05-4f21-b4c7-772627729b02/call-Fetch_SRA_to_BAM',
              attempt: 1,
              executionEvents: [
                {
                  startTime: '2023-04-20T14:16:48.086Z',
                  description: 'Pending',
                  endTime: '2023-04-20T14:16:48.087Z'
                },
                {
                  startTime: '2023-04-20T14:16:50.758Z',
                  description: 'RunningJob',
                  endTime: '2023-04-20T14:27:27.561Z'
                },
                {
                  startTime: '2023-04-20T14:27:27.561Z',
                  description: 'UpdatingJobStore',
                  endTime: '2023-04-20T14:27:27.707Z'
                },
                {
                  startTime: '2023-04-20T14:16:48.087Z',
                  description: 'RequestingExecutionToken',
                  endTime: '2023-04-20T14:16:50.735Z'
                },
                {
                  startTime: '2023-04-20T14:16:50.735Z',
                  description: 'WaitingForValueStore',
                  endTime: '2023-04-20T14:16:50.736Z'
                },
                {
                  startTime: '2023-04-20T14:16:50.736Z',
                  description: 'PreparingJob',
                  endTime: '2023-04-20T14:16:50.758Z'
                }
              ]
            },
            {
              executionStatus: 'Failed',
              stdout:
                'https://lz0d5275bdd36d3e6a22a130.blob.core.windows.net/sc-af87d167-4fcf-43f4-8447-555010fc2ac8/workspace-services/cbas/wds-af87d167-4fcf-43f4-8447-555010fc2ac8/fetch_sra_to_bam/56ee000a-3e05-4f21-b4c7-772627729b02/call-Fetch_SRA_to_BAM/execution/stdout',
              commandLine:
                "set -e\n# fetch SRA metadata on this record\nesearch -db sra -q \"SRR11954115\" | efetch -mode json -json > SRA.json\ncp SRA.json \"SRR11954115.json\"\n\n# pull reads from SRA and make a fully annotated BAM -- must succeed\nCENTER=$(jq -r .EXPERIMENT_PACKAGE_SET.EXPERIMENT_PACKAGE.SUBMISSION.center_name SRA.json)\nPLATFORM=$(jq -r '.EXPERIMENT_PACKAGE_SET.EXPERIMENT_PACKAGE.EXPERIMENT.PLATFORM | keys[] as $k | \"\\($k)\"' SRA.json)\nMODEL=$(jq -r \".EXPERIMENT_PACKAGE_SET.EXPERIMENT_PACKAGE.EXPERIMENT.PLATFORM.$PLATFORM.INSTRUMENT_MODEL\" SRA.json)\nSAMPLE=$(jq -r '.EXPERIMENT_PACKAGE_SET.EXPERIMENT_PACKAGE.SAMPLE.IDENTIFIERS.EXTERNAL_ID|select(.namespace == \"BioSample\")|.content' SRA.json)\nLIBRARY=$(jq -r .EXPERIMENT_PACKAGE_SET.EXPERIMENT_PACKAGE.EXPERIMENT.alias SRA.json)\nRUNDATE=$(jq -r '.EXPERIMENT_PACKAGE_SET.EXPERIMENT_PACKAGE.RUN_SET.RUN.SRAFiles|if (.SRAFile|type) == \"object\" then .SRAFile.date else [.SRAFile[]|select(.supertype == \"Original\")][0].date end' SRA.json | cut -f 1 -d ' ')\n\nif [ \"$PLATFORM\" = \"OXFORD_NANOPORE\" ]; then\n    # per the SAM/BAM specification\n    SAM_PLATFORM=\"ONT\"\nelse\n    SAM_PLATFORM=\"$PLATFORM\"\nfi\n\nsam-dump --unaligned --header \"SRR11954115\" \\\n    | samtools view -bhS - \\\n    > temp.bam\npicard AddOrReplaceReadGroups \\\n    I=temp.bam \\\n    O=\"SRR11954115.bam\" \\\n    RGID=1 \\\n    RGLB=\"$LIBRARY\" \\\n    RGSM=\"$SAMPLE\" \\\n    RGPL=\"$SAM_PLATFORM\" \\\n    RGPU=\"$LIBRARY\" \\\n    RGPM=\"$MODEL\" \\\n    RGDT=\"$RUNDATE\" \\\n    RGCN=\"$CENTER\" \\\n    VALIDATION_STRINGENCY=SILENT\nrm temp.bam\nsamtools view -H \"SRR11954115.bam\"\n\n# emit numeric WDL outputs\necho $CENTER > OUT_CENTER\necho $PLATFORM > OUT_PLATFORM\necho $SAMPLE > OUT_BIOSAMPLE\necho $LIBRARY > OUT_LIBRARY\necho $RUNDATE > OUT_RUNDATE\nsamtools view -c \"SRR11954115.bam\" | tee OUT_NUM_READS\n\n# pull other metadata from SRA -- allow for silent failures here!\ntouch OUT_MODEL OUT_COLLECTION_DATE OUT_STRAIN OUT_COLLECTED_BY OUT_GEO_LOC\nset +e\njq -r \\\n    .EXPERIMENT_PACKAGE_SET.EXPERIMENT_PACKAGE.EXPERIMENT.PLATFORM.\"$PLATFORM\".INSTRUMENT_MODEL \\\n    SRA.json | tee OUT_MODEL\njq -r \\\n    '.EXPERIMENT_PACKAGE_SET.EXPERIMENT_PACKAGE.SAMPLE.SAMPLE_ATTRIBUTES.SAMPLE_ATTRIBUTE[]|select(.TAG == \"collection_date\" or .TAG==\"collection date\")|.VALUE' \\\n    SRA.json | tee OUT_COLLECTION_DATE\njq -r \\\n    '.EXPERIMENT_PACKAGE_SET.EXPERIMENT_PACKAGE.SAMPLE.SAMPLE_ATTRIBUTES.SAMPLE_ATTRIBUTE[]|select(.TAG == \"strain\")|.VALUE' \\\n    SRA.json | tee OUT_STRAIN\njq -r \\\n    '.EXPERIMENT_PACKAGE_SET.EXPERIMENT_PACKAGE.SAMPLE.SAMPLE_ATTRIBUTES.SAMPLE_ATTRIBUTE[]|select(.TAG == \"collected_by\" or .TAG == \"collecting institution\")|.VALUE' \\\n    SRA.json | tee OUT_COLLECTED_BY\njq -r \\\n    '.EXPERIMENT_PACKAGE_SET.EXPERIMENT_PACKAGE.SAMPLE.SAMPLE_ATTRIBUTES.SAMPLE_ATTRIBUTE[]|select(.TAG == \"geo_loc_name\" or .TAG == \"geographic location (country and/or sea)\")|.VALUE' \\\n    SRA.json | tee OUT_GEO_LOC\njq -r \\\n    '.EXPERIMENT_PACKAGE_SET.EXPERIMENT_PACKAGE.EXPERIMENT.DESIGN.LIBRARY_DESCRIPTOR.LIBRARY_STRATEGY' \\\n    SRA.json | tee OUT_LIBRARY_STRATEGY\n\nset -e\npython3 << CODE\nimport json\nwith open('SRA.json', 'rt') as inf:\n    meta = json.load(inf)\n# reorganize to look more like a biosample attributes tsv\nbiosample = dict((x['TAG'],x['VALUE']) for x in meta['EXPERIMENT_PACKAGE_SET']['EXPERIMENT_PACKAGE']['SAMPLE']['SAMPLE_ATTRIBUTES']['SAMPLE_ATTRIBUTE'])\nbiosample['accession'] = meta['EXPERIMENT_PACKAGE_SET']['EXPERIMENT_PACKAGE']['SAMPLE']['IDENTIFIERS']['EXTERNAL_ID']['content']\nbiosample['message'] = 'Successfully loaded'\nbiosample['bioproject_accession'] = meta['EXPERIMENT_PACKAGE_SET']['EXPERIMENT_PACKAGE']['STUDY']['IDENTIFIERS']['EXTERNAL_ID']['content']\nbiosample['sample_name'] = biosample['isolate']\nfor k,v in biosample.items():\n    if v == 'not provided':\n        biosample[k] = ''\n\n# British to American conversions (NCBI vs ENA)\nus_to_uk = {\n    'sample_name': 'Sample Name',\n    'isolate': 'Sample Name',\n    'collected_by': 'collecting institution',\n    'collection_date': 'collection date',\n    'geo_loc_name': 'geographic location (country and/or sea)',\n    'host': 'host scientific name',\n}\nfor key_us, key_uk in us_to_uk.items():\n    if not biosample.get(key_us,''):\n        biosample[key_us] = biosample.get(key_uk,'')\n\n# write outputs\nwith open('SRR11954115-biosample_attributes.json', 'wt') as outf:\n    json.dump(biosample, outf)\nCODE",
              shardIndex: -1,
              outputs: {
                library_id: 'SAMN14938612_Next_1_ERCC-42',
                sample_collection_date: '2020-03-10',
                biosample_accession: 'SAMN14938612',
                run_date: '2020-06-08',
                sra_metadata:
                  'https://lz0d5275bdd36d3e6a22a130.blob.core.windows.net/sc-af87d167-4fcf-43f4-8447-555010fc2ac8/workspace-services/cbas/wds-af87d167-4fcf-43f4-8447-555010fc2ac8/fetch_sra_to_bam/56ee000a-3e05-4f21-b4c7-772627729b02/call-Fetch_SRA_to_BAM/execution/SRR11954115.json',
                library_strategy: 'RNA-Seq',
                num_reads: 405900,
                sequencing_center: 'Broad Institute of Harvard and MIT',
                reads_ubam:
                  'https://lz0d5275bdd36d3e6a22a130.blob.core.windows.net/sc-af87d167-4fcf-43f4-8447-555010fc2ac8/workspace-services/cbas/wds-af87d167-4fcf-43f4-8447-555010fc2ac8/fetch_sra_to_bam/56ee000a-3e05-4f21-b4c7-772627729b02/call-Fetch_SRA_to_BAM/execution/SRR11954115.bam',
                sample_strain: 'not applicable',
                biosample_attributes_json:
                  'https://lz0d5275bdd36d3e6a22a130.blob.core.windows.net/sc-af87d167-4fcf-43f4-8447-555010fc2ac8/workspace-services/cbas/wds-af87d167-4fcf-43f4-8447-555010fc2ac8/fetch_sra_to_bam/56ee000a-3e05-4f21-b4c7-772627729b02/call-Fetch_SRA_to_BAM/execution/SRR11954115-biosample_attributes.json',
                sample_geo_loc: 'USA: Massachusetts',
                sequencing_platform: 'ILLUMINA',
                sample_collected_by: 'Massachusetts General Hospital',
                sequencing_platform_model: 'Illumina HiSeq 2500'
              },
              runtimeAttributes: {
                preemptible: 'true',
                disk: '750 GB',
                failOnStderr: 'false',
                disks: 'local-disk 750 LOCAL',
                continueOnReturnCode: '0',
                docker: 'quay.io/broadinstitute/ncbi-tools:2.10.7.10',
                maxRetries: '2',
                cpu: '2',
                memory: '6 GB'
              },
              callCaching: {
                allowResultReuse: false,
                effectiveCallCachingMode: 'CallCachingOff'
              },
              inputs: {
                docker: 'quay.io/broadinstitute/ncbi-tools:2.10.7.10',
                disk_size: 750,
                SRA_ID: 'SRR11954115',
                machine_mem_gb: null
              },
              returnCode: 0,
              jobId: '56ee000a_06b7b2d4bcdb4598a7df6b6acc60418a',
              backend: 'TES',
              start: '2023-04-20T14:16:48.086Z',
              backendStatus: 'Complete',
              compressedDockerSize: 1339143280,
              end: '2023-04-20T14:27:27.707Z',
              dockerImageUsed: 'quay.io/broadinstitute/ncbi-tools@sha256:c6228528a9fa7d3abd78d40821231ec49c122f8c10bb27ae603540c46fc05797',
              stderr:
                'https://lz0d5275bdd36d3e6a22a130.blob.core.windows.net/sc-af87d167-4fcf-43f4-8447-555010fc2ac8/workspace-services/cbas/wds-af87d167-4fcf-43f4-8447-555010fc2ac8/fetch_sra_to_bam/56ee000a-3e05-4f21-b4c7-772627729b02/call-Fetch_SRA_to_BAM/execution/stderr',
              callRoot:
                'https://lz0d5275bdd36d3e6a22a130.blob.core.windows.net/sc-af87d167-4fcf-43f4-8447-555010fc2ac8/workspace-services/cbas/wds-af87d167-4fcf-43f4-8447-555010fc2ac8/fetch_sra_to_bam/56ee000a-3e05-4f21-b4c7-772627729b02/call-Fetch_SRA_to_BAM',
              attempt: 2,
              executionEvents: [
                {
                  startTime: '2023-04-20T14:16:48.086Z',
                  description: 'Pending',
                  endTime: '2023-04-20T14:16:48.087Z'
                },
                {
                  startTime: '2023-04-20T14:16:50.758Z',
                  description: 'RunningJob',
                  endTime: '2023-04-20T14:27:27.561Z'
                },
                {
                  startTime: '2023-04-20T14:27:27.561Z',
                  description: 'UpdatingJobStore',
                  endTime: '2023-04-20T14:27:27.707Z'
                },
                {
                  startTime: '2023-04-20T14:16:48.087Z',
                  description: 'RequestingExecutionToken',
                  endTime: '2023-04-20T14:16:50.735Z'
                },
                {
                  startTime: '2023-04-20T14:16:50.735Z',
                  description: 'WaitingForValueStore',
                  endTime: '2023-04-20T14:16:50.736Z'
                },
                {
                  startTime: '2023-04-20T14:16:50.736Z',
                  description: 'PreparingJob',
                  endTime: '2023-04-20T14:16:50.758Z'
                }
              ]
            }
          ],
          fetch_REMIX: [
            {
              executionStatus: 'Done',
              stdout:
                'https://lz0d5275bdd36d3e6a22a130.blob.core.windows.net/sc-af87d167-4fcf-43f4-8447-555010fc2ac8/workspace-services/cbas/wds-af87d167-4fcf-43f4-8447-555010fc2ac8/fetch_sra_to_bam/56ee000a-3e05-4f21-b4c7-772627729b02/call-Fetch_SRA_to_BAM/execution/stdout',
              commandLine:
                "set -e\n# fetch SRA metadata on this record\nesearch -db sra -q \"SRR11954115\" | efetch -mode json -json > SRA.json\ncp SRA.json \"SRR11954115.json\"\n\n# pull reads from SRA and make a fully annotated BAM -- must succeed\nCENTER=$(jq -r .EXPERIMENT_PACKAGE_SET.EXPERIMENT_PACKAGE.SUBMISSION.center_name SRA.json)\nPLATFORM=$(jq -r '.EXPERIMENT_PACKAGE_SET.EXPERIMENT_PACKAGE.EXPERIMENT.PLATFORM | keys[] as $k | \"\\($k)\"' SRA.json)\nMODEL=$(jq -r \".EXPERIMENT_PACKAGE_SET.EXPERIMENT_PACKAGE.EXPERIMENT.PLATFORM.$PLATFORM.INSTRUMENT_MODEL\" SRA.json)\nSAMPLE=$(jq -r '.EXPERIMENT_PACKAGE_SET.EXPERIMENT_PACKAGE.SAMPLE.IDENTIFIERS.EXTERNAL_ID|select(.namespace == \"BioSample\")|.content' SRA.json)\nLIBRARY=$(jq -r .EXPERIMENT_PACKAGE_SET.EXPERIMENT_PACKAGE.EXPERIMENT.alias SRA.json)\nRUNDATE=$(jq -r '.EXPERIMENT_PACKAGE_SET.EXPERIMENT_PACKAGE.RUN_SET.RUN.SRAFiles|if (.SRAFile|type) == \"object\" then .SRAFile.date else [.SRAFile[]|select(.supertype == \"Original\")][0].date end' SRA.json | cut -f 1 -d ' ')\n\nif [ \"$PLATFORM\" = \"OXFORD_NANOPORE\" ]; then\n    # per the SAM/BAM specification\n    SAM_PLATFORM=\"ONT\"\nelse\n    SAM_PLATFORM=\"$PLATFORM\"\nfi\n\nsam-dump --unaligned --header \"SRR11954115\" \\\n    | samtools view -bhS - \\\n    > temp.bam\npicard AddOrReplaceReadGroups \\\n    I=temp.bam \\\n    O=\"SRR11954115.bam\" \\\n    RGID=1 \\\n    RGLB=\"$LIBRARY\" \\\n    RGSM=\"$SAMPLE\" \\\n    RGPL=\"$SAM_PLATFORM\" \\\n    RGPU=\"$LIBRARY\" \\\n    RGPM=\"$MODEL\" \\\n    RGDT=\"$RUNDATE\" \\\n    RGCN=\"$CENTER\" \\\n    VALIDATION_STRINGENCY=SILENT\nrm temp.bam\nsamtools view -H \"SRR11954115.bam\"\n\n# emit numeric WDL outputs\necho $CENTER > OUT_CENTER\necho $PLATFORM > OUT_PLATFORM\necho $SAMPLE > OUT_BIOSAMPLE\necho $LIBRARY > OUT_LIBRARY\necho $RUNDATE > OUT_RUNDATE\nsamtools view -c \"SRR11954115.bam\" | tee OUT_NUM_READS\n\n# pull other metadata from SRA -- allow for silent failures here!\ntouch OUT_MODEL OUT_COLLECTION_DATE OUT_STRAIN OUT_COLLECTED_BY OUT_GEO_LOC\nset +e\njq -r \\\n    .EXPERIMENT_PACKAGE_SET.EXPERIMENT_PACKAGE.EXPERIMENT.PLATFORM.\"$PLATFORM\".INSTRUMENT_MODEL \\\n    SRA.json | tee OUT_MODEL\njq -r \\\n    '.EXPERIMENT_PACKAGE_SET.EXPERIMENT_PACKAGE.SAMPLE.SAMPLE_ATTRIBUTES.SAMPLE_ATTRIBUTE[]|select(.TAG == \"collection_date\" or .TAG==\"collection date\")|.VALUE' \\\n    SRA.json | tee OUT_COLLECTION_DATE\njq -r \\\n    '.EXPERIMENT_PACKAGE_SET.EXPERIMENT_PACKAGE.SAMPLE.SAMPLE_ATTRIBUTES.SAMPLE_ATTRIBUTE[]|select(.TAG == \"strain\")|.VALUE' \\\n    SRA.json | tee OUT_STRAIN\njq -r \\\n    '.EXPERIMENT_PACKAGE_SET.EXPERIMENT_PACKAGE.SAMPLE.SAMPLE_ATTRIBUTES.SAMPLE_ATTRIBUTE[]|select(.TAG == \"collected_by\" or .TAG == \"collecting institution\")|.VALUE' \\\n    SRA.json | tee OUT_COLLECTED_BY\njq -r \\\n    '.EXPERIMENT_PACKAGE_SET.EXPERIMENT_PACKAGE.SAMPLE.SAMPLE_ATTRIBUTES.SAMPLE_ATTRIBUTE[]|select(.TAG == \"geo_loc_name\" or .TAG == \"geographic location (country and/or sea)\")|.VALUE' \\\n    SRA.json | tee OUT_GEO_LOC\njq -r \\\n    '.EXPERIMENT_PACKAGE_SET.EXPERIMENT_PACKAGE.EXPERIMENT.DESIGN.LIBRARY_DESCRIPTOR.LIBRARY_STRATEGY' \\\n    SRA.json | tee OUT_LIBRARY_STRATEGY\n\nset -e\npython3 << CODE\nimport json\nwith open('SRA.json', 'rt') as inf:\n    meta = json.load(inf)\n# reorganize to look more like a biosample attributes tsv\nbiosample = dict((x['TAG'],x['VALUE']) for x in meta['EXPERIMENT_PACKAGE_SET']['EXPERIMENT_PACKAGE']['SAMPLE']['SAMPLE_ATTRIBUTES']['SAMPLE_ATTRIBUTE'])\nbiosample['accession'] = meta['EXPERIMENT_PACKAGE_SET']['EXPERIMENT_PACKAGE']['SAMPLE']['IDENTIFIERS']['EXTERNAL_ID']['content']\nbiosample['message'] = 'Successfully loaded'\nbiosample['bioproject_accession'] = meta['EXPERIMENT_PACKAGE_SET']['EXPERIMENT_PACKAGE']['STUDY']['IDENTIFIERS']['EXTERNAL_ID']['content']\nbiosample['sample_name'] = biosample['isolate']\nfor k,v in biosample.items():\n    if v == 'not provided':\n        biosample[k] = ''\n\n# British to American conversions (NCBI vs ENA)\nus_to_uk = {\n    'sample_name': 'Sample Name',\n    'isolate': 'Sample Name',\n    'collected_by': 'collecting institution',\n    'collection_date': 'collection date',\n    'geo_loc_name': 'geographic location (country and/or sea)',\n    'host': 'host scientific name',\n}\nfor key_us, key_uk in us_to_uk.items():\n    if not biosample.get(key_us,''):\n        biosample[key_us] = biosample.get(key_uk,'')\n\n# write outputs\nwith open('SRR11954115-biosample_attributes.json', 'wt') as outf:\n    json.dump(biosample, outf)\nCODE",
              shardIndex: -1,
              outputs: {
                library_id: 'SAMN14938612_Next_1_ERCC-42',
                sample_collection_date: '2020-03-10',
                biosample_accession: 'SAMN14938612',
                run_date: '2020-06-08',
                sra_metadata:
                  'https://lz0d5275bdd36d3e6a22a130.blob.core.windows.net/sc-af87d167-4fcf-43f4-8447-555010fc2ac8/workspace-services/cbas/wds-af87d167-4fcf-43f4-8447-555010fc2ac8/fetch_sra_to_bam/56ee000a-3e05-4f21-b4c7-772627729b02/call-Fetch_SRA_to_BAM/execution/SRR11954115.json',
                library_strategy: 'RNA-Seq',
                num_reads: 405900,
                sequencing_center: 'Broad Institute of Harvard and MIT',
                reads_ubam:
                  'https://lz0d5275bdd36d3e6a22a130.blob.core.windows.net/sc-af87d167-4fcf-43f4-8447-555010fc2ac8/workspace-services/cbas/wds-af87d167-4fcf-43f4-8447-555010fc2ac8/fetch_sra_to_bam/56ee000a-3e05-4f21-b4c7-772627729b02/call-Fetch_SRA_to_BAM/execution/SRR11954115.bam',
                sample_strain: 'not applicable',
                biosample_attributes_json:
                  'https://lz0d5275bdd36d3e6a22a130.blob.core.windows.net/sc-af87d167-4fcf-43f4-8447-555010fc2ac8/workspace-services/cbas/wds-af87d167-4fcf-43f4-8447-555010fc2ac8/fetch_sra_to_bam/56ee000a-3e05-4f21-b4c7-772627729b02/call-Fetch_SRA_to_BAM/execution/SRR11954115-biosample_attributes.json',
                sample_geo_loc: 'USA: Massachusetts',
                sequencing_platform: 'ILLUMINA',
                sample_collected_by: 'Massachusetts General Hospital',
                sequencing_platform_model: 'Illumina HiSeq 2500'
              },
              runtimeAttributes: {
                preemptible: 'true',
                disk: '750 GB',
                failOnStderr: 'false',
                disks: 'local-disk 750 LOCAL',
                continueOnReturnCode: '0',
                docker: 'quay.io/broadinstitute/ncbi-tools:2.10.7.10',
                maxRetries: '2',
                cpu: '2',
                memory: '6 GB'
              },
              callCaching: {
                allowResultReuse: false,
                effectiveCallCachingMode: 'CallCachingOff'
              },
              inputs: {
                docker: 'quay.io/broadinstitute/ncbi-tools:2.10.7.10',
                disk_size: 750,
                SRA_ID: 'SRR11954115',
                machine_mem_gb: null
              },
              returnCode: 0,
              jobId: '56ee000a_06b7b2d4bcdb4598a7df6b6acc60418a',
              backend: 'TES',
              start: '2023-04-20T14:16:48.086Z',
              backendStatus: 'Complete',
              compressedDockerSize: 1339143280,
              end: '2023-04-20T14:27:27.707Z',
              dockerImageUsed: 'quay.io/broadinstitute/ncbi-tools@sha256:c6228528a9fa7d3abd78d40821231ec49c122f8c10bb27ae603540c46fc05797',
              stderr:
                'https://lz0d5275bdd36d3e6a22a130.blob.core.windows.net/sc-af87d167-4fcf-43f4-8447-555010fc2ac8/workspace-services/cbas/wds-af87d167-4fcf-43f4-8447-555010fc2ac8/fetch_sra_to_bam/56ee000a-3e05-4f21-b4c7-772627729b02/call-Fetch_SRA_to_BAM/execution/stderr',
              callRoot:
                'https://lz0d5275bdd36d3e6a22a130.blob.core.windows.net/sc-af87d167-4fcf-43f4-8447-555010fc2ac8/workspace-services/cbas/wds-af87d167-4fcf-43f4-8447-555010fc2ac8/fetch_sra_to_bam/56ee000a-3e05-4f21-b4c7-772627729b02/call-Fetch_SRA_to_BAM',
              attempt: 1,
              executionEvents: [
                {
                  startTime: '2023-04-20T14:16:48.086Z',
                  description: 'Pending',
                  endTime: '2023-04-20T14:16:48.087Z'
                },
                {
                  startTime: '2023-04-20T14:16:50.758Z',
                  description: 'RunningJob',
                  endTime: '2023-04-20T14:27:27.561Z'
                },
                {
                  startTime: '2023-04-20T14:27:27.561Z',
                  description: 'UpdatingJobStore',
                  endTime: '2023-04-20T14:27:27.707Z'
                },
                {
                  startTime: '2023-04-20T14:16:48.087Z',
                  description: 'RequestingExecutionToken',
                  endTime: '2023-04-20T14:16:50.735Z'
                },
                {
                  startTime: '2023-04-20T14:16:50.735Z',
                  description: 'WaitingForValueStore',
                  endTime: '2023-04-20T14:16:50.736Z'
                },
                {
                  startTime: '2023-04-20T14:16:50.736Z',
                  description: 'PreparingJob',
                  endTime: '2023-04-20T14:16:50.758Z'
                }
              ]
            },
            {
              executionStatus: 'Done',
              stdout:
                'https://lz0d5275bdd36d3e6a22a130.blob.core.windows.net/sc-af87d167-4fcf-43f4-8447-555010fc2ac8/workspace-services/cbas/wds-af87d167-4fcf-43f4-8447-555010fc2ac8/fetch_sra_to_bam/56ee000a-3e05-4f21-b4c7-772627729b02/call-Fetch_SRA_to_BAM/execution/stdout',
              commandLine:
                "set -e\n# fetch SRA metadata on this record\nesearch -db sra -q \"SRR11954115\" | efetch -mode json -json > SRA.json\ncp SRA.json \"SRR11954115.json\"\n\n# pull reads from SRA and make a fully annotated BAM -- must succeed\nCENTER=$(jq -r .EXPERIMENT_PACKAGE_SET.EXPERIMENT_PACKAGE.SUBMISSION.center_name SRA.json)\nPLATFORM=$(jq -r '.EXPERIMENT_PACKAGE_SET.EXPERIMENT_PACKAGE.EXPERIMENT.PLATFORM | keys[] as $k | \"\\($k)\"' SRA.json)\nMODEL=$(jq -r \".EXPERIMENT_PACKAGE_SET.EXPERIMENT_PACKAGE.EXPERIMENT.PLATFORM.$PLATFORM.INSTRUMENT_MODEL\" SRA.json)\nSAMPLE=$(jq -r '.EXPERIMENT_PACKAGE_SET.EXPERIMENT_PACKAGE.SAMPLE.IDENTIFIERS.EXTERNAL_ID|select(.namespace == \"BioSample\")|.content' SRA.json)\nLIBRARY=$(jq -r .EXPERIMENT_PACKAGE_SET.EXPERIMENT_PACKAGE.EXPERIMENT.alias SRA.json)\nRUNDATE=$(jq -r '.EXPERIMENT_PACKAGE_SET.EXPERIMENT_PACKAGE.RUN_SET.RUN.SRAFiles|if (.SRAFile|type) == \"object\" then .SRAFile.date else [.SRAFile[]|select(.supertype == \"Original\")][0].date end' SRA.json | cut -f 1 -d ' ')\n\nif [ \"$PLATFORM\" = \"OXFORD_NANOPORE\" ]; then\n    # per the SAM/BAM specification\n    SAM_PLATFORM=\"ONT\"\nelse\n    SAM_PLATFORM=\"$PLATFORM\"\nfi\n\nsam-dump --unaligned --header \"SRR11954115\" \\\n    | samtools view -bhS - \\\n    > temp.bam\npicard AddOrReplaceReadGroups \\\n    I=temp.bam \\\n    O=\"SRR11954115.bam\" \\\n    RGID=1 \\\n    RGLB=\"$LIBRARY\" \\\n    RGSM=\"$SAMPLE\" \\\n    RGPL=\"$SAM_PLATFORM\" \\\n    RGPU=\"$LIBRARY\" \\\n    RGPM=\"$MODEL\" \\\n    RGDT=\"$RUNDATE\" \\\n    RGCN=\"$CENTER\" \\\n    VALIDATION_STRINGENCY=SILENT\nrm temp.bam\nsamtools view -H \"SRR11954115.bam\"\n\n# emit numeric WDL outputs\necho $CENTER > OUT_CENTER\necho $PLATFORM > OUT_PLATFORM\necho $SAMPLE > OUT_BIOSAMPLE\necho $LIBRARY > OUT_LIBRARY\necho $RUNDATE > OUT_RUNDATE\nsamtools view -c \"SRR11954115.bam\" | tee OUT_NUM_READS\n\n# pull other metadata from SRA -- allow for silent failures here!\ntouch OUT_MODEL OUT_COLLECTION_DATE OUT_STRAIN OUT_COLLECTED_BY OUT_GEO_LOC\nset +e\njq -r \\\n    .EXPERIMENT_PACKAGE_SET.EXPERIMENT_PACKAGE.EXPERIMENT.PLATFORM.\"$PLATFORM\".INSTRUMENT_MODEL \\\n    SRA.json | tee OUT_MODEL\njq -r \\\n    '.EXPERIMENT_PACKAGE_SET.EXPERIMENT_PACKAGE.SAMPLE.SAMPLE_ATTRIBUTES.SAMPLE_ATTRIBUTE[]|select(.TAG == \"collection_date\" or .TAG==\"collection date\")|.VALUE' \\\n    SRA.json | tee OUT_COLLECTION_DATE\njq -r \\\n    '.EXPERIMENT_PACKAGE_SET.EXPERIMENT_PACKAGE.SAMPLE.SAMPLE_ATTRIBUTES.SAMPLE_ATTRIBUTE[]|select(.TAG == \"strain\")|.VALUE' \\\n    SRA.json | tee OUT_STRAIN\njq -r \\\n    '.EXPERIMENT_PACKAGE_SET.EXPERIMENT_PACKAGE.SAMPLE.SAMPLE_ATTRIBUTES.SAMPLE_ATTRIBUTE[]|select(.TAG == \"collected_by\" or .TAG == \"collecting institution\")|.VALUE' \\\n    SRA.json | tee OUT_COLLECTED_BY\njq -r \\\n    '.EXPERIMENT_PACKAGE_SET.EXPERIMENT_PACKAGE.SAMPLE.SAMPLE_ATTRIBUTES.SAMPLE_ATTRIBUTE[]|select(.TAG == \"geo_loc_name\" or .TAG == \"geographic location (country and/or sea)\")|.VALUE' \\\n    SRA.json | tee OUT_GEO_LOC\njq -r \\\n    '.EXPERIMENT_PACKAGE_SET.EXPERIMENT_PACKAGE.EXPERIMENT.DESIGN.LIBRARY_DESCRIPTOR.LIBRARY_STRATEGY' \\\n    SRA.json | tee OUT_LIBRARY_STRATEGY\n\nset -e\npython3 << CODE\nimport json\nwith open('SRA.json', 'rt') as inf:\n    meta = json.load(inf)\n# reorganize to look more like a biosample attributes tsv\nbiosample = dict((x['TAG'],x['VALUE']) for x in meta['EXPERIMENT_PACKAGE_SET']['EXPERIMENT_PACKAGE']['SAMPLE']['SAMPLE_ATTRIBUTES']['SAMPLE_ATTRIBUTE'])\nbiosample['accession'] = meta['EXPERIMENT_PACKAGE_SET']['EXPERIMENT_PACKAGE']['SAMPLE']['IDENTIFIERS']['EXTERNAL_ID']['content']\nbiosample['message'] = 'Successfully loaded'\nbiosample['bioproject_accession'] = meta['EXPERIMENT_PACKAGE_SET']['EXPERIMENT_PACKAGE']['STUDY']['IDENTIFIERS']['EXTERNAL_ID']['content']\nbiosample['sample_name'] = biosample['isolate']\nfor k,v in biosample.items():\n    if v == 'not provided':\n        biosample[k] = ''\n\n# British to American conversions (NCBI vs ENA)\nus_to_uk = {\n    'sample_name': 'Sample Name',\n    'isolate': 'Sample Name',\n    'collected_by': 'collecting institution',\n    'collection_date': 'collection date',\n    'geo_loc_name': 'geographic location (country and/or sea)',\n    'host': 'host scientific name',\n}\nfor key_us, key_uk in us_to_uk.items():\n    if not biosample.get(key_us,''):\n        biosample[key_us] = biosample.get(key_uk,'')\n\n# write outputs\nwith open('SRR11954115-biosample_attributes.json', 'wt') as outf:\n    json.dump(biosample, outf)\nCODE",
              shardIndex: -1,
              outputs: {
                library_id: 'SAMN14938612_Next_1_ERCC-42',
                sample_collection_date: '2020-03-10',
                biosample_accession: 'SAMN14938612',
                run_date: '2020-06-08',
                sra_metadata:
                  'https://lz0d5275bdd36d3e6a22a130.blob.core.windows.net/sc-af87d167-4fcf-43f4-8447-555010fc2ac8/workspace-services/cbas/wds-af87d167-4fcf-43f4-8447-555010fc2ac8/fetch_sra_to_bam/56ee000a-3e05-4f21-b4c7-772627729b02/call-Fetch_SRA_to_BAM/execution/SRR11954115.json',
                library_strategy: 'RNA-Seq',
                num_reads: 405900,
                sequencing_center: 'Broad Institute of Harvard and MIT',
                reads_ubam:
                  'https://lz0d5275bdd36d3e6a22a130.blob.core.windows.net/sc-af87d167-4fcf-43f4-8447-555010fc2ac8/workspace-services/cbas/wds-af87d167-4fcf-43f4-8447-555010fc2ac8/fetch_sra_to_bam/56ee000a-3e05-4f21-b4c7-772627729b02/call-Fetch_SRA_to_BAM/execution/SRR11954115.bam',
                sample_strain: 'not applicable',
                biosample_attributes_json:
                  'https://lz0d5275bdd36d3e6a22a130.blob.core.windows.net/sc-af87d167-4fcf-43f4-8447-555010fc2ac8/workspace-services/cbas/wds-af87d167-4fcf-43f4-8447-555010fc2ac8/fetch_sra_to_bam/56ee000a-3e05-4f21-b4c7-772627729b02/call-Fetch_SRA_to_BAM/execution/SRR11954115-biosample_attributes.json',
                sample_geo_loc: 'USA: Massachusetts',
                sequencing_platform: 'ILLUMINA',
                sample_collected_by: 'Massachusetts General Hospital',
                sequencing_platform_model: 'Illumina HiSeq 2500'
              },
              runtimeAttributes: {
                preemptible: 'true',
                disk: '750 GB',
                failOnStderr: 'false',
                disks: 'local-disk 750 LOCAL',
                continueOnReturnCode: '0',
                docker: 'quay.io/broadinstitute/ncbi-tools:2.10.7.10',
                maxRetries: '2',
                cpu: '2',
                memory: '6 GB'
              },
              callCaching: {
                allowResultReuse: false,
                effectiveCallCachingMode: 'CallCachingOff'
              },
              inputs: {
                docker: 'quay.io/broadinstitute/ncbi-tools:2.10.7.10',
                disk_size: 750,
                SRA_ID: 'SRR11954115',
                machine_mem_gb: null
              },
              returnCode: 0,
              jobId: '56ee000a_06b7b2d4bcdb4598a7df6b6acc60418a',
              backend: 'TES',
              start: '2023-04-20T14:16:48.086Z',
              backendStatus: 'Complete',
              compressedDockerSize: 1339143280,
              end: '2023-04-20T14:27:27.707Z',
              dockerImageUsed: 'quay.io/broadinstitute/ncbi-tools@sha256:c6228528a9fa7d3abd78d40821231ec49c122f8c10bb27ae603540c46fc05797',
              stderr:
                'https://lz0d5275bdd36d3e6a22a130.blob.core.windows.net/sc-af87d167-4fcf-43f4-8447-555010fc2ac8/workspace-services/cbas/wds-af87d167-4fcf-43f4-8447-555010fc2ac8/fetch_sra_to_bam/56ee000a-3e05-4f21-b4c7-772627729b02/call-Fetch_SRA_to_BAM/execution/stderr',
              callRoot:
                'https://lz0d5275bdd36d3e6a22a130.blob.core.windows.net/sc-af87d167-4fcf-43f4-8447-555010fc2ac8/workspace-services/cbas/wds-af87d167-4fcf-43f4-8447-555010fc2ac8/fetch_sra_to_bam/56ee000a-3e05-4f21-b4c7-772627729b02/call-Fetch_SRA_to_BAM',
              attempt: 2,
              executionEvents: [
                {
                  startTime: '2023-04-20T14:16:48.086Z',
                  description: 'Pending',
                  endTime: '2023-04-20T14:16:48.087Z'
                },
                {
                  startTime: '2023-04-20T14:16:50.758Z',
                  description: 'RunningJob',
                  endTime: '2023-04-20T14:27:27.561Z'
                },
                {
                  startTime: '2023-04-20T14:27:27.561Z',
                  description: 'UpdatingJobStore',
                  endTime: '2023-04-20T14:27:27.707Z'
                },
                {
                  startTime: '2023-04-20T14:16:48.087Z',
                  description: 'RequestingExecutionToken',
                  endTime: '2023-04-20T14:16:50.735Z'
                },
                {
                  startTime: '2023-04-20T14:16:50.735Z',
                  description: 'WaitingForValueStore',
                  endTime: '2023-04-20T14:16:50.736Z'
                },
                {
                  startTime: '2023-04-20T14:16:50.736Z',
                  description: 'PreparingJob',
                  endTime: '2023-04-20T14:16:50.758Z'
                }
              ]
            }
          ]
        },
        outputs: {
          'fetch_sra_to_bam.sra_metadata':
            'https://lz0d5275bdd36d3e6a22a130.blob.core.windows.net/sc-af87d167-4fcf-43f4-8447-555010fc2ac8/workspace-services/cbas/wds-af87d167-4fcf-43f4-8447-555010fc2ac8/fetch_sra_to_bam/56ee000a-3e05-4f21-b4c7-772627729b02/call-Fetch_SRA_to_BAM/execution/SRR11954115.json',
          'fetch_sra_to_bam.reads_ubam':
            'https://lz0d5275bdd36d3e6a22a130.blob.core.windows.net/sc-af87d167-4fcf-43f4-8447-555010fc2ac8/workspace-services/cbas/wds-af87d167-4fcf-43f4-8447-555010fc2ac8/fetch_sra_to_bam/56ee000a-3e05-4f21-b4c7-772627729b02/call-Fetch_SRA_to_BAM/execution/SRR11954115.bam',
          'fetch_sra_to_bam.biosample_accession': 'SAMN14938612',
          'fetch_sra_to_bam.sample_geo_loc': 'USA: Massachusetts',
          'fetch_sra_to_bam.sample_collection_date': '2020-03-10',
          'fetch_sra_to_bam.sequencing_center': 'Broad Institute of Harvard and MIT',
          'fetch_sra_to_bam.sequencing_platform': 'ILLUMINA',
          'fetch_sra_to_bam.library_id': 'SAMN14938612_Next_1_ERCC-42',
          'fetch_sra_to_bam.run_date': '2020-06-08',
          'fetch_sra_to_bam.sample_collected_by': 'Massachusetts General Hospital',
          'fetch_sra_to_bam.sample_strain': 'not applicable',
          'fetch_sra_to_bam.sequencing_platform_model': 'Illumina HiSeq 2500'
        },
        workflowRoot:
          'https://lz0d5275bdd36d3e6a22a130.blob.core.windows.net/sc-af87d167-4fcf-43f4-8447-555010fc2ac8/workspace-services/cbas/wds-af87d167-4fcf-43f4-8447-555010fc2ac8/fetch_sra_to_bam/56ee000a-3e05-4f21-b4c7-772627729b02',
        actualWorkflowLanguage: 'WDL',
        status: 'Succeeded',
        workflowLog:
          'https://lz0d5275bdd36d3e6a22a130.blob.core.windows.net/sc-af87d167-4fcf-43f4-8447-555010fc2ac8/workspace-services/cbas/wds-af87d167-4fcf-43f4-8447-555010fc2ac8/cromwell-workflow-logs/workflow.56ee000a-3e05-4f21-b4c7-772627729b02.log',
        end: '2023-04-20T14:27:29.668Z',
        start: '2023-04-20T14:16:46.888Z',
        id: '56ee000a-3e05-4f21-b4c7-772627729b02',
        inputs: {
          'fetch_sra_to_bam.Fetch_SRA_to_BAM.docker': 'quay.io/broadinstitute/ncbi-tools:2.10.7.10',
          'fetch_sra_to_bam.Fetch_SRA_to_BAM.machine_mem_gb': null,
          'fetch_sra_to_bam.Fetch_SRA_to_BAM.SRA_ID': 'SRR11954115'
        },
        labels: {
          'cromwell-workflow-id': 'cromwell-56ee000a-3e05-4f21-b4c7-772627729b02'
        },
        submission: '2023-04-20T14:16:17.781Z'
      }

      //NOTE: commenting this out for now, setting metadata to mock workflow for local development purposes. Re-enable when submitting PR
      //const metadata = await Ajax(signal).Cromwell.workflows(workflowId).metadata({ includeKey, excludeKey })

      setWorkflow(metadata)
      const formattedTableData = generateCallTableData(metadata.calls)
      setTableData(formattedTableData)
      if (includes(collapseStatus(metadata.status), [statusType.running, statusType.submitted])) {
        stateRefreshTimer.current = setTimeout(loadWorkflow, 60000)
      }
    }

    loadWorkflow()
    return () => {
      clearTimeout(stateRefreshTimer.current)
    }
  })

  const header = useMemo(() => {
    const breadcrumbPathObjects = [
      {
        label: 'Submission History',
        path: 'submission-history'
      },
      {
        label: `Submission ${submissionId}`,
        path: `submission-details`,
        params: { submissionId }
      },
      {
        label: workflow?.workflowName
      }
    ]

    return h(HeaderSection, { breadcrumbPathObjects, button: SubmitNewWorkflowButton, title: 'Workflow Details' })
  }, [workflow, submissionId])

  /*
   * Page render
   */
  // Disabling warning about workflowLog being unused
  // TODO maybe display the path to the workflow log file rather than the contents?
  // eslint-disable-next-line
  const { metadataArchiveStatus, calls, end, failures, start, status, workflowLog, workflowRoot, submittedFiles: { workflow: wdl } = {} } = workflow || {}

  const restructureFailures = failuresArray => {
    const filtered = filter(({ message }) => !isEmpty(message) && !message.startsWith('Will not start job'), failuresArray)
    const sizeDiff = failuresArray.length - filtered.length
    const newMessage = sizeDiff > 0 ? [{
      message: `${sizeDiff} jobs were queued in Cromwell but never sent to the cloud backend due to failures elsewhere in the workflow`
    }] : []
    const simplifiedFailures = [...filtered, ...newMessage]

    return map(({ message, causedBy }) => ({
      message,
      ...(!isEmpty(causedBy) ? { causedBy: restructureFailures(causedBy) } : {})
    }), simplifiedFailures)
  }

  const callNames = sortBy(callName => min(map('start', calls[callName])), keys(calls))

  return div({ 'data-testid': 'run-details-container', id: 'run-details-page' }, [
    Navbar('RUN WORKFLOWS WITH CROMWELL'),
    //Loading state (spinner)
    cond(
      [
        workflow === undefined,
        () => h(Fragment, [div({ style: { fontStyle: 'italic', marginBottom: '1rem' } }, ['Fetching workflow metadata...']), centeredSpinner()])
      ],
      [
        metadataArchiveStatus === 'ArchivedAndDeleted',
        () => h(Fragment, [
          div({ style: { lineHeight: '24px', marginTop: '0.5rem', ...elements.sectionHeader } }, ' Run Details Archived'),
          div({ style: { lineHeight: '24px', marginTop: '0.5rem' } }, [
            "This run's details have been archived. Please refer to the ",
            h(
              Link,
              {
                href: 'https://support.terra.bio/hc/en-us/articles/360060601631',
                ...newTabLinkProps
              },
              [icon('pop-out', { size: 18 }), ' Run Details Archived']
            ),
            ' support article for details on how to access the archive.'
          ])
        ])
      ],
      () => h(Fragment, {}, [
        div({ style: { padding: '1rem 2rem 2rem' } }, [header]),
        div(
          {
            style: {
              id: 'details-colored-container',
              backgroundColor: 'rgb(222, 226, 232)'
            }
          },
          [
            div(
              {
                id: `details-colored-container-content`,
                style: {
                  padding: '1rem 2rem 2rem'
                }
              },
              [
                div({ style: { display: 'flex', justifyContent: 'flex-start' } }, [
                  makeSection(
                    'Workflow Status',
                    [
                      div({ style: { lineHeight: '24px', marginTop: '0.5rem' } }, [
                        makeStatusLine(style => collapseStatus(status).icon(style), status)
                      ])
                    ],
                    {}
                  ),
                  makeSection('Workflow Timing', [
                    div({ style: { marginTop: '0.5rem', display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '0.5rem' } }, [
                      div({ style: styles.sectionTableLabel }, ['Start:']),
                      div([start ? makeCompleteDate(start) : 'N/A']),
                      div({ style: styles.sectionTableLabel }, ['End:']),
                      div([end ? makeCompleteDate(end) : 'N/A'])
                    ])
                  ]),
                  makeSection('Workflow Engine Id', [div({ style: { lineHeight: '24px', marginTop: '0.5rem' } }, [div([workflowId])])], {})
                ]),
                failures &&
                    h(
                      Collapse,
                      {
                        style: { marginBottom: '1rem' },
                        initialOpenState: true,
                        title: div({ style: elements.sectionHeader }, 'Workflow-Level Failures'),
                        afterTitle: h(ClipboardButton, {
                          text: JSON.stringify(failures, null, 2),
                          style: { marginLeft: '0.5rem' }
                        })
                      },
                      [
                        h(ReactJson, {
                          style: { whiteSpace: 'pre-wrap' },
                          name: false,
                          collapsed: 4,
                          enableClipboard: false,
                          displayDataTypes: false,
                          displayObjectSize: false,
                          src: restructureFailures(failures)
                        })
                      ]
                    ),
                h(
                  Collapse,
                  {
                    title: div({ style: elements.sectionHeader }, ['Tasks']),
                    initialOpenState: true
                  },
                  [
                    div({ style: { marginLeft: '1rem' } }, [
                      makeSection('Total Task Status Counts', [
                        !isEmpty(calls) ?
                          statusCell(workflow) :
                          div({ style: { marginTop: '0.5rem' } }, ['No calls have been started by this workflow.'])
                      ]),
                      !isEmpty(calls) &&
                          makeSection(
                            'Task Lists',
                            [
                              map(callName => {
                                return h(
                                  Collapse,
                                  {
                                    key: callName,
                                    style: { marginLeft: '1rem', marginTop: '0.5rem' },
                                    title: div({ style: { ...codeFont, ...elements.sectionHeader } }, [`${callName} × ${calls[callName].length}`]),
                                    initialOpenState: !every({ executionStatus: 'Done' }, calls[callName])
                                  },
                                  // [h(CallTable, { callName, callObjects: calls[callName] })]
                                )
                              }, callNames)
                            ],
                            { style: { overflow: 'visible' } }
                          )
                    ])
                  ]
                ),
                wdl &&
                    h(
                      Collapse,
                      {
                        title: div({ style: elements.sectionHeader }, ['Submitted workflow script'])
                      },
                      [h(WDLViewer, { wdl })]
                    )
              ]
            )
          ]
        ),
        //NOTE:filter drop down, status count, and taskname search will occur here

        div({
          id: 'workflow-details-call-table-container',
          style: {
            margin: '1rem 3rem'
          }
        }, [
          h(CallTable, { key: 'workflow-tasks', callObjects: tableData })
        ])

        //  Q4-2022 Disable log-viewing
        //showLog && h(UriViewer, { workspace, uri: workflowLog, onDismiss: () => setShowLog(false) })
      ])
    )
  ])
}

export const navPaths = [
  {
    name: 'run-details',
    path: '/submission-monitoring/:submissionId/:workflowId',
    component: RunDetails,
    title: ({ name }) => `${name} - Run Details`
  }
]
