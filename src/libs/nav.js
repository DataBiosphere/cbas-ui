import { createHashHistory as createHistory } from 'history'
import _ from 'lodash/fp'
import * as qs from 'qs'
import { createContext, useContext, useState } from 'react'
import { div, h } from 'react-hyperscript-helpers'
import { useOnMount, useStore } from 'src/libs/react-utils'
import { routeHandlersStore } from 'src/libs/state'
import * as Utils from 'src/libs/utils'


export const blockNav = Utils.atom(() => Promise.resolve())

export const history = createHistory({
  hashType: 'noslash',
  getUserConfirmation: (_, cb) => blockNav.get()().then(() => cb(true))
})

history.block('')

/**
 * @param k
 * @param params
 * @param [options]
 * @returns {string}
 */
export const getPath = (name, params, options) => {
  const handler = _.find({ name }, routeHandlersStore.get())
  console.assert(handler,
    `No handler found for key ${name}. Valid path keys are: ${_.map('name', routeHandlersStore.get())}`)
  return handler.makePath(params, options)
}

/**
 * @param args
 * @returns {string}
 */
export const getLink = (...args) => `#${getPath(...args).slice(1)}` // slice off leading slash

/**
 * @param args
 */
export const goToPath = (...args) => {
  history.push({ pathname: getPath(...args) })
}

const parseRoute = (handlers, { pathname, search }) => {
  const handler = _.find(({ regex }) => regex.test(pathname), handlers)
  console.assert(handler, 'No handler found for path')

  return handler && {
    ...handler,
    params: _.zipObject(handler.keys, _.tail(handler.regex.exec(pathname))),
    query: qs.parse(search, { ignoreQueryPrefix: true, plainObjects: true })
  }
}

const locationContext = createContext()

export const LocationProvider = ({ children }) => {
  const [location, setLocation] = useState(history.location)
  useOnMount(() => {
    return history.listen(v => setLocation(v))
  })
  return h(locationContext.Provider, { value: location }, [children])
}

export const getCurrentRoute = () => {
  return parseRoute(routeHandlersStore.get(), history.location)
}

export const useRoute = () => {
  const location = useContext(locationContext)
  const handlers = useStore(routeHandlersStore)
  return parseRoute(handlers, location)
}

export const Router = () => {
  const { component, params, query } = useRoute()
  return div({ style: { display: 'flex', flexDirection: 'column', flex: '1 0 auto', position: 'relative' } }, [
    h(component, { key: history.location.pathname, ...params, queryParams: query })
  ])
}
