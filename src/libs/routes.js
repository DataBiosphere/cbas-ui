import { flatten, map } from 'lodash/fp'
import { compile, pathToRegexp } from 'path-to-regexp'
import { routeHandlersStore } from 'src/libs/state'
import * as RunDetails from 'src/pages/RunDetails.js'
import * as SubmissionConfig from 'src/pages/SubmissionConfig'
import * as SubmissionDetails from 'src/pages/SubmissionDetails'
import * as SubmissionHistory from 'src/pages/SubmissionHistory'
import * as SubmitWorkflow from 'src/pages/SubmitWorkflow'


const routes = flatten([
  SubmissionDetails.navPaths,
  SubmissionHistory.navPaths,
  SubmissionConfig.navPaths,
  SubmitWorkflow.navPaths,
  RunDetails.navPaths
])

const handlers = map(({ path, encode = encodeURIComponent, ...data }) => {
  const keys = [] // mutated by pathToRegexp
  const regex = pathToRegexp(path, keys)
  return {
    regex,
    keys: map('name', keys),
    makePath: compile(path, { encode }),
    ...data
  }
}, routes)

// NOTE: This is treated as stateful in order to support hot loading.
// Updates will re-execute this file, which will reset the routes.
routeHandlersStore.set(handlers)
