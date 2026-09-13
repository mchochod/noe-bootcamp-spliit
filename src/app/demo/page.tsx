'use client'

import { saveRecentGroup } from '@/app/groups/recent-groups-helpers'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

/**
 * Puts the seeded demo groups into this browser and opens the group list.
 *
 * The "My groups" list is localStorage, not a query, so a freshly seeded
 * database looks completely empty until every group has been visited once.
 * That is fine for the real product, where groups are shared by link, but in a
 * workshop it means every participant hunting for four URLs on their own
 * machine — and again in whatever browser their AI assistant drives.
 *
 * Only exists in this teaching fork. The ids match scripts/seed.mjs.
 */
const DEMO_GROUPS = [
  { id: 'demo-couple', name: 'Alice & Bob' },
  { id: 'demo-coloc', name: 'Coloc Oberkampf' },
  { id: 'demo-yc', name: 'YC Combinator Summer26' },
  { id: 'demo-etretat', name: 'Week-end à Étretat' },
]

export default function DemoPage() {
  const router = useRouter()

  useEffect(() => {
    // Oldest first, so the most interesting group ends up on top of the list.
    for (const group of [...DEMO_GROUPS].reverse()) {
      saveRecentGroup(group)
      // Alice is in all four groups, so the balances and "your share" figures
      // read as one story rather than four disconnected ones.
      localStorage.setItem(`${group.id}-activeUser`, `${group.id}-alice`)
    }
    router.replace('/groups')
  }, [router])

  return (
    <p className="p-6 text-muted-foreground">
      Adding the demo groups to this browser…
    </p>
  )
}
