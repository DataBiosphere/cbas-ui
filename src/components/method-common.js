import _ from 'lodash/fp'
import { div, h } from 'react-hyperscript-helpers'
import { Link, Select } from 'src/components/common'
import { icon } from 'src/components/icons'
import { TextInput } from 'src/components/input'
import TooltipTrigger from 'src/components/TooltipTrigger'
import { Ajax } from 'src/libs/ajax'
import colors from 'src/libs/colors'
import { getConfig } from 'src/libs/config'
import * as Nav from 'src/libs/nav'
import { notify } from 'src/libs/notifications'
import { differenceFromDatesInSeconds, differenceFromNowInSeconds, withBusyState } from 'src/libs/utils'
import * as Utils from 'src/libs/utils'

export const submitMethod = (setLoading, onDismiss, method) => { return withBusyState(setLoading, async (signal) => {
  try {
    console.log("I'M BEING CALLED")
    const rawGithubUrl = reconstructToRawUrl(method.method_url, onDismiss)

    const methodPayload = {
      method_name: method.method_name,
      method_description: method.method_description,
      method_source: method.method_source,
      method_version: method.method_version,
      method_url: rawGithubUrl
    }

    const methodObject = await Ajax(signal).Cbas.methods.post(methodPayload)
    onDismiss()
    Nav.goToPath('submission-config', {
      methodId: methodObject.method_id
    })
  } catch (error) {
    notify('error', 'Error creating new method', { detail: await (error instanceof Response ? error.text() : error) })
    onDismiss()
  }
})}

export const reconstructToRawUrl = (url, onDismiss) => {
  // mapping of searchValues (key) and their replaceValue (value)
  const mapObj = {
    github: 'raw.githubusercontent',
    'blob/': ''
  }
  try {
    url = url.replace(/\b(?:github|blob\/)\b/gi, matched => mapObj[matched])
  } catch (error) {
    notify('error', 'Error creating new method', { detail: (error instanceof Response ? error.text() : error) })
    onDismiss()
  }

  return url
}
