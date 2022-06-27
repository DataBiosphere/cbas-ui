import 'src/libs/routes'

import { useState } from 'react'
import { h } from 'react-hyperscript-helpers'
import { Ajax } from 'src/libs/ajax'
import { LocationProvider, PathHashInserter, Router } from 'src/libs/nav'
import { useCancellation, useOnMount } from 'src/libs/react-utils'


const Main = () => {
  // const [cbasStatus, setCbasStatus] = useState()
  // const signal = useCancellation()
  //
  // useOnMount(() => {
  //   const loadCbasStatus = async () => {
  //     const cbasStatus = await Ajax(signal).Cbas.status()
  //     setCbasStatus(cbasStatus)
  //   }
  //
  //   loadCbasStatus()
  //   return () => {
  //   }
  // })

  return h(LocationProvider, [
    h(PathHashInserter),
    h(Router)
  ])
}

export default Main
