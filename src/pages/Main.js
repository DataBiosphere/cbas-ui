import 'src/libs/routes'

import { h } from 'react-hyperscript-helpers'
import { LocationProvider, PathHashInserter, Router } from 'src/libs/nav'


const Main = () => {
  return h(LocationProvider, [
    h(PathHashInserter),
    h(Router)
  ])
}

export default Main
