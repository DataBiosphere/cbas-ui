import 'src/libs/routes'

import { h } from 'react-hyperscript-helpers'
import { LocationProvider, PathHashInserter, Router } from 'src/libs/nav'
// import { Ajax } from 'src/libs/ajax'
// import { useCancellation, useOnMount } from 'src/libs/react-utils'
// import { WorkflowSource } from 'src/pages/WorkflowSource'
// import { useState } from 'react'


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
  //
  // return h(WorkflowSource, { cbasStatus })

  return h(LocationProvider, [
    h(PathHashInserter),
    h(Router)
  ])
}

export default Main
