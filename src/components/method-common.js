import { Ajax } from 'src/libs/ajax'
import * as Nav from 'src/libs/nav'
import { notify } from 'src/libs/notifications'
import * as Utils from 'src/libs/utils'


const MethodSource = Object.freeze({
  GitHub: 'GitHub',
  Dockstore: 'Dockstore'
})

export const submitMethod = async (signal, onDismiss, method) => {
  try {
    const methodPayload = {
      method_name: method.method_name,
      method_description: method.method_description,
      method_source: method.method_source,
      method_version: method.method_version,
      method_url: method.method_url
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

export const convertToRawUrl = (methodPath, methodVersion, methodSource) => {
  return Utils.cond(
    // 3 Covid-19 workflows have 'Github' as source hence we check for that here to maintain backwards compatibility
    [methodSource.toLowerCase() === MethodSource.GitHub.toLowerCase(), () => {
      // mapping of searchValues (key) and their replaceValue (value)
      const mapObj = {
        github: 'raw.githubusercontent',
        'blob/': ''
      }
      return methodPath.replace(/\b(?:github|blob\/)\b/gi, matched => mapObj[matched])
    }],
    [methodSource.toLowerCase() === MethodSource.Dockstore.toLowerCase(), async () => await Ajax().Dockstore.getWorkflowSourceUrl(methodPath, methodVersion)],
    () => {
      throw new Error(`Unknown method source '${methodSource}'. Currently supported method sources are [${MethodSource.GitHub}, ${MethodSource.Dockstore}].`)
    }
  )
}
