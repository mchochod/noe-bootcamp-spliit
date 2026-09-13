'use client'

import { loadDemoGroups } from '@/app/groups/demo-groups'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

/**
 * Seeds the demo data and opens the group list, in one URL.
 *
 * Reaching for a URL is the only setup step that works identically in the
 * participant's own browser and in whatever browser their AI assistant drives,
 * which is why this exists next to `npm run db:seed`. Safe to open twice: the
 * seed replaces the four demo groups and leaves anything else alone.
 *
 * Only exists in this teaching fork.
 */
export default function DemoPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadDemoGroups()
      .then(() => router.replace('/groups'))
      .catch((cause: Error) => setError(cause.message))
  }, [router])

  return (
    <p className="p-6 text-sm text-muted-foreground">
      {error ?? 'Loading the demo groups…'}
    </p>
  )
}
