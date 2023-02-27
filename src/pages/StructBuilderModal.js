import { h } from 'react-hyperscript-helpers'
import Modal from 'src/components/Modal'
import { StructBuilder } from 'src/components/StructBuilder'


export const StructBuilderModal = ({ onDismiss, ...props }) => {
  const { inputSourceLabels } = props
  return h(Modal,
    {
      title: 'Struct Builder',
      onDismiss,
      showCancel: false,
      showX: true,
      okButton: 'Done',
      width: '90%'
    }, [
      h(StructBuilder, { inputSourceLabels, style: { height: 500 } }, [])
    ]
  )
}
