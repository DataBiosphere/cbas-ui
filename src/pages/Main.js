import 'src/libs/routes'

import { h } from 'react-hyperscript-helpers'
import { LocationProvider, Router } from 'src/libs/nav'


const Main = () => {
  return h(LocationProvider, [
    h(Router)
  ])
}

export default Main
