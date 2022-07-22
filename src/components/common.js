import _ from 'lodash/fp'
import { useState } from 'react'
import { a, div, h, h3, img } from 'react-hyperscript-helpers'
import { containsUnlabelledIcon, icon } from 'src/components/icons'
import Interactive from 'src/components/Interactive'
import TooltipTrigger from 'src/components/TooltipTrigger'
import cromwellLogoWhite from 'src/images/cromwell-logo-white.svg'
import headerLeftHexes from 'src/images/header-left-hexes.svg'
import headerRightHexes from 'src/images/header-right-hexes.svg'
import colors, { terraSpecial } from 'src/libs/colors'
import { topBarLogo } from 'src/libs/logos'
import { forwardRefWithName, useLabelAssert } from 'src/libs/react-utils'
import * as Style from 'src/libs/style'
import * as Utils from 'src/libs/utils'


const styles = {
  button: {
    display: 'inline-flex', justifyContent: 'space-around', alignItems: 'center', height: '2.25rem',
    fontWeight: 500, fontSize: 14, textTransform: 'uppercase', whiteSpace: 'nowrap',
    userSelect: 'none'
  },
  tabBar: {
    container: {
      display: 'flex', alignItems: 'center',
      fontWeight: 400, textTransform: 'uppercase',
      height: '2.25rem',
      borderBottom: `1px solid ${terraSpecial()}`, flex: ''
    },
    tab: {
      flex: 'none', padding: '0 1em', height: '100%',
      alignSelf: 'stretch', display: 'flex', justifyContent: 'center', alignItems: 'center',
      borderBottomWidth: 8, borderBottomStyle: 'solid', borderBottomColor: 'transparent'
    },
    active: {
      borderBottomColor: terraSpecial(),
      fontWeight: 600
    }
  },
  topBar: {
    flex: 'none', height: Style.topBarHeight,
    display: 'flex', alignItems: 'center',
    borderBottom: `2px solid ${colors.primary(0.55)}`,
    zIndex: 2,
    boxShadow: '3px 0 13px 0 rgba(0,0,0,0.3)'
  },
  image: {
    verticalAlign: 'middle',
    height: 30
  },
  pageTitle: {
    color: 'white'
  }
}

export const Clickable = forwardRefWithName('Clickable', ({ href, as = (!!href ? 'a' : 'div'), disabled, tooltip, tooltipSide, tooltipDelay, useTooltipAsLabel, onClick, children, ...props }, ref) => {
  const child = h(Interactive, {
    'aria-disabled': !!disabled,
    as, disabled, ref,
    onClick: (...args) => onClick && !disabled && onClick(...args),
    href: !disabled ? href : undefined,
    tabIndex: disabled ? '-1' : '0',
    ...props
  }, [children])

  // To support accessibility, every link must have a label or contain text or a labeled child.
  // If an unlabeled link contains just a single unlabeled icon, then we should use the tooltip as the label,
  // rather than as the description as we otherwise would.
  //
  // If the auto-detection can't make the proper determination, for example, because the icon is wrapped in other elements,
  // you can explicitly pass in a boolean as `useTooltipAsLabel` to force the correct behavior.
  //
  // Note that TooltipTrigger does this same check with its own children, but since we'll be passing it an
  // Interactive element, we need to do the check here instead.
  const useAsLabel = _.isNil(useTooltipAsLabel) ? containsUnlabelledIcon({ children, ...props }) : useTooltipAsLabel

  // If we determined that we need to use the tooltip as a label, assert that we have a tooltip.
  // Do the check here and pass empty properties, to bypass the check logic in useLabelAssert() which doesn't take into account the icon's properties.
  if (useAsLabel && !tooltip) {
    useLabelAssert('Clickable', { allowTooltip: true, allowContent: true })
  }

  if (tooltip) {
    return h(TooltipTrigger, { content: tooltip, side: tooltipSide, delay: tooltipDelay, useTooltipAsLabel: useAsLabel }, [child])
  } else {
    return child
  }
})

export const Link = forwardRefWithName('Link', ({ disabled, variant, children, baseColor = colors.accent, ...props }, ref) => {
  return h(Clickable, _.merge({
    ref,
    style: { // 0.72 is the min to meet ANDI's contrast requirement
      color: disabled ? colors.dark(0.72) : baseColor(variant === 'light' ? 0.3 : 1),
      cursor: disabled ? 'not-allowed' : 'pointer',
      fontWeight: 500, display: 'inline'
    },
    hover: disabled ? undefined : { color: baseColor(variant === 'light' ? 0.1 : 0.8) },
    disabled
  }, props), [children])
})

export const makeInlineDockLink = (href, title, size) => {
  return h(Link, {
    href,
    ...Utils.newTabLinkProps,
    style: { fontSize: size }
  }, [
    title,
    icon('pop-out', { size, style: { marginLeft: '0.15rem' } })
  ])
}

export const makeDocLink = (href, title, size) => {
  return div({
    style: { marginBottom: '1rem', fontSize: size, width: 600 }
  }, [makeInlineDockLink(href, title, size)])
}

export const IdContainer = ({ children }) => {
  const [id] = useState(() => _.uniqueId('element-'))
  return children(id)
}

export const ButtonPrimary = ({ disabled, danger = false, children, ...props }) => {
  return h(Clickable, _.merge({
    disabled,
    style: {
      ...styles.button,
      border: `1px solid ${disabled ? colors.dark(0.4) : danger ? colors.danger(1.2) : colors.accent(1.2)}`,
      borderRadius: 5, color: 'white', padding: '0.875rem',
      backgroundColor: disabled ? colors.dark(0.25) : danger ? colors.danger() : colors.accent(),
      cursor: disabled ? 'not-allowed' : 'pointer'
    },
    hover: disabled ? undefined : { backgroundColor: danger ? colors.danger(0.85) : colors.accent(0.85) }
  }, props), [children])
}

export const ButtonSecondary = ({ disabled, children, ...props }) => {
  return h(Clickable, _.merge({
    disabled,
    style: {
      ...styles.button,
      color: disabled ? colors.dark(0.7) : colors.accent(),
      cursor: disabled ? 'not-allowed' : 'pointer'
    },
    hover: disabled ? undefined : { color: colors.accent(0.8) }
  }, props), [children])
}

export const ButtonOutline = ({ disabled, children, ...props }) => {
  return h(ButtonPrimary, _.merge({
    disabled,
    style: {
      border: `1px solid ${disabled ? colors.dark(0.4) : colors.accent()}`,
      color: colors.accent(),
      backgroundColor: disabled ? colors.dark(0.25) : 'white'
    },
    hover: disabled ? undefined : { backgroundColor: colors.accent(0.1) }
  }, props), [children])
}

export const headerBar = () => {
  return div({
    role: 'banner',
    style: { flex: 'none', display: 'flex', flexFlow: 'column nowrap' }
  }, [
    div({
      style: {
        ...styles.topBar,
        backgroundColor: colors.primary(1.47)
      }
    }, [
      div({
        style: {
          background: `0px url(${headerLeftHexes}) no-repeat, right url(${headerRightHexes}) no-repeat`,
          flex: '1 1 auto', display: 'flex', alignSelf: 'stretch', width: '100%', alignItems: 'center'
        }
      }, [
        a({
          style: { ...styles.pageTitle, display: 'flex', alignItems: 'center' },
          href: '#'
        }, [
          topBarLogo(),
          div({ style: { display: 'flex', alignItems: 'center', marginLeft: '1rem' } }, [
            img({ src: cromwellLogoWhite, alt: '', style: styles.image }),
            h3({
              style: { color: 'white', fontWeight: 600, padding: '0px', marginLeft: '0.5rem' }
            }, ['SUBMIT WORKFLOWS WITH CROMWELL'])
          ])
        ])
      ])
    ])
  ])
}
