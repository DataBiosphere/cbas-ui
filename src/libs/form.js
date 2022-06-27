import { label } from 'react-hyperscript-helpers'
import * as Style from 'src/libs/style'


const styles = {
  formLabel: {
    ...Style.elements.sectionHeader,
    display: 'block',
    margin: '1rem 0 0.25rem'
  },
  formHint: {
    fontSize: 'smaller',
    marginTop: '0.25rem'
  }
}

export const FormLabel = ({ style = {}, required = false, children, ...props }) => {
  return label({ ...props, style: { ...styles.formLabel, ...style } }, [children, required && ' *'])
}
