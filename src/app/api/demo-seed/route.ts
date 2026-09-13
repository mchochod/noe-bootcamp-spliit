import { NextResponse } from 'next/server'
// Plain ESM script, shared with `npm run db:seed` so the command line and the
// in-app button write exactly the same data (allowJs resolves it).
import { seedDemoGroups } from '../../../../scripts/seed.mjs'

/**
 * Writes the demo data, for the "load the demo groups" button and for /demo.
 *
 * Only exists in this teaching fork, and only outside production: it deletes
 * and recreates the four demo groups, which is not something a deployed
 * instance should ever expose.
 */
export async function POST() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available' }, { status: 404 })
  }

  try {
    const result = await seedDemoGroups()
    return NextResponse.json(result)
  } catch (error) {
    console.error('Demo seed failed', error)
    return NextResponse.json(
      { error: 'Could not seed the demo data. Is `npm run db` running?' },
      { status: 500 },
    )
  }
}
