import '@testing-library/jest-dom'

import { render, screen } from '@testing-library/react'
import { axe } from 'jest-axe'
import { useState } from 'react'
import { div, h } from 'react-hyperscript-helpers'
import { MenuTrigger } from 'src/components/PopupTrigger'
import TooltipTrigger from 'src/components/TooltipTrigger'
import { useWorkspaceDetails } from 'src/components/workspace-utils'
import WorkspaceMenu from 'src/pages/workspaces/workspace/WorkspaceMenu'


jest.mock('src/components/workspace-utils', () => {
  const originalModule = jest.requireActual('src/components/workspace-utils')
  return {
    ...originalModule,
    useWorkspaceDetails: jest.fn()
  }
})

beforeEach(() => {
  MenuTrigger.mockImplementation(({ content }) => { return div({ role: 'menu' }, [content]) })
  TooltipTrigger.mockImplementation(({ content, children }) => {
    const [open, setOpen] = useState(false)
    return (div([
      div(
        {
          onMouseEnter: () => {
            setOpen(true)
          },
          onMouseLeave: () => {
            setOpen(false)
          }
        },
        [children]
      ),
      open && !!content && div([content])
    ]))
  })
})

describe('WorkspaceMenu - undefined workspace', () => {
  beforeEach(() => {
    // Arrange
    useWorkspaceDetails.mockReturnValue({ workspace: undefined })
  })

  it('should not fail any accessibility tests', async () => {
    // Act
    const { container } = render(h(WorkspaceMenu, workspaceMenuProps))
    // Assert
    expect(await axe(container)).toHaveNoViolations()
  })

  it.each([
    'Clone', 'Share', 'Lock', 'Leave', 'Delete'
  ])('renders menu item %s as disabled', menuText => {
    // Act
    render(h(WorkspaceMenu, workspaceMenuProps))
    const menuItem = screen.getByText(menuText)
    // Assert
    expect(menuItem).toHaveAttribute('disabled')
  })
})
