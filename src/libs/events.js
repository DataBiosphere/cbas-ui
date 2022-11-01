import _ from 'lodash/fp'
import { useEffect } from 'react'
import { Ajax } from 'src/libs/ajax'
import { useRoute } from 'src/libs/nav'

/*
 * NOTE: In order to show up in reports, new events MUST be marked as expected in the Mixpanel
 * lexicon. See the Mixpanel guide in the terra-ui GitHub Wiki for more details:
 *   https://github.com/DataBiosphere/terra-ui/wiki/Mixpanel
 */
const eventsList = {
  aboutPersistentDiskView: 'about:persistentDisk:view',
  appcuesEvent: 'appcues:event',
  applicationLaunch: 'application:launch',
  applicationCreate: 'application:create',
  applicationDelete: 'application:delete',
  applicationPause: 'application:pause',
  applicationResume: 'application:resume',
  analysisEnableBeta: 'analysis:enable',
  analysisDisableBeta: 'analysis:disable',
  analysisLaunch: 'analysis:launch',
  analysisCreate: 'analysis:create',
  billingProjectExpandWorkspace: 'billing:project:workspace:expand',
  billingProjectGoToWorkspace: 'billing:project:workspace:navigate',
  billingProjectOpenFromList: 'billing:project:open-from-list',
  billingProjectSelectTab: 'billing:project:tab',
  changeBillingAccount: 'billing:project:account:update',
  cloudEnvironmentConfigOpen: 'cloudEnvironment:config:open',
  cloudEnvironmentCreate: 'cloudEnvironment:create',
  cloudEnvironmentDelete: 'cloudEnvironment:delete',
  cloudEnvironmentUpdate: 'cloudEnvironment:update',
  cloudEnvironmentDetailsLoad: 'analysis:details:load',
  catalogFilter: 'catalog:filter',
  catalogRequestAccess: 'catalog:requestAccess',
  catalogToggle: 'catalog:toggle',
  catalogLandingPageBanner: 'catalog:landingPageBanner',
  catalogView: 'catalog:view',
  catalogWorkspaceLink: 'catalog:workspaceLink',
  catalogWorkspaceLinkExportFinished: 'catalog:workspaceLink:completed',
  datasetLibraryBrowseData: 'library:browseData',
  dataTableSaveColumnSettings: 'dataTable:saveColumnSettings',
  dataTableLoadColumnSettings: 'dataTable:loadColumnSettings',
  dataTableVersioningViewVersionHistory: 'dataTable:versioning:viewVersionHistory',
  dataTableVersioningSaveVersion: 'dataTable:versioning:saveVersion',
  dataTableVersioningImportVersion: 'dataTable:versioning:importVersion',
  dataTableVersioningDeleteVersion: 'dataTable:versioning:deleteVersion',
  featurePreviewToggle: 'featurePreview:toggle',
  // Note: "external" refers to the common Job Manager deployment, not a Job Manager bundled in CromwellApp
  jobManagerOpenExternal: 'job-manager:open-external',
  notebookLaunch: 'notebook:launch',
  notebookRename: 'notebook:rename',
  notebookCopy: 'notebook:copy',
  notificationToggle: 'notification:toggle',
  pageView: 'page:view',
  removeBillingAccount: 'billing:project:account:remove',
  resourceLeave: 'resource:leave',
  userRegister: 'user:register',
  workflowImport: 'workflow:import',
  workflowLaunch: 'workflow:launch',
  workflowRerun: 'workflow:rerun',
  workspaceClone: 'workspace:clone',
  workspaceCreate: 'workspace:create',
  workspaceDataAddColumn: 'workspace:data:addColumn',
  workspaceDataAddRow: 'workspace:data:addRow',
  workspaceDataClearColumn: 'workspace:data:clearColumn',
  workspaceDataCopy: 'workspace:data:copy',
  workspaceDataCopyToClipboard: 'workspace:data:copyToClipboard',
  workspaceDataCreateSet: 'workspace:data:createSet',
  workspaceDataCrossTableSearch: 'workspace:data:crossTableSearch',
  workspaceDataDelete: 'workspace:data:delete',
  workspaceDataDeleteColumn: 'workspace:data:deleteColumn',
  workspaceDataDownload: 'workspace:data:download',
  workspaceDataDownloadPartial: 'workspace:data:downloadpartial',
  workspaceDataEditMultiple: 'workspace:data:editMultiple',
  workspaceDataEditOne: 'workspace:data:editOne',
  workspaceDataOpenWithIGV: 'workspace:data:igv',
  workspaceDataOpenWithWorkflow: 'workspace:data:workflow',
  workspaceDataOpenWithDataExplorer: 'workspace:data:dataexplorer',
  workspaceDataOpenWithNotebook: 'workspace:data:notebook',
  workspaceDataImport: 'workspace:data:import',
  workspaceDataUpload: 'workspace:data:upload',
  workspaceDataRenameColumn: 'workspace:data:renameColumn',
  workspaceDataRenameEntity: 'workspace:data:renameEntity',
  workspaceDataRenameTable: 'workspace:data:rename-table',
  workspaceDataDeleteTable: 'workspace:data:deleteTable',
  workspaceOpenFromList: 'workspace:open-from-list',
  workspaceSampleTsvDownload: 'workspace:sample-tsv:download',
  workspaceShare: 'workspace:share',
  workspaceShareWithSupport: 'workspace:shareWithSupport',
  workspaceSnapshotDelete: 'workspace:snapshot:delete',
  workspaceSnapshotContentsView: 'workspace:snapshot:contents:view',
  workspaceStar: 'workspace:star'
}

export const extractWorkspaceDetails = workspaceObject => {
  const { name, namespace } = workspaceObject
  return { workspaceName: name, workspaceNamespace: namespace }
}

export const extractCrossWorkspaceDetails = (fromWorkspace, toWorkspace) => {
  return {
    fromWorkspaceNamespace: fromWorkspace.workspace.namespace,
    fromWorkspaceName: fromWorkspace.workspace.name,
    toWorkspaceNamespace: toWorkspace.workspace.namespace,
    toWorkspaceName: toWorkspace.workspace.name
  }
}

export const PageViewReporter = () => {
  const { name, params } = useRoute()

  useEffect(() => {
    const isWorkspace = /^#workspaces\/.+\/.+/.test(window.location.hash)

    Ajax().Metrics.captureEvent(
      `${eventsList.pageView}:${name}`,
      isWorkspace ? extractWorkspaceDetails(params) : undefined
    )
  }, [name, params])

  return null
}

export const captureAppcuesEvent = (eventName, event) => {
  // Only record "public-facing events" (and related properties) as documented by Appcues: https://docs.appcues.com/article/301-client-side-events-reference
  const publicEvents = [
    'flow_started',
    'flow_completed',
    'flow_skipped',
    'flow_aborted',
    'step_started',
    'step_completed',
    'step_skipped',
    'step_aborted',
    'step_interacted',
    'form_submitted',
    'form_field_submitted'
  ]
  if (_.includes(eventName, publicEvents)) {
    const eventProps = { // Building the props manually to make sure we're resilient to any changes in Appcues
      'appcues.flowId': event.flowId,
      'appcues.flowName': event.flowName,
      'appcues.flowType': event.flowType,
      'appcues.flowVersion': event.flowVersion,
      'appcues.id': event.id,
      'appcues.interaction.category': event.interaction?.category,
      'appcues.interaction.destination': event.interaction?.destination,
      'appcues.interaction.element': event.interaction?.element,
      'appcues.interaction.fields': JSON.stringify(event.interaction?.fields),
      'appcues.interaction.formId': event.interaction?.formId,
      'appcues.interaction.text': event.interaction?.text, // not documented by Appcues, but observed and useful
      'appcues.interactionType': event.interactionType,
      'appcues.localeId': event.localeId,
      'appcues.localeName': event.localeName,
      'appcues.name': event.name,
      'appcues.sessionId': event.sessionId,
      'appcues.stepChildId': event.stepChildId,
      'appcues.stepChildNumber': event.stepChildNumber,
      'appcues.stepId': event.stepId,
      'appcues.stepNumber': event.stepNumber,
      'appcues.stepType': event.stepType,
      'appcues.timestamp': event.timestamp
    }
    return Ajax().Metrics.captureEvent(eventsList.appcuesEvent, eventProps)
  }
}

export default eventsList
