import _ from 'lodash/fp'
import { div, h } from 'react-hyperscript-helpers'
import { Link, Select } from 'src/components/common'
import { icon } from 'src/components/icons'
import { TextInput } from 'src/components/input'
import { Ajax } from 'src/libs/ajax'
import colors from 'src/libs/colors'
import { notify } from 'src/libs/notifications'
import { differenceFromDatesInSeconds, differenceFromNowInSeconds } from 'src/libs/utils'


export const AutoRefreshInterval = 1000 * 60 // 1 minute

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
  },
  canceling: {
    id: 'canceling', // Must match variable name for collection unpacking.
    label: () => 'Canceling',
    icon: style => icon('sync', { size: iconSize, style: { color: colors.dark(), ...style } })
  },
  canceled: {
    id: 'canceled', // Must match variable name for collection unpacking.
    label: () => 'Canceled',
    icon: style => icon('warning-standard', { size: iconSize, style: { color: colors.dark(), ...style } })
  }
}

/**
 * Returns the rendered status line, based on icon function, label, and style.
 */
export const makeStatusLine = (iconFn, label, style) => div(
  { style: { display: 'flex', alignItems: 'center', fontSize: 14, ...style } },
  [iconFn({ marginRight: '0.5rem' }), label]
)

const RunSetTerminalStates = ['ERROR', 'COMPLETE']
export const isRunSetInTerminalState = runSetStatus => RunSetTerminalStates.includes(runSetStatus)

const RunTerminalStates = ['COMPLETE', 'CANCELED', 'SYSTEM_ERROR', 'ABORTED', 'EXECUTOR_ERROR']
export const isRunInTerminalState = runStatus => RunTerminalStates.includes(runStatus)

export const getDuration = (state, submissionDate, lastModifiedTimestamp, stateCheckCallback) => {
  return stateCheckCallback(state) ?
    differenceFromDatesInSeconds(submissionDate, lastModifiedTimestamp) :
    differenceFromNowInSeconds(submissionDate)
}

export const loadRunSetData = async signal => {
  try {
    const getRunSets = await Ajax(signal).Cbas.runSets.get()
    const allRunSets = getRunSets.run_sets
    return _.map(r => _.merge(r, { duration: getDuration(r.state, r.submission_timestamp, r.last_modified_timestamp, isRunSetInTerminalState) }),
      allRunSets)
  } catch (error) {
    notify('error', 'Error getting run set data', { detail: await (error instanceof Response ? error.text() : error) })
  }
}

export const parseMethodString = methodString => {
  const methodNameParts = methodString.split('.')
  return {
    workflow: methodNameParts[0],
    call: methodNameParts.length === 3 ? methodNameParts[1] : '',
    variable: methodNameParts[methodNameParts.length - 1]
  }
}

export const inputSourceLabels = {
  literal: 'Type a Value',
  record_lookup: 'Fetch from Data Table',
  object_builder: 'Use Struct Builder',
  none: 'None'
}

export const inputSourceTypes = _.invert(inputSourceLabels)

export const RecordLookupSelect = props => {
  const {
    source,
    dataTableAttributes,
    updateSource
  } = props

  return h(Select, {
    isDisabled: false,
    'aria-label': 'Select an Attribute',
    isClearable: false,
    value: source.record_attribute,
    onChange: ({ value }) => {
      const newAttribute = _.get(`${value}.name`, dataTableAttributes)
      const newSource = {
        type: source.type,
        record_attribute: newAttribute
      }
      updateSource(newSource)
    },
    placeholder: source.record_attribute || 'Select Attribute',
    options: _.keys(dataTableAttributes),
    // ** https://stackoverflow.com/questions/55830799/how-to-change-zindex-in-react-select-drowpdown
    styles: { container: old => ({ ...old, display: 'inline-block', width: '100%' }), menuPortal: base => ({ ...base, zIndex: 9999 }) },
    menuPortalTarget: document.body,
    menuPlacement: 'top'
  })
}

export const ParameterValueTextInput = props => {
  const {
    id,
    source,
    updateSource
  } = props

  return h(TextInput, {
    id,
    style: { display: 'block', width: '100%' },
    value: source.parameter_value,
    onChange: value => {
      const newSource = {
        type: source.type,
        parameter_value: value
      }
      updateSource(newSource)
    }
  })
}

export const InputSourceSelect = props => {
  const {
    source,
    inputType,
    updateSource
  } = props
  const isOptional = inputType.type === 'optional'
  const innerInputType = isOptional ? inputType.optional_type.type : inputType.type
  const editorType = innerInputType === 'struct' ? 'object_builder' : 'literal'

  return h(Select, {
    isDisabled: false,
    'aria-label': 'Select an Option',
    isClearable: false,
    value: _.get(source.type, inputSourceLabels) || null,
    onChange: ({ value }) => {
      const newType = _.get(value, inputSourceTypes)
      let newSource
      if (newType === 'none') {
        newSource = {
          type: newType
        }
      } else {
        const param = newType === 'record_lookup' ? 'record_attribute' : 'parameter_value'
        newSource = {
          type: newType,
          [param]: ''
        }
      }
      updateSource(newSource)
    },
    placeholder: 'Select Source',
    options: [
      inputSourceLabels[editorType],
      inputSourceLabels['record_lookup'],
      ...isOptional ? [inputSourceLabels.none] : []
    ],
    // ** https://stackoverflow.com/questions/55830799/how-to-change-zindex-in-react-select-drowpdown
    styles: { container: old => ({ ...old, display: 'inline-block', width: '100%' }), menuPortal: base => ({ ...base, zIndex: 9999 }) },
    menuPortalTarget: document.body,
    menuPlacement: 'top'
  })
}

export const StructBuilderLink = props => {
  const {
    onClick, structBuilderVisible
  } = props
  return h(Link, {
    display: 'block',
    width: '100%',
    onClick
  },
  structBuilderVisible ? 'Hide Struct' : 'View Struct'
  )
}
