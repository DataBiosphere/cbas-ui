import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { h, span } from 'react-hyperscript-helpers'
import { goToPath } from 'src/libs/nav'

import { HeaderSection, PageHeader } from './job-common'


jest.mock('src/libs/nav')

describe('Job Common Components - Page Header', () => {
  beforeEach(() => {
    goToPath.mockImplementation(() => {
      return () => {}
    })
  })

  it('renders header text for provided text', async () => {
    const props = { title: 'Test Header' }
    render(h(PageHeader, props))
    await waitFor(() => {
      const header = screen.getByText(props.title)
      expect(header).toBeDefined()
    })
  })

  it('renders a breadcrumb trail of links when provided the config object', async () => {
    const breadcrumbPathObjects = [
      {
        label: 'Submission History',
        path: 'submission-history'
      },
      {
        label: 'Test link',
        path: 'test-link'
      }
    ]

    const props = {
      title: 'Test Header',
      breadcrumbPathObjects
    }

    render(h(PageHeader, props))
    const user = userEvent.setup();
    await waitFor(async () => {
      const historyLink = screen.getByText(breadcrumbPathObjects[0].label)
      expect(historyLink).toBeDefined()
      await user.click(historyLink)
      expect(goToPath).toHaveBeenCalled()
      const testLink = screen.getByText(breadcrumbPathObjects[1].label)
      expect(testLink).toBeDefined()
      await user.click(testLink)
      expect(goToPath).toHaveBeenCalled()
    })
  })
})

describe('Job Common Components - Header Section', () => {
  it('renders the PageHeader and button', () => {
    const buttonText = 'Test button'
    const props = {
      title: 'Test Title',
      button: span({}, [buttonText])
    }

    const user = userEvent.setup()
    render(h(HeaderSection, props))
    waitFor(async () => {
      const header = screen.getByText(props.title)
      expect(header).toBeDefined()
      const button = screen.getByText(buttonText)
      expect(button).toBeDefined()
      await user.click(button)
      expect(goToPath).toHaveBeenCalled()
    })
  })
})
