import _ from 'lodash/fp'
import { compile, pathToRegexp } from 'path-to-regexp'
import { routeHandlersStore } from 'src/libs/state'
import * as SubmitWorkflow from 'src/pages/SubmitWorkflow'


const routes = _.flatten([
  SubmitWorkflow.navPaths
])

const handlers = _.map(({ path, encode = encodeURIComponent, ...data }) => {
  const keys = [] // mutated by pathToRegexp
  const regex = pathToRegexp(path, keys)
  return {
    regex,
    keys: _.map('name', keys),
    makePath: compile(path, { encode }),
    ...data
  }
}, routes)

// NOTE: This is treated as stateful in order to support hot loading.
// Updates will re-execute this file, which will reset the routes.
routeHandlersStore.set(handlers)
