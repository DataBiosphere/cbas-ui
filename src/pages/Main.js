import 'src/libs/routes'

import { h } from 'react-hyperscript-helpers'
import ReactNotification from 'react-notifications-component'
import { LocationProvider, Router } from 'src/libs/nav'


const Main = () => {
  return h(LocationProvider, [
    h(Router)
  ])
}

export default Main
