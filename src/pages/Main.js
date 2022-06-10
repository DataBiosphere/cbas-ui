import _ from 'lodash/fp'
import { useState } from 'react'
import { h } from 'react-hyperscript-helpers'
import { HelloWorld } from 'src/components/HelloWorld'
import { Ajax } from 'src/libs/ajax'
import { useCancellation, useOnMount } from 'src/libs/react-utils'


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

  return h(HelloWorld, { cbasStatus })
}

export default Main
