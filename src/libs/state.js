import { getSessionStorage, staticStorageSlot } from 'src/libs/browser-storage'
import * as Utils from 'src/libs/utils'


export const authStore = Utils.atom({
  isSignedIn: undefined,
  anonymousId: undefined,
  registrationStatus: undefined,
  acceptedTos: undefined,
  user: {},
  profile: {},
  fenceStatus: {},
  cookiesAccepted: undefined,
  authContext: undefined,
  oidcConfig: {}
})

export const routeHandlersStore = Utils.atom([])

export const requesterPaysProjectStore = Utils.atom()

export const workspaceStore = Utils.atom()

/*
 * Modifies ajax responses for testing purposes.
 * Can be set to an array of objects of the form { fn, filter }.
 * The fn should be a fetch wrapper (oldFetch => newFetch) that modifies the request process. (See ajaxOverrideUtils)
 * If present, filter should be a RegExp that is matched against the url to target specific requests.
 */
export const ajaxOverridesStore = Utils.atom()
window.ajaxOverridesStore = ajaxOverridesStore

/*
 * Modifies config settings for testing purposes.
 * Can be set to an object which will be merged with the loaded config object.
 */
export const configOverridesStore = staticStorageSlot(getSessionStorage(), 'config-overrides')
window.configOverridesStore = configOverridesStore

export const notificationStore = Utils.atom([])
