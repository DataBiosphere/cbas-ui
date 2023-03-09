import { isEmpty, isNil, kebabCase } from 'lodash/fp'
import { Fragment } from 'react'
import { div, h, h1, h4, span } from 'react-hyperscript-helpers'
import { icon } from 'src/components/icons'
import { TooltipCell } from 'src/components/table'
import colors from 'src/libs/colors'
import { goToPath } from 'src/libs/nav'
import * as Style from 'src/libs/style'

import { ButtonOutline, Link } from './common'


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
    label: () => 'Failed with error(s)',
    icon: style => icon('warning-standard', { size: iconSize, style: { color: colors.danger(), ...style } })
  },
  paused: {
    id: 'paused', // Must match variable name for collection unpacking.
    label: () => 'Paused',
    icon: style => icon('pause', { size: iconSize, style: { color: colors.dark(), ...style } })
  },
  running: {
    id: 'running', // Must match variable name for collection unpacking.
    label: () => 'Running',
    icon: style => icon('sync', { size: iconSize, style: { color: colors.dark(), ...style } })
  },
  canceled: {
    id: 'canceled', // Must match variable name for collection unpacking.
    label: () => 'Canceled',
    icon: style => icon('warning-standard', { size: iconSize, style: { color: colors.dark(), ...style } })
  },
  submitted: {
    id: 'submitted', // Must match variable name for collection unpacking.
    label: () => 'Submitted',
    icon: style => icon('clock', { size: iconSize, style: { color: colors.dark(), ...style } })
  },
  queued: {
    id: 'queued', // Must match variable name for collection unpacking.
    label: () => 'Queued',
    icon: style => icon('clock', { size: iconSize, style: { color: colors.dark(), ...style } })
  },
  initializing: {
    id: 'initializing', // Must match variable name for collection unpacking.
    label: () => 'Initializing',
    icon: style => icon('sync', { size: iconSize, style: { color: colors.dark(), ...style } })
  },
  canceling: {
    id: 'canceling', // Must match variable name for collection unpacking.
    label: () => 'Canceling',
    icon: style => icon('sync', { size: iconSize, style: { color: colors.dark(), ...style } })
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
    case 'Unstartable':
      return statusType.failed
    case 'Running':
    case 'NotStarted':
    case 'WaitingForQueueSpace':
    case 'QueuedInCromwell':
    case 'Starting':
    case 'Bypassed':
    case 'RetryableFailure':
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

export const SubmitNewWorkflowButton = h(ButtonOutline, {
  onClick: () => goToPath('root')
}, ['Submit a new workflow'])

export const breadcrumbHistoryCaret = icon('angle-right', { size: 10, style: { margin: '0 0.25rem' } })

export const PageHeader = ({ breadcrumbPathObjects, title }) => {
  const pageId = kebabCase(title)
  return div({ id: `${pageId}-header-container` }, [
    h1({/*Make adjustments if needed */}, [title]),
    h(Breadcrumbs, { isRendered: !isEmpty(breadcrumbPathObjects), breadcrumbPathObjects, pageId })
  ])
}

export const Breadcrumbs = ({ breadcrumbPathObjects, pageId }) => {
  const links = breadcrumbPathObjects.map(({ label, path, params }, index) => {
    const attributes = { key: `${kebabCase(label)}-breadcrumb-link` }
    let component
    if (!isNil(path)) {
      attributes.onClick = () => goToPath(path, params)
      component = h(Link, { ...attributes }, [label])
    } else {
      component = span({ ...attributes }, [label])
    }

    const children = [component]

    if (index < breadcrumbPathObjects.length - 1) {
      children.push(breadcrumbHistoryCaret)
    }

    return span({ key: `${kebabCase(label)}-breadcrumb-link` }, children)
  })

  return div({ id: `${pageId}-breadcrumbs-container` }, links)
}

export const HeaderSection = ({ title, breadcrumbPathObjects, button }) => {
  return div({ id: 'header-section', style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } }, [
    h(PageHeader, { breadcrumbPathObjects, title }),
    button
  ])
}
