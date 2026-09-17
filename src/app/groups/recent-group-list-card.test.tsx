import { RecentGroupListCard } from '@/app/groups/recent-group-list-card'
import '@testing-library/jest-dom'
import { fireEvent, render, screen } from '@testing-library/react'

// next-intl is ESM-only, which Jest does not transform inside node_modules.
// The component only reads plain strings out of the `Groups` namespace, so
// look them up from the real translations instead of stubbing every key.
jest.mock('next-intl', () => ({
  useTranslations: () => {
    const messages = require('../../../messages/en-US.json').Groups
    return (key: string) => messages[key]
  },
  useLocale: () => 'en-US',
}))

// The card pushes a route on click, which needs an app-router context this
// test doesn't set up.
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}))

const GROUP = { id: 'group-1', name: 'Ski trip' }

// jsdom has no PointerEvent, so Radix's dropdown trigger (which opens on
// pointerdown, not click) never sees `event.button === 0` and stays closed.
// Aliasing it to MouseEvent is the standard workaround: Radix here only reads
// `button` and `ctrlKey`, both of which MouseEvent already has.
class PointerEventPolyfill extends MouseEvent {}
beforeAll(() => {
  // @ts-expect-error -- jsdom doesn't ship PointerEvent
  window.PointerEvent ??= PointerEventPolyfill
  Element.prototype.hasPointerCapture ??= () => false
  Element.prototype.releasePointerCapture ??= () => {}
  Element.prototype.scrollIntoView ??= () => {}
})

afterEach(() => {
  localStorage.clear()
})

it('refreshes the group list after archiving, same as starring already did', () => {
  const refreshGroupsFromStorage = jest.fn()
  render(
    <RecentGroupListCard
      group={GROUP}
      isStarred={false}
      isArchived={false}
      refreshGroupsFromStorage={refreshGroupsFromStorage}
    />,
  )

  // Neither icon-only button (star, "more") has an accessible name; the
  // dropdown trigger is the second one in DOM order.
  fireEvent.pointerDown(screen.getAllByRole('button')[1], { button: 0 })
  fireEvent.click(screen.getByText('Archive group'))

  expect(refreshGroupsFromStorage).toHaveBeenCalledTimes(1)
})

it('refreshes the group list after unarchiving', () => {
  const refreshGroupsFromStorage = jest.fn()
  render(
    <RecentGroupListCard
      group={GROUP}
      isStarred={false}
      isArchived={true}
      refreshGroupsFromStorage={refreshGroupsFromStorage}
    />,
  )

  fireEvent.pointerDown(screen.getAllByRole('button')[1], { button: 0 })
  fireEvent.click(screen.getByText('Unarchive group'))

  expect(refreshGroupsFromStorage).toHaveBeenCalledTimes(1)
})
