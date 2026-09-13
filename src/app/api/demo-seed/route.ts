import { NextResponse } from 'next/server'
// Plain ESM script, shared with `npm run db:seed` so the command line and the
// in-app button write exactly the same data (allowJs resolves it).
import { seedDemoGroups } from '../../../../scripts/seed.mjs'

/**
 * Writes the demo data, for the "load the demo groups" button and for /demo.
 *
 * Only exists in this teaching fork. It is unauthenticated and it deletes and
 * recreates the four demo groups, so it is on by default in development and
 * off by default in a production build — but ENABLE_DEMO_SEED turns it back on
 * deliberately, which is how you test a real deployment under real conditions.
 * Read from process.env on every call rather than from the env snapshot, so a
 * prebuilt image can be toggled with `docker run -e ENABLE_DEMO_SEED=true`.
 */
const demoSeedEnabled = () => {
  const flag = (process.env.ENABLE_DEMO_SEED ?? '').trim().toLowerCase()
  if (['true', 'yes', '1', 'on'].includes(flag)) return true
  if (['false', 'no', '0', 'off'].includes(flag)) return false
  return process.env.NODE_ENV !== 'production'
}

export async function POST() {
  if (!demoSeedEnabled()) {
    return NextResponse.json(
      { error: 'Demo seeding is disabled. Set ENABLE_DEMO_SEED=true.' },
      { status: 404 },
    )
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
