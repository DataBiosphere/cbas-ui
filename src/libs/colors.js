import Color from 'color'
import _ from 'lodash/fp'


const isTerra = () => true

const ALL_COLORS = ['primary', 'secondary', 'accent', 'success', 'warning', 'danger', 'light', 'dark', 'grey']

const baseColors = {
  primary: '#4d72aa', // Used as accent on header, loading spinner, background of beta version tag and some buttons
  secondary: '#6d6e70', // Used as footer background
  accent: '#4d72aa', // Used as button backgrounds, headers, links
  success: '#74ae43',
  warning: '#f7981c',
  danger: '#db3214',
  light: '#e9ecef', // Used as header background color, lightened for background of cells, panels, etc.
  dark: '#333f52', // Used as text color, menu background (lightened), selected background (lightened)
  grey: '#808080'
}

const colorPalette = { ...baseColors, primary: '#74ae43' }

const colors = _.fromPairs(_.map(
  color => [color, (intensity = 1) => Color(colorPalette[color]).mix(Color('white'), 1 - intensity).hex()],
  ALL_COLORS
))

export const terraSpecial = intensity => isTerra() ? colors.primary(intensity) : colors.accent(intensity)

export default colors
