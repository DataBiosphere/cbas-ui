import { useState } from 'react'
import { h } from 'react-hyperscript-helpers'
import { Ajax } from 'src/libs/ajax'
import { useCancellation, useOnMount } from 'src/libs/react-utils'
import { WorkflowInput } from 'src/pages/WorkflowInput'


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

  return h(WorkflowInput, { cbasStatus })
}

export default Main
