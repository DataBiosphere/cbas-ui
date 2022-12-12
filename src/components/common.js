import * as clipboard from 'clipboard-polyfill/text'
import { find, flow, isNil, isObject, map, merge, uniqueId } from 'lodash/fp'
import { useState } from 'react'
import FocusLock from 'react-focus-lock'
import { a, div, h, h3 } from 'react-hyperscript-helpers'
import RSelect, { components as RSelectComponents } from 'react-select'
import { centeredSpinner, containsUnlabelledIcon, icon } from 'src/components/icons'
import Interactive from 'src/components/Interactive'
import TooltipTrigger from 'src/components/TooltipTrigger'
import headerLeftHexes from 'src/images/header-left-hexes.svg'
import headerRightHexes from 'src/images/header-right-hexes.svg'
import colors, { terraSpecial } from 'src/libs/colors'
import { withErrorReporting } from 'src/libs/error'
import { topBarLogo } from 'src/libs/logos'
import { forwardRefWithName, useLabelAssert, useUniqueId } from 'src/libs/react-utils'
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
  const useAsLabel = isNil(useTooltipAsLabel) ? containsUnlabelledIcon({ children, ...props }) : useTooltipAsLabel

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
  return h(Clickable, merge({
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
  const [id] = useState(() => uniqueId('element-'))
  return children(id)
}

export const ButtonPrimary = ({ disabled, danger = false, children, ...props }) => {
  return h(Clickable, merge({
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
  return h(Clickable, merge({
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
  return h(ButtonPrimary, merge({
    disabled,
    style: {
      border: `1px solid ${disabled ? colors.dark(0.4) : colors.accent()}`,
      color: colors.accent(),
      backgroundColor: disabled ? colors.dark(0.25) : 'white'
    },
    hover: disabled ? undefined : { backgroundColor: colors.accent(0.1) }
  }, props), [children])
}

export const Checkbox = ({ checked, onChange, disabled, ...props }) => {
  useLabelAssert('Checkbox', { ...props, allowId: true })
  return h(Interactive, merge({
    as: 'span',
    className: 'fa-layers fa-fw',
    role: 'checkbox',
    'aria-checked': checked,
    onClick: () => !disabled && onChange?.(!checked),
    style: { verticalAlign: 'middle' },
    disabled
  }, props), [
    icon('squareSolid', { style: { color: Utils.cond([disabled, () => colors.light(1.2)], [checked, () => colors.accent()], () => 'white') } }), // bg
    !disabled && icon('squareLight', { style: { color: checked ? colors.accent(1.2) : colors.dark(0.75) } }), // border
    checked && icon('check', { size: 8, style: { color: disabled ? colors.dark(0.75) : 'white' } }) // check
  ])
}

export const Navbar = title => {
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
            h3({
              style: { color: 'white', fontWeight: 600, padding: '0px', marginLeft: '0.5rem' }
            }, [title])
          ])
        ])
      ])
    ])
  ])
}

export const ClipboardButton = ({ text, onClick, children, ...props }) => {
  const [copied, setCopied] = useState(false)
  return h(Link, {
    tooltip: copied ? 'Copied to clipboard' : 'Copy to clipboard',
    ...props,
    onClick: flow(
      withErrorReporting('Error copying to clipboard'),
      Utils.withBusyState(setCopied)
    )(async e => {
      onClick?.(e)
      await clipboard.writeText(text)
      await Utils.delay(1500)
    })
  }, [children, icon(copied ? 'check' : 'copy-to-clipboard', !!children && { style: { marginLeft: '0.5rem' } })])
}

const BaseSelect = ({ value, newOptions, id, findValue, ...props }) => {
  const newValue = props.isMulti ? map(findValue, value) : findValue(value)
  const myId = useUniqueId()
  const inputId = id || myId

  return h(RSelect, merge({
    inputId,
    ...commonSelectProps,
    getOptionLabel: ({ value, label }) => label || value.toString(),
    value: newValue || null, // need null instead of undefined to clear the select
    options: newOptions,
    formatGroupLabel
  }, props))
}

/**
 * @param {Object} props - see {@link https://react-select.com/props#select-props}
 * @param props.value - a member of options
 * @param {Array} props.options - can be of any type; if objects, they should each contain a value and label, unless defining getOptionLabel
 * @param props.id - The HTML ID to give the form element
 */
export const Select = ({ value, options, ...props }) => {
  useLabelAssert('Select', { ...props, allowId: true })

  const newOptions = options && !isObject(options[0]) ? map(value => ({ value }), options) : options
  const findValue = target => find({ value: target }, newOptions)

  return h(BaseSelect, { value, newOptions, findValue, ...props })
}

const commonSelectProps = {
  theme: base => merge(base, {
    colors: {
      primary: colors.accent(),
      neutral20: colors.dark(0.55),
      neutral30: colors.dark(0.55)
    },
    spacing: { controlHeight: 36 }
  }),
  styles: {
    control: (base, { isDisabled }) => merge(base, {
      backgroundColor: isDisabled ? colors.dark(0.25) : 'white',
      boxShadow: 'none'
    }),
    singleValue: base => ({ ...base, color: colors.dark() }),
    option: (base, { isSelected, isFocused, isDisabled }) => merge(base, {
      fontWeight: isSelected ? 600 : undefined,
      backgroundColor: isFocused ? colors.dark(0.15) : 'white',
      color: isDisabled ? undefined : colors.dark(),
      ':active': { backgroundColor: colors.accent(isSelected ? 0.55 : 0.4) }
    }),
    clearIndicator: base => ({ ...base, paddingRight: 0 }),
    indicatorSeparator: () => ({ display: 'none' }),
    dropdownIndicator: (base, { selectProps: { isClearable } }) => merge(base, { paddingLeft: isClearable ? 0 : undefined }),
    multiValueLabel: base => ({ ...base, maxWidth: '100%' }),
    multiValueRemove: base => merge(base, { ':hover': { backgroundColor: 'unset' } }),
    placeholder: base => ({ ...base, color: colors.dark(0.8) })
  },
  components: {
    Option: ({ children, selectProps, ...props }) => h(RSelectComponents.Option, merge(props, {
      selectProps,
      innerProps: {
        role: 'option',
        'aria-selected': props.isSelected
      }
    }), [
      div({ style: { display: 'flex', alignItems: 'center', minHeight: 25 } }, [
        div({ style: { flex: 1, minWidth: 0, overflowWrap: 'break-word' } }, [children]),
        props.isSelected && icon('check', { size: 14, style: { flex: 'none', marginLeft: '0.5rem', color: colors.dark(0.5) } })
      ])
    ]),
    Menu: ({ children, selectProps, ...props }) => h(RSelectComponents.Menu, merge(props, {
      selectProps,
      innerProps: {
        role: 'listbox',
        'aria-label': 'Options',
        'aria-multiselectable': selectProps.isMulti
      }
    }), [children])
  }
}

const formatGroupLabel = group => (
  div({
    style: {
      color: colors.dark(),
      fontSize: 14,
      height: 30,
      fontWeight: 600,
      borderBottom: `1px solid ${colors.dark(0.25)}`
    }
  }, [group.label]))

const makeBaseSpinner = ({ outerStyles = {}, innerStyles = {} }) => div(
  {
    style: {
      position: 'absolute',
      display: 'flex', alignItems: 'center',
      top: 0, right: 0, bottom: 0, left: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.1)',
      zIndex: 9999, // make sure it's on top of any third party components with z-indicies
      ...outerStyles
    }
  }, [
    centeredSpinner({
      size: 64,
      style: { backgroundColor: 'rgba(255, 255, 255, 0.85)', padding: '1rem', borderRadius: '0.5rem', ...innerStyles }
    })
  ]
)

export const FocusTrapper = ({ children, onBreakout, ...props }) => {
  return h(FocusLock, {
    returnFocus: true,
    lockProps: merge({
      tabIndex: 0,
      style: { outline: 'none' },
      onKeyDown: e => {
        if (e.key === 'Escape') {
          onBreakout()
          e.stopPropagation()
        }
      }
    }, props)
  }, [children])
}


export const spinnerOverlay = makeBaseSpinner({})
