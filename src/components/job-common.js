import { Fragment } from 'react'
import { div, h, h4 } from 'react-hyperscript-helpers'
import { icon } from 'src/components/icons'
import { TooltipCell } from 'src/components/table'
import colors from 'src/libs/colors'
import * as Style from 'src/libs/style'


const iconSize = 24
export const addCountSuffix = (label, count = undefined) => {
  return label + (count === undefined ? '' : `: ${count}`)
}

export const statusType = {
  succeeded: {
    id: 'succeeded', // Must match variable name for collection unpacking.
    label: () => 'Succeeded',
    icon: style => icon('check', { size: iconSize, style: { color: colors.success(), ...style } })
  },
  failed: {
    id: 'failed', // Must match variable name for collection unpacking.
    label: () => 'Failed',
    icon: style => icon('warning-standard', { size: iconSize, style: { color: colors.danger(), ...style } })
  },
  running: {
    id: 'running', // Must match variable name for collection unpacking.
    label: () => 'Running',
    icon: style => icon('sync', { size: iconSize, style: { color: colors.dark(), ...style } })
  },
  submitted: {
    id: 'submitted', // Must match variable name for collection unpacking.
    label: () => 'Submitted',
    icon: style => icon('clock', { size: iconSize, style: { color: colors.dark(), ...style } })
  },
  waitingForQuota: {
    id: 'waitingForQuota', // Must match variable name for collection unpacking.
    label: () => 'Submitted, Awaiting Cloud Quota',
    icon: style => icon('error-standard', { size: iconSize, style: { color: colors.warning(), ...style } }),
    moreInfoLink: 'https://support.terra.bio/hc/en-us/articles/360029071251',
    moreInfoLabel: 'Learn more about cloud quota',
    tooltip: 'Delayed by Google Cloud Platform (GCP) quota limits. Contact Terra Support to request a quota increase.'
  },
  unknown: {
    id: 'unknown', // Must match variable name for collection unpacking.
    label: executionStatus => `Unexpected status (${executionStatus})`,
    icon: style => icon('question', { size: iconSize, style: { color: colors.dark(), ...style } })
  }
}


/**
 * Collapses submission or workflow status.
 *
 * @param {string} rawStatus
 * @returns {Object} one of `statusType.succeeded`, `statusType.failed`, `statusType.running`, or `statusType.submitted`
 */
export const collapseStatus = rawStatus => {
  switch (rawStatus) {
    case 'Succeeded':
      return statusType.succeeded
    case 'Aborting': // only on submissions not workflows
    case 'Aborted':
    case 'Failed':
      return statusType.failed
    case 'Running':
      return statusType.running
    default:
      return statusType.submitted
  }
}

/**
 * Collapses Cromwell status, taking into account both execution and backend status values.
 *
 * @param {string} executionStatus from metadata
 * @param {string} backendStatus from metadata
 * @returns {Object} one of `statusType.succeeded`, `statusType.failed`, `statusType.running`, `statusType.waitingForQuota`, or `statusType.unknown`
 */
export const collapseCromwellStatus = (executionStatus, backendStatus) => {
  switch (executionStatus) {
    case 'Done':
      return statusType.succeeded
    case 'Aborting':
    case 'Aborted':
    case 'Failed':
      return statusType.failed
    case 'Running':
      return backendStatus === 'AwaitingCloudQuota' ? statusType.waitingForQuota : statusType.running
    default:
      return statusType.unknown
  }
}

/**
 * Returns the rendered status line, based on icon function, label, and style.
 */
export const makeStatusLine = (iconFn, label, style) => div(
  { style: { display: 'flex', alignItems: 'center', fontSize: 14, ...style } },
  [iconFn({ marginRight: '0.5rem' }), label]
)

/**
 * Returns the rendered status line for Cromwell status.
 */
export const makeCromwellStatusLine = (executionStatus, backendStatus) => {
  const collapsedStatus = collapseCromwellStatus(executionStatus, backendStatus)
  return h(TooltipCell, { tooltip: collapsedStatus.tooltip }, // Note that if the tooltip is undefined, a default will be shown
    [makeStatusLine(style => collapsedStatus.icon(style), collapsedStatus.label(executionStatus), { marginLeft: '0.5rem' }
    )]
  )
}

export const makeSection = (label, children, { style = {} } = {}) => div({
  style: {
    flex: '0 0 33%', padding: '0 0.5rem 0.5rem', marginTop: '1rem',
    whiteSpace: 'pre', textOverflow: 'ellipsis', overflow: 'hidden',
    ...style
  }
}, [
  h4({ style: Style.elements.sectionHeader }, label),
  h(Fragment, children)
])
