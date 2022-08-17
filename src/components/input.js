import _ from 'lodash/fp'
import { h, input } from 'react-hyperscript-helpers'
import TextAreaAutosize from 'react-textarea-autosize'
import colors from 'src/libs/colors'
import { forwardRefWithName, useLabelAssert } from 'src/libs/react-utils'


const styles = {
  input: {
    height: '2.25rem',
    border: `1px solid ${colors.dark(0.55)}`, borderRadius: 4
  },
  suggestionsContainer: {
    position: 'fixed', top: 0, left: 0,
    maxHeight: 36 * 8 + 2, overflowY: 'auto',
    backgroundColor: 'white',
    border: `1px solid ${colors.light()}`,
    margin: '0.5rem 0',
    borderRadius: 4,
    boxShadow: '0 0 1px 0 rgba(0,0,0,0.12), 0 8px 8px 0 rgba(0,0,0,0.24)'
  },
  suggestion: isSelected => ({
    display: 'block', lineHeight: '2.25rem',
    paddingLeft: '1rem', paddingRight: '1rem',
    cursor: 'pointer',
    backgroundColor: isSelected ? colors.light(0.4) : undefined
  }),
  textarea: {
    width: '100%', resize: 'none',
    border: `1px solid ${colors.dark(0.55)}`, borderRadius: 4,
    fontSize: 14, fontWeight: 400,
    padding: '0.5rem 1rem',
    cursor: 'text'
  },
  validationError: {
    color: colors.danger(),
    fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
    marginLeft: '1rem', marginTop: '0.5rem'
  }
}

export const TextArea = forwardRefWithName('TextArea', ({ onChange, autosize = false, nativeOnChange = false, ...props }, ref) => {
  useLabelAssert('TextArea', { ...props, allowId: true })

  return h(autosize ? TextAreaAutosize : 'textarea', _.merge({
    ref,
    className: 'focus-style',
    style: styles.textarea,
    onChange: onChange ? (e => onChange(nativeOnChange ? e : e.target.value)) : undefined
  }, props))
})

export const TextInput = forwardRefWithName('TextInput', ({ onChange, nativeOnChange = false, ...props }, ref) => {
  useLabelAssert('TextInput', { ...props, allowId: true })

  return input({
    ..._.merge({
      className: 'focus-style',
      onChange: onChange ? e => onChange(nativeOnChange ? e : e.target.value) : undefined,
      style: {
        ...styles.input,
        width: '100%',
        paddingLeft: '1rem', paddingRight: '1rem',
        fontWeight: 400, fontSize: 14,
        backgroundColor: props.disabled ? colors.light() : undefined
      }
    }, props),
    // the ref does not get added to the props correctly when inside of _.merge
    ref
  })
})
