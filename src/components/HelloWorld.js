import { a, div, h2 } from 'react-hyperscript-helpers'
import headerLeftHexes from 'src/images/header-left-hexes.svg'
import headerRightHexes from 'src/images/header-right-hexes.svg'
import colors from 'src/libs/colors'
import { topBarLogo, versionTag } from 'src/libs/logos'
import * as Style from 'src/libs/style'


const styles = {
  topBar: {
    flex: 'none', height: Style.topBarHeight,
    display: 'flex', alignItems: 'center',
    borderBottom: `2px solid ${colors.primary(0.55)}`,
    zIndex: 2,
    boxShadow: '3px 0 13px 0 rgba(0,0,0,0.3)'
  }
}

export const HelloWorld = () => {
  return div({}, [
    div({
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
            div({}, [
              div({
                style: { fontSize: '1rem', fontWeight: 600 }
              }, [versionTag('Beta')])
            ])
          ])
        ])
      ])
    ]),
    div({ style: { margin: '1rem' } }, [
      h2(['Hello World!'])
    ])
  ])
}
