import { useState } from 'react'
import { h } from 'react-hyperscript-helpers'
import { Ajax } from 'src/libs/ajax'
import { useCancellation, useOnMount } from 'src/libs/react-utils'
import { WorkflowSource } from 'src/pages/WorkflowSource'


const Main = () => {
  const [cbasStatus, setCbasStatus] = useState()
  const signal = useCancellation()

  useOnMount(() => {
    const loadCbasStatus = async () => {
      const cbasStatus = await Ajax(signal).Cbas.status()
      setCbasStatus(cbasStatus)
    }

    loadCbasStatus()
    return () => {
    }
  })

  return h(WorkflowSource, { cbasStatus })
}

export default Main
