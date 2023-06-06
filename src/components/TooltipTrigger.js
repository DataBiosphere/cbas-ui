import _ from 'lodash/fp'
import { Children, cloneElement, Fragment, useRef, useState } from 'react'
import { div, h, path, svg } from 'react-hyperscript-helpers'
import { containsUnlabelledIcon } from 'src/components/icons'
import { computePopupPosition, PopupPortal, useDynamicPosition } from 'src/components/popup-utils'
import colors from 'src/libs/colors'
import { useOnMount, useUniqueId } from 'src/libs/react-utils'
import * as Style from 'src/libs/style'
import * as Utils from 'src/libs/utils'


const baseToolTip = {
  position: 'fixed', top: 0, left: 0,
  maxWidth: 400, display: 'flex'
}

const styles = {
  tooltip: {
    background: 'black', color: 'white',
    padding: '0.5rem', borderRadius: 4,
    whiteSpace: 'break-spaces'
  },
  notch: {
    fill: 'black',
    width: 16, height: 16,
    flexShrink: 0,
    margin: -4
  },
  lightBox: {
    background: 'white',
    border: `1px solid ${colors.dark(0.55)}`,
    boxShadow: Style.standardShadow,
    ...baseToolTip
  }
}

const Tooltip = ({ side = 'bottom', type, target: targetId, children, id, delay, setOverTooltip }) => {
  const [shouldRender, setShouldRender] = useState(!delay)
  const renderTimeout = useRef()
  const elementRef = useRef()
  const [target, element, viewport] = useDynamicPosition([{ id: targetId }, { ref: elementRef }, { viewport: true }])

  useOnMount(() => {
    if (!!delay) {
      renderTimeout.current = setTimeout(() => setShouldRender(true), delay)
      return () => clearTimeout(renderTimeout.current)
    }
  })

  const gap = type === 'light' ? 5 : 0
  const { side: finalSide, position } = computePopupPosition({ side, target, element, viewport, gap })

  const getFlexOrder = () => {
    return Utils.switchCase(finalSide,
      ['top', () => ({ flexDirection: 'column' })],
      ['bottom', () => ({ flexDirection: 'column-reverse' })],
      ['left', () => ({ flexDirection: 'row' })],
      ['right', () => ({ flexDirection: 'row-reverse' })]
    )
  }

  const getNotchRotation = () => {
    const left = _.clamp(12, element.width - 12,
      (target.left + target.right) / 2 - position.left
    )
    const top = _.clamp(12, element.height - 12,
      (target.top + target.bottom) / 2 - position.top
    )
    return Utils.switchCase(finalSide,
      ['top', () => ({ marginLeft: left - 8, transform: 'rotate(180deg)', marginBottom: 0, marginTop: -4 })],
      ['bottom', () => ({ marginLeft: left - 8, marginTop: 0, marginBottom: -4 })],
      ['left', () => ({ marginTop: top - 8, transform: 'rotate(90deg)', marginRight: 0, marginLeft: -4 })],
      ['right', () => ({ marginTop: top - 8, transform: 'rotate(270deg)', marginLeft: 0, marginRight: -4 })]
    )
  }

  return h(PopupPortal, [
    div({
      id, role: 'tooltip',
      ref: elementRef,
      style: {
        display: shouldRender ? undefined : 'none',
        transform: `translate(${position.left}px, ${position.top}px)`,
        visibility: !viewport.width ? 'hidden' : undefined,
        ...(type === 'light') ? styles.lightBox : baseToolTip,
        ...getFlexOrder()
      },
      onMouseEnter: () => setOverTooltip(true),
      onMouseLeave: () => setOverTooltip(false),
      onFocus: () => setOverTooltip(true),
      onBlur: () => setOverTooltip(false)
    }, [
      div({ style: { overflow: 'auto', maxHeight: '100px', ...styles.tooltip } },
        children),
      type !== 'light' && svg({ viewBox: '0 0 2 1', style: { ...styles.notch, ...getNotchRotation() } }, [
        path({ d: 'M0,1l1,-1l1,1Z' })
      ])
    ])
  ])
}

const TooltipTrigger = ({ children, content, useTooltipAsLabel, ...props }) => {
  const [overTooltip, setOverTooltip] = useState(false)
  const [overTrigger, setOverTrigger] = useState(false)
  const id = useUniqueId()
  const tooltipId = useUniqueId()
  const descriptionId = useUniqueId()

  const child = Children.only(children)
  const childId = child.props.id || id

  // To support accessibility, every link must have a label or contain text or a labeled child.
  // If an unlabeled link contains just a single unlabeled icon, then we should use the tooltip as the label,
  // rather than as the description as we otherwise would.
  //
  // If the auto-detection can't make the proper determination, for example, because the icon is wrapped in other elements,
  // you can explicitly pass in a boolean as `useTooltipAsLabel` to force the correct behavior.
  const useAsLabel = _.isNil(useTooltipAsLabel) ? containsUnlabelledIcon({ children, ...props }) : useTooltipAsLabel

  return h(Fragment, [
    cloneElement(child, {
      id: childId,
      'aria-labelledby': !!content && useAsLabel ? descriptionId : undefined,
      'aria-describedby': !!content && !useAsLabel ? descriptionId : undefined,
      onMouseEnter: (...args) => {
        child.props.onMouseEnter && child.props.onMouseEnter(...args)
        setOverTrigger(true)
      },
      onMouseLeave: (...args) => {
        child.props.onMouseLeave && child.props.onMouseLeave(...args)
        setOverTrigger(false)
      },
      onFocus: (...args) => {
        child.props.onFocus && child.props.onFocus(...args)
        setOverTrigger(true)
      },
      onBlur: (...args) => {
        child.props.onBlur && child.props.onBlur(...args)
        setOverTrigger(false)
      }
    }),
    (overTooltip || overTrigger) && !!content && h(Tooltip, { target: childId, id: tooltipId, setOverTooltip, ...props }, [content]),
    !!content && div({ id: descriptionId, style: { display: 'none' } }, [content])
  ])
}

export default TooltipTrigger
