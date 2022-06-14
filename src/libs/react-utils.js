import _ from 'lodash/fp'
import { forwardRef, memo, useEffect, useRef, useState } from 'react'
import { h } from 'react-hyperscript-helpers'
import { delay } from 'src/libs/utils'


/**
 * Performs the given effect, but only on component mount.
 * React's hooks eslint plugin flags [] because it's a common mistake. However, sometimes this is
 * exactly the right thing to do. This function makes the intention clear and avoids the lint error.
 */
export const useOnMount = fn => {
  useEffect(fn, []) // eslint-disable-line react-hooks/exhaustive-deps
}

export const usePrevious = value => {
  const ref = useRef()

  useEffect(() => {
    ref.current = value
  })

  return ref.current
}

/**
 * Given a value that changes over time, returns a getter function that reads the current value.
 * Useful for asynchronous processes that need to read the current value of e.g. props or state.
 */
export const useGetter = value => {
  const ref = useRef()
  ref.current = value
  return () => ref.current
}

/**
 * Calls the provided function to produce and return a value tied to this component instance.
 * The initializer function is only called once for each component instance, on first render.
 */
export const useInstance = fn => {
  const ref = useRef()
  if (!ref.current) {
    ref.current = fn()
  }
  return ref.current
}

export const useUniqueId = () => {
  return useInstance(() => _.uniqueId('unique-id-'))
}

export const useCancelable = () => {
  const [controller, setController] = useState(new window.AbortController())

  // Abort it automatically in the destructor
  useEffect(() => {
    return () => controller.abort()
  }, [controller])

  return {
    signal: controller.signal,
    abort: () => {
      controller.abort()
      setController(new window.AbortController())
    }
  }
}

export const useCancellation = () => {
  const controller = useRef()
  useOnMount(() => {
    const instance = controller.current
    return () => instance.abort()
  })
  if (!controller.current) {
    controller.current = new window.AbortController()
  }
  return controller.current.signal
}

export const withDisplayName = _.curry((name, WrappedComponent) => {
  WrappedComponent.displayName = name
  return WrappedComponent
})

export const forwardRefWithName = _.curry((name, WrappedComponent) => {
  return withDisplayName(name, forwardRef(WrappedComponent))
})

export const memoWithName = _.curry((name, WrappedComponent) => {
  return withDisplayName(name, memo(WrappedComponent))
})

export const withCancellationSignal = WrappedComponent => {
  return withDisplayName('withCancellationSignal', props => {
    const signal = useCancellation()
    return h(WrappedComponent, { ...props, signal })
  })
}

export const usePollingEffect = (effectFn, { ms, leading }) => {
  const signal = useCancellation()

  useOnMount(() => {
    const poll = async () => {
      leading && await effectFn()
      while (!signal.aborted) {
        await delay(ms)
        !signal.aborted && await effectFn()
      }
    }
    poll()
  })
}

export const useCurrentTime = (initialDelay = 250) => {
  const [currentTime, setCurrentTime] = useState(Date.now())
  const signal = useCancellation()
  const delayRef = useRef(initialDelay)
  useOnMount(() => {
    const poll = async () => {
      while (!signal.aborted) {
        await delay(delayRef.current)
        !signal.aborted && setCurrentTime(Date.now())
      }
    }
    poll()
  })
  return [currentTime, delay => { delayRef.current = delay }]
}

/**
 * Hook that returns the value of a given store. When the store changes, the component will re-render
 */
export const useStore = theStore => {
  const [value, setValue] = useState(theStore.get())
  useEffect(() => {
    return theStore.subscribe(v => setValue(v)).unsubscribe
  }, [theStore, setValue])
  return value
}

/**
 * Asserts that a component has an accessible label, and alerts the developer how to fix it if it doesn't.
 *
 * @param componentName The name of the component, which will be printed to the console if there's an alert.
 * @param [allowLabelledBy] If true (default), the component can have an aria-labelledby linked to another element. Set to false to only allow aria-label.
 * @param [allowId] If true, the component can have an id linked to a label using htmlFor. This is true for form elements.
 * @param [allowTooltip] If true, the component can have a tooltip which will be used if needed as the label.
 * @param [allowContent] If true, the component can used nested textual content as its label, as long as it's not a single unlabelled icon
 * @param [ariaLabel] Optional: The label provided to the component
 * @param [ariaLabelledBy] Optional: The ID of the label provided to the component
 * @param [id]: Optional: The ID of the component if allowId is true
 * @param [tooltip] Optional: The tooltip provided to the component if allowTooltip is true
 */
export const useLabelAssert = (componentName, {
  allowLabelledBy = true, allowId = false, allowTooltip = false, allowContent = false,
  'aria-label': ariaLabel, 'aria-labelledby': ariaLabelledBy, id, tooltip
}) => {
  const printed = useRef(false)

  if (!printed.current) {
    // Ensure that the properties contain a label
    if (!(ariaLabel ||
      (allowLabelledBy && ariaLabelledBy) ||
      (allowId && id) || (allowTooltip && tooltip)
    )) {
      printed.current = true

      console.warn(`For accessibility, ${componentName} needs a label. Resolve this by doing any of the following: ${allowContent ? `
  * add a child component with textual content or a label
  * if the child is an icon, add a label to it` : ''}${allowTooltip ? `
  * add a tooltip property to this component, which will also be used as the aria-label` : ''}
  * add an aria-label property to this component${allowLabelledBy ? `
  * add an aria-labelledby property referencing the id of another component containing the label` : ''}${allowId ? `
  * create a label component and point its htmlFor property to this component's id` : ''}`)
    }
  }
}
