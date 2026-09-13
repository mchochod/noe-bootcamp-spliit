import {
  getStarredGroups,
  saveRecentGroup,
  starGroup,
} from '@/app/groups/recent-groups-helpers'

/**
 * Seeds the demo data and registers the resulting groups in this browser.
 *
 * Two steps, because they solve two different problems. The POST writes the
 * groups to the database — a fresh clone has none. The localStorage writes make
 * them visible: the "My groups" list is browser state, not a query, so a seeded
 * database still looks empty in a browser that has never opened those groups.
 * Running this in a second browser — the one an AI assistant drives, say —
 * gives it the same view without touching the data again.
 *
 * Only exists in this teaching fork.
 */
const STARRED_GROUP_ID = 'demo-couple'

/** @see the note above. */
export async function loadDemoGroups() {
  const response = await fetch('/api/demo-seed', { method: 'POST' })
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as {
      error?: string
    }
    throw new Error(body.error ?? 'Could not seed the demo data.')
  }

  const { groups } = (await response.json()) as {
    groups: { id: string; name: string }[]
  }

  // Oldest first, so the group the seed lists first ends up on top.
  for (const group of [...groups].reverse()) {
    saveRecentGroup(group)
    // Alice is in all four groups, so the balances and "your share" figures
    // read as one story rather than four disconnected ones.
    localStorage.setItem(`${group.id}-activeUser`, `${group.id}-alice`)
  }

  // The couple is the group with eighteen months of history and the richest
  // stats, so it is the one to land on. Starring pins it to the top.
  if (!getStarredGroups().includes(STARRED_GROUP_ID))
    starGroup(STARRED_GROUP_ID)

  return groups
}
