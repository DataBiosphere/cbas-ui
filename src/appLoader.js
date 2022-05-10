import 'src/style.css'

import _ from 'lodash/fp'
import ReactDOM from 'react-dom'
import { h } from 'react-hyperscript-helpers'
import RModal from 'react-modal'
import Main from 'src/pages/Main'


const appRoot = document.getElementById('root')

RModal.defaultStyles = { overlay: {}, content: {} }
RModal.setAppElement(appRoot)

window._ = _

ReactDOM.render(h(Main), appRoot)
