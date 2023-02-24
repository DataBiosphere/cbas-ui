import 'src/libs/routes'

import { h } from 'react-hyperscript-helpers'
import { ReactNotifications } from 'react-notifications-component'
import ConfigOverridesWarning from 'src/components/ConfigOverridesWarning'
import { LocationProvider, Router } from 'src/libs/nav'


const Main = () => {
  return h(LocationProvider, [
    h(ReactNotifications),
    h(Router),
    h(ConfigOverridesWarning)
  ])
}

export default Main
