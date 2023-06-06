
import { cloneDeep, filter, includes, isEmpty } from 'lodash/fp'
import { Fragment, useCallback, useMemo, useRef, useState } from 'react'
import { div, h } from 'react-hyperscript-helpers'
import { Link, Navbar } from 'src/components/common'
import { centeredSpinner, icon } from 'src/components/icons'
import InputOutputModal from 'src/components/InputOutputModal'
import {
  collapseCromwellStatus,
  collapseStatus,
  HeaderSection,
  statusType,
  SubmitNewWorkflowButton
} from 'src/components/job-common'
import { TroubleshootingBox } from 'src/components/TroubleshootingBox'
import { UriViewer } from 'src/components/URIViewer/UriViewer'
import { WorkflowInfoBox } from 'src/components/WorkflowInfoBox'
import { Ajax } from 'src/libs/ajax'
import { useCancellation, useOnMount } from 'src/libs/react-utils'
import { elements } from 'src/libs/style'
import { cond, newTabLinkProps } from 'src/libs/utils'
import CallTable from 'src/pages/workspaces/workspace/jobHistory/CallTable'


// Filter function that only displays rows based on task name search parameters
// NOTE: the viewable call should have the task name stored on the call instance itself, should be done via pre-processing step
export const taskNameFilterFn = searchTerm => filter(call => call?.taskName?.includes(searchTerm))
export const statusFilterFn = status => filter(call => call.uiStatusLabel.toLocaleLowerCase() === status.toLocaleLowerCase())

//Helper method to generate data for the call table
export const generateCallTableData = calls => {
  const taskName = Object.keys(calls)
  return taskName.map(taskName => {
    const targetData = calls[taskName]
    const lastCall = cloneDeep(targetData[targetData.length - 1])
    //helper construct that assigns task name and status to the call object for easy access within the call tabler renderer
    const additionalData = {
      taskName,
      statusObj: collapseCromwellStatus(lastCall.executionStatus, lastCall.backendStatus)
    }
    return Object.assign(additionalData, lastCall)
  })
}

const myMetadata = {
  "workflowName": "assemble_refbased",
  "workflowProcessingEvents": [
      {
          "cromwellId": "cromid-89e0352",
          "description": "Finished",
          "timestamp": "2023-06-06T14:37:50.316Z",
          "cromwellVersion": "86-b1ec16a"
      },
      {
          "cromwellId": "cromid-89e0352",
          "description": "PickedUp",
          "timestamp": "2023-06-06T14:14:21.181Z",
          "cromwellVersion": "86-b1ec16a"
      }
  ],
  "actualWorkflowLanguageVersion": "1.0",
  "submittedFiles": {
      "workflow": "version 1.0\n\nimport \"../tasks/tasks_assembly.wdl\" as assembly\nimport \"../tasks/tasks_intrahost.wdl\" as intrahost\nimport \"../tasks/tasks_reports.wdl\" as reports\nimport \"../tasks/tasks_read_utils.wdl\" as read_utils\n\nworkflow assemble_refbased {\n\n    meta {\n        description: \"Reference-based microbial consensus calling. Aligns NGS reads to a singular reference genome, calls a new consensus sequence, and emits: new assembly, reads aligned to provided reference, reads aligned to new assembly, various figures of merit, plots, and QC metrics. The user may provide unaligned reads spread across multiple input files and this workflow will parallelize alignment per input file before merging results prior to consensus calling.\"\n        author: \"Broad Viral Genomics\"\n        email:  \"viral-ngs@broadinstitute.org\"\n        allowNestedInputs: true\n    }\n\n    parameter_meta {\n        sample_name: {\n            description: \"Base name of output files. The 'SM' field in BAM read group headers are also rewritten to this value. Avoid spaces and other filename-unfriendly characters.\",\n            category: \"common\"\n        }\n        reads_unmapped_bams: {\n            description: \"Unaligned reads in BAM format\",\n            patterns: [\"*.bam\"]\n        }\n        reference_fasta: {\n            description: \"Reference genome to align reads to.\",\n            patterns: [\"*.fasta\"]\n        }\n        aligner: {\n            description: \"Read aligner software to use. Options: novoalign, bwa, minimap2. Minimap2 can automatically handle Illumina, PacBio, or Oxford Nanopore reads as long as the 'PL' field in the BAM read group header is set properly (novoalign and bwa are Illumina-only).\"\n        }\n        novocraft_license: {\n            description: \"The default Novoalign short read aligner is a commercially licensed software that is available in a much slower, single-threaded version for free. If you have a paid license file, provide it here to run in multi-threaded mode. If this is omitted, it will run in single-threaded mode.\",\n            patterns: [\"*.lic\"]\n        }\n        skip_mark_dupes: {\n            description: \"skip Picard MarkDuplicates step after alignment. This is recommended to be set to true for PCR amplicon based data. (Default: false)\"\n        }\n        trim_coords_bed: {\n            description: \"optional primers to trim in reference coordinate space (0-based BED format)\",\n            patterns: [\"*.bed\"],\n            category: \"common\"\n        }\n        min_coverage: {\n            description: \"Minimum read coverage required to call a position unambiguous.\"\n        }\n        major_cutoff: {\n            description: \"If the major allele is present at a frequency higher than this cutoff, we will call an unambiguous base at that position.  If it is equal to or below this cutoff, we will call an ambiguous base representing all possible alleles at that position.\"\n        }\n\n\n        assembly_fasta: { description: \"The new assembly / consensus sequence for this sample\" }\n        align_to_ref_variants_vcf_gz: { description: \"All variants in the input reads against the original reference genome. This VCF file is used to create the assembly_fasta\" }\n        assembly_length: { description: \"The length of the sequence described in assembly_fasta, inclusive of any uncovered regions denoted by Ns\" }\n        assembly_length_unambiguous: { description: \"The number of called consensus bases in assembly_fasta (excludes regions of the genome that lack read coverage)\" }\n    }\n\n    input {\n        Array[File]+ reads_unmapped_bams\n        File         reference_fasta\n        String       sample_name = basename(reads_unmapped_bams[0], '.bam')\n\n        String       aligner=\"minimap2\"\n        File?        novocraft_license\n        Int          min_coverage=3\n        Float        major_cutoff=0.75\n        Boolean      skip_mark_dupes=false\n        File?        trim_coords_bed\n\n        Map[String,String] align_to_ref_options = {\n                            \"novoalign\": \"-r Random -l 40 -g 40 -x 20 -t 501 -k\",\n                            \"bwa\": \"-k 12 -B 1\",\n                            \"minimap2\": \"\"\n                            }\n        Map[String,String] align_to_self_options = {\n                            \"novoalign\": \"-r Random -l 40 -g 40 -x 20 -t 100\",\n                            \"bwa\": \"\",\n                            \"minimap2\": \"\"\n                            }\n    }\n\n    scatter(reads_unmapped_bam in reads_unmapped_bams) {\n        call assembly.align_reads as align_to_ref {\n            input:\n                reference_fasta    = reference_fasta,\n                reads_unmapped_bam = reads_unmapped_bam,\n                novocraft_license  = novocraft_license,\n                skip_mark_dupes    = skip_mark_dupes,\n                aligner            = aligner,\n                aligner_options    = align_to_ref_options[aligner]\n        }\n        call assembly.ivar_trim {\n            input:\n                aligned_bam     = align_to_ref.aligned_only_reads_bam,\n                trim_coords_bed = trim_coords_bed\n        }\n        Map[String,String] ivar_stats = {\n            'file': basename(reads_unmapped_bam, '.bam'),\n            'trim_percent': ivar_trim.primer_trimmed_read_percent,\n            'trim_count':   ivar_trim.primer_trimmed_read_count\n        }\n        Array[String] ivar_stats_row = [ivar_stats['file'], ivar_stats['trim_percent'], ivar_stats['trim_count']]\n    }\n\n    if(length(reads_unmapped_bams)>1) {\n        call read_utils.merge_and_reheader_bams as merge_align_to_ref {\n            input:\n                in_bams      = ivar_trim.aligned_trimmed_bam,\n                sample_name  = sample_name,\n                out_basename = \"~{sample_name}.align_to_ref.trimmed\"\n        }\n    }\n    File aligned_trimmed_bam = select_first([merge_align_to_ref.out_bam, ivar_trim.aligned_trimmed_bam[0]])\n\n    call intrahost.lofreq as isnvs_ref {\n        input:\n            reference_fasta = reference_fasta,\n            aligned_bam     = aligned_trimmed_bam\n    }\n\n    call reports.alignment_metrics {\n        input:\n            aligned_bam = aligned_trimmed_bam,\n            ref_fasta   = reference_fasta,\n            primers_bed = trim_coords_bed,\n            min_coverage = min_coverage\n    }\n\n    call assembly.run_discordance {\n        input:\n            reads_aligned_bam = aligned_trimmed_bam,\n            reference_fasta   = reference_fasta,\n            min_coverage      = min_coverage+1,\n            out_basename      = sample_name\n    }\n\n    call reports.plot_coverage as plot_ref_coverage {\n        input:\n            aligned_reads_bam = aligned_trimmed_bam,\n            sample_name       = sample_name\n    }\n\n    call assembly.refine_assembly_with_aligned_reads as call_consensus {\n        input:\n            reference_fasta   = reference_fasta,\n            reads_aligned_bam = aligned_trimmed_bam,\n            min_coverage      = min_coverage,\n            major_cutoff      = major_cutoff,\n            sample_name       = sample_name\n    }\n\n    scatter(reads_unmapped_bam in reads_unmapped_bams) {\n        call assembly.align_reads as align_to_self {\n            input:\n                reference_fasta    = call_consensus.refined_assembly_fasta,\n                reads_unmapped_bam = reads_unmapped_bam,\n                novocraft_license  = novocraft_license,\n                skip_mark_dupes    = skip_mark_dupes,\n                aligner            = aligner,\n                aligner_options    = align_to_self_options[aligner]\n        }\n    }\n\n    if(length(reads_unmapped_bams)>1) {\n        call read_utils.merge_and_reheader_bams as merge_align_to_self {\n            input:\n                in_bams      = align_to_self.aligned_only_reads_bam,\n                sample_name  = sample_name,\n                out_basename = \"~{sample_name}.merge_align_to_self\"\n        }\n    }\n    File aligned_self_bam = select_first([merge_align_to_self.out_bam, align_to_self.aligned_only_reads_bam[0]])\n\n    call intrahost.lofreq as isnvs_self {\n        input:\n            reference_fasta = call_consensus.refined_assembly_fasta,\n            aligned_bam     = aligned_self_bam\n    }\n\n    call reports.plot_coverage as plot_self_coverage {\n        input:\n            aligned_reads_bam = aligned_self_bam,\n            sample_name       = sample_name\n    }\n\n    output {\n        File        assembly_fasta                               = call_consensus.refined_assembly_fasta\n        File        align_to_ref_variants_vcf_gz                 = call_consensus.sites_vcf_gz\n        Int         assembly_length                              = call_consensus.assembly_length\n        Int         assembly_length_unambiguous                  = call_consensus.assembly_length_unambiguous\n        Int         reference_genome_length                      = plot_ref_coverage.assembly_length\n        Float       assembly_mean_coverage                       = plot_ref_coverage.mean_coverage\n        \n        Int         dist_to_ref_snps                             = call_consensus.dist_to_ref_snps\n        Int         dist_to_ref_indels                           = call_consensus.dist_to_ref_indels\n        \n        Array[Int]                primer_trimmed_read_count      = ivar_trim.primer_trimmed_read_count\n        Array[Float]              primer_trimmed_read_percent    = ivar_trim.primer_trimmed_read_percent\n        Array[Map[String,String]] ivar_trim_stats                = ivar_stats\n        Array[Array[String]]      ivar_trim_stats_tsv            = ivar_stats_row\n        \n        Int         replicate_concordant_sites                   = run_discordance.concordant_sites\n        Int         replicate_discordant_snps                    = run_discordance.discordant_snps\n        Int         replicate_discordant_indels                  = run_discordance.discordant_indels\n        Int         num_read_groups                              = run_discordance.num_read_groups\n        Int         num_libraries                                = run_discordance.num_libraries\n        File        replicate_discordant_vcf                     = run_discordance.discordant_sites_vcf\n        \n        Array[File] align_to_ref_per_input_aligned_flagstat      = align_to_ref.aligned_bam_flagstat\n        Array[Int]  align_to_ref_per_input_reads_provided        = align_to_ref.reads_provided\n        Array[Int]  align_to_ref_per_input_reads_aligned         = align_to_ref.reads_aligned\n\n        File        align_to_ref_merged_aligned_trimmed_only_bam = aligned_trimmed_bam\n        File        align_to_ref_fastqc                          = select_first([merge_align_to_ref.fastqc, align_to_ref.aligned_only_reads_fastqc[0]])\n        File        align_to_ref_merged_coverage_plot            = plot_ref_coverage.coverage_plot\n        File        align_to_ref_merged_coverage_tsv             = plot_ref_coverage.coverage_tsv\n        Int         align_to_ref_merged_reads_aligned            = plot_ref_coverage.reads_aligned\n        Int         align_to_ref_merged_read_pairs_aligned       = plot_ref_coverage.read_pairs_aligned\n        Float       align_to_ref_merged_bases_aligned            = plot_ref_coverage.bases_aligned\n        File        align_to_ref_isnvs_vcf                       = isnvs_ref.report_vcf\n        \n        File        picard_metrics_wgs                           = alignment_metrics.wgs_metrics\n        File        picard_metrics_alignment                     = alignment_metrics.alignment_metrics\n        File        picard_metrics_insert_size                   = alignment_metrics.insert_size_metrics\n        File        samtools_ampliconstats                       = alignment_metrics.amplicon_stats\n        File        samtools_ampliconstats_parsed                = alignment_metrics.amplicon_stats_parsed\n\n        Array[File] align_to_self_merged_aligned_and_unaligned_bam = align_to_self.aligned_bam\n\n        File        align_to_self_merged_aligned_only_bam        = aligned_self_bam\n        File        align_to_self_merged_coverage_plot           = plot_self_coverage.coverage_plot\n        File        align_to_self_merged_coverage_tsv            = plot_self_coverage.coverage_tsv\n        Int         align_to_self_merged_reads_aligned           = plot_self_coverage.reads_aligned\n        Int         align_to_self_merged_read_pairs_aligned      = plot_self_coverage.read_pairs_aligned\n        Float       align_to_self_merged_bases_aligned           = plot_self_coverage.bases_aligned\n        Float       align_to_self_merged_mean_coverage           = plot_self_coverage.mean_coverage\n        File        align_to_self_isnvs_vcf                      = isnvs_self.report_vcf\n        \n        String      assembly_method = \"viral-ngs/assemble_refbased\"\n        String      align_to_ref_viral_core_version              = align_to_ref.viralngs_version[0]\n        String      ivar_version                                 = ivar_trim.ivar_version[0]\n        String      viral_assemble_version                       = call_consensus.viralngs_version\n    }\n\n}\n",
      "root": "",
      "options": "{\n  \"final_workflow_log_dir\": \"https://lz43a8a3d21540dfd25f5ace.blob.core.windows.net/sc-d4564046-bbba-495c-afec-14f7d3a8283a/workspace-services/cbas/terra-app-566e92a0-e55e-4250-b4c1-d0925dd03916/cromwell-workflow-logs\"\n}",
      "inputs": "{\"assemble_refbased.reads_unmapped_bams\":[\"https://lz43a8a3d21540dfd25f5ace.blob.core.windows.net/sc-d4564046-bbba-495c-afec-14f7d3a8283a/workspace-services/cbas/terra-app-566e92a0-e55e-4250-b4c1-d0925dd03916/fetch_sra_to_bam/64142bd7-6616-4730-a176-f8496b3536c6/call-Fetch_SRA_to_BAM/execution/SRR11953796.bam\"],\"assemble_refbased.reference_fasta\":\"https://lze033433beed5b4a6a47de6.blob.core.windows.net/sc-e3ac5af2-dc4f-42cc-9111-a6f37acfe21a/ref-sarscov2-NC_045512.2.fasta\",\"assemble_refbased.sample_name\":\"SRR11953796\"}",
      "workflowUrl": "https://raw.githubusercontent.com/broadinstitute/viral-pipelines/v2.1.33.16/pipes/WDL/workflows/assemble_refbased.wdl",
      "labels": "{}"
  },
  "calls": {
      "assemble_refbased.isnvs_ref": [
          {
              "executionStatus": "Done",
              "stdout": "https://lz43a8a3d21540dfd25f5ace.blob.core.windows.net/sc-d4564046-bbba-495c-afec-14f7d3a8283a/workspace-services/cbas/terra-app-566e92a0-e55e-4250-b4c1-d0925dd03916/assemble_refbased/ddbbd548-5bde-4f4f-bc9e-9ca3e7fd7631/call-isnvs_ref/execution/stdout",
              "commandLine": "set -e -o pipefail\n\nlofreq version | grep version | sed 's/.* \\(.*\\)/\\1/g' | tee LOFREQ_VERSION\n\n# make local copies because CWD is writeable but localization dir isn't always\ncp \"/cromwell-executions/assemble_refbased/ddbbd548-5bde-4f4f-bc9e-9ca3e7fd7631/call-isnvs_ref/inputs/lze033433beed5b4a6a47de6.blob.core.windows.net/sc-e3ac5af2-dc4f-42cc-9111-a6f37acfe21a/ref-sarscov2-NC_045512.2.fasta\" reference.fasta\ncp \"/cromwell-executions/assemble_refbased/ddbbd548-5bde-4f4f-bc9e-9ca3e7fd7631/call-isnvs_ref/inputs/lz43a8a3d21540dfd25f5ace.blob.core.windows.net/sc-d4564046-bbba-495c-afec-14f7d3a8283a/workspace-services/cbas/terra-app-566e92a0-e55e-4250-b4c1-d0925dd03916/assemble_refbased/ddbbd548-5bde-4f4f-bc9e-9ca3e7fd7631/call-ivar_trim/shard-0/execution/SRR11953796.mapped.trimmed.bam\" aligned.bam\n\n# samtools faidx fails if fasta is empty\nif [ $(grep -v '^>' reference.fasta | tr -d '\\nNn' | wc -c) == \"0\" ]; then\n  touch \"SRR11953796.mapped.trimmed.vcf\"\n  exit 0\nfi\n\n# index for lofreq\nsamtools faidx reference.fasta\nsamtools index aligned.bam\n\n# lofreq\nlofreq call \\\n  -f reference.fasta \\\n  -o \"SRR11953796.mapped.trimmed.vcf\" \\\n  aligned.bam",
              "shardIndex": -1,
              "outputs": {
                  "report_vcf": "https://lz43a8a3d21540dfd25f5ace.blob.core.windows.net/sc-d4564046-bbba-495c-afec-14f7d3a8283a/workspace-services/cbas/terra-app-566e92a0-e55e-4250-b4c1-d0925dd03916/assemble_refbased/ddbbd548-5bde-4f4f-bc9e-9ca3e7fd7631/call-isnvs_ref/execution/SRR11953796.mapped.trimmed.vcf",
                  "lofreq_version": "2.1.5"
              },
              "runtimeAttributes": {
                  "preemptible": "true",
                  "disk": "200 GB",
                  "failOnStderr": "false",
                  "disks": "local-disk 200 HDD",
                  "continueOnReturnCode": "0",
                  "docker": "quay.io/biocontainers/lofreq:2.1.5--py38h588ecb2_4",
                  "maxRetries": "2",
                  "cpu": "2",
                  "memory": "3 GB"
              },
              "callCaching": {
                  "allowResultReuse": false,
                  "effectiveCallCachingMode": "CallCachingOff"
              },
              "inputs": {
                  "disk_size": 200,
                  "out_basename": null,
                  "reference_fasta": "https://lze033433beed5b4a6a47de6.blob.core.windows.net/sc-e3ac5af2-dc4f-42cc-9111-a6f37acfe21a/ref-sarscov2-NC_045512.2.fasta",
                  "docker": "quay.io/biocontainers/lofreq:2.1.5--py38h588ecb2_4",
                  "aligned_bam": "https://lz43a8a3d21540dfd25f5ace.blob.core.windows.net/sc-d4564046-bbba-495c-afec-14f7d3a8283a/workspace-services/cbas/terra-app-566e92a0-e55e-4250-b4c1-d0925dd03916/assemble_refbased/ddbbd548-5bde-4f4f-bc9e-9ca3e7fd7631/call-ivar_trim/shard-0/execution/SRR11953796.mapped.trimmed.bam",
                  "__out_basename": "SRR11953796.mapped.trimmed"
              },
              "returnCode": 0,
              "jobId": "ddbbd548_d8ff4df752424bc499312405612c4b3c",
              "backend": "TES",
              "start": "2023-06-06T14:22:13.906Z",
              "backendStatus": "Complete",
              "compressedDockerSize": 71091105,
              "end": "2023-06-06T14:25:56.998Z",
              "dockerImageUsed": "quay.io/biocontainers/lofreq@sha256:354ed5155578450d7fff24e0a0ab2445406581bbc7b0412b764380f77100ca66",
              "stderr": "https://lz43a8a3d21540dfd25f5ace.blob.core.windows.net/sc-d4564046-bbba-495c-afec-14f7d3a8283a/workspace-services/cbas/terra-app-566e92a0-e55e-4250-b4c1-d0925dd03916/assemble_refbased/ddbbd548-5bde-4f4f-bc9e-9ca3e7fd7631/call-isnvs_ref/execution/stderr",
              "callRoot": "https://lz43a8a3d21540dfd25f5ace.blob.core.windows.net/sc-d4564046-bbba-495c-afec-14f7d3a8283a/workspace-services/cbas/terra-app-566e92a0-e55e-4250-b4c1-d0925dd03916/assemble_refbased/ddbbd548-5bde-4f4f-bc9e-9ca3e7fd7631/call-isnvs_ref",
              "attempt": 1,
              "executionEvents": [
                  {
                      "startTime": "2023-06-06T14:22:17.137Z",
                      "description": "RunningJob",
                      "endTime": "2023-06-06T14:25:56.906Z"
                  },
                  {
                      "startTime": "2023-06-06T14:25:56.906Z",
                      "description": "UpdatingJobStore",
                      "endTime": "2023-06-06T14:25:56.998Z"
                  },
                  {
                      "startTime": "2023-06-06T14:22:13.906Z",
                      "description": "RequestingExecutionToken",
                      "endTime": "2023-06-06T14:22:17.103Z"
                  },
                  {
                      "startTime": "2023-06-06T14:22:13.906Z",
                      "description": "Pending",
                      "endTime": "2023-06-06T14:22:13.906Z"
                  },
                  {
                      "startTime": "2023-06-06T14:22:17.107Z",
                      "description": "PreparingJob",
                      "endTime": "2023-06-06T14:22:17.137Z"
                  },
                  {
                      "startTime": "2023-06-06T14:22:17.103Z",
                      "description": "WaitingForValueStore",
                      "endTime": "2023-06-06T14:22:17.107Z"
                  }
              ]
          }
      ],
      "assemble_refbased.plot_ref_coverage": [
          {
              "executionStatus": "Done",
              "stdout": "https://lz43a8a3d21540dfd25f5ace.blob.core.windows.net/sc-d4564046-bbba-495c-afec-14f7d3a8283a/workspace-services/cbas/terra-app-566e92a0-e55e-4250-b4c1-d0925dd03916/assemble_refbased/ddbbd548-5bde-4f4f-bc9e-9ca3e7fd7631/call-plot_ref_coverage/execution/stdout",
              "commandLine": "set -ex -o pipefail\n\nread_utils.py --version | tee VERSION\n\nsamtools view -c /cromwell-executions/assemble_refbased/ddbbd548-5bde-4f4f-bc9e-9ca3e7fd7631/call-plot_ref_coverage/inputs/lz43a8a3d21540dfd25f5ace.blob.core.windows.net/sc-d4564046-bbba-495c-afec-14f7d3a8283a/workspace-services/cbas/terra-app-566e92a0-e55e-4250-b4c1-d0925dd03916/assemble_refbased/ddbbd548-5bde-4f4f-bc9e-9ca3e7fd7631/call-ivar_trim/shard-0/execution/SRR11953796.mapped.trimmed.bam | tee reads_aligned\nif [ \"$(cat reads_aligned)\" != \"0\" ]; then\n  samtools index -@ \"$(nproc)\" \"/cromwell-executions/assemble_refbased/ddbbd548-5bde-4f4f-bc9e-9ca3e7fd7631/call-plot_ref_coverage/inputs/lz43a8a3d21540dfd25f5ace.blob.core.windows.net/sc-d4564046-bbba-495c-afec-14f7d3a8283a/workspace-services/cbas/terra-app-566e92a0-e55e-4250-b4c1-d0925dd03916/assemble_refbased/ddbbd548-5bde-4f4f-bc9e-9ca3e7fd7631/call-ivar_trim/shard-0/execution/SRR11953796.mapped.trimmed.bam\"\n\n  PLOT_DUPE_OPTION=\"\"\n  if [[ \"false\" != \"true\" ]]; then\n    PLOT_DUPE_OPTION=\"\"\n  fi\n  \n  BINNING_OPTION=\"\"\n\n  # plot coverage\n  reports.py plot_coverage \\\n    \"/cromwell-executions/assemble_refbased/ddbbd548-5bde-4f4f-bc9e-9ca3e7fd7631/call-plot_ref_coverage/inputs/lz43a8a3d21540dfd25f5ace.blob.core.windows.net/sc-d4564046-bbba-495c-afec-14f7d3a8283a/workspace-services/cbas/terra-app-566e92a0-e55e-4250-b4c1-d0925dd03916/assemble_refbased/ddbbd548-5bde-4f4f-bc9e-9ca3e7fd7631/call-ivar_trim/shard-0/execution/SRR11953796.mapped.trimmed.bam\" \\\n    \"SRR11953796.coverage_plot.pdf\" \\\n    --outSummary \"SRR11953796.coverage_plot.txt\" \\\n    --plotFormat pdf \\\n    --plotWidth 1100 \\\n    --plotHeight 850 \\\n    --plotDPI 100 \\\n     \\\n     \\\n     \\\n     \\\n     \\\n     \\\n    $PLOT_DUPE_OPTION \\\n    $BINNING_OPTION \\\n    --binningSummaryStatistic max \\\n    --plotTitle \"SRR11953796 coverage plot\" \\\n    --loglevel=DEBUG\n\nelse\n  touch SRR11953796.coverage_plot.pdf SRR11953796.coverage_plot.txt\nfi\n\n# collect figures of merit\nset +o pipefail # grep will exit 1 if it fails to find the pattern\nsamtools view -H /cromwell-executions/assemble_refbased/ddbbd548-5bde-4f4f-bc9e-9ca3e7fd7631/call-plot_ref_coverage/inputs/lz43a8a3d21540dfd25f5ace.blob.core.windows.net/sc-d4564046-bbba-495c-afec-14f7d3a8283a/workspace-services/cbas/terra-app-566e92a0-e55e-4250-b4c1-d0925dd03916/assemble_refbased/ddbbd548-5bde-4f4f-bc9e-9ca3e7fd7631/call-ivar_trim/shard-0/execution/SRR11953796.mapped.trimmed.bam | perl -n -e'/^@SQ.*LN:(\\d+)/ && print \"$1\\n\"' |  python -c \"import sys; print(sum(int(x) for x in sys.stdin))\" | tee assembly_length\n# report only primary alignments 260=exclude unaligned reads and secondary mappings\nsamtools view -h -F 260 /cromwell-executions/assemble_refbased/ddbbd548-5bde-4f4f-bc9e-9ca3e7fd7631/call-plot_ref_coverage/inputs/lz43a8a3d21540dfd25f5ace.blob.core.windows.net/sc-d4564046-bbba-495c-afec-14f7d3a8283a/workspace-services/cbas/terra-app-566e92a0-e55e-4250-b4c1-d0925dd03916/assemble_refbased/ddbbd548-5bde-4f4f-bc9e-9ca3e7fd7631/call-ivar_trim/shard-0/execution/SRR11953796.mapped.trimmed.bam | samtools flagstat - | tee SRR11953796.flagstat.txt\ngrep properly SRR11953796.flagstat.txt | cut -f 1 -d ' ' | tee read_pairs_aligned\nsamtools view /cromwell-executions/assemble_refbased/ddbbd548-5bde-4f4f-bc9e-9ca3e7fd7631/call-plot_ref_coverage/inputs/lz43a8a3d21540dfd25f5ace.blob.core.windows.net/sc-d4564046-bbba-495c-afec-14f7d3a8283a/workspace-services/cbas/terra-app-566e92a0-e55e-4250-b4c1-d0925dd03916/assemble_refbased/ddbbd548-5bde-4f4f-bc9e-9ca3e7fd7631/call-ivar_trim/shard-0/execution/SRR11953796.mapped.trimmed.bam | cut -f10 | tr -d '\\n' | wc -c | tee bases_aligned\npython -c \"print (float(\"$(cat bases_aligned)\")/\"$(cat assembly_length)\") if \"$(cat assembly_length)\">0 else print(0)\" > mean_coverage",
              "shardIndex": -1,
              "outputs": {
                  "coverage_tsv": "https://lz43a8a3d21540dfd25f5ace.blob.core.windows.net/sc-d4564046-bbba-495c-afec-14f7d3a8283a/workspace-services/cbas/terra-app-566e92a0-e55e-4250-b4c1-d0925dd03916/assemble_refbased/ddbbd548-5bde-4f4f-bc9e-9ca3e7fd7631/call-plot_ref_coverage/execution/SRR11953796.coverage_plot.txt",
                  "bases_aligned": 4343.0,
                  "reads_aligned": 43,
                  "mean_coverage": 0.14523626392000802,
                  "coverage_plot": "https://lz43a8a3d21540dfd25f5ace.blob.core.windows.net/sc-d4564046-bbba-495c-afec-14f7d3a8283a/workspace-services/cbas/terra-app-566e92a0-e55e-4250-b4c1-d0925dd03916/assemble_refbased/ddbbd548-5bde-4f4f-bc9e-9ca3e7fd7631/call-plot_ref_coverage/execution/SRR11953796.coverage_plot.pdf",
                  "assembly_length": 29903,
                  "read_pairs_aligned": 43,
                  "viralngs_version": "v2.1.33"
              },
              "runtimeAttributes": {
                  "preemptible": "true",
                  "disk": "375 GB",
                  "failOnStderr": "false",
                  "disks": "local-disk 375 LOCAL",
                  "continueOnReturnCode": "0",
                  "docker": "quay.io/broadinstitute/viral-core:2.1.33",
                  "maxRetries": "2",
                  "cpu": "2",
                  "memory": "7 GB"
              },
              "callCaching": {
                  "allowResultReuse": false,
                  "effectiveCallCachingMode": "CallCachingOff"
              },
              "inputs": {
                  "binning_summary_statistic": "max",
                  "base_q_threshold": null,
                  "mapping_q_threshold": null,
                  "max_coverage_depth": null,
                  "plotYLimits": null,
                  "plot_height_pixels": 850,
                  "bin_large_plots": false,
                  "plot_only_non_duplicates": false,
                  "sample_name": "SRR11953796",
                  "skip_mark_dupes": false,
                  "plotXLimits": null,
                  "plot_pixels_per_inch": 100,
                  "plot_width_pixels": 1100,
                  "aligned_reads_bam": "https://lz43a8a3d21540dfd25f5ace.blob.core.windows.net/sc-d4564046-bbba-495c-afec-14f7d3a8283a/workspace-services/cbas/terra-app-566e92a0-e55e-4250-b4c1-d0925dd03916/assemble_refbased/ddbbd548-5bde-4f4f-bc9e-9ca3e7fd7631/call-ivar_trim/shard-0/execution/SRR11953796.mapped.trimmed.bam",
                  "disk_size": 375,
                  "read_length_threshold": null,
                  "docker": "quay.io/broadinstitute/viral-core:2.1.33"
              },
              "returnCode": 0,
              "jobId": "ddbbd548_131f186fcca746d78c06c1c610233844",
              "backend": "TES",
              "start": "2023-06-06T14:22:13.904Z",
              "backendStatus": "Complete",
              "compressedDockerSize": 1310101908,
              "end": "2023-06-06T14:29:28.998Z",
              "dockerImageUsed": "quay.io/broadinstitute/viral-core@sha256:c6f4dadc33de882cd543f2aecf3c126e67230d71e7a4898eece1b23a3156d65c",
              "stderr": "https://lz43a8a3d21540dfd25f5ace.blob.core.windows.net/sc-d4564046-bbba-495c-afec-14f7d3a8283a/workspace-services/cbas/terra-app-566e92a0-e55e-4250-b4c1-d0925dd03916/assemble_refbased/ddbbd548-5bde-4f4f-bc9e-9ca3e7fd7631/call-plot_ref_coverage/execution/stderr",
              "callRoot": "https://lz43a8a3d21540dfd25f5ace.blob.core.windows.net/sc-d4564046-bbba-495c-afec-14f7d3a8283a/workspace-services/cbas/terra-app-566e92a0-e55e-4250-b4c1-d0925dd03916/assemble_refbased/ddbbd548-5bde-4f4f-bc9e-9ca3e7fd7631/call-plot_ref_coverage",
              "attempt": 1,
              "executionEvents": [
                  {
                      "startTime": "2023-06-06T14:22:13.904Z",
                      "description": "Pending",
                      "endTime": "2023-06-06T14:22:13.904Z"
                  },
                  {
                      "startTime": "2023-06-06T14:22:17.103Z",
                      "description": "WaitingForValueStore",
                      "endTime": "2023-06-06T14:22:17.103Z"
                  },
                  {
                      "startTime": "2023-06-06T14:29:28.039Z",
                      "description": "UpdatingJobStore",
                      "endTime": "2023-06-06T14:29:28.998Z"
                  },
                  {
                      "startTime": "2023-06-06T14:22:17.103Z",
                      "description": "PreparingJob",
                      "endTime": "2023-06-06T14:22:17.129Z"
                  },
                  {
                      "startTime": "2023-06-06T14:22:17.129Z",
                      "description": "RunningJob",
                      "endTime": "2023-06-06T14:29:28.039Z"
                  },
                  {
                      "startTime": "2023-06-06T14:22:13.904Z",
                      "description": "RequestingExecutionToken",
                      "endTime": "2023-06-06T14:22:17.103Z"
                  }
              ]
          }
      ],
      "assemble_refbased.ivar_trim": [
          {
              "executionStatus": "Done",
              "stdout": "https://lz43a8a3d21540dfd25f5ace.blob.core.windows.net/sc-d4564046-bbba-495c-afec-14f7d3a8283a/workspace-services/cbas/terra-app-566e92a0-e55e-4250-b4c1-d0925dd03916/assemble_refbased/ddbbd548-5bde-4f4f-bc9e-9ca3e7fd7631/call-ivar_trim/shard-0/execution/stdout",
              "commandLine": "ivar version | head -1 | tee VERSION\nif [ -f \"\" ]; then\n  ivar trim -e \\\n     \\\n     \\\n     \\\n    -q 1 \\\n     \\\n    -i /cromwell-executions/assemble_refbased/ddbbd548-5bde-4f4f-bc9e-9ca3e7fd7631/call-ivar_trim/shard-0/inputs/lz43a8a3d21540dfd25f5ace.blob.core.windows.net/sc-d4564046-bbba-495c-afec-14f7d3a8283a/workspace-services/cbas/terra-app-566e92a0-e55e-4250-b4c1-d0925dd03916/assemble_refbased/ddbbd548-5bde-4f4f-bc9e-9ca3e7fd7631/call-align_to_ref/shard-0/execution/SRR11953796.mapped.bam -p trim | tee IVAR_OUT\n  samtools sort -@ $(nproc) -m 1000M -o SRR11953796.mapped.trimmed.bam trim.bam\nelse\n  echo \"skipping ivar trim\"\n  cp \"/cromwell-executions/assemble_refbased/ddbbd548-5bde-4f4f-bc9e-9ca3e7fd7631/call-ivar_trim/shard-0/inputs/lz43a8a3d21540dfd25f5ace.blob.core.windows.net/sc-d4564046-bbba-495c-afec-14f7d3a8283a/workspace-services/cbas/terra-app-566e92a0-e55e-4250-b4c1-d0925dd03916/assemble_refbased/ddbbd548-5bde-4f4f-bc9e-9ca3e7fd7631/call-align_to_ref/shard-0/execution/SRR11953796.mapped.bam\" \"SRR11953796.mapped.trimmed.bam\"\n  echo \"Trimmed primers from 0% (0) of reads.\" > IVAR_OUT\nfi\nPCT=$(grep \"Trimmed primers from\" IVAR_OUT | perl -lape 's/Trimmed primers from (\\S+)%.*/$1/')\nif [[ $PCT = -* ]]; then echo 0; else echo $PCT; fi > IVAR_TRIM_PCT\ngrep \"Trimmed primers from\" IVAR_OUT | perl -lape 's/Trimmed primers from \\S+% \\((\\d+)\\).*/$1/' > IVAR_TRIM_COUNT",
              "shardIndex": 0,
              "outputs": {
                  "primer_trimmed_read_count": 0,
                  "primer_trimmed_read_percent": 0.0,
                  "ivar_version": "iVar version 1.3.1",
                  "aligned_trimmed_bam": "https://lz43a8a3d21540dfd25f5ace.blob.core.windows.net/sc-d4564046-bbba-495c-afec-14f7d3a8283a/workspace-services/cbas/terra-app-566e92a0-e55e-4250-b4c1-d0925dd03916/assemble_refbased/ddbbd548-5bde-4f4f-bc9e-9ca3e7fd7631/call-ivar_trim/shard-0/execution/SRR11953796.mapped.trimmed.bam"
              },
              "runtimeAttributes": {
                  "preemptible": "true",
                  "disk": "375 GB",
                  "failOnStderr": "false",
                  "disks": "local-disk 375 LOCAL",
                  "continueOnReturnCode": "0",
                  "docker": "andersenlabapps/ivar:1.3.1",
                  "maxRetries": "2",
                  "cpu": "4",
                  "memory": "7 GB"
              },
              "callCaching": {
                  "allowResultReuse": false,
                  "effectiveCallCachingMode": "CallCachingOff"
              },
              "inputs": {
                  "primer_offset": null,
                  "disk_size": 375,
                  "bam_basename": "SRR11953796.mapped",
                  "docker": "andersenlabapps/ivar:1.3.1",
                  "min_quality": 1,
                  "machine_mem_gb": null,
                  "trim_coords_bed": null,
                  "aligned_bam": "https://lz43a8a3d21540dfd25f5ace.blob.core.windows.net/sc-d4564046-bbba-495c-afec-14f7d3a8283a/workspace-services/cbas/terra-app-566e92a0-e55e-4250-b4c1-d0925dd03916/assemble_refbased/ddbbd548-5bde-4f4f-bc9e-9ca3e7fd7631/call-align_to_ref/shard-0/execution/SRR11953796.mapped.bam",
                  "min_keep_length": null,
                  "sliding_window": null
              },
              "returnCode": 0,
              "jobId": "ddbbd548_6b883f23b470492f83b554ffaf5ebcdd",
              "backend": "TES",
              "start": "2023-06-06T14:20:57.394Z",
              "backendStatus": "Complete",
              "compressedDockerSize": 445183039,
              "end": "2023-06-06T14:22:09.992Z",
              "dockerImageUsed": "andersenlabapps/ivar@sha256:05124b0aeb52262766a6ee1e03e82cae3f7b967ff417cb8d48a585ab6363501e",
              "stderr": "https://lz43a8a3d21540dfd25f5ace.blob.core.windows.net/sc-d4564046-bbba-495c-afec-14f7d3a8283a/workspace-services/cbas/terra-app-566e92a0-e55e-4250-b4c1-d0925dd03916/assemble_refbased/ddbbd548-5bde-4f4f-bc9e-9ca3e7fd7631/call-ivar_trim/shard-0/execution/stderr",
              "callRoot": "https://lz43a8a3d21540dfd25f5ace.blob.core.windows.net/sc-d4564046-bbba-495c-afec-14f7d3a8283a/workspace-services/cbas/terra-app-566e92a0-e55e-4250-b4c1-d0925dd03916/assemble_refbased/ddbbd548-5bde-4f4f-bc9e-9ca3e7fd7631/call-ivar_trim/shard-0",
              "attempt": 1,
              "executionEvents": [
                  {
                      "startTime": "2023-06-06T14:21:02.116Z",
                      "description": "RunningJob",
                      "endTime": "2023-06-06T14:22:09.690Z"
                  },
                  {
                      "startTime": "2023-06-06T14:20:57.394Z",
                      "description": "Pending",
                      "endTime": "2023-06-06T14:20:57.394Z"
                  },
                  {
                      "startTime": "2023-06-06T14:21:02.103Z",
                      "description": "WaitingForValueStore",
                      "endTime": "2023-06-06T14:21:02.103Z"
                  },
                  {
                      "startTime": "2023-06-06T14:20:57.394Z",
                      "description": "RequestingExecutionToken",
                      "endTime": "2023-06-06T14:21:02.103Z"
                  },
                  {
                      "startTime": "2023-06-06T14:22:09.690Z",
                      "description": "UpdatingJobStore",
                      "endTime": "2023-06-06T14:22:09.992Z"
                  },
                  {
                      "startTime": "2023-06-06T14:21:02.103Z",
                      "description": "PreparingJob",
                      "endTime": "2023-06-06T14:21:02.116Z"
                  }
              ]
          }
      ],
      "assemble_refbased.run_discordance": [
          {
              "executionStatus": "Done",
              "stdout": "https://lz43a8a3d21540dfd25f5ace.blob.core.windows.net/sc-d4564046-bbba-495c-afec-14f7d3a8283a/workspace-services/cbas/terra-app-566e92a0-e55e-4250-b4c1-d0925dd03916/assemble_refbased/ddbbd548-5bde-4f4f-bc9e-9ca3e7fd7631/call-run_discordance/execution/stdout",
              "commandLine": "set -ex -o pipefail\n\nread_utils.py --version | tee VERSION\n\n# create 2-col table with read group ids in both cols\npython3 <<CODE\nimport tools.samtools\nheader = tools.samtools.SamtoolsTool().getHeader(\"/cromwell-executions/assemble_refbased/ddbbd548-5bde-4f4f-bc9e-9ca3e7fd7631/call-run_discordance/inputs/lz43a8a3d21540dfd25f5ace.blob.core.windows.net/sc-d4564046-bbba-495c-afec-14f7d3a8283a/workspace-services/cbas/terra-app-566e92a0-e55e-4250-b4c1-d0925dd03916/assemble_refbased/ddbbd548-5bde-4f4f-bc9e-9ca3e7fd7631/call-ivar_trim/shard-0/execution/SRR11953796.mapped.trimmed.bam\")\nrgids = [[x[3:] for x in h if x.startswith('ID:')][0] for h in header if h[0]=='@RG']\nn_rgs = len(rgids)\nwith open('readgroups.txt', 'wt') as outf:\n  for rg in rgids:\n    outf.write(rg+'\\t'+rg+'\\n')\nn_lbs = len(set([[x[3:] for x in h if x.startswith('LB:')][0] for h in header if h[0]=='@RG']))\nwith open('num_read_groups', 'wt') as outf:\n  outf.write(str(n_rgs)+'\\n')\nwith open('num_libraries', 'wt') as outf:\n  outf.write(str(n_lbs)+'\\n')\nCODE\n\n# bcftools call snps while treating each RG as a separate sample\nbcftools mpileup \\\n  -G readgroups.txt -d 10000 -a \"FORMAT/DP,FORMAT/AD\" \\\n  -q 1 -m 2 -Ou \\\n  -f \"/cromwell-executions/assemble_refbased/ddbbd548-5bde-4f4f-bc9e-9ca3e7fd7631/call-run_discordance/inputs/lze033433beed5b4a6a47de6.blob.core.windows.net/sc-e3ac5af2-dc4f-42cc-9111-a6f37acfe21a/ref-sarscov2-NC_045512.2.fasta\" \"/cromwell-executions/assemble_refbased/ddbbd548-5bde-4f4f-bc9e-9ca3e7fd7631/call-run_discordance/inputs/lz43a8a3d21540dfd25f5ace.blob.core.windows.net/sc-d4564046-bbba-495c-afec-14f7d3a8283a/workspace-services/cbas/terra-app-566e92a0-e55e-4250-b4c1-d0925dd03916/assemble_refbased/ddbbd548-5bde-4f4f-bc9e-9ca3e7fd7631/call-ivar_trim/shard-0/execution/SRR11953796.mapped.trimmed.bam\" \\\n  | bcftools call \\\n  -P 0 -m --ploidy 1 \\\n  --threads $(nproc) \\\n  -Ov -o everything.vcf\n\n# mask all GT calls when less than 3 reads\ncat everything.vcf | bcftools filter -e \"FMT/DP<4\" -S . > filtered.vcf\ncat filtered.vcf | bcftools filter -i \"MAC>0\" > \"SRR11953796.discordant.vcf\"\n\n# tally outputs\nbcftools filter -i 'MAC=0' filtered.vcf | bcftools query -f '%POS\\n' | wc -l | tee num_concordant\nbcftools filter -i 'TYPE=\"snp\"'  \"SRR11953796.discordant.vcf\" | bcftools query -f '%POS\\n' | wc -l | tee num_discordant_snps\nbcftools filter -i 'TYPE!=\"snp\"' \"SRR11953796.discordant.vcf\" | bcftools query -f '%POS\\n' | wc -l | tee num_discordant_indels",
              "shardIndex": -1,
              "outputs": {
                  "discordant_snps": 0,
                  "num_read_groups": 1,
                  "discordant_indels": 0,
                  "num_libraries": 1,
                  "discordant_sites_vcf": "https://lz43a8a3d21540dfd25f5ace.blob.core.windows.net/sc-d4564046-bbba-495c-afec-14f7d3a8283a/workspace-services/cbas/terra-app-566e92a0-e55e-4250-b4c1-d0925dd03916/assemble_refbased/ddbbd548-5bde-4f4f-bc9e-9ca3e7fd7631/call-run_discordance/execution/SRR11953796.discordant.vcf",
                  "viralngs_version": "v2.1.33",
                  "concordant_sites": 0
              },
              "runtimeAttributes": {
                  "preemptible": "true",
                  "disk": "100 GB",
                  "failOnStderr": "false",
                  "disks": "local-disk 100 HDD",
                  "continueOnReturnCode": "0",
                  "docker": "quay.io/broadinstitute/viral-core:2.1.33",
                  "maxRetries": "2",
                  "cpu": "2",
                  "memory": "3 GB"
              },
              "callCaching": {
                  "allowResultReuse": false,
                  "effectiveCallCachingMode": "CallCachingOff"
              },
              "inputs": {
                  "reads_aligned_bam": "https://lz43a8a3d21540dfd25f5ace.blob.core.windows.net/sc-d4564046-bbba-495c-afec-14f7d3a8283a/workspace-services/cbas/terra-app-566e92a0-e55e-4250-b4c1-d0925dd03916/assemble_refbased/ddbbd548-5bde-4f4f-bc9e-9ca3e7fd7631/call-ivar_trim/shard-0/execution/SRR11953796.mapped.trimmed.bam",
                  "disk_size": 100,
                  "out_basename": "SRR11953796",
                  "reference_fasta": "https://lze033433beed5b4a6a47de6.blob.core.windows.net/sc-e3ac5af2-dc4f-42cc-9111-a6f37acfe21a/ref-sarscov2-NC_045512.2.fasta",
                  "min_coverage": 4,
                  "docker": "quay.io/broadinstitute/viral-core:2.1.33"
              },
              "returnCode": 0,
              "jobId": "ddbbd548_f1a03888c39f4062b253dbee8897baa4",
              "backend": "TES",
              "start": "2023-06-06T14:22:13.905Z",
              "backendStatus": "Complete",
              "compressedDockerSize": 1310101908,
              "end": "2023-06-06T14:29:11.992Z",
              "dockerImageUsed": "quay.io/broadinstitute/viral-core@sha256:c6f4dadc33de882cd543f2aecf3c126e67230d71e7a4898eece1b23a3156d65c",
              "stderr": "https://lz43a8a3d21540dfd25f5ace.blob.core.windows.net/sc-d4564046-bbba-495c-afec-14f7d3a8283a/workspace-services/cbas/terra-app-566e92a0-e55e-4250-b4c1-d0925dd03916/assemble_refbased/ddbbd548-5bde-4f4f-bc9e-9ca3e7fd7631/call-run_discordance/execution/stderr",
              "callRoot": "https://lz43a8a3d21540dfd25f5ace.blob.core.windows.net/sc-d4564046-bbba-495c-afec-14f7d3a8283a/workspace-services/cbas/terra-app-566e92a0-e55e-4250-b4c1-d0925dd03916/assemble_refbased/ddbbd548-5bde-4f4f-bc9e-9ca3e7fd7631/call-run_discordance",
              "attempt": 1,
              "executionEvents": [
                  {
                      "startTime": "2023-06-06T14:22:17.106Z",
                      "description": "PreparingJob",
                      "endTime": "2023-06-06T14:22:17.128Z"
                  },
                  {
                      "startTime": "2023-06-06T14:22:13.905Z",
                      "description": "RequestingExecutionToken",
                      "endTime": "2023-06-06T14:22:17.103Z"
                  },
                  {
                      "startTime": "2023-06-06T14:22:17.103Z",
                      "description": "WaitingForValueStore",
                      "endTime": "2023-06-06T14:22:17.106Z"
                  },
                  {
                      "startTime": "2023-06-06T14:29:11.766Z",
                      "description": "UpdatingJobStore",
                      "endTime": "2023-06-06T14:29:11.992Z"
                  },
                  {
                      "startTime": "2023-06-06T14:22:17.128Z",
                      "description": "RunningJob",
                      "endTime": "2023-06-06T14:29:11.766Z"
                  },
                  {
                      "startTime": "2023-06-06T14:22:13.905Z",
                      "description": "Pending",
                      "endTime": "2023-06-06T14:22:13.905Z"
                  }
              ]
          }
      ],
      "assemble_refbased.isnvs_self": [
          {
              "executionStatus": "Done",
              "stdout": "https://lz43a8a3d21540dfd25f5ace.blob.core.windows.net/sc-d4564046-bbba-495c-afec-14f7d3a8283a/workspace-services/cbas/terra-app-566e92a0-e55e-4250-b4c1-d0925dd03916/assemble_refbased/ddbbd548-5bde-4f4f-bc9e-9ca3e7fd7631/call-isnvs_self/execution/stdout",
              "commandLine": "set -e -o pipefail\n\nlofreq version | grep version | sed 's/.* \\(.*\\)/\\1/g' | tee LOFREQ_VERSION\n\n# make local copies because CWD is writeable but localization dir isn't always\ncp \"/cromwell-executions/assemble_refbased/ddbbd548-5bde-4f4f-bc9e-9ca3e7fd7631/call-isnvs_self/inputs/lz43a8a3d21540dfd25f5ace.blob.core.windows.net/sc-d4564046-bbba-495c-afec-14f7d3a8283a/workspace-services/cbas/terra-app-566e92a0-e55e-4250-b4c1-d0925dd03916/assemble_refbased/ddbbd548-5bde-4f4f-bc9e-9ca3e7fd7631/call-call_consensus/execution/SRR11953796.fasta\" reference.fasta\ncp \"/cromwell-executions/assemble_refbased/ddbbd548-5bde-4f4f-bc9e-9ca3e7fd7631/call-isnvs_self/inputs/lz43a8a3d21540dfd25f5ace.blob.core.windows.net/sc-d4564046-bbba-495c-afec-14f7d3a8283a/workspace-services/cbas/terra-app-566e92a0-e55e-4250-b4c1-d0925dd03916/assemble_refbased/ddbbd548-5bde-4f4f-bc9e-9ca3e7fd7631/call-align_to_self/shard-0/execution/SRR11953796.mapped.bam\" aligned.bam\n\n# samtools faidx fails if fasta is empty\nif [ $(grep -v '^>' reference.fasta | tr -d '\\nNn' | wc -c) == \"0\" ]; then\n  touch \"SRR11953796.mapped.vcf\"\n  exit 0\nfi\n\n# index for lofreq\nsamtools faidx reference.fasta\nsamtools index aligned.bam\n\n# lofreq\nlofreq call \\\n  -f reference.fasta \\\n  -o \"SRR11953796.mapped.vcf\" \\\n  aligned.bam",
              "shardIndex": -1,
              "outputs": {
                  "report_vcf": "https://lz43a8a3d21540dfd25f5ace.blob.core.windows.net/sc-d4564046-bbba-495c-afec-14f7d3a8283a/workspace-services/cbas/terra-app-566e92a0-e55e-4250-b4c1-d0925dd03916/assemble_refbased/ddbbd548-5bde-4f4f-bc9e-9ca3e7fd7631/call-isnvs_self/execution/SRR11953796.mapped.vcf",
                  "lofreq_version": "2.1.5"
              },
              "runtimeAttributes": {
                  "preemptible": "true",
                  "disk": "200 GB",
                  "failOnStderr": "false",
                  "disks": "local-disk 200 HDD",
                  "continueOnReturnCode": "0",
                  "docker": "quay.io/biocontainers/lofreq:2.1.5--py38h588ecb2_4",
                  "maxRetries": "2",
                  "cpu": "2",
                  "memory": "3 GB"
              },
              "callCaching": {
                  "allowResultReuse": false,
                  "effectiveCallCachingMode": "CallCachingOff"
              },
              "inputs": {
                  "disk_size": 200,
                  "out_basename": null,
                  "reference_fasta": "https://lz43a8a3d21540dfd25f5ace.blob.core.windows.net/sc-d4564046-bbba-495c-afec-14f7d3a8283a/workspace-services/cbas/terra-app-566e92a0-e55e-4250-b4c1-d0925dd03916/assemble_refbased/ddbbd548-5bde-4f4f-bc9e-9ca3e7fd7631/call-call_consensus/execution/SRR11953796.fasta",
                  "docker": "quay.io/biocontainers/lofreq:2.1.5--py38h588ecb2_4",
                  "aligned_bam": "https://lz43a8a3d21540dfd25f5ace.blob.core.windows.net/sc-d4564046-bbba-495c-afec-14f7d3a8283a/workspace-services/cbas/terra-app-566e92a0-e55e-4250-b4c1-d0925dd03916/assemble_refbased/ddbbd548-5bde-4f4f-bc9e-9ca3e7fd7631/call-align_to_self/shard-0/execution/SRR11953796.mapped.bam",
                  "__out_basename": "SRR11953796.mapped"
              },
              "returnCode": 0,
              "jobId": "ddbbd548_a1cf822f6c8e4986b0c28f7250d0a0a3",
              "backend": "TES",
              "start": "2023-06-06T14:32:16.773Z",
              "backendStatus": "Complete",
              "compressedDockerSize": 71091105,
              "end": "2023-06-06T14:36:11.988Z",
              "dockerImageUsed": "quay.io/biocontainers/lofreq@sha256:354ed5155578450d7fff24e0a0ab2445406581bbc7b0412b764380f77100ca66",
              "stderr": "https://lz43a8a3d21540dfd25f5ace.blob.core.windows.net/sc-d4564046-bbba-495c-afec-14f7d3a8283a/workspace-services/cbas/terra-app-566e92a0-e55e-4250-b4c1-d0925dd03916/assemble_refbased/ddbbd548-5bde-4f4f-bc9e-9ca3e7fd7631/call-isnvs_self/execution/stderr",
              "callRoot": "https://lz43a8a3d21540dfd25f5ace.blob.core.windows.net/sc-d4564046-bbba-495c-afec-14f7d3a8283a/workspace-services/cbas/terra-app-566e92a0-e55e-4250-b4c1-d0925dd03916/assemble_refbased/ddbbd548-5bde-4f4f-bc9e-9ca3e7fd7631/call-isnvs_self",
              "attempt": 1,
              "executionEvents": [
                  {
                      "startTime": "2023-06-06T14:32:17.108Z",
                      "description": "RunningJob",
                      "endTime": "2023-06-06T14:36:11.787Z"
                  },
                  {
                      "startTime": "2023-06-06T14:32:17.103Z",
                      "description": "WaitingForValueStore",
                      "endTime": "2023-06-06T14:32:17.103Z"
                  },
                  {
                      "startTime": "2023-06-06T14:36:11.787Z",
                      "description": "UpdatingJobStore",
                      "endTime": "2023-06-06T14:36:11.988Z"
                  },
                  {
                      "startTime": "2023-06-06T14:32:17.103Z",
                      "description": "PreparingJob",
                      "endTime": "2023-06-06T14:32:17.108Z"
                  },
                  {
                      "startTime": "2023-06-06T14:32:16.774Z",
                      "description": "RequestingExecutionToken",
                      "endTime": "2023-06-06T14:32:17.103Z"
                  },
                  {
                      "startTime": "2023-06-06T14:32:16.774Z",
                      "description": "Pending",
                      "endTime": "2023-06-06T14:32:16.774Z"
                  }
              ]
          }
      ],
      "assemble_refbased.alignment_metrics": [
          {
              "executionStatus": "Done",
              "stdout": "https://lz43a8a3d21540dfd25f5ace.blob.core.windows.net/sc-d4564046-bbba-495c-afec-14f7d3a8283a/workspace-services/cbas/terra-app-566e92a0-e55e-4250-b4c1-d0925dd03916/assemble_refbased/ddbbd548-5bde-4f4f-bc9e-9ca3e7fd7631/call-alignment_metrics/execution/stdout",
              "commandLine": "set -e\nMEM_MB=$(free -m | head -2 | tail -1 | awk '{print $4}')\nXMX=$(echo \"-Xmx\"$MEM_MB\"m\")\necho \"Requesting $MEM_MB MB of RAM for Java\"\n\n# requisite Picard fasta indexing\ncp \"/cromwell-executions/assemble_refbased/ddbbd548-5bde-4f4f-bc9e-9ca3e7fd7631/call-alignment_metrics/inputs/lze033433beed5b4a6a47de6.blob.core.windows.net/sc-e3ac5af2-dc4f-42cc-9111-a6f37acfe21a/ref-sarscov2-NC_045512.2.fasta\" reference.fasta\npicard $XMX CreateSequenceDictionary -R reference.fasta\n\n# get Picard metrics and clean up the junky outputs\npicard $XMX CollectRawWgsMetrics \\\n  -R reference.fasta \\\n  -I \"/cromwell-executions/assemble_refbased/ddbbd548-5bde-4f4f-bc9e-9ca3e7fd7631/call-alignment_metrics/inputs/lz43a8a3d21540dfd25f5ace.blob.core.windows.net/sc-d4564046-bbba-495c-afec-14f7d3a8283a/workspace-services/cbas/terra-app-566e92a0-e55e-4250-b4c1-d0925dd03916/assemble_refbased/ddbbd548-5bde-4f4f-bc9e-9ca3e7fd7631/call-ivar_trim/shard-0/execution/SRR11953796.mapped.trimmed.bam\" \\\n  -O picard_raw.raw_wgs_metrics.txt\ngrep -v \\# picard_raw.raw_wgs_metrics.txt | grep . | head -2 > picard_clean.raw_wgs_metrics.txt\n\npicard $XMX CollectAlignmentSummaryMetrics \\\n  -R reference.fasta \\\n  -I \"/cromwell-executions/assemble_refbased/ddbbd548-5bde-4f4f-bc9e-9ca3e7fd7631/call-alignment_metrics/inputs/lz43a8a3d21540dfd25f5ace.blob.core.windows.net/sc-d4564046-bbba-495c-afec-14f7d3a8283a/workspace-services/cbas/terra-app-566e92a0-e55e-4250-b4c1-d0925dd03916/assemble_refbased/ddbbd548-5bde-4f4f-bc9e-9ca3e7fd7631/call-ivar_trim/shard-0/execution/SRR11953796.mapped.trimmed.bam\" \\\n  -O picard_raw.alignment_metrics.txt\ngrep -v \\# picard_raw.alignment_metrics.txt | grep . | head -4 > picard_clean.alignment_metrics.txt \n\npicard $XMX CollectInsertSizeMetrics \\\n  -I \"/cromwell-executions/assemble_refbased/ddbbd548-5bde-4f4f-bc9e-9ca3e7fd7631/call-alignment_metrics/inputs/lz43a8a3d21540dfd25f5ace.blob.core.windows.net/sc-d4564046-bbba-495c-afec-14f7d3a8283a/workspace-services/cbas/terra-app-566e92a0-e55e-4250-b4c1-d0925dd03916/assemble_refbased/ddbbd548-5bde-4f4f-bc9e-9ca3e7fd7631/call-ivar_trim/shard-0/execution/SRR11953796.mapped.trimmed.bam\" \\\n  -O picard_raw.insert_size_metrics.txt \\\n  -H picard_raw.insert_size_metrics.pdf \\\n  --INCLUDE_DUPLICATES true\ngrep -v \\# picard_raw.insert_size_metrics.txt | grep . | head -2 > picard_clean.insert_size_metrics.txt\n\n# prepend the sample name in order to facilitate tsv joining later\nSAMPLE=$(samtools view -H \"/cromwell-executions/assemble_refbased/ddbbd548-5bde-4f4f-bc9e-9ca3e7fd7631/call-alignment_metrics/inputs/lz43a8a3d21540dfd25f5ace.blob.core.windows.net/sc-d4564046-bbba-495c-afec-14f7d3a8283a/workspace-services/cbas/terra-app-566e92a0-e55e-4250-b4c1-d0925dd03916/assemble_refbased/ddbbd548-5bde-4f4f-bc9e-9ca3e7fd7631/call-ivar_trim/shard-0/execution/SRR11953796.mapped.trimmed.bam\" | grep ^@RG | perl -lape 's/^@RG.*SM:(\\S+).*$/$1/' | sort | uniq)\necho -e \"sample_sanitized\\tbam\" > prepend.txt\necho -e \"$SAMPLE\\tSRR11953796.mapped.trimmed\" >> prepend.txt\npaste prepend.txt picard_clean.raw_wgs_metrics.txt > \"SRR11953796.mapped.trimmed\".raw_wgs_metrics.txt\necho -e \"$SAMPLE\\tSRR11953796.mapped.trimmed\" >> prepend.txt\necho -e \"$SAMPLE\\tSRR11953796.mapped.trimmed\" >> prepend.txt\npaste prepend.txt picard_clean.alignment_metrics.txt > \"SRR11953796.mapped.trimmed\".alignment_metrics.txt\necho -e \"sample_sanitized\\tbam\" > prepend.txt\necho -e \"$SAMPLE\\tSRR11953796.mapped.trimmed\" >> prepend.txt\npaste prepend.txt picard_clean.insert_size_metrics.txt > \"SRR11953796.mapped.trimmed\".insert_size_metrics.txt\n\ntouch \"SRR11953796.mapped.trimmed\".ampliconstats.txt \"SRR11953796.mapped.trimmed\".ampliconstats_parsed.txt\necho -e \"sample_sanitized\\tbam\\tamplicon_set\\tamplicon_idx\\tamplicon_left\\tamplicon_right\\tFREADS\\tFDEPTH\\tFPCOV\\tFAMP\" > \"SRR11953796.mapped.trimmed.ampliconstats_parsed.txt\"\nif [ -n \"\" ]; then\n  # samtools ampliconstats\n  cat \"\" | sort -k 4 -t $'\\t' > primers-sorted_for_samtools.bed\n  samtools ampliconstats -s -@ $(nproc) \\\n    -d 3 \\\n    -l 5000 \\\n    -a 500 \\\n    -o \"SRR11953796.mapped.trimmed\".ampliconstats.txt primers-sorted_for_samtools.bed \"/cromwell-executions/assemble_refbased/ddbbd548-5bde-4f4f-bc9e-9ca3e7fd7631/call-alignment_metrics/inputs/lz43a8a3d21540dfd25f5ace.blob.core.windows.net/sc-d4564046-bbba-495c-afec-14f7d3a8283a/workspace-services/cbas/terra-app-566e92a0-e55e-4250-b4c1-d0925dd03916/assemble_refbased/ddbbd548-5bde-4f4f-bc9e-9ca3e7fd7631/call-ivar_trim/shard-0/execution/SRR11953796.mapped.trimmed.bam\"\n\n  # parse into our own tsv to facilitate tsv joining later\n  if [ -n \"\" ]; then\n    AMPLICON_SET=\"\"\n  else\n    AMPLICON_SET=$(basename \"\" .bed)\n  fi\n  grep ^AMPLICON \"SRR11953796.mapped.trimmed\".ampliconstats.txt | cut -f 2- > AMPLICON\n  grep ^FREADS \"SRR11953796.mapped.trimmed\".ampliconstats.txt | cut -f 3- | tr '\\t' '\\n' > FREADS; echo \"\" >> FREADS\n  grep ^FDEPTH \"SRR11953796.mapped.trimmed\".ampliconstats.txt | cut -f 3- | tr '\\t' '\\n' > FDEPTH; echo \"\" >> FDEPTH\n  grep ^FPCOV  \"SRR11953796.mapped.trimmed\".ampliconstats.txt | cut -f 3- | tr '\\t' '\\n' > FPCOV;  echo \"\" >> FPCOV\n  grep ^FAMP   \"SRR11953796.mapped.trimmed\".ampliconstats.txt | cut -f 4 | tail +2 > FAMP\n  for i in $(cut -f 1 AMPLICON); do echo -e \"$SAMPLE\\tSRR11953796.mapped.trimmed\\t$AMPLICON_SET\"; done > prepend.txt\n  wc -l prepend.txt AMPLICON FREADS FDEPTH FPCOV FAMP\n  paste prepend.txt AMPLICON FREADS FDEPTH FPCOV FAMP | grep '\\S' >> \"SRR11953796.mapped.trimmed.ampliconstats_parsed.txt\"\nfi",
              "shardIndex": -1,
              "outputs": {
                  "insert_size_metrics": "https://lz43a8a3d21540dfd25f5ace.blob.core.windows.net/sc-d4564046-bbba-495c-afec-14f7d3a8283a/workspace-services/cbas/terra-app-566e92a0-e55e-4250-b4c1-d0925dd03916/assemble_refbased/ddbbd548-5bde-4f4f-bc9e-9ca3e7fd7631/call-alignment_metrics/execution/SRR11953796.mapped.trimmed.insert_size_metrics.txt",
                  "wgs_metrics": "https://lz43a8a3d21540dfd25f5ace.blob.core.windows.net/sc-d4564046-bbba-495c-afec-14f7d3a8283a/workspace-services/cbas/terra-app-566e92a0-e55e-4250-b4c1-d0925dd03916/assemble_refbased/ddbbd548-5bde-4f4f-bc9e-9ca3e7fd7631/call-alignment_metrics/execution/SRR11953796.mapped.trimmed.raw_wgs_metrics.txt",
                  "amplicon_stats": "https://lz43a8a3d21540dfd25f5ace.blob.core.windows.net/sc-d4564046-bbba-495c-afec-14f7d3a8283a/workspace-services/cbas/terra-app-566e92a0-e55e-4250-b4c1-d0925dd03916/assemble_refbased/ddbbd548-5bde-4f4f-bc9e-9ca3e7fd7631/call-alignment_metrics/execution/SRR11953796.mapped.trimmed.ampliconstats.txt",
                  "amplicon_stats_parsed": "https://lz43a8a3d21540dfd25f5ace.blob.core.windows.net/sc-d4564046-bbba-495c-afec-14f7d3a8283a/workspace-services/cbas/terra-app-566e92a0-e55e-4250-b4c1-d0925dd03916/assemble_refbased/ddbbd548-5bde-4f4f-bc9e-9ca3e7fd7631/call-alignment_metrics/execution/SRR11953796.mapped.trimmed.ampliconstats_parsed.txt",
                  "alignment_metrics": "https://lz43a8a3d21540dfd25f5ace.blob.core.windows.net/sc-d4564046-bbba-495c-afec-14f7d3a8283a/workspace-services/cbas/terra-app-566e92a0-e55e-4250-b4c1-d0925dd03916/assemble_refbased/ddbbd548-5bde-4f4f-bc9e-9ca3e7fd7631/call-alignment_metrics/execution/SRR11953796.mapped.trimmed.alignment_metrics.txt"
              },
              "runtimeAttributes": {
                  "preemptible": "true",
                  "disk": "150 GB",
                  "failOnStderr": "false",
                  "disks": "local-disk 150 HDD",
                  "continueOnReturnCode": "0",
                  "docker": "quay.io/broadinstitute/viral-core:2.1.33",
                  "maxRetries": "2",
                  "cpu": "2",
                  "memory": "13 GB"
              },
              "callCaching": {
                  "allowResultReuse": false,
                  "effectiveCallCachingMode": "CallCachingOff"
              },
              "inputs": {
                  "ref_fasta": "https://lze033433beed5b4a6a47de6.blob.core.windows.net/sc-e3ac5af2-dc4f-42cc-9111-a6f37acfe21a/ref-sarscov2-NC_045512.2.fasta",
                  "max_amp_len": 5000,
                  "disk_size": 150,
                  "out_basename": "SRR11953796.mapped.trimmed",
                  "primers_bed": null,
                  "min_coverage": 3,
                  "docker": "quay.io/broadinstitute/viral-core:2.1.33",
                  "max_amplicons": 500,
                  "aligned_bam": "https://lz43a8a3d21540dfd25f5ace.blob.core.windows.net/sc-d4564046-bbba-495c-afec-14f7d3a8283a/workspace-services/cbas/terra-app-566e92a0-e55e-4250-b4c1-d0925dd03916/assemble_refbased/ddbbd548-5bde-4f4f-bc9e-9ca3e7fd7631/call-ivar_trim/shard-0/execution/SRR11953796.mapped.trimmed.bam",
                  "amplicon_set": null,
                  "machine_mem_gb": null
              },
              "returnCode": 0,
              "jobId": "ddbbd548_f7cb1e91670749959b8d704e69553a7f",
              "backend": "TES",
              "start": "2023-06-06T14:22:13.905Z",
              "backendStatus": "Complete",
              "compressedDockerSize": 1310101908,
              "end": "2023-06-06T14:28:49.992Z",
              "dockerImageUsed": "quay.io/broadinstitute/viral-core@sha256:c6f4dadc33de882cd543f2aecf3c126e67230d71e7a4898eece1b23a3156d65c",
              "stderr": "https://lz43a8a3d21540dfd25f5ace.blob.core.windows.net/sc-d4564046-bbba-495c-afec-14f7d3a8283a/workspace-services/cbas/terra-app-566e92a0-e55e-4250-b4c1-d0925dd03916/assemble_refbased/ddbbd548-5bde-4f4f-bc9e-9ca3e7fd7631/call-alignment_metrics/execution/stderr",
              "callRoot": "https://lz43a8a3d21540dfd25f5ace.blob.core.windows.net/sc-d4564046-bbba-495c-afec-14f7d3a8283a/workspace-services/cbas/terra-app-566e92a0-e55e-4250-b4c1-d0925dd03916/assemble_refbased/ddbbd548-5bde-4f4f-bc9e-9ca3e7fd7631/call-alignment_metrics",
              "attempt": 1,
              "executionEvents": [
                  {
                      "startTime": "2023-06-06T14:22:17.134Z",
                      "description": "RunningJob",
                      "endTime": "2023-06-06T14:28:49.246Z"
                  },
                  {
                      "startTime": "2023-06-06T14:22:17.103Z",
                      "description": "WaitingForValueStore",
                      "endTime": "2023-06-06T14:22:17.103Z"
                  },
                  {
                      "startTime": "2023-06-06T14:22:17.103Z",
                      "description": "PreparingJob",
                      "endTime": "2023-06-06T14:22:17.134Z"
                  },
                  {
                      "startTime": "2023-06-06T14:22:13.905Z",
                      "description": "Pending",
                      "endTime": "2023-06-06T14:22:13.905Z"
                  },
                  {
                      "startTime": "2023-06-06T14:28:49.246Z",
                      "description": "UpdatingJobStore",
                      "endTime": "2023-06-06T14:28:49.992Z"
                  },
                  {
                      "startTime": "2023-06-06T14:22:13.905Z",
                      "description": "RequestingExecutionToken",
                      "endTime": "2023-06-06T14:22:17.103Z"
                  }
              ]
          }
      ],
      "assemble_refbased.plot_self_coverage": [
          {
              "executionStatus": "Done",
              "stdout": "https://lz43a8a3d21540dfd25f5ace.blob.core.windows.net/sc-d4564046-bbba-495c-afec-14f7d3a8283a/workspace-services/cbas/terra-app-566e92a0-e55e-4250-b4c1-d0925dd03916/assemble_refbased/ddbbd548-5bde-4f4f-bc9e-9ca3e7fd7631/call-plot_self_coverage/execution/stdout",
              "commandLine": "set -ex -o pipefail\n\nread_utils.py --version | tee VERSION\n\nsamtools view -c /cromwell-executions/assemble_refbased/ddbbd548-5bde-4f4f-bc9e-9ca3e7fd7631/call-plot_self_coverage/inputs/lz43a8a3d21540dfd25f5ace.blob.core.windows.net/sc-d4564046-bbba-495c-afec-14f7d3a8283a/workspace-services/cbas/terra-app-566e92a0-e55e-4250-b4c1-d0925dd03916/assemble_refbased/ddbbd548-5bde-4f4f-bc9e-9ca3e7fd7631/call-align_to_self/shard-0/execution/SRR11953796.mapped.bam | tee reads_aligned\nif [ \"$(cat reads_aligned)\" != \"0\" ]; then\n  samtools index -@ \"$(nproc)\" \"/cromwell-executions/assemble_refbased/ddbbd548-5bde-4f4f-bc9e-9ca3e7fd7631/call-plot_self_coverage/inputs/lz43a8a3d21540dfd25f5ace.blob.core.windows.net/sc-d4564046-bbba-495c-afec-14f7d3a8283a/workspace-services/cbas/terra-app-566e92a0-e55e-4250-b4c1-d0925dd03916/assemble_refbased/ddbbd548-5bde-4f4f-bc9e-9ca3e7fd7631/call-align_to_self/shard-0/execution/SRR11953796.mapped.bam\"\n\n  PLOT_DUPE_OPTION=\"\"\n  if [[ \"false\" != \"true\" ]]; then\n    PLOT_DUPE_OPTION=\"\"\n  fi\n  \n  BINNING_OPTION=\"\"\n\n  # plot coverage\n  reports.py plot_coverage \\\n    \"/cromwell-executions/assemble_refbased/ddbbd548-5bde-4f4f-bc9e-9ca3e7fd7631/call-plot_self_coverage/inputs/lz43a8a3d21540dfd25f5ace.blob.core.windows.net/sc-d4564046-bbba-495c-afec-14f7d3a8283a/workspace-services/cbas/terra-app-566e92a0-e55e-4250-b4c1-d0925dd03916/assemble_refbased/ddbbd548-5bde-4f4f-bc9e-9ca3e7fd7631/call-align_to_self/shard-0/execution/SRR11953796.mapped.bam\" \\\n    \"SRR11953796.coverage_plot.pdf\" \\\n    --outSummary \"SRR11953796.coverage_plot.txt\" \\\n    --plotFormat pdf \\\n    --plotWidth 1100 \\\n    --plotHeight 850 \\\n    --plotDPI 100 \\\n     \\\n     \\\n     \\\n     \\\n     \\\n     \\\n    $PLOT_DUPE_OPTION \\\n    $BINNING_OPTION \\\n    --binningSummaryStatistic max \\\n    --plotTitle \"SRR11953796 coverage plot\" \\\n    --loglevel=DEBUG\n\nelse\n  touch SRR11953796.coverage_plot.pdf SRR11953796.coverage_plot.txt\nfi\n\n# collect figures of merit\nset +o pipefail # grep will exit 1 if it fails to find the pattern\nsamtools view -H /cromwell-executions/assemble_refbased/ddbbd548-5bde-4f4f-bc9e-9ca3e7fd7631/call-plot_self_coverage/inputs/lz43a8a3d21540dfd25f5ace.blob.core.windows.net/sc-d4564046-bbba-495c-afec-14f7d3a8283a/workspace-services/cbas/terra-app-566e92a0-e55e-4250-b4c1-d0925dd03916/assemble_refbased/ddbbd548-5bde-4f4f-bc9e-9ca3e7fd7631/call-align_to_self/shard-0/execution/SRR11953796.mapped.bam | perl -n -e'/^@SQ.*LN:(\\d+)/ && print \"$1\\n\"' |  python -c \"import sys; print(sum(int(x) for x in sys.stdin))\" | tee assembly_length\n# report only primary alignments 260=exclude unaligned reads and secondary mappings\nsamtools view -h -F 260 /cromwell-executions/assemble_refbased/ddbbd548-5bde-4f4f-bc9e-9ca3e7fd7631/call-plot_self_coverage/inputs/lz43a8a3d21540dfd25f5ace.blob.core.windows.net/sc-d4564046-bbba-495c-afec-14f7d3a8283a/workspace-services/cbas/terra-app-566e92a0-e55e-4250-b4c1-d0925dd03916/assemble_refbased/ddbbd548-5bde-4f4f-bc9e-9ca3e7fd7631/call-align_to_self/shard-0/execution/SRR11953796.mapped.bam | samtools flagstat - | tee SRR11953796.flagstat.txt\ngrep properly SRR11953796.flagstat.txt | cut -f 1 -d ' ' | tee read_pairs_aligned\nsamtools view /cromwell-executions/assemble_refbased/ddbbd548-5bde-4f4f-bc9e-9ca3e7fd7631/call-plot_self_coverage/inputs/lz43a8a3d21540dfd25f5ace.blob.core.windows.net/sc-d4564046-bbba-495c-afec-14f7d3a8283a/workspace-services/cbas/terra-app-566e92a0-e55e-4250-b4c1-d0925dd03916/assemble_refbased/ddbbd548-5bde-4f4f-bc9e-9ca3e7fd7631/call-align_to_self/shard-0/execution/SRR11953796.mapped.bam | cut -f10 | tr -d '\\n' | wc -c | tee bases_aligned\npython -c \"print (float(\"$(cat bases_aligned)\")/\"$(cat assembly_length)\") if \"$(cat assembly_length)\">0 else print(0)\" > mean_coverage",
              "shardIndex": -1,
              "outputs": {
                  "coverage_tsv": "https://lz43a8a3d21540dfd25f5ace.blob.core.windows.net/sc-d4564046-bbba-495c-afec-14f7d3a8283a/workspace-services/cbas/terra-app-566e92a0-e55e-4250-b4c1-d0925dd03916/assemble_refbased/ddbbd548-5bde-4f4f-bc9e-9ca3e7fd7631/call-plot_self_coverage/execution/SRR11953796.coverage_plot.txt",
                  "bases_aligned": 0.0,
                  "reads_aligned": 0,
                  "mean_coverage": 0.0,
                  "coverage_plot": "https://lz43a8a3d21540dfd25f5ace.blob.core.windows.net/sc-d4564046-bbba-495c-afec-14f7d3a8283a/workspace-services/cbas/terra-app-566e92a0-e55e-4250-b4c1-d0925dd03916/assemble_refbased/ddbbd548-5bde-4f4f-bc9e-9ca3e7fd7631/call-plot_self_coverage/execution/SRR11953796.coverage_plot.pdf",
                  "assembly_length": 18529,
                  "read_pairs_aligned": 0,
                  "viralngs_version": "v2.1.33"
              },
              "runtimeAttributes": {
                  "preemptible": "true",
                  "disk": "375 GB",
                  "failOnStderr": "false",
                  "disks": "local-disk 375 LOCAL",
                  "continueOnReturnCode": "0",
                  "docker": "quay.io/broadinstitute/viral-core:2.1.33",
                  "maxRetries": "2",
                  "cpu": "2",
                  "memory": "7 GB"
              },
              "callCaching": {
                  "allowResultReuse": false,
                  "effectiveCallCachingMode": "CallCachingOff"
              },
              "inputs": {
                  "binning_summary_statistic": "max",
                  "base_q_threshold": null,
                  "mapping_q_threshold": null,
                  "max_coverage_depth": null,
                  "plotYLimits": null,
                  "plot_height_pixels": 850,
                  "bin_large_plots": false,
                  "plot_only_non_duplicates": false,
                  "sample_name": "SRR11953796",
                  "skip_mark_dupes": false,
                  "plotXLimits": null,
                  "plot_pixels_per_inch": 100,
                  "plot_width_pixels": 1100,
                  "aligned_reads_bam": "https://lz43a8a3d21540dfd25f5ace.blob.core.windows.net/sc-d4564046-bbba-495c-afec-14f7d3a8283a/workspace-services/cbas/terra-app-566e92a0-e55e-4250-b4c1-d0925dd03916/assemble_refbased/ddbbd548-5bde-4f4f-bc9e-9ca3e7fd7631/call-align_to_self/shard-0/execution/SRR11953796.mapped.bam",
                  "disk_size": 375,
                  "read_length_threshold": null,
                  "docker": "quay.io/broadinstitute/viral-core:2.1.33"
              },
              "returnCode": 0,
              "jobId": "ddbbd548_ce103856387b414ea00422fbdf892ee5",
              "backend": "TES",
              "start": "2023-06-06T14:32:16.773Z",
              "backendStatus": "Complete",
              "compressedDockerSize": 1310101908,
              "end": "2023-06-06T14:37:48.993Z",
              "dockerImageUsed": "quay.io/broadinstitute/viral-core@sha256:c6f4dadc33de882cd543f2aecf3c126e67230d71e7a4898eece1b23a3156d65c",
              "stderr": "https://lz43a8a3d21540dfd25f5ace.blob.core.windows.net/sc-d4564046-bbba-495c-afec-14f7d3a8283a/workspace-services/cbas/terra-app-566e92a0-e55e-4250-b4c1-d0925dd03916/assemble_refbased/ddbbd548-5bde-4f4f-bc9e-9ca3e7fd7631/call-plot_self_coverage/execution/stderr",
              "callRoot": "https://lz43a8a3d21540dfd25f5ace.blob.core.windows.net/sc-d4564046-bbba-495c-afec-14f7d3a8283a/workspace-services/cbas/terra-app-566e92a0-e55e-4250-b4c1-d0925dd03916/assemble_refbased/ddbbd548-5bde-4f4f-bc9e-9ca3e7fd7631/call-plot_self_coverage",
              "attempt": 1,
              "executionEvents": [
                  {
                      "startTime": "2023-06-06T14:32:17.103Z",
                      "description": "PreparingJob",
                      "endTime": "2023-06-06T14:32:17.111Z"
                  },
                  {
                      "startTime": "2023-06-06T14:37:48.926Z",
                      "description": "UpdatingJobStore",
                      "endTime": "2023-06-06T14:37:48.993Z"
                  },
                  {
                      "startTime": "2023-06-06T14:32:17.111Z",
                      "description": "RunningJob",
                      "endTime": "2023-06-06T14:37:48.926Z"
                  },
                  {
                      "startTime": "2023-06-06T14:32:16.774Z",
                      "description": "RequestingExecutionToken",
                      "endTime": "2023-06-06T14:32:17.103Z"
                  },
                  {
                      "startTime": "2023-06-06T14:32:17.103Z",
                      "description": "WaitingForValueStore",
                      "endTime": "2023-06-06T14:32:17.103Z"
                  },
                  {
                      "startTime": "2023-06-06T14:32:16.774Z",
                      "description": "Pending",
                      "endTime": "2023-06-06T14:32:16.774Z"
                  }
              ]
          }
      ],
      "assemble_refbased.align_to_self": [
          {
              "executionStatus": "Done",
              "stdout": "https://lz43a8a3d21540dfd25f5ace.blob.core.windows.net/sc-d4564046-bbba-495c-afec-14f7d3a8283a/workspace-services/cbas/terra-app-566e92a0-e55e-4250-b4c1-d0925dd03916/assemble_refbased/ddbbd548-5bde-4f4f-bc9e-9ca3e7fd7631/call-align_to_self/shard-0/execution/stdout",
              "commandLine": "set -ex # do not set pipefail, since grep exits 1 if it can't find the pattern\n\nread_utils.py --version | tee VERSION\n\nmem_in_mb=$(/opt/viral-ngs/source/docker/calc_mem.py mb 90)\n\ncp \"/cromwell-executions/assemble_refbased/ddbbd548-5bde-4f4f-bc9e-9ca3e7fd7631/call-align_to_self/shard-0/inputs/lz43a8a3d21540dfd25f5ace.blob.core.windows.net/sc-d4564046-bbba-495c-afec-14f7d3a8283a/workspace-services/cbas/terra-app-566e92a0-e55e-4250-b4c1-d0925dd03916/assemble_refbased/ddbbd548-5bde-4f4f-bc9e-9ca3e7fd7631/call-call_consensus/execution/SRR11953796.fasta\" assembly.fasta\ngrep -v '^>' assembly.fasta | tr -d '\\n' | wc -c | tee assembly_length\n\nif [ \"$(cat assembly_length)\" != \"0\" ]; then\n\n  # only perform the following if the reference is non-empty\n\n  if [ \"minimap2\" == \"novoalign\" ]; then\n    read_utils.py novoindex \\\n      assembly.fasta \\\n       \\\n      --loglevel=DEBUG\n  fi\n  read_utils.py index_fasta_picard assembly.fasta --loglevel=DEBUG\n  read_utils.py index_fasta_samtools assembly.fasta --loglevel=DEBUG\n\n  read_utils.py align_and_fix \\\n    \"/cromwell-executions/assemble_refbased/ddbbd548-5bde-4f4f-bc9e-9ca3e7fd7631/call-align_to_self/shard-0/inputs/lz43a8a3d21540dfd25f5ace.blob.core.windows.net/sc-d4564046-bbba-495c-afec-14f7d3a8283a/workspace-services/cbas/terra-app-566e92a0-e55e-4250-b4c1-d0925dd03916/fetch_sra_to_bam/64142bd7-6616-4730-a176-f8496b3536c6/call-Fetch_SRA_to_BAM/execution/SRR11953796.bam\" \\\n    assembly.fasta \\\n    --outBamAll \"SRR11953796.all.bam\" \\\n    --outBamFiltered \"SRR11953796.mapped.bam\" \\\n    --aligner minimap2 \\\n    --aligner_options \"\" \\\n     \\\n    --JVMmemory \"$mem_in_mb\"m \\\n     \\\n    --loglevel=DEBUG\n\nelse\n  # handle special case of empty reference fasta -- emit empty bams (with original bam headers)\n  samtools view -H -b \"/cromwell-executions/assemble_refbased/ddbbd548-5bde-4f4f-bc9e-9ca3e7fd7631/call-align_to_self/shard-0/inputs/lz43a8a3d21540dfd25f5ace.blob.core.windows.net/sc-d4564046-bbba-495c-afec-14f7d3a8283a/workspace-services/cbas/terra-app-566e92a0-e55e-4250-b4c1-d0925dd03916/fetch_sra_to_bam/64142bd7-6616-4730-a176-f8496b3536c6/call-Fetch_SRA_to_BAM/execution/SRR11953796.bam\" > \"SRR11953796.all.bam\"\n  samtools view -H -b \"/cromwell-executions/assemble_refbased/ddbbd548-5bde-4f4f-bc9e-9ca3e7fd7631/call-align_to_self/shard-0/inputs/lz43a8a3d21540dfd25f5ace.blob.core.windows.net/sc-d4564046-bbba-495c-afec-14f7d3a8283a/workspace-services/cbas/terra-app-566e92a0-e55e-4250-b4c1-d0925dd03916/fetch_sra_to_bam/64142bd7-6616-4730-a176-f8496b3536c6/call-Fetch_SRA_to_BAM/execution/SRR11953796.bam\" > \"SRR11953796.mapped.bam\"\n\n  samtools index \"SRR11953796.all.bam\" \"SRR11953796.all.bai\"\n  samtools index \"SRR11953796.mapped.bam\" \"SRR11953796.mapped.bai\"\nfi\n\ncat /proc/loadavg > CPU_LOAD\n\n# collect figures of merit\ngrep -v '^>' assembly.fasta | tr -d '\\nNn' | wc -c | tee assembly_length_unambiguous\nsamtools view -c \"/cromwell-executions/assemble_refbased/ddbbd548-5bde-4f4f-bc9e-9ca3e7fd7631/call-align_to_self/shard-0/inputs/lz43a8a3d21540dfd25f5ace.blob.core.windows.net/sc-d4564046-bbba-495c-afec-14f7d3a8283a/workspace-services/cbas/terra-app-566e92a0-e55e-4250-b4c1-d0925dd03916/fetch_sra_to_bam/64142bd7-6616-4730-a176-f8496b3536c6/call-Fetch_SRA_to_BAM/execution/SRR11953796.bam\" | tee reads_provided\nsamtools view -c \"SRR11953796.mapped.bam\" | tee reads_aligned\n# report only primary alignments 260=exclude unaligned reads and secondary mappings\nsamtools view -h -F 260 \"SRR11953796.all.bam\" | samtools flagstat - | tee SRR11953796.all.bam.flagstat.txt\ngrep properly \"SRR11953796.all.bam.flagstat.txt\" | cut -f 1 -d ' ' | tee read_pairs_aligned\nsamtools view \"SRR11953796.mapped.bam\" | cut -f10 | tr -d '\\n' | wc -c | tee bases_aligned\npython -c \"print (float(\"$(cat bases_aligned)\")/\"$(cat assembly_length_unambiguous)\") if \"$(cat assembly_length_unambiguous)\">0 else print(0)\" > mean_coverage\n\n# fastqc mapped bam\nreports.py fastqc SRR11953796.mapped.bam SRR11953796.mapped_fastqc.html --out_zip SRR11953796.mapped_fastqc.zip\n\ncat /proc/uptime | cut -f 1 -d ' ' > UPTIME_SEC\n{ cat /sys/fs/cgroup/memory/memory.max_usage_in_bytes || echo 0; } > MEM_BYTES",
              "shardIndex": 0,
              "outputs": {
                  "reads_provided": 750120,
                  "aligned_only_reads_fastqc": "https://lz43a8a3d21540dfd25f5ace.blob.core.windows.net/sc-d4564046-bbba-495c-afec-14f7d3a8283a/workspace-services/cbas/terra-app-566e92a0-e55e-4250-b4c1-d0925dd03916/assemble_refbased/ddbbd548-5bde-4f4f-bc9e-9ca3e7fd7631/call-align_to_self/shard-0/execution/SRR11953796.mapped_fastqc.html",
                  "max_ram_gb": 8,
                  "reads_aligned": 0,
                  "aligned_bam_flagstat": "https://lz43a8a3d21540dfd25f5ace.blob.core.windows.net/sc-d4564046-bbba-495c-afec-14f7d3a8283a/workspace-services/cbas/terra-app-566e92a0-e55e-4250-b4c1-d0925dd03916/assemble_refbased/ddbbd548-5bde-4f4f-bc9e-9ca3e7fd7631/call-align_to_self/shard-0/execution/SRR11953796.all.bam.flagstat.txt",
                  "read_pairs_aligned": 0,
                  "aligned_bam_idx": "https://lz43a8a3d21540dfd25f5ace.blob.core.windows.net/sc-d4564046-bbba-495c-afec-14f7d3a8283a/workspace-services/cbas/terra-app-566e92a0-e55e-4250-b4c1-d0925dd03916/assemble_refbased/ddbbd548-5bde-4f4f-bc9e-9ca3e7fd7631/call-align_to_self/shard-0/execution/SRR11953796.all.bai",
                  "cpu_load": "2.69 1.61 0.70 2/273 354",
                  "aligned_only_reads_fastqc_zip": "https://lz43a8a3d21540dfd25f5ace.blob.core.windows.net/sc-d4564046-bbba-495c-afec-14f7d3a8283a/workspace-services/cbas/terra-app-566e92a0-e55e-4250-b4c1-d0925dd03916/assemble_refbased/ddbbd548-5bde-4f4f-bc9e-9ca3e7fd7631/call-align_to_self/shard-0/execution/SRR11953796.mapped_fastqc.zip",
                  "runtime_sec": 343,
                  "bases_aligned": 0.0,
                  "mean_coverage": 0.0,
                  "aligned_only_reads_bam": "https://lz43a8a3d21540dfd25f5ace.blob.core.windows.net/sc-d4564046-bbba-495c-afec-14f7d3a8283a/workspace-services/cbas/terra-app-566e92a0-e55e-4250-b4c1-d0925dd03916/assemble_refbased/ddbbd548-5bde-4f4f-bc9e-9ca3e7fd7631/call-align_to_self/shard-0/execution/SRR11953796.mapped.bam",
                  "aligned_bam": "https://lz43a8a3d21540dfd25f5ace.blob.core.windows.net/sc-d4564046-bbba-495c-afec-14f7d3a8283a/workspace-services/cbas/terra-app-566e92a0-e55e-4250-b4c1-d0925dd03916/assemble_refbased/ddbbd548-5bde-4f4f-bc9e-9ca3e7fd7631/call-align_to_self/shard-0/execution/SRR11953796.all.bam",
                  "aligned_only_reads_bam_idx": "https://lz43a8a3d21540dfd25f5ace.blob.core.windows.net/sc-d4564046-bbba-495c-afec-14f7d3a8283a/workspace-services/cbas/terra-app-566e92a0-e55e-4250-b4c1-d0925dd03916/assemble_refbased/ddbbd548-5bde-4f4f-bc9e-9ca3e7fd7631/call-align_to_self/shard-0/execution/SRR11953796.mapped.bai",
                  "viralngs_version": "v2.1.33"
              },
              "runtimeAttributes": {
                  "preemptible": "true",
                  "disk": "375 GB",
                  "failOnStderr": "false",
                  "disks": "local-disk 375 LOCAL",
                  "continueOnReturnCode": "0",
                  "docker": "quay.io/broadinstitute/viral-core:2.1.33",
                  "maxRetries": "2",
                  "cpu": "8",
                  "memory": "15 GB"
              },
              "callCaching": {
                  "allowResultReuse": false,
                  "effectiveCallCachingMode": "CallCachingOff"
              },
              "inputs": {
                  "novocraft_license": null,
                  "reads_unmapped_bam": "https://lz43a8a3d21540dfd25f5ace.blob.core.windows.net/sc-d4564046-bbba-495c-afec-14f7d3a8283a/workspace-services/cbas/terra-app-566e92a0-e55e-4250-b4c1-d0925dd03916/fetch_sra_to_bam/64142bd7-6616-4730-a176-f8496b3536c6/call-Fetch_SRA_to_BAM/execution/SRR11953796.bam",
                  "disk_size": 375,
                  "reference_fasta": "https://lz43a8a3d21540dfd25f5ace.blob.core.windows.net/sc-d4564046-bbba-495c-afec-14f7d3a8283a/workspace-services/cbas/terra-app-566e92a0-e55e-4250-b4c1-d0925dd03916/assemble_refbased/ddbbd548-5bde-4f4f-bc9e-9ca3e7fd7631/call-call_consensus/execution/SRR11953796.fasta",
                  "docker": "quay.io/broadinstitute/viral-core:2.1.33",
                  "aligner": "minimap2",
                  "sample_name": null,
                  "aligner_options": "",
                  "__sample_name": "SRR11953796",
                  "skip_mark_dupes": false,
                  "machine_mem_gb": null
              },
              "returnCode": 0,
              "jobId": "ddbbd548_e44eb6e275904cc39f2a4f8ebc3931d1",
              "backend": "TES",
              "start": "2023-06-06T14:28:04.793Z",
              "backendStatus": "Complete",
              "compressedDockerSize": 1310101908,
              "end": "2023-06-06T14:32:13.005Z",
              "dockerImageUsed": "quay.io/broadinstitute/viral-core@sha256:c6f4dadc33de882cd543f2aecf3c126e67230d71e7a4898eece1b23a3156d65c",
              "stderr": "https://lz43a8a3d21540dfd25f5ace.blob.core.windows.net/sc-d4564046-bbba-495c-afec-14f7d3a8283a/workspace-services/cbas/terra-app-566e92a0-e55e-4250-b4c1-d0925dd03916/assemble_refbased/ddbbd548-5bde-4f4f-bc9e-9ca3e7fd7631/call-align_to_self/shard-0/execution/stderr",
              "callRoot": "https://lz43a8a3d21540dfd25f5ace.blob.core.windows.net/sc-d4564046-bbba-495c-afec-14f7d3a8283a/workspace-services/cbas/terra-app-566e92a0-e55e-4250-b4c1-d0925dd03916/assemble_refbased/ddbbd548-5bde-4f4f-bc9e-9ca3e7fd7631/call-align_to_self/shard-0",
              "attempt": 1,
              "executionEvents": [
                  {
                      "startTime": "2023-06-06T14:28:04.795Z",
                      "description": "RequestingExecutionToken",
                      "endTime": "2023-06-06T14:28:07.103Z"
                  },
                  {
                      "startTime": "2023-06-06T14:28:07.103Z",
                      "description": "WaitingForValueStore",
                      "endTime": "2023-06-06T14:28:07.103Z"
                  },
                  {
                      "startTime": "2023-06-06T14:28:04.794Z",
                      "description": "Pending",
                      "endTime": "2023-06-06T14:28:04.795Z"
                  },
                  {
                      "startTime": "2023-06-06T14:28:07.103Z",
                      "description": "PreparingJob",
                      "endTime": "2023-06-06T14:28:07.120Z"
                  },
                  {
                      "startTime": "2023-06-06T14:28:07.120Z",
                      "description": "RunningJob",
                      "endTime": "2023-06-06T14:32:12.264Z"
                  },
                  {
                      "startTime": "2023-06-06T14:32:12.264Z",
                      "description": "UpdatingJobStore",
                      "endTime": "2023-06-06T14:32:13.005Z"
                  }
              ]
          }
      ],
      "assemble_refbased.call_consensus": [
          {
              "executionStatus": "Done",
              "stdout": "https://lz43a8a3d21540dfd25f5ace.blob.core.windows.net/sc-d4564046-bbba-495c-afec-14f7d3a8283a/workspace-services/cbas/terra-app-566e92a0-e55e-4250-b4c1-d0925dd03916/assemble_refbased/ddbbd548-5bde-4f4f-bc9e-9ca3e7fd7631/call-call_consensus/execution/stdout",
              "commandLine": "set -ex -o pipefail\n\n# find 90% memory\nmem_in_mb=$(/opt/viral-ngs/source/docker/calc_mem.py mb 90)\n\nassembly.py --version | tee VERSION\n\nif [ false == \"true\" ]; then\n  read_utils.py mkdup_picard \\\n    /cromwell-executions/assemble_refbased/ddbbd548-5bde-4f4f-bc9e-9ca3e7fd7631/call-call_consensus/inputs/lz43a8a3d21540dfd25f5ace.blob.core.windows.net/sc-d4564046-bbba-495c-afec-14f7d3a8283a/workspace-services/cbas/terra-app-566e92a0-e55e-4250-b4c1-d0925dd03916/assemble_refbased/ddbbd548-5bde-4f4f-bc9e-9ca3e7fd7631/call-ivar_trim/shard-0/execution/SRR11953796.mapped.trimmed.bam \\\n    temp_markdup.bam \\\n    --JVMmemory \"$mem_in_mb\"m \\\n    --loglevel=DEBUG\nelse\n  ln -s /cromwell-executions/assemble_refbased/ddbbd548-5bde-4f4f-bc9e-9ca3e7fd7631/call-call_consensus/inputs/lz43a8a3d21540dfd25f5ace.blob.core.windows.net/sc-d4564046-bbba-495c-afec-14f7d3a8283a/workspace-services/cbas/terra-app-566e92a0-e55e-4250-b4c1-d0925dd03916/assemble_refbased/ddbbd548-5bde-4f4f-bc9e-9ca3e7fd7631/call-ivar_trim/shard-0/execution/SRR11953796.mapped.trimmed.bam temp_markdup.bam\nfi\nsamtools index -@ $(nproc) temp_markdup.bam temp_markdup.bai\n\nln -s /cromwell-executions/assemble_refbased/ddbbd548-5bde-4f4f-bc9e-9ca3e7fd7631/call-call_consensus/inputs/lze033433beed5b4a6a47de6.blob.core.windows.net/sc-e3ac5af2-dc4f-42cc-9111-a6f37acfe21a/ref-sarscov2-NC_045512.2.fasta assembly.fasta\nassembly.py refine_assembly \\\n  assembly.fasta \\\n  temp_markdup.bam \\\n  refined.fasta \\\n  --already_realigned_bam=temp_markdup.bam \\\n  --outVcf SRR11953796.sites.vcf.gz \\\n  --min_coverage 3 \\\n  --major_cutoff 0.75 \\\n  --JVMmemory \"$mem_in_mb\"m \\\n  --loglevel=DEBUG\n\nfile_utils.py rename_fasta_sequences \\\n  refined.fasta \"SRR11953796.fasta\" \"SRR11953796\"\n\n# collect variant counts\nif (( $(cat refined.fasta | wc -l) > 1 )); then\n  bcftools filter -e \"FMT/DP<3\" -S . \"SRR11953796.sites.vcf.gz\" -Ou | bcftools filter -i \"AC>1\" -Ou > \"SRR11953796.diffs.vcf\"\n  bcftools filter -i 'TYPE=\"snp\"'  \"SRR11953796.diffs.vcf\" | bcftools query -f '%POS\\n' | wc -l | tee num_snps\n  bcftools filter -i 'TYPE!=\"snp\"' \"SRR11953796.diffs.vcf\" | bcftools query -f '%POS\\n' | wc -l | tee num_indels\nelse\n  # empty output\n  echo \"0\" > num_snps\n  echo \"0\" > num_indels\n  cp \"SRR11953796.sites.vcf.gz\" \"SRR11953796.diffs.vcf\"\nfi\n\n# collect figures of merit\nset +o pipefail # grep will exit 1 if it fails to find the pattern\ngrep -v '^>' refined.fasta | tr -d '\\n' | wc -c | tee assembly_length\ngrep -v '^>' refined.fasta | tr -d '\\nNn' | wc -c | tee assembly_length_unambiguous",
              "shardIndex": -1,
              "outputs": {
                  "dist_to_ref_snps": 0,
                  "refined_assembly_fasta": "https://lz43a8a3d21540dfd25f5ace.blob.core.windows.net/sc-d4564046-bbba-495c-afec-14f7d3a8283a/workspace-services/cbas/terra-app-566e92a0-e55e-4250-b4c1-d0925dd03916/assemble_refbased/ddbbd548-5bde-4f4f-bc9e-9ca3e7fd7631/call-call_consensus/execution/SRR11953796.fasta",
                  "assembly_length_unambiguous": 56,
                  "sites_vcf_gz": "https://lz43a8a3d21540dfd25f5ace.blob.core.windows.net/sc-d4564046-bbba-495c-afec-14f7d3a8283a/workspace-services/cbas/terra-app-566e92a0-e55e-4250-b4c1-d0925dd03916/assemble_refbased/ddbbd548-5bde-4f4f-bc9e-9ca3e7fd7631/call-call_consensus/execution/SRR11953796.sites.vcf.gz",
                  "viralngs_version": "v2.1.33",
                  "dist_to_ref_indels": 0,
                  "assembly_length": 18529
              },
              "runtimeAttributes": {
                  "preemptible": "true",
                  "disk": "375 GB",
                  "failOnStderr": "false",
                  "disks": "local-disk 375 LOCAL",
                  "continueOnReturnCode": "0",
                  "docker": "quay.io/broadinstitute/viral-assemble:2.1.33.0",
                  "maxRetries": "2",
                  "cpu": "8",
                  "memory": "15 GB"
              },
              "callCaching": {
                  "allowResultReuse": false,
                  "effectiveCallCachingMode": "CallCachingOff"
              },
              "inputs": {
                  "reads_aligned_bam": "https://lz43a8a3d21540dfd25f5ace.blob.core.windows.net/sc-d4564046-bbba-495c-afec-14f7d3a8283a/workspace-services/cbas/terra-app-566e92a0-e55e-4250-b4c1-d0925dd03916/assemble_refbased/ddbbd548-5bde-4f4f-bc9e-9ca3e7fd7631/call-ivar_trim/shard-0/execution/SRR11953796.mapped.trimmed.bam",
                  "disk_size": 375,
                  "reference_fasta": "https://lze033433beed5b4a6a47de6.blob.core.windows.net/sc-e3ac5af2-dc4f-42cc-9111-a6f37acfe21a/ref-sarscov2-NC_045512.2.fasta",
                  "min_coverage": 3,
                  "docker": "quay.io/broadinstitute/viral-assemble:2.1.33.0",
                  "mark_duplicates": false,
                  "sample_name": "SRR11953796",
                  "machine_mem_gb": null,
                  "major_cutoff": 0.75
              },
              "returnCode": 0,
              "jobId": "ddbbd548_2730108ffb6b455ab599980bde59f3a1",
              "backend": "TES",
              "start": "2023-06-06T14:22:13.905Z",
              "backendStatus": "Complete",
              "compressedDockerSize": 1452250089,
              "end": "2023-06-06T14:28:02.995Z",
              "dockerImageUsed": "quay.io/broadinstitute/viral-assemble@sha256:863cc41af2482ac6f21251196d73d73ed62176e2b4414a9af3f9e73bf0e6f9e1",
              "stderr": "https://lz43a8a3d21540dfd25f5ace.blob.core.windows.net/sc-d4564046-bbba-495c-afec-14f7d3a8283a/workspace-services/cbas/terra-app-566e92a0-e55e-4250-b4c1-d0925dd03916/assemble_refbased/ddbbd548-5bde-4f4f-bc9e-9ca3e7fd7631/call-call_consensus/execution/stderr",
              "callRoot": "https://lz43a8a3d21540dfd25f5ace.blob.core.windows.net/sc-d4564046-bbba-495c-afec-14f7d3a8283a/workspace-services/cbas/terra-app-566e92a0-e55e-4250-b4c1-d0925dd03916/assemble_refbased/ddbbd548-5bde-4f4f-bc9e-9ca3e7fd7631/call-call_consensus",
              "attempt": 1,
              "executionEvents": [
                  {
                      "startTime": "2023-06-06T14:28:02.671Z",
                      "description": "UpdatingJobStore",
                      "endTime": "2023-06-06T14:28:02.995Z"
                  },
                  {
                      "startTime": "2023-06-06T14:22:13.905Z",
                      "description": "RequestingExecutionToken",
                      "endTime": "2023-06-06T14:22:17.103Z"
                  },
                  {
                      "startTime": "2023-06-06T14:22:17.112Z",
                      "description": "PreparingJob",
                      "endTime": "2023-06-06T14:22:17.140Z"
                  },
                  {
                      "startTime": "2023-06-06T14:22:17.103Z",
                      "description": "WaitingForValueStore",
                      "endTime": "2023-06-06T14:22:17.112Z"
                  },
                  {
                      "startTime": "2023-06-06T14:22:17.140Z",
                      "description": "RunningJob",
                      "endTime": "2023-06-06T14:28:02.671Z"
                  },
                  {
                      "startTime": "2023-06-06T14:22:13.905Z",
                      "description": "Pending",
                      "endTime": "2023-06-06T14:22:13.905Z"
                  }
              ]
          }
      ],
      "assemble_refbased.align_to_ref": [
          {
              "executionStatus": "Done",
              "stdout": "https://lz43a8a3d21540dfd25f5ace.blob.core.windows.net/sc-d4564046-bbba-495c-afec-14f7d3a8283a/workspace-services/cbas/terra-app-566e92a0-e55e-4250-b4c1-d0925dd03916/assemble_refbased/ddbbd548-5bde-4f4f-bc9e-9ca3e7fd7631/call-align_to_ref/shard-0/execution/stdout",
              "commandLine": "set -ex # do not set pipefail, since grep exits 1 if it can't find the pattern\n\nread_utils.py --version | tee VERSION\n\nmem_in_mb=$(/opt/viral-ngs/source/docker/calc_mem.py mb 90)\n\ncp \"/cromwell-executions/assemble_refbased/ddbbd548-5bde-4f4f-bc9e-9ca3e7fd7631/call-align_to_ref/shard-0/inputs/lze033433beed5b4a6a47de6.blob.core.windows.net/sc-e3ac5af2-dc4f-42cc-9111-a6f37acfe21a/ref-sarscov2-NC_045512.2.fasta\" assembly.fasta\ngrep -v '^>' assembly.fasta | tr -d '\\n' | wc -c | tee assembly_length\n\nif [ \"$(cat assembly_length)\" != \"0\" ]; then\n\n  # only perform the following if the reference is non-empty\n\n  if [ \"minimap2\" == \"novoalign\" ]; then\n    read_utils.py novoindex \\\n      assembly.fasta \\\n       \\\n      --loglevel=DEBUG\n  fi\n  read_utils.py index_fasta_picard assembly.fasta --loglevel=DEBUG\n  read_utils.py index_fasta_samtools assembly.fasta --loglevel=DEBUG\n\n  read_utils.py align_and_fix \\\n    \"/cromwell-executions/assemble_refbased/ddbbd548-5bde-4f4f-bc9e-9ca3e7fd7631/call-align_to_ref/shard-0/inputs/lz43a8a3d21540dfd25f5ace.blob.core.windows.net/sc-d4564046-bbba-495c-afec-14f7d3a8283a/workspace-services/cbas/terra-app-566e92a0-e55e-4250-b4c1-d0925dd03916/fetch_sra_to_bam/64142bd7-6616-4730-a176-f8496b3536c6/call-Fetch_SRA_to_BAM/execution/SRR11953796.bam\" \\\n    assembly.fasta \\\n    --outBamAll \"SRR11953796.all.bam\" \\\n    --outBamFiltered \"SRR11953796.mapped.bam\" \\\n    --aligner minimap2 \\\n    --aligner_options \"\" \\\n     \\\n    --JVMmemory \"$mem_in_mb\"m \\\n     \\\n    --loglevel=DEBUG\n\nelse\n  # handle special case of empty reference fasta -- emit empty bams (with original bam headers)\n  samtools view -H -b \"/cromwell-executions/assemble_refbased/ddbbd548-5bde-4f4f-bc9e-9ca3e7fd7631/call-align_to_ref/shard-0/inputs/lz43a8a3d21540dfd25f5ace.blob.core.windows.net/sc-d4564046-bbba-495c-afec-14f7d3a8283a/workspace-services/cbas/terra-app-566e92a0-e55e-4250-b4c1-d0925dd03916/fetch_sra_to_bam/64142bd7-6616-4730-a176-f8496b3536c6/call-Fetch_SRA_to_BAM/execution/SRR11953796.bam\" > \"SRR11953796.all.bam\"\n  samtools view -H -b \"/cromwell-executions/assemble_refbased/ddbbd548-5bde-4f4f-bc9e-9ca3e7fd7631/call-align_to_ref/shard-0/inputs/lz43a8a3d21540dfd25f5ace.blob.core.windows.net/sc-d4564046-bbba-495c-afec-14f7d3a8283a/workspace-services/cbas/terra-app-566e92a0-e55e-4250-b4c1-d0925dd03916/fetch_sra_to_bam/64142bd7-6616-4730-a176-f8496b3536c6/call-Fetch_SRA_to_BAM/execution/SRR11953796.bam\" > \"SRR11953796.mapped.bam\"\n\n  samtools index \"SRR11953796.all.bam\" \"SRR11953796.all.bai\"\n  samtools index \"SRR11953796.mapped.bam\" \"SRR11953796.mapped.bai\"\nfi\n\ncat /proc/loadavg > CPU_LOAD\n\n# collect figures of merit\ngrep -v '^>' assembly.fasta | tr -d '\\nNn' | wc -c | tee assembly_length_unambiguous\nsamtools view -c \"/cromwell-executions/assemble_refbased/ddbbd548-5bde-4f4f-bc9e-9ca3e7fd7631/call-align_to_ref/shard-0/inputs/lz43a8a3d21540dfd25f5ace.blob.core.windows.net/sc-d4564046-bbba-495c-afec-14f7d3a8283a/workspace-services/cbas/terra-app-566e92a0-e55e-4250-b4c1-d0925dd03916/fetch_sra_to_bam/64142bd7-6616-4730-a176-f8496b3536c6/call-Fetch_SRA_to_BAM/execution/SRR11953796.bam\" | tee reads_provided\nsamtools view -c \"SRR11953796.mapped.bam\" | tee reads_aligned\n# report only primary alignments 260=exclude unaligned reads and secondary mappings\nsamtools view -h -F 260 \"SRR11953796.all.bam\" | samtools flagstat - | tee SRR11953796.all.bam.flagstat.txt\ngrep properly \"SRR11953796.all.bam.flagstat.txt\" | cut -f 1 -d ' ' | tee read_pairs_aligned\nsamtools view \"SRR11953796.mapped.bam\" | cut -f10 | tr -d '\\n' | wc -c | tee bases_aligned\npython -c \"print (float(\"$(cat bases_aligned)\")/\"$(cat assembly_length_unambiguous)\") if \"$(cat assembly_length_unambiguous)\">0 else print(0)\" > mean_coverage\n\n# fastqc mapped bam\nreports.py fastqc SRR11953796.mapped.bam SRR11953796.mapped_fastqc.html --out_zip SRR11953796.mapped_fastqc.zip\n\ncat /proc/uptime | cut -f 1 -d ' ' > UPTIME_SEC\n{ cat /sys/fs/cgroup/memory/memory.max_usage_in_bytes || echo 0; } > MEM_BYTES",
              "shardIndex": 0,
              "outputs": {
                  "reads_provided": 750120,
                  "aligned_only_reads_fastqc": "https://lz43a8a3d21540dfd25f5ace.blob.core.windows.net/sc-d4564046-bbba-495c-afec-14f7d3a8283a/workspace-services/cbas/terra-app-566e92a0-e55e-4250-b4c1-d0925dd03916/assemble_refbased/ddbbd548-5bde-4f4f-bc9e-9ca3e7fd7631/call-align_to_ref/shard-0/execution/SRR11953796.mapped_fastqc.html",
                  "max_ram_gb": 8,
                  "reads_aligned": 43,
                  "aligned_bam_flagstat": "https://lz43a8a3d21540dfd25f5ace.blob.core.windows.net/sc-d4564046-bbba-495c-afec-14f7d3a8283a/workspace-services/cbas/terra-app-566e92a0-e55e-4250-b4c1-d0925dd03916/assemble_refbased/ddbbd548-5bde-4f4f-bc9e-9ca3e7fd7631/call-align_to_ref/shard-0/execution/SRR11953796.all.bam.flagstat.txt",
                  "read_pairs_aligned": 46,
                  "aligned_bam_idx": "https://lz43a8a3d21540dfd25f5ace.blob.core.windows.net/sc-d4564046-bbba-495c-afec-14f7d3a8283a/workspace-services/cbas/terra-app-566e92a0-e55e-4250-b4c1-d0925dd03916/assemble_refbased/ddbbd548-5bde-4f4f-bc9e-9ca3e7fd7631/call-align_to_ref/shard-0/execution/SRR11953796.all.bai",
                  "cpu_load": "1.33 0.97 0.43 1/290 359",
                  "aligned_only_reads_fastqc_zip": "https://lz43a8a3d21540dfd25f5ace.blob.core.windows.net/sc-d4564046-bbba-495c-afec-14f7d3a8283a/workspace-services/cbas/terra-app-566e92a0-e55e-4250-b4c1-d0925dd03916/assemble_refbased/ddbbd548-5bde-4f4f-bc9e-9ca3e7fd7631/call-align_to_ref/shard-0/execution/SRR11953796.mapped_fastqc.zip",
                  "runtime_sec": 285,
                  "bases_aligned": 4343.0,
                  "mean_coverage": 0.14523626392000802,
                  "aligned_only_reads_bam": "https://lz43a8a3d21540dfd25f5ace.blob.core.windows.net/sc-d4564046-bbba-495c-afec-14f7d3a8283a/workspace-services/cbas/terra-app-566e92a0-e55e-4250-b4c1-d0925dd03916/assemble_refbased/ddbbd548-5bde-4f4f-bc9e-9ca3e7fd7631/call-align_to_ref/shard-0/execution/SRR11953796.mapped.bam",
                  "aligned_bam": "https://lz43a8a3d21540dfd25f5ace.blob.core.windows.net/sc-d4564046-bbba-495c-afec-14f7d3a8283a/workspace-services/cbas/terra-app-566e92a0-e55e-4250-b4c1-d0925dd03916/assemble_refbased/ddbbd548-5bde-4f4f-bc9e-9ca3e7fd7631/call-align_to_ref/shard-0/execution/SRR11953796.all.bam",
                  "aligned_only_reads_bam_idx": "https://lz43a8a3d21540dfd25f5ace.blob.core.windows.net/sc-d4564046-bbba-495c-afec-14f7d3a8283a/workspace-services/cbas/terra-app-566e92a0-e55e-4250-b4c1-d0925dd03916/assemble_refbased/ddbbd548-5bde-4f4f-bc9e-9ca3e7fd7631/call-align_to_ref/shard-0/execution/SRR11953796.mapped.bai",
                  "viralngs_version": "v2.1.33"
              },
              "runtimeAttributes": {
                  "preemptible": "true",
                  "disk": "375 GB",
                  "failOnStderr": "false",
                  "disks": "local-disk 375 LOCAL",
                  "continueOnReturnCode": "0",
                  "docker": "quay.io/broadinstitute/viral-core:2.1.33",
                  "maxRetries": "2",
                  "cpu": "8",
                  "memory": "15 GB"
              },
              "callCaching": {
                  "allowResultReuse": false,
                  "effectiveCallCachingMode": "CallCachingOff"
              },
              "inputs": {
                  "novocraft_license": null,
                  "reads_unmapped_bam": "https://lz43a8a3d21540dfd25f5ace.blob.core.windows.net/sc-d4564046-bbba-495c-afec-14f7d3a8283a/workspace-services/cbas/terra-app-566e92a0-e55e-4250-b4c1-d0925dd03916/fetch_sra_to_bam/64142bd7-6616-4730-a176-f8496b3536c6/call-Fetch_SRA_to_BAM/execution/SRR11953796.bam",
                  "disk_size": 375,
                  "reference_fasta": "https://lze033433beed5b4a6a47de6.blob.core.windows.net/sc-e3ac5af2-dc4f-42cc-9111-a6f37acfe21a/ref-sarscov2-NC_045512.2.fasta",
                  "docker": "quay.io/broadinstitute/viral-core:2.1.33",
                  "aligner": "minimap2",
                  "sample_name": null,
                  "aligner_options": "",
                  "__sample_name": "SRR11953796",
                  "skip_mark_dupes": false,
                  "machine_mem_gb": null
              },
              "returnCode": 0,
              "jobId": "ddbbd548_a0c92a5e221b42ffb1fe8d82ec1e8ba5",
              "backend": "TES",
              "start": "2023-06-06T14:14:25.676Z",
              "backendStatus": "Complete",
              "compressedDockerSize": 1310101908,
              "end": "2023-06-06T14:20:55.998Z",
              "dockerImageUsed": "quay.io/broadinstitute/viral-core@sha256:c6f4dadc33de882cd543f2aecf3c126e67230d71e7a4898eece1b23a3156d65c",
              "stderr": "https://lz43a8a3d21540dfd25f5ace.blob.core.windows.net/sc-d4564046-bbba-495c-afec-14f7d3a8283a/workspace-services/cbas/terra-app-566e92a0-e55e-4250-b4c1-d0925dd03916/assemble_refbased/ddbbd548-5bde-4f4f-bc9e-9ca3e7fd7631/call-align_to_ref/shard-0/execution/stderr",
              "callRoot": "https://lz43a8a3d21540dfd25f5ace.blob.core.windows.net/sc-d4564046-bbba-495c-afec-14f7d3a8283a/workspace-services/cbas/terra-app-566e92a0-e55e-4250-b4c1-d0925dd03916/assemble_refbased/ddbbd548-5bde-4f4f-bc9e-9ca3e7fd7631/call-align_to_ref/shard-0",
              "attempt": 1,
              "executionEvents": [
                  {
                      "startTime": "2023-06-06T14:14:27.112Z",
                      "description": "WaitingForValueStore",
                      "endTime": "2023-06-06T14:14:27.113Z"
                  },
                  {
                      "startTime": "2023-06-06T14:14:25.676Z",
                      "description": "RequestingExecutionToken",
                      "endTime": "2023-06-06T14:14:27.112Z"
                  },
                  {
                      "startTime": "2023-06-06T14:20:55.235Z",
                      "description": "UpdatingJobStore",
                      "endTime": "2023-06-06T14:20:55.998Z"
                  },
                  {
                      "startTime": "2023-06-06T14:14:25.676Z",
                      "description": "Pending",
                      "endTime": "2023-06-06T14:14:25.676Z"
                  },
                  {
                      "startTime": "2023-06-06T14:14:27.127Z",
                      "description": "RunningJob",
                      "endTime": "2023-06-06T14:20:55.235Z"
                  },
                  {
                      "startTime": "2023-06-06T14:14:27.113Z",
                      "description": "PreparingJob",
                      "endTime": "2023-06-06T14:14:27.127Z"
                  }
              ]
          }
      ]
  },
  "outputs": {
      "assemble_refbased.dist_to_ref_snps": 0,
      "assemble_refbased.primer_trimmed_read_percent": [
          0.0
      ],
      "assemble_refbased.samtools_ampliconstats_parsed": "https://lz43a8a3d21540dfd25f5ace.blob.core.windows.net/sc-d4564046-bbba-495c-afec-14f7d3a8283a/workspace-services/cbas/terra-app-566e92a0-e55e-4250-b4c1-d0925dd03916/assemble_refbased/ddbbd548-5bde-4f4f-bc9e-9ca3e7fd7631/call-alignment_metrics/execution/SRR11953796.mapped.trimmed.ampliconstats_parsed.txt",
      "assemble_refbased.num_libraries": 1,
      "assemble_refbased.assembly_fasta": "https://lz43a8a3d21540dfd25f5ace.blob.core.windows.net/sc-d4564046-bbba-495c-afec-14f7d3a8283a/workspace-services/cbas/terra-app-566e92a0-e55e-4250-b4c1-d0925dd03916/assemble_refbased/ddbbd548-5bde-4f4f-bc9e-9ca3e7fd7631/call-call_consensus/execution/SRR11953796.fasta",
      "assemble_refbased.ivar_trim_stats_tsv": [
          [
              "SRR11953796",
              "0.0",
              "0"
          ]
      ],
      "assemble_refbased.picard_metrics_insert_size": "https://lz43a8a3d21540dfd25f5ace.blob.core.windows.net/sc-d4564046-bbba-495c-afec-14f7d3a8283a/workspace-services/cbas/terra-app-566e92a0-e55e-4250-b4c1-d0925dd03916/assemble_refbased/ddbbd548-5bde-4f4f-bc9e-9ca3e7fd7631/call-alignment_metrics/execution/SRR11953796.mapped.trimmed.insert_size_metrics.txt",
      "assemble_refbased.assembly_mean_coverage": 0.14523626392000802,
      "assemble_refbased.assembly_method": "viral-ngs/assemble_refbased",
      "assemble_refbased.align_to_self_merged_mean_coverage": 0.0,
      "assemble_refbased.align_to_self_merged_coverage_plot": "https://lz43a8a3d21540dfd25f5ace.blob.core.windows.net/sc-d4564046-bbba-495c-afec-14f7d3a8283a/workspace-services/cbas/terra-app-566e92a0-e55e-4250-b4c1-d0925dd03916/assemble_refbased/ddbbd548-5bde-4f4f-bc9e-9ca3e7fd7631/call-plot_self_coverage/execution/SRR11953796.coverage_plot.pdf",
      "assemble_refbased.align_to_ref_isnvs_vcf": "https://lz43a8a3d21540dfd25f5ace.blob.core.windows.net/sc-d4564046-bbba-495c-afec-14f7d3a8283a/workspace-services/cbas/terra-app-566e92a0-e55e-4250-b4c1-d0925dd03916/assemble_refbased/ddbbd548-5bde-4f4f-bc9e-9ca3e7fd7631/call-isnvs_ref/execution/SRR11953796.mapped.trimmed.vcf",
      "assemble_refbased.align_to_self_merged_bases_aligned": 0.0,
      "assemble_refbased.replicate_discordant_snps": 0,
      "assemble_refbased.replicate_discordant_vcf": "https://lz43a8a3d21540dfd25f5ace.blob.core.windows.net/sc-d4564046-bbba-495c-afec-14f7d3a8283a/workspace-services/cbas/terra-app-566e92a0-e55e-4250-b4c1-d0925dd03916/assemble_refbased/ddbbd548-5bde-4f4f-bc9e-9ca3e7fd7631/call-run_discordance/execution/SRR11953796.discordant.vcf",
      "assemble_refbased.align_to_self_merged_read_pairs_aligned": 0,
      "assemble_refbased.align_to_self_merged_reads_aligned": 0,
      "assemble_refbased.align_to_ref_merged_coverage_tsv": "https://lz43a8a3d21540dfd25f5ace.blob.core.windows.net/sc-d4564046-bbba-495c-afec-14f7d3a8283a/workspace-services/cbas/terra-app-566e92a0-e55e-4250-b4c1-d0925dd03916/assemble_refbased/ddbbd548-5bde-4f4f-bc9e-9ca3e7fd7631/call-plot_ref_coverage/execution/SRR11953796.coverage_plot.txt",
      "assemble_refbased.primer_trimmed_read_count": [
          0
      ],
      "assemble_refbased.ivar_trim_stats": [
          {
              "trim_percent": "0.0",
              "file": "SRR11953796",
              "trim_count": "0"
          }
      ],
      "assemble_refbased.align_to_ref_viral_core_version": "v2.1.33",
      "assemble_refbased.ivar_version": "iVar version 1.3.1",
      "assemble_refbased.align_to_self_merged_aligned_and_unaligned_bam": [
          "https://lz43a8a3d21540dfd25f5ace.blob.core.windows.net/sc-d4564046-bbba-495c-afec-14f7d3a8283a/workspace-services/cbas/terra-app-566e92a0-e55e-4250-b4c1-d0925dd03916/assemble_refbased/ddbbd548-5bde-4f4f-bc9e-9ca3e7fd7631/call-align_to_self/shard-0/execution/SRR11953796.all.bam"
      ],
      "assemble_refbased.align_to_ref_merged_read_pairs_aligned": 43,
      "assemble_refbased.num_read_groups": 1,
      "assemble_refbased.align_to_ref_merged_reads_aligned": 43,
      "assemble_refbased.assembly_length": 18529,
      "assemble_refbased.align_to_self_merged_coverage_tsv": "https://lz43a8a3d21540dfd25f5ace.blob.core.windows.net/sc-d4564046-bbba-495c-afec-14f7d3a8283a/workspace-services/cbas/terra-app-566e92a0-e55e-4250-b4c1-d0925dd03916/assemble_refbased/ddbbd548-5bde-4f4f-bc9e-9ca3e7fd7631/call-plot_self_coverage/execution/SRR11953796.coverage_plot.txt",
      "assemble_refbased.replicate_discordant_indels": 0,
      "assemble_refbased.align_to_ref_per_input_reads_aligned": [
          43
      ],
      "assemble_refbased.align_to_ref_merged_aligned_trimmed_only_bam": "https://lz43a8a3d21540dfd25f5ace.blob.core.windows.net/sc-d4564046-bbba-495c-afec-14f7d3a8283a/workspace-services/cbas/terra-app-566e92a0-e55e-4250-b4c1-d0925dd03916/assemble_refbased/ddbbd548-5bde-4f4f-bc9e-9ca3e7fd7631/call-ivar_trim/shard-0/execution/SRR11953796.mapped.trimmed.bam",
      "assemble_refbased.align_to_ref_variants_vcf_gz": "https://lz43a8a3d21540dfd25f5ace.blob.core.windows.net/sc-d4564046-bbba-495c-afec-14f7d3a8283a/workspace-services/cbas/terra-app-566e92a0-e55e-4250-b4c1-d0925dd03916/assemble_refbased/ddbbd548-5bde-4f4f-bc9e-9ca3e7fd7631/call-call_consensus/execution/SRR11953796.sites.vcf.gz",
      "assemble_refbased.align_to_ref_per_input_aligned_flagstat": [
          "https://lz43a8a3d21540dfd25f5ace.blob.core.windows.net/sc-d4564046-bbba-495c-afec-14f7d3a8283a/workspace-services/cbas/terra-app-566e92a0-e55e-4250-b4c1-d0925dd03916/assemble_refbased/ddbbd548-5bde-4f4f-bc9e-9ca3e7fd7631/call-align_to_ref/shard-0/execution/SRR11953796.all.bam.flagstat.txt"
      ],
      "assemble_refbased.picard_metrics_alignment": "https://lz43a8a3d21540dfd25f5ace.blob.core.windows.net/sc-d4564046-bbba-495c-afec-14f7d3a8283a/workspace-services/cbas/terra-app-566e92a0-e55e-4250-b4c1-d0925dd03916/assemble_refbased/ddbbd548-5bde-4f4f-bc9e-9ca3e7fd7631/call-alignment_metrics/execution/SRR11953796.mapped.trimmed.alignment_metrics.txt",
      "assemble_refbased.align_to_ref_merged_coverage_plot": "https://lz43a8a3d21540dfd25f5ace.blob.core.windows.net/sc-d4564046-bbba-495c-afec-14f7d3a8283a/workspace-services/cbas/terra-app-566e92a0-e55e-4250-b4c1-d0925dd03916/assemble_refbased/ddbbd548-5bde-4f4f-bc9e-9ca3e7fd7631/call-plot_ref_coverage/execution/SRR11953796.coverage_plot.pdf",
      "assemble_refbased.reference_genome_length": 29903,
      "assemble_refbased.align_to_ref_fastqc": "https://lz43a8a3d21540dfd25f5ace.blob.core.windows.net/sc-d4564046-bbba-495c-afec-14f7d3a8283a/workspace-services/cbas/terra-app-566e92a0-e55e-4250-b4c1-d0925dd03916/assemble_refbased/ddbbd548-5bde-4f4f-bc9e-9ca3e7fd7631/call-align_to_ref/shard-0/execution/SRR11953796.mapped_fastqc.html",
      "assemble_refbased.picard_metrics_wgs": "https://lz43a8a3d21540dfd25f5ace.blob.core.windows.net/sc-d4564046-bbba-495c-afec-14f7d3a8283a/workspace-services/cbas/terra-app-566e92a0-e55e-4250-b4c1-d0925dd03916/assemble_refbased/ddbbd548-5bde-4f4f-bc9e-9ca3e7fd7631/call-alignment_metrics/execution/SRR11953796.mapped.trimmed.raw_wgs_metrics.txt",
      "assemble_refbased.align_to_self_isnvs_vcf": "https://lz43a8a3d21540dfd25f5ace.blob.core.windows.net/sc-d4564046-bbba-495c-afec-14f7d3a8283a/workspace-services/cbas/terra-app-566e92a0-e55e-4250-b4c1-d0925dd03916/assemble_refbased/ddbbd548-5bde-4f4f-bc9e-9ca3e7fd7631/call-isnvs_self/execution/SRR11953796.mapped.vcf",
      "assemble_refbased.align_to_ref_merged_bases_aligned": 4343.0,
      "assemble_refbased.align_to_ref_per_input_reads_provided": [
          750120
      ],
      "assemble_refbased.assembly_length_unambiguous": 56,
      "assemble_refbased.viral_assemble_version": "v2.1.33",
      "assemble_refbased.align_to_self_merged_aligned_only_bam": "https://lz43a8a3d21540dfd25f5ace.blob.core.windows.net/sc-d4564046-bbba-495c-afec-14f7d3a8283a/workspace-services/cbas/terra-app-566e92a0-e55e-4250-b4c1-d0925dd03916/assemble_refbased/ddbbd548-5bde-4f4f-bc9e-9ca3e7fd7631/call-align_to_self/shard-0/execution/SRR11953796.mapped.bam",
      "assemble_refbased.dist_to_ref_indels": 0,
      "assemble_refbased.replicate_concordant_sites": 0,
      "assemble_refbased.samtools_ampliconstats": "https://lz43a8a3d21540dfd25f5ace.blob.core.windows.net/sc-d4564046-bbba-495c-afec-14f7d3a8283a/workspace-services/cbas/terra-app-566e92a0-e55e-4250-b4c1-d0925dd03916/assemble_refbased/ddbbd548-5bde-4f4f-bc9e-9ca3e7fd7631/call-alignment_metrics/execution/SRR11953796.mapped.trimmed.ampliconstats.txt"
  },
  "workflowRoot": "https://lz43a8a3d21540dfd25f5ace.blob.core.windows.net/sc-d4564046-bbba-495c-afec-14f7d3a8283a/workspace-services/cbas/terra-app-566e92a0-e55e-4250-b4c1-d0925dd03916/assemble_refbased/ddbbd548-5bde-4f4f-bc9e-9ca3e7fd7631",
  "actualWorkflowLanguage": "WDL",
  "status": "Succeeded",
  "workflowLog": "https://lz43a8a3d21540dfd25f5ace.blob.core.windows.net/sc-d4564046-bbba-495c-afec-14f7d3a8283a/workspace-services/cbas/terra-app-566e92a0-e55e-4250-b4c1-d0925dd03916/cromwell-workflow-logs/workflow.ddbbd548-5bde-4f4f-bc9e-9ca3e7fd7631.log",
  "end": "2023-06-06T14:37:50.316Z",
  "start": "2023-06-06T14:14:21.182Z",
  "id": "ddbbd548-5bde-4f4f-bc9e-9ca3e7fd7631",
  "inputs": {
      "novocraft_license": null,
      "assemble_refbased.plot_self_coverage.binning_summary_statistic": "max",
      "assemble_refbased.plot_ref_coverage.base_q_threshold": null,
      "min_coverage": 3,
      "assemble_refbased.plot_ref_coverage.max_coverage_depth": null,
      "aligner": "minimap2",
      "reads_unmapped_bams": [
          "https://lz43a8a3d21540dfd25f5ace.blob.core.windows.net/sc-d4564046-bbba-495c-afec-14f7d3a8283a/workspace-services/cbas/terra-app-566e92a0-e55e-4250-b4c1-d0925dd03916/fetch_sra_to_bam/64142bd7-6616-4730-a176-f8496b3536c6/call-Fetch_SRA_to_BAM/execution/SRR11953796.bam"
      ],
      "trim_coords_bed": null,
      "align_to_self_options": {
          "bwa": "",
          "novoalign": "-r Random -l 40 -g 40 -x 20 -t 100",
          "minimap2": ""
      },
      "assemble_refbased.plot_self_coverage.max_coverage_depth": null,
      "assemble_refbased.ivar_trim.primer_offset": null,
      "assemble_refbased.align_to_self.docker": "quay.io/broadinstitute/viral-core:2.1.33",
      "assemble_refbased.plot_ref_coverage.plotYLimits": null,
      "assemble_refbased.plot_self_coverage.mapping_q_threshold": null,
      "assemble_refbased.run_discordance.docker": "quay.io/broadinstitute/viral-core:2.1.33",
      "assemble_refbased.call_consensus.docker": "quay.io/broadinstitute/viral-assemble:2.1.33.0",
      "assemble_refbased.alignment_metrics.max_amplicons": 500,
      "assemble_refbased.plot_ref_coverage.mapping_q_threshold": null,
      "assemble_refbased.plot_ref_coverage.read_length_threshold": null,
      "assemble_refbased.plot_ref_coverage.binning_summary_statistic": "max",
      "assemble_refbased.alignment_metrics.machine_mem_gb": null,
      "assemble_refbased.plot_ref_coverage.plot_pixels_per_inch": 100,
      "assemble_refbased.call_consensus.mark_duplicates": false,
      "assemble_refbased.plot_self_coverage.plotYLimits": null,
      "assemble_refbased.plot_ref_coverage.plot_only_non_duplicates": false,
      "assemble_refbased.merge_align_to_self.reheader_table": null,
      "assemble_refbased.plot_self_coverage.plot_height_pixels": 850,
      "assemble_refbased.ivar_trim.machine_mem_gb": null,
      "reference_fasta": "https://lze033433beed5b4a6a47de6.blob.core.windows.net/sc-e3ac5af2-dc4f-42cc-9111-a6f37acfe21a/ref-sarscov2-NC_045512.2.fasta",
      "assemble_refbased.call_consensus.machine_mem_gb": null,
      "assemble_refbased.align_to_self.machine_mem_gb": null,
      "assemble_refbased.plot_ref_coverage.docker": "quay.io/broadinstitute/viral-core:2.1.33",
      "assemble_refbased.plot_ref_coverage.plotXLimits": null,
      "assemble_refbased.plot_ref_coverage.skip_mark_dupes": false,
      "assemble_refbased.alignment_metrics.amplicon_set": null,
      "assemble_refbased.merge_align_to_self.docker": "quay.io/broadinstitute/viral-core:2.1.33",
      "assemble_refbased.plot_self_coverage.plot_width_pixels": 1100,
      "assemble_refbased.align_to_ref.sample_name": null,
      "assemble_refbased.plot_self_coverage.bin_large_plots": false,
      "assemble_refbased.merge_align_to_ref.reheader_table": null,
      "align_to_ref_options": {
          "bwa": "-k 12 -B 1",
          "novoalign": "-r Random -l 40 -g 40 -x 20 -t 501 -k",
          "minimap2": ""
      },
      "assemble_refbased.ivar_trim.sliding_window": null,
      "assemble_refbased.plot_self_coverage.docker": "quay.io/broadinstitute/viral-core:2.1.33",
      "assemble_refbased.ivar_trim.min_quality": 1,
      "assemble_refbased.plot_ref_coverage.plot_width_pixels": 1100,
      "assemble_refbased.plot_self_coverage.plotXLimits": null,
      "assemble_refbased.plot_self_coverage.base_q_threshold": null,
      "assemble_refbased.merge_align_to_ref.docker": "quay.io/broadinstitute/viral-core:2.1.33",
      "assemble_refbased.alignment_metrics.docker": "quay.io/broadinstitute/viral-core:2.1.33",
      "assemble_refbased.align_to_ref.machine_mem_gb": null,
      "assemble_refbased.plot_ref_coverage.bin_large_plots": false,
      "assemble_refbased.isnvs_self.docker": "quay.io/biocontainers/lofreq:2.1.5--py38h588ecb2_4",
      "sample_name": "SRR11953796",
      "assemble_refbased.plot_self_coverage.plot_only_non_duplicates": false,
      "assemble_refbased.isnvs_self.out_basename": null,
      "assemble_refbased.ivar_trim.docker": "andersenlabapps/ivar:1.3.1",
      "assemble_refbased.plot_self_coverage.skip_mark_dupes": false,
      "assemble_refbased.align_to_self.sample_name": null,
      "skip_mark_dupes": false,
      "assemble_refbased.plot_self_coverage.plot_pixels_per_inch": 100,
      "assemble_refbased.plot_ref_coverage.plot_height_pixels": 850,
      "assemble_refbased.isnvs_ref.out_basename": null,
      "major_cutoff": 0.75,
      "assemble_refbased.alignment_metrics.max_amp_len": 5000,
      "assemble_refbased.isnvs_ref.docker": "quay.io/biocontainers/lofreq:2.1.5--py38h588ecb2_4",
      "assemble_refbased.ivar_trim.min_keep_length": null,
      "assemble_refbased.plot_self_coverage.read_length_threshold": null,
      "assemble_refbased.align_to_ref.docker": "quay.io/broadinstitute/viral-core:2.1.33"
  },
  "labels": {
      "cromwell-workflow-id": "cromwell-ddbbd548-5bde-4f4f-bc9e-9ca3e7fd7631"
  },
  "submission": "2023-06-06T14:14:10.820Z"
}

export const RunDetails = ({ submissionId, workflowId }) => {
  /*
   * State setup
   */
  const [workflow, setWorkflow] = useState()
  const [tableData, setTableData] = useState([])
  const [showLog, setShowLog] = useState(false)
  const [logUri, setLogUri] = useState({})

  const [taskDataTitle, setTaskDataTitle] = useState('')
  const [taskDataJson, setTaskDataJson] = useState({})
  const [showTaskData, setShowTaskData] = useState(false)

  const signal = useCancellation()
  const stateRefreshTimer = useRef()

  const [sasToken, setSasToken] = useState('')

  const showLogModal = useCallback(logUri => {
    setLogUri(logUri)
    setShowLog(true)
  }, [])

  const showTaskDataModal = useCallback((taskDataTitle, taskJson) => {
    setTaskDataTitle(taskDataTitle)
    setTaskDataJson(taskJson)
    setShowTaskData(true)
  }, [])
  /*
   * Data fetchers
   */
  useOnMount(() => {
    const loadWorkflow = async () => {
      const includeKey = [
        'backendStatus',
        'executionStatus',
        'shardIndex',
        // 'outputs', //not sure if I need this yet
        // 'inputs', //not sure if I need this yet
        'jobId',
        'start',
        'end',
        'stderr',
        'stdout',
        'attempt',
        'subWorkflowId' //needed for task type column
        // 'subWorkflowMetadata' //may need this later
      ]
      const excludeKey = []
      //const metadata = await Ajax(signal).Cromwell.workflows(workflowId).metadata({ includeKey, excludeKey })
      const metadata = myMetadata
      setWorkflow(metadata)
      if (!isEmpty(metadata?.calls)) {
        const formattedTableData = generateCallTableData(metadata.calls)
        setTableData(formattedTableData)
        if (includes(collapseStatus(metadata.status), [statusType.running, statusType.submitted])) {
          stateRefreshTimer.current = setTimeout(loadWorkflow, 60000)
        }
      }
    }
    const fetchSasToken = async () => {
      const sasToken = await Ajax(signal).WorkspaceManager.getSASToken()
      setSasToken(sasToken)
    }
    fetchSasToken()
    loadWorkflow()
    return () => {
      clearTimeout(stateRefreshTimer.current)
    }
  })

  const metadataArchiveStatus = useMemo(() => workflow?.metadataArchiveStatus, [workflow])

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
        div({ 'data-testid': 'details-top-container', style: { display: 'flex', justifyContent: 'space-between', padding: '1rem 2rem 2rem' } }, [
          h(WorkflowInfoBox, { workflow }, []),
          h(TroubleshootingBox, { logUri: workflow.workflowLog, submissionId, workflowId, showLogModal }, [])
        ]),
        div(
          {
            'data-testid': 'call-table-container',
            style: {
              margin: '2rem'
            }
          },
          [
            h(CallTable, {
              defaultFailedFilter: workflow?.status.toLocaleLowerCase().includes('failed'),
              isRendered: !isEmpty(tableData),
              showLogModal,
              showTaskDataModal,
              tableData
            })
          ]
        ),
        showLog && h(UriViewer, { uri: logUri || '', onDismiss: () => setShowLog(false) }),
        showTaskData && h(InputOutputModal, { title: taskDataTitle, jsonData: taskDataJson, onDismiss: () => setShowTaskData(false), sasToken }, [])
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
