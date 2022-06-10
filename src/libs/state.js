import { staticStorageSlot } from 'src/libs/browser-storage'
import * as Utils from 'src/libs/utils'


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
export const configOverridesStore = staticStorageSlot(sessionStorage, 'config-overrides')
window.configOverridesStore = configOverridesStore
