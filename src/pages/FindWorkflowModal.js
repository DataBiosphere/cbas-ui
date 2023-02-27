import {div, h, h2, span} from 'react-hyperscript-helpers'
import ModalDrawer  from 'src/components/ModalDrawer'
import {Clickable} from "src/components/common";
import * as Style from 'src/libs/style'
import colors from "src/libs/colors";

const styles = {
  findWorkflowSubHeader: selected => {
    return {
      ...Style.navList.itemContainer(selected),
      ...Style.navList.item(selected),
      ...(selected ? { backgroundColor: colors.dark(0.1) } : {}),
      paddingLeft: '3rem'
    }
  }
}


const FindWorkflowModal = () => {
  const isActive = true

  return h(ModalDrawer, {
    'aria-label': 'find-workflow-modal', isOpen: true, width: '80%',
    onDismiss: () => {} // ??
  }, [
    div({ style: { padding: '0 25px 25px' } }, [
      h2(["Find a Workflow"])
    ]),
    div({ role: 'main', style: { display: 'flex', flex: 1, height: `calc(100% - 66px)` } }, [
      div({
        style: {
          minWidth: 330, maxWidth: 330,
          boxShadow: '0 2px 5px 0 rgba(0,0,0,0.25)',
          overflowY: 'auto'
        }
      }, [
        h(Clickable, {
          style: { ...styles.findWorkflowSubHeader(isActive), color: isActive ? colors.accent(1.1) : colors.accent(), fontSize: 16 },
          onClick: () => console.log('Clicked on first item'),
          hover: Style.navList.itemHover(isActive),
          'aria-current': isActive ? 'location' : false
        }, ['Browse Suggested Workflows']),
        h(Clickable, {
          style: { ...styles.findWorkflowSubHeader(false), color: false ? colors.accent(1.1) : colors.accent(), fontSize: 16 },
          onClick: () => console.log('Clicked on first item'),
          hover: Style.navList.itemHover(false),
          'aria-current': false ? 'location' : false
        }, ['Add a Workflow Link'])
      ])
    ])
  ])
}

export default FindWorkflowModal
