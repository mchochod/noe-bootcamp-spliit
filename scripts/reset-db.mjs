// Wipes every group in the local database. Used by `npm run db:reset`, which
// then re-seeds.
//
// It deletes rows rather than the ./pglite-data folder on purpose: the folder
// is held by the running `npm run db`, so removing it would mean stopping the
// database first. This works with the database up, which is the state a stuck
// participant is actually in. Deleting the folder stays the nuclear option,
// documented in the README.
import { Client } from 'pg'

const connectionString = process.env.POSTGRES_PRISMA_URL
if (!connectionString) {
  console.error(
    'POSTGRES_PRISMA_URL is not set. Copy .env.example to .env, then run this through `npm run db:reset`.',
  )
  process.exit(1)
}

// This deletes every group unconditionally, which is what you want against a
// throwaway local database and a disaster against anything else. Refuse to run
// unless the target is on this machine.
const host = new URL(connectionString).hostname || 'localhost'
if (!['localhost', '127.0.0.1', '::1', ''].includes(host)) {
  console.error(
    `Refusing to wipe a database on "${host}". This script only runs against localhost.`,
  )
  process.exit(1)
}

const client = new Client({ connectionString })
await client.connect()

try {
  // Groups cascade to participants, expenses, paid-for rows and activities.
  // Categories are reference data created by the migrations and are kept.
  const { rowCount } = await client.query(`DELETE FROM "Group"`)
  console.log(`Deleted ${rowCount} group(s), including any you created.`)
} finally {
  await client.end()
}
