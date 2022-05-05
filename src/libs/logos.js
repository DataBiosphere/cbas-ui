import { b, img } from 'react-hyperscript-helpers'
import terraLogoShadow from 'src/images/brands/terra/logo-wShadow.svg'
import colors from 'src/libs/colors'


export const terraLogoMaker = (logoVariant, style) => img({ alt: 'Terra', role: 'img', src: logoVariant, style })

export const topBarLogo = () => terraLogoMaker(terraLogoShadow, { height: 75, marginRight: '0.1rem' })

export const versionTag = (version, styles) => b({
  style: {
    fontSize: 8, lineHeight: '9px',
    color: 'white', backgroundColor: colors.primary(1.5),
    padding: '3px 5px', verticalAlign: 'middle',
    borderRadius: 2, textTransform: 'uppercase',
    ...styles
  }
}, [version])
