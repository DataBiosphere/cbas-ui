import _ from 'lodash/fp'
import { Fragment, useState } from 'react'
import { div, h, h3, span } from 'react-hyperscript-helpers'
import { ButtonPrimary, IdContainer } from 'src/components/common'
import { icon } from 'src/components/icons'
import { TextInput, ValidatedInput } from 'src/components/input'
import { submitMethod } from 'src/components/method-common'
import { TooltipCell } from 'src/components/table'
import colors from 'src/libs/colors'
import { FormLabel } from 'src/libs/form'
import * as Utils from 'src/libs/utils'
import { withBusyState } from 'src/libs/utils'
import validate from 'validate.js'

const constraints = {
  methodUrl: {
    presence: { allowEmpty: false },
    length: { maximum: 254 },
    url: true
  },
  methodVersionName: {
    presence: { allowEmpty: false }
  },
  methodName: {
    presence: { allowEmpty: false }
  }
}

const ImportGithub = ({ setLoading, signal, onDismiss }) => {
  const [methodName, setMethodName] = useState('')
  const [methodVersionName, setMethodVersionName] = useState('')
  const [methodUrl, setMethodUrl] = useState('')
  const [urlModified, setUrlModified] = useState(false)
  const [methodNameModified, setMethodNameModified] = useState(false)
  const [versionNameModified, setVersionNameModified] = useState(false)

  const errors = validate({ methodName, methodVersionName, methodUrl }, constraints, {
    prettify: v => ({ methodName: 'Method name', methodVersionName: 'Method version name', methodUrl: "Workflow url" }[v] || validate.prettify(v))
  })

  return div({ style: { marginLeft: '4rem', width: '50%' }}, [
    h(FormLabel, { htmlFor: 'methodurl', required: true }, ['Workflow Link']),
    h(ValidatedInput, {
      inputProps: {
        id: 'methodurl',
        placeholder: 'Paste Github link',
        value: methodUrl,
        onChange: u => {
          setMethodUrl(u)
          setUrlModified(true)
        }
      },
      error: Utils.summarizeErrors(urlModified && errors?.methodUrl),
    }),
    h(FormLabel, { htmlFor: 'workflowName', required: true }, ['Workflow Name']),
    h(ValidatedInput, {
      inputProps: {
        id: 'workflowName',
        placeholder: 'Workflow Name',
        value: methodName,
        onChange: n => {
          setMethodName(n)
          setMethodNameModified(true)
        }
      },
      error: Utils.summarizeErrors(methodNameModified && errors?.methodName)
    }),
    h(FormLabel, { htmlFor: 'workflowVersion', required: true }, ['Workflow Version']),
    h(ValidatedInput, {
      inputProps: {
        id: 'workflowVersion',
        placeholder: 'Workflow Version',
        value: methodVersionName,
        onChange: v => {
          setMethodVersionName(v)
          setVersionNameModified(true)
        }
      },
      error: Utils.summarizeErrors(versionNameModified && errors?.methodVersionName)
    }),
    div({}, [h(ButtonPrimary, {
      style: { marginTop: '2rem' },
      'aria-label': 'Add to Workspace button',
      tooltip: Utils.summarizeErrors(errors),
      disabled: errors,
      onClick: () => {
        console.log("ON CLICK")
        const method = {
          method_name: methodName,
          method_version: methodVersionName,
          method_url: methodUrl,
          method_source: 'GitHub'
        }
        withBusyState(setLoading, submitMethod(signal, onDismiss, method))
      }
    }, ['Add to Workspace'])])
  ])
}

export default ImportGithub
