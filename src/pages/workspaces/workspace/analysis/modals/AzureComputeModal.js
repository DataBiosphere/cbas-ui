import _ from 'lodash/fp'
import { Fragment, useState } from 'react'
import { div, h, label, p, span } from 'react-hyperscript-helpers'
import { ButtonOutline, ButtonPrimary, IdContainer, Link, Select, spinnerOverlay, WarningTitle } from 'src/components/common'
import { icon } from 'src/components/icons'
import { NumberInput } from 'src/components/input'
import { withModalDrawer } from 'src/components/ModalDrawer'
import { InfoBox } from 'src/components/PopupTrigger'
import TitleBar from 'src/components/TitleBar'
import { Ajax } from 'src/libs/ajax'
import {
  azureMachineTypes, azureRegions, defaultAzureComputeConfig, defaultAzureDiskSize, defaultAzureMachineType, defaultAzureRegion, getMachineTypeLabel,
  getRegionLabel
} from 'src/libs/azure-utils'
import colors from 'src/libs/colors'
import { withErrorReportingInModal } from 'src/libs/error'
import { useOnMount } from 'src/libs/react-utils'
import * as Utils from 'src/libs/utils'
import {
  computeStyles, getCurrentRuntime, getIsRuntimeBusy
} from 'src/pages/workspaces/workspace/analysis/runtime-utils'


const titleId = 'azure-compute-modal-title'

export const AzureComputeModalBase = ({
  onDismiss, onSuccess, onError = onDismiss, workspace: { workspace: { namespace, name: workspaceName, workspaceId } }, runtimes, hideCloseButton = false
}) => {
  const [loading, setLoading] = useState(false)
  const [viewMode, setViewMode] = useState(undefined)
  const [currentRuntimeDetails, setCurrentRuntimeDetails] = useState(() => getCurrentRuntime(runtimes))
  const [computeConfig, setComputeConfig] = useState(defaultAzureComputeConfig)
  const updateComputeConfig = (key, value) => setComputeConfig(_.set(key, value, computeConfig))

  // Lifecycle
  useOnMount(_.flow(
    withErrorReportingInModal('Error loading cloud environment', onError),
    Utils.withBusyState(setLoading)
  )(async () => {
    const currentRuntime = getCurrentRuntime(runtimes)
    setCurrentRuntimeDetails(currentRuntime ? await Ajax().Runtimes.runtimeV2(workspaceId, currentRuntime.runtimeName).details() : null)

    setComputeConfig({
      machineType: currentRuntimeDetails?.runtimeConfig?.machineType || defaultAzureMachineType,
      diskSize: currentRuntimeDetails?.diskConfig?.size || defaultAzureDiskSize,
      region: currentRuntime?.runtimeConfig?.region || defaultAzureRegion
    })
  }))

  const renderTitleAndTagline = () => {
    return h(Fragment, [
      h(TitleBar, {
        id: titleId,
        hideCloseButton,
        style: { marginBottom: '0.5rem' },
        title: 'Azure Cloud Environment',
        onDismiss
      }),
      div(['A cloud environment consists of application configuration, cloud compute and persistent disk(s).'])
    ])
  }

  const renderBottomButtons = () => {
    return div({ style: { display: 'flex', marginTop: '2rem' } }, [
      doesRuntimeExist() && h(ButtonOutline, {
        onClick: () => setViewMode('deleteEnvironment')
      }, ['Delete Environment']),
      div({ style: { flex: 1 } }),
      renderActionButton()
    ])
  }

  const renderApplicationConfigurationSection = () => {
    return div({ style: computeStyles.whiteBoxContainer }, [
      h(IdContainer, [
        id => h(Fragment, [
          div({ style: { marginBottom: '1rem' } }, [
            label({ htmlFor: id, style: computeStyles.label }, ['Application configuration']),
            h(InfoBox, { style: { marginLeft: '0.5rem' } }, [
              'Currently, the Azure VM is pre-configured. '
            ])
          ]),
          p({ style: { marginBottom: '1.5rem' } }, ['Azure Data Science Virtual Machine']),
          div([
            h(Link, { href: 'https://azure.microsoft.com/en-us/services/virtual-machines/data-science-virtual-machines/#product-overview', ...Utils.newTabLinkProps }, [
              'Learn more about this Azure Data Science VMs',
              icon('pop-out', { size: 12, style: { marginLeft: '0.25rem' } })
            ])
          ])
        ])
      ])
    ])
  }

  const renderComputeProfileSection = () => {
    return div({ style: { ...computeStyles.whiteBoxContainer, marginTop: '1.5rem' } }, [
      div({ style: { marginBottom: '2rem' } }, [
        h(IdContainer, [
          id => h(Fragment, [
            div({ style: { marginBottom: '1rem' } }, [
              label({ htmlFor: id, style: computeStyles.label }, ['Cloud compute profile'])
            ]),
            div({ style: { width: 400 } }, [
              h(Select, {
                id,
                isSearchable: false,
                isClearable: false,
                value: computeConfig.machineType,
                onChange: ({ value }) => updateComputeConfig('machineType', value),
                options: _.keys(azureMachineTypes),
                getOptionLabel: ({ value }) => getMachineTypeLabel(value),
                styles: { width: '400' }
              })
            ])
          ])
        ]),
        div({ style: { display: 'flex', marginTop: '.5rem' } }, [
          h(Link, { href: 'https://azure.microsoft.com/en-us/pricing/details/virtual-machines/series/', ...Utils.newTabLinkProps }, [
            'Learn more about cloud compute profiles',
            icon('pop-out', { size: 12, style: { marginLeft: '0.25rem' } })
          ])
        ])
      ]),
      div({ style: { marginBottom: '2rem' } }, [
        h(IdContainer, [
          id => h(Fragment, [
            div({ style: { marginBottom: '.5rem' } }, [
              label({ htmlFor: id, style: computeStyles.label }, ['Location'])
            ]),
            div({ style: { width: 400 } }, [
              h(Select, {
                id,
                isSearchable: false,
                isClearable: false,
                value: computeConfig.region,
                isDisabled: true, //this is currently locked to workspace location
                onChange: ({ value }) => updateComputeConfig('region', value),
                options: _.keys(azureRegions),
                getOptionLabel: ({ value }) => getRegionLabel(value)
              })
            ])
          ])
        ])
      ]),
      div({ style: { marginBottom: '2rem' } }, [
        h(IdContainer, [
          id => h(Fragment, [
            div({ style: { marginBottom: '.5rem' } }, [
              label({ htmlFor: id, style: computeStyles.label }, ['Disk Size (GB)'])
            ]),
            div({ style: { width: 75 } }, [
              h(NumberInput, {
                id,
                min: 50,
                max: 64000,
                isClearable: false,
                onlyInteger: true,
                value: computeConfig.diskSize,
                onChange: v => updateComputeConfig('diskSize', v)
              })
            ])
          ])
        ])
      ])
    ])
  }

  // Will be used once we support update
  // const hasChanges = () => {
  //   const existingConfig = adaptRuntimeDetailsToFormConfig()
  //
  //   return !_.isEqual(existingConfig, computeConfig)
  // }
  //
  // const adaptRuntimeDetailsToFormConfig = () => {
  //   return currentRuntimeDetails ? {
  //     machineType: currentRuntimeDetails.runtimeConfig?.machineType || defaultAzureMachineType,
  //     diskSize: currentRuntimeDetails.diskConfig?.size || defaultAzureDiskSize,
  //     region: currentRuntimeDetails.runtimeConfig?.region || defaultAzureRegion
  //   } : {}
  // }

  const doesRuntimeExist = () => !!currentRuntimeDetails

  const renderActionButton = () => {
    const commonButtonProps = {
      tooltipSide: 'left',
      disabled: Utils.cond(
        [viewMode === 'deleteEnvironment', () => getIsRuntimeBusy(currentRuntimeDetails)],
        () => doesRuntimeExist()),
      tooltip: Utils.cond(
        [viewMode === 'deleteEnvironment',
          () => getIsRuntimeBusy(currentRuntimeDetails) ? 'Cannot delete a runtime while it is busy' : undefined],
        [doesRuntimeExist(), () => 'Update not supported for azure runtimes'],
        () => undefined)
    }

    return h(ButtonPrimary, {
      ...commonButtonProps,
      onClick: () => applyChanges()
    }, [Utils.cond(
      [viewMode === 'deleteEnvironment', () => 'Delete'],
      [doesRuntimeExist(), () => 'Update'],
      () => 'Create'
    )]
    )
  }

  // Helper functions -- begin
  const applyChanges = _.flow(
    Utils.withBusyState(setLoading),
    withErrorReportingInModal('Error modifying cloud environment', onError)
  )(async () => {
    //TODO: metrics onclick
    //sendCloudEnvironmentMetrics()

    //each branch of the cond should return a promise
    await Utils.cond(
      [viewMode === 'deleteEnvironment',
        () => Ajax().Runtimes.runtimeV2(workspaceId, currentRuntimeDetails.runtimeName).delete()], //delete runtime
      [Utils.DEFAULT, () => {
        const disk = {
          size: computeConfig.diskSize,
          //We do not currently support re-attaching azure disks
          name: Utils.generatePersistentDiskName(),
          labels: { saturnWorkspaceNamespace: namespace, saturnWorkspaceName: workspaceName }
        }

        return Ajax().Runtimes.runtimeV2(workspaceId, Utils.generateRuntimeName()).create({
          region: computeConfig.region,
          machineSize: computeConfig.machineType,
          labels: {
            saturnWorkspaceNamespace: namespace,
            saturnWorkspaceName: workspaceName
          },
          disk
        })
      }]
    )

    onSuccess()
  })

  const renderMainForm = () => {
    return h(Fragment, [
      div({ style: { padding: '1.5rem', borderBottom: `1px solid ${colors.dark(0.4)}` } }, [
        renderTitleAndTagline(),
        renderCostBreakdown()
      ]),
      div({ style: { padding: '1.5rem', overflowY: 'auto', flex: 'auto' } }, [
        renderApplicationConfigurationSection(),
        renderComputeProfileSection(),
        renderBottomButtons()
      ])
    ])
  }

  //TODO this does not actually compute cost as is, see IA-3348
  //It is possible that once we compute the cost, we would like to parameterize this and make it a shared function between the equivalent in ComputeModal
  const renderCostBreakdown = () => {
    return div({
      style: {
        backgroundColor: colors.accent(0.2),
        display: 'flex',
        borderRadius: 5,
        padding: '0.5rem 1rem',
        marginTop: '1rem'
      }
    }, [
      _.map(({ cost, label, unitLabel }) => {
        return div({ key: label, style: { flex: 1, ...computeStyles.label } }, [
          div({ style: { fontSize: 10 } }, [label]),
          div({ style: { color: colors.accent(1.1), marginTop: '0.25rem' } }, [
            span({ style: { fontSize: 20 } }, [cost]),
            span([' ', unitLabel])
          ])
        ])
      }, [
        { label: 'Running cloud compute cost', cost: Utils.formatUSD(0), unitLabel: 'per hr' },
        { label: 'Paused cloud compute cost', cost: Utils.formatUSD(0), unitLabel: 'per hr' },
        {
          label: 'Persistent disk cost',
          cost: Utils.formatUSD(0),
          unitLabel: 'per month'
        }
      ])
    ])
  }

  const renderDeleteEnvironment = () => {
    return div({ style: { ...computeStyles.drawerContent, ...computeStyles.warningView } }, [
      h(TitleBar, {
        id: titleId,
        hideCloseButton,
        style: computeStyles.titleBar,
        title: h(WarningTitle, ['Delete environment']),
        onDismiss,
        onPrevious: () => setViewMode(undefined)
      }),
      div({ style: { lineHeight: '1.5rem' } }, [
        p([
          'Deleting your application configuration and cloud compute profile will also ',
          span({ style: { fontWeight: 600 } }, ['delete all files on the built-in hard disk.'])
        ])
      ]),
      div({ style: { display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' } }, [
        renderActionButton()
      ])
    ])
  }

  return h(Fragment, [
    Utils.switchCase(viewMode,
      ['deleteEnvironment', renderDeleteEnvironment],
      [Utils.DEFAULT, renderMainForm]
    ),
    loading && spinnerOverlay
  ])
}

export const AzureComputeModal = withModalDrawer({ width: 675, 'aria-labelledby': titleId })(
  AzureComputeModalBase
)
