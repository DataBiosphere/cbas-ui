import _ from 'lodash/fp'
import { Fragment, useState } from 'react'
import { div, h, h3 } from 'react-hyperscript-helpers'
import { ButtonPrimary } from 'src/components/common'
import { TextInput } from 'src/components/input'
import { submitMethod } from 'src/components/method-common'
import { withBusyState } from 'src/libs/utils'

// { tooltip: 'Link must start with https://github.com or https://raw.githubusercontent.com' },
const ImportGithub = ({ setLoading, signal, onDismiss }) => {
  const [methodName, setMethodName] = useState('')
  const [methodVersionName, setMethodVersionName] = useState('')
  const [methodUrl, setMethodUrl] = useState('')

  return div({ style: { marginLeft: '4rem' } }, [
    div({ style: { width: 500 /* make width 50% */ } }, [h3(['Workflow Link'])]),
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
      h3(['New Workflow Name / Version'])
    ]),
    div({}, [h(Fragment, [
      h(TextInput, {
        style: { width: 200 },
        placeholder: 'Workflow name',
        value: methodName,
        onChange: w => setMethodName(w),
        'aria-label': 'Workflow name input'
      }), ' / ',
      h(TextInput, {
        style: { width: 200 },
        placeholder: 'Version',
        value: methodVersionName,
        onChange: v => setMethodVersionName(v),
        'aria-label': 'Version name input'
      })
    ])]),
    div({}, [h(ButtonPrimary, {
      style: { marginTop: '2rem' },
      'aria-label': 'Add to Workspace button',
      disabled: _.isEmpty(methodName) || _.isEmpty(methodVersionName) || _.isEmpty(methodUrl),
      onClick: () => {
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
