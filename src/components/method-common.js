import { Ajax } from 'src/libs/ajax'
import * as Nav from 'src/libs/nav'
import { notify } from 'src/libs/notifications'


export const submitMethod = async (signal, onDismiss, method) => {
  try {
    console.log('SUBMIT ME')
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
}

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
