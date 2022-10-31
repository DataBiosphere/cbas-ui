import _ from 'lodash/fp'
import { Fragment, useState } from 'react'
import { div, h, hr, img, span } from 'react-hyperscript-helpers'
import { Clickable, spinnerOverlay } from 'src/components/common'
import { icon } from 'src/components/icons'
import ModalDrawer from 'src/components/ModalDrawer'
import TitleBar from 'src/components/TitleBar'
import cromwellImg from 'src/images/cromwell-logo.png'
import galaxyLogo from 'src/images/galaxy-logo.svg'
import jupyterLogo from 'src/images/jupyter-logo-long.png'
import rstudioBioLogo from 'src/images/r-bio-logo.svg'
import { Ajax } from 'src/libs/ajax'
import colors from 'src/libs/colors'
import { reportError } from 'src/libs/error'
import Events from 'src/libs/events'
import * as Nav from 'src/libs/nav'
import { useStore } from 'src/libs/react-utils'
import { cookieReadyStore } from 'src/libs/state'
import * as Utils from 'src/libs/utils'
import { AzureComputeModalBase } from 'src/pages/workspaces/workspace/analysis/modals/AzureComputeModal'
import { ComputeModalBase } from 'src/pages/workspaces/workspace/analysis/modals/ComputeModal'
import { CromwellModalBase } from 'src/pages/workspaces/workspace/analysis/modals/CromwellModal'
import { GalaxyModalBase } from 'src/pages/workspaces/workspace/analysis/modals/GalaxyModal'
import { getAppType, getToolsToDisplay, isPauseSupported, isToolAnApp, tools } from 'src/pages/workspaces/workspace/analysis/notebook-utils'
import { appLauncherTabName } from 'src/pages/workspaces/workspace/analysis/runtime-common'
import {
  getComputeStatusForDisplay, getConvertedRuntimeStatus, getCostDisplayForDisk, getCostDisplayForTool,
  getCurrentApp, getCurrentPersistentDisk, getCurrentRuntime, getIsAppBusy, getIsRuntimeBusy, getRuntimeForTool,
  isCurrentGalaxyDiskDetaching
} from 'src/pages/workspaces/workspace/analysis/runtime-utils'
import { AppErrorModal, RuntimeErrorModal } from 'src/pages/workspaces/workspace/analysis/RuntimeManager'


const titleId = 'cloud-env-modal'

export const CloudEnvironmentModal = ({
  isOpen, onSuccess, onDismiss, canCompute, runtimes, apps, appDataDisks, refreshRuntimes, refreshApps,
  workspace, persistentDisks, location, computeRegion, workspace: { azureContext, workspace: { namespace, name: workspaceName } },
  filterForTool = undefined
}) => {
  const [viewMode, setViewMode] = useState(undefined)
  const [busy, setBusy] = useState(false)
  const [errorRuntimeId, setErrorRuntimeId] = useState(undefined)
  const [errorAppId, setErrorAppId] = useState(undefined)
  const cookieReady = useStore(cookieReadyStore)
  const currentDisk = getCurrentPersistentDisk(runtimes, persistentDisks)

  const noCompute = 'You do not have access to run analyses on this workspace.'

  const resetView = () => setViewMode(undefined)

  const renderComputeModal = tool => h(ComputeModalBase, {
    isOpen: viewMode === NEW_JUPYTER_MODE || viewMode === NEW_RSTUDIO_MODE,
    workspace,
    tool,
    currentRuntime,
    currentDisk,
    location,
    onDismiss,
    onSuccess,
    onError: onDismiss
  })

  const renderAzureModal = () => h(AzureComputeModalBase, {
    isOpen: viewMode === NEW_AZURE_MODE,
    hideCloseButton: true,
    workspace,
    runtimes,
    onDismiss,
    onSuccess,
    onError: onDismiss
  })

  const renderAppModal = (appModalBase, appMode) => h(appModalBase, {
    isOpen: viewMode === appMode,
    workspace,
    apps,
    appDataDisks,
    onDismiss,
    onSuccess,
    onError: onDismiss
  })

  const renderDefaultPage = () => div({ style: { display: 'flex', flexDirection: 'column', flex: 1 } },
    _.map(tool => renderToolButtons(tool.label))(filterForTool ? [tools[filterForTool]] : getToolsToDisplay(azureContext))
  )

  const toolPanelStyles = {
    backgroundColor: 'white',
    margin: '0 1.5rem 1rem 1.5rem',
    padding: '0 1rem 1rem 1rem',
    display: 'flex',
    flexDirection: 'column'
  }
  const toolLabelStyles = {
    margin: '1rem 0 0.5rem 0',
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  }
  const toolButtonDivStyles = { display: 'flex', flexDirection: 'row', justifyContent: 'space-evenly' }
  const toolButtonStyles = {
    flex: '1 1 0%',
    maxWidth: 105,
    display: 'flex',
    flexDirection: 'column',
    border: '.5px solid',
    borderColor: colors.grey(),
    borderRadius: 16,
    padding: '.5rem .75rem',
    alignItems: 'center',
    fontWeight: 550,
    fontSize: 11,
    color: colors.accent()
  }

  const currentRuntime = getCurrentRuntime(runtimes)
  const currentRuntimeStatus = getConvertedRuntimeStatus(currentRuntime)
  const currentRuntimeTool = currentRuntime?.labels?.tool

  const currentApp = toolLabel => getCurrentApp(getAppType(toolLabel))(apps)

  const isLaunchSupported = toolLabel => !_.find(tool => tool.label === toolLabel)(tools).isLaunchUnsupported

  const RuntimeIcon = ({ shape, onClick, disabled, messageChildren, toolLabel, style, ...props }) => {
    return h(Clickable, {
      'aria-label': `${toolLabel} Status`,
      hover: disabled ? {} : { backgroundColor: colors.accent(0.2) },
      // css takes the last thing if there are duplicate fields, the order here is important because all three things can specify color
      style: { ...toolButtonStyles, color: onClick && !disabled ? colors.accent() : colors.dark(0.3), ...style },
      onClick, disabled, ...props
    }, [
      icon(shape, { style: { marginBottom: '.25rem' }, size: 20 }),
      ...messageChildren
    ])
  }

  const executeAndRefresh = async (toolLabel, promise) => {
    try {
      setBusy(true)
      await promise
      await isToolAnApp(toolLabel) ? refreshApps() : refreshRuntimes()
    } catch (error) {
      reportError('Cloud Environment Error', error)
    } finally {
      setBusy(false)
    }
  }

  //TODO: add azure start
  // We assume here that button disabling is working properly, so the only thing to check is whether it's an app or the current (assumed to be existing) runtime
  const startApp = toolLabel => Utils.cond([isToolAnApp(toolLabel), () => {
    const { appName, cloudContext } = currentApp(toolLabel)
    executeAndRefresh(toolLabel,
      Ajax().Apps.app(cloudContext.cloudResource, appName).resume())
  }], [Utils.DEFAULT, () => {
    executeAndRefresh(toolLabel,
      Ajax().Runtimes.runtimeWrapper(currentRuntime).start())
  }])

  const stopApp = toolLabel => Utils.cond([isToolAnApp(toolLabel), () => {
    const { appName, cloudContext } = currentApp(toolLabel)
    executeAndRefresh(toolLabel, Ajax().Apps.app(cloudContext.cloudResource, appName).pause())
  }], [Utils.DEFAULT, () => {
    executeAndRefresh(toolLabel, Ajax().Runtimes.runtimeWrapper(currentRuntime).stop())
  }])

  const defaultIcon = toolLabel => isPauseSupported(toolLabel) && h(RuntimeIcon, {
    shape: 'pause',
    toolLabel,
    disabled: true,
    messageChildren: [span('Pause')],
    tooltip: 'No Environment found',
    style: { borderColor: colors.dark(0.3) }
  })

  const renderStatusClickable = toolLabel => Utils.cond(
    [toolLabel === currentRuntimeTool, () => getIconFromStatus(toolLabel, currentRuntimeStatus)],
    [isToolAnApp(toolLabel), () => {
      const normalizedAppStatus = _.capitalize(currentApp(toolLabel)?.status)
      return getIconFromStatus(toolLabel, normalizedAppStatus)
    }],
    [Utils.DEFAULT, () => defaultIcon(toolLabel)]
  )

  const getIconFromStatus = (toolLabel, status) => {
    // We dont use Utils.switchCase here to support the 'fallthrough' functionality
    switch (status) {
      case 'Stopped':
        return h(RuntimeIcon, {
          shape: 'play',
          toolLabel,
          onClick: () => startApp(toolLabel),
          disabled: busy || !canCompute,
          messageChildren: [span('Resume')],
          tooltip: canCompute ? 'Resume Environment' : noCompute
        })
      case 'Running':
        return isPauseSupported(toolLabel) && h(RuntimeIcon, {
          shape: 'pause',
          toolLabel,
          onClick: () => stopApp(toolLabel),
          disabled: busy || !canCompute,
          messageChildren: [span('Pause')],
          tooltip: canCompute ? 'Pause Environment' : noCompute
        })
      case 'Starting':
      case 'Stopping':
      case 'Updating':
      case 'Creating':
      case 'Prestopping':
      case 'Prestarting':
      case 'Precreating':
      case 'Provisioning':
      case 'LeoReconfiguring':
        return h(RuntimeIcon, {
          shape: 'sync',
          toolLabel,
          disabled: true,
          tooltip: 'Environment update in progress',
          messageChildren: [span(getComputeStatusForDisplay(status))],
          style: { color: colors.dark(0.7) }
        })
      case 'Error':
        return h(RuntimeIcon, {
          shape: 'warning-standard',
          toolLabel,
          style: { color: colors.danger(0.9) },
          onClick: () => {
            Utils.cond(
              [isToolAnApp(toolLabel), () => setErrorAppId(currentApp(toolLabel)?.appName)],
              [Utils.DEFAULT, () => setErrorRuntimeId(currentRuntime?.id)]
            )
          },
          disabled: busy || !canCompute,
          messageChildren: [span('View'),
            span('Error')],
          tooltip: canCompute ? 'View error' : noCompute
        })
      default:
        return defaultIcon(toolLabel)
    }
  }

  const getToolIcon = toolLabel => Utils.switchCase(toolLabel,
    [tools.Jupyter.label, () => jupyterLogo],
    [tools.Galaxy.label, () => galaxyLogo],
    [tools.RStudio.label, () => rstudioBioLogo],
    [tools.Cromwell.label, () => cromwellImg],
    [tools.Azure.label, () => jupyterLogo])

  const isCloudEnvModalDisabled = toolLabel => Utils.cond(
    [isToolAnApp(toolLabel), () => !canCompute || busy || (toolLabel === tools.Galaxy.label && isCurrentGalaxyDiskDetaching(apps)) || getIsAppBusy(currentApp(toolLabel))],
    [Utils.DEFAULT, () => {
      const runtime = getRuntimeForTool(toolLabel, currentRuntime, currentRuntimeTool)
      // This asks 'does this tool have a runtime'
      //  if yes, then we allow cloud env modal to open (and ComputeModal determines if it should be read-only mode)
      //  if no, then we want to disallow the cloud env modal opening if the other tool's runtime is busy
      //  this check is not needed if we allow multiple runtimes, and cloud env modal will never be disabled in this case
      return runtime ? false :
        !canCompute || busy || getIsRuntimeBusy(currentRuntime)
    }]
  )

  const getToolLaunchClickableProps = toolLabel => {
    const app = currentApp(toolLabel)
    const doesCloudEnvForToolExist = currentRuntimeTool === toolLabel || app
    // TODO what does cookieReady do? Found it in the galaxy app launch code, is it needed here?
    const isToolBusy = isToolAnApp(toolLabel) ?
      getIsAppBusy(app) || app?.status === 'STOPPED' || app?.status === 'ERROR' :
      currentRuntime?.status === 'Error'
    const isDisabled = !doesCloudEnvForToolExist || !cookieReady || !canCompute || busy || isToolBusy || !isLaunchSupported(toolLabel)
    const baseProps = {
      'aria-label': `Launch ${toolLabel}`,
      disabled: isDisabled,
      style: {
        ...toolButtonStyles,
        color: isDisabled ? colors.dark(0.3) : colors.accent(),
        borderColor: isDisabled ? colors.dark(0.3) : colors.grey()
      },
      hover: isDisabled ? {} : { backgroundColor: colors.accent(0.2) },
      tooltip: Utils.cond(
        [doesCloudEnvForToolExist && !isDisabled, () => 'Open'],
        [doesCloudEnvForToolExist && isDisabled && isLaunchSupported(toolLabel), () => `Please wait until ${toolLabel} is running`],
        [doesCloudEnvForToolExist && isDisabled && !isLaunchSupported(toolLabel),
          () => `Select or create an analysis in the analyses tab to open ${toolLabel}`],
        [Utils.DEFAULT, () => 'No Environment found']
      )
    }
    return Utils.switchCase(toolLabel,
      [tools.Galaxy.label, () => {
        return {
          ...baseProps,
          href: app?.proxyUrls?.galaxy,
          onClick: () => {
            onDismiss()
            Ajax().Metrics.captureEvent(Events.applicationLaunch, { app: 'Galaxy' })
          },
          ...Utils.newTabLinkPropsWithReferrer
        }
      }],
      [tools.Cromwell.label, () => {
        return {
          ...baseProps,
          href: app?.proxyUrls['cromwell-service'],
          onClick: () => {
            onDismiss()
            Ajax().Metrics.captureEvent(Events.applicationLaunch, { app: tools.Cromwell.appType })
          },
          ...Utils.newTabLinkPropsWithReferrer
        }
      }],
      [Utils.DEFAULT, () => {
        // TODO: Jupyter link isn't currently valid, and button will always be disabled for Jupyter because launching directly into tree view is problematic in terms of welder/nbextensions. We are investigating alternatives in https://broadworkbench.atlassian.net/browse/IA-2873
        const applicationLaunchLink = Nav.getLink(appLauncherTabName, { namespace, name: workspaceName, application: toolLabel })
        return {
          ...baseProps,
          href: applicationLaunchLink,
          onClick: () => {
            Ajax().Metrics.captureEvent(Events.analysisLaunch,
              { origin: 'contextBar', source: toolLabel, application: toolLabel, workspaceName, namespace })
            if ((toolLabel === tools.Jupyter.label || toolLabel === tools.RStudio.label) && currentRuntime?.status === 'Stopped') {
              startApp(toolLabel)
            }
            onDismiss()
          }
        }
      }]
    )
  }

  const renderToolButtons = toolLabel => {
    const app = currentApp(toolLabel)
    const doesCloudEnvForToolExist = currentRuntimeTool === toolLabel || app
    const isCloudEnvForToolDisabled = isCloudEnvModalDisabled(toolLabel)
    return h(Fragment, [
      div({ style: toolPanelStyles }, [
        // Label at the top for each tool
        div({ style: toolLabelStyles }, [
          img({
            src: getToolIcon(toolLabel),
            style: { height: 30 },
            alt: `${toolLabel}`
          }),
          div([
            div({ style: { textAlign: 'right' } }, getCostDisplayForTool(app, currentRuntime, currentRuntimeTool, toolLabel)),
            div({ style: { textAlign: 'right' } }, getCostDisplayForDisk(app, appDataDisks, computeRegion, currentRuntimeTool, persistentDisks, runtimes, toolLabel))
          ])
        ]),
        // Cloud environment button
        div({ style: toolButtonDivStyles }, [
          h(Clickable, {
            'aria-label': `${toolLabel} Environment`,
            style: {
              ...toolButtonStyles,
              color: !isCloudEnvForToolDisabled ? colors.accent() : colors.dark(0.7)
            },
            hover: isCloudEnvForToolDisabled ? {} : { backgroundColor: colors.accent(0.2) },
            tooltip: Utils.cond([isCloudEnvForToolDisabled, () => 'Edit disabled, processing'],
              [doesCloudEnvForToolExist, () => 'Edit existing Environment'],
              [!doesCloudEnvForToolExist, () => 'Create new Environment']),
            disabled: isCloudEnvForToolDisabled,
            onClick: () => setViewMode(toolLabel)
          }, [
            icon('cog', { size: 20 }),
            span({ style: { marginTop: '.25rem' } }, ['Settings'])
          ]),
          // Status button with stop/start functionality
          renderStatusClickable(toolLabel),
          // Launch
          h(Clickable, { ...getToolLaunchClickableProps(toolLabel) }, [
            icon('rocket', { size: 20 }),
            span({ style: { marginTop: '.25rem' } }, ['Open'])
          ])
        ])
      ])
    ])
  }

  const NEW_JUPYTER_MODE = tools.Jupyter.label
  const NEW_RSTUDIO_MODE = tools.RStudio.label
  const NEW_GALAXY_MODE = tools.Galaxy.label
  const NEW_CROMWELL_MODE = tools.Cromwell.label
  const NEW_AZURE_MODE = tools.Azure.label

  const getView = () => Utils.switchCase(viewMode,
    [NEW_JUPYTER_MODE, () => renderComputeModal(NEW_JUPYTER_MODE)],
    [NEW_AZURE_MODE, () => renderAzureModal()],
    [NEW_RSTUDIO_MODE, () => renderComputeModal(NEW_RSTUDIO_MODE)],
    [NEW_GALAXY_MODE, () => renderAppModal(GalaxyModalBase, NEW_GALAXY_MODE)],
    [NEW_CROMWELL_MODE, () => renderAppModal(CromwellModalBase, NEW_CROMWELL_MODE)],
    [Utils.DEFAULT, renderDefaultPage]
  )

  const width = Utils.switchCase(viewMode,
    [NEW_JUPYTER_MODE, () => 675],
    [NEW_RSTUDIO_MODE, () => 675],
    [NEW_GALAXY_MODE, () => 675],
    [NEW_CROMWELL_MODE, () => 675],
    [NEW_AZURE_MODE, () => 675],
    [Utils.DEFAULT, () => 430]
  )

  const modalBody = h(Fragment, [
    h(TitleBar, {
      id: titleId,
      title: filterForTool ? `${filterForTool} Environment Details` : 'Cloud Environment Details',
      titleStyles: _.merge(viewMode === undefined ? {} : { display: 'none' }, { margin: '1.5rem 0 .5rem 1rem' }),
      width,
      onDismiss,
      onPrevious: !!viewMode ? () => setViewMode(undefined) : undefined
    }),
    viewMode !== undefined && hr({ style: { borderTop: '1px solid', width: '100%', color: colors.accent() } }),
    getView(),
    errorAppId && h(AppErrorModal, {
      app: _.find({ appName: errorAppId }, apps),
      onDismiss: () => setErrorAppId(undefined)
    }),
    errorRuntimeId && h(RuntimeErrorModal, {
      runtime: _.find({ id: errorRuntimeId }, runtimes),
      onDismiss: () => setErrorRuntimeId(undefined)
    }),
    busy && spinnerOverlay
  ])

  const modalProps = {
    'aria-labelledby': titleId, isOpen, width,
    onDismiss,
    onExited: resetView
  }
  return h(ModalDrawer, { ...modalProps, children: modalBody })
}
