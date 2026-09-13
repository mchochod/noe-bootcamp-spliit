// Writes the demo data defined in seed-data.mjs.
//
// Talks to postgres through `pg` rather than Prisma, for the same reason
// perf/seed.ts does: the generated Prisma 7 client is ESM-only and awkward to
// load from a standalone script, and plain SQL is enough here.
import { pathToFileURL } from 'node:url'
import { Client } from 'pg'
import { DEMO_GROUP_IDS, GROUPS, demoGroupSummaries } from './seed-data.mjs'

export { demoGroupSummaries }

async function writeGroup(client, group) {
  await client.query(
    `INSERT INTO "Group" (id, name, information, currency, "currencyCode", "createdAt")
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      group.id,
      group.name,
      group.information,
      group.currency,
      group.currencyCode,
      new Date(`${group.createdAt}T09:00:00Z`),
    ],
  )

  const participantId = {}
  for (const [key, name] of Object.entries(group.participants)) {
    participantId[key] = `${group.id}-${key}`
    await client.query(
      `INSERT INTO "Participant" (id, name, "groupId") VALUES ($1, $2, $3)`,
      [participantId[key], name, group.id],
    )
  }

  const allKeys = Object.keys(group.participants)
  let index = 0

  for (const expense of group.expenses) {
    index += 1
    const id = `${group.id}-e${String(index).padStart(3, '0')}`
    const keys = expense.forWhom === 'all' ? allKeys : expense.forWhom

    // The expense list sorts by [expenseDate desc, createdAt desc]. Giving
    // every row a distinct createdAt keeps that order total, so same-day
    // expenses never swap places between reads.
    const createdAt = new Date(`${expense.date}T08:00:00Z`)
    createdAt.setMinutes(createdAt.getMinutes() + index)

    await client.query(
      `INSERT INTO "Expense"
         (id, "groupId", "expenseDate", title, "categoryId", amount,
          "originalAmount", "originalCurrency", "conversionRate",
          "paidById", "isReimbursement", "splitMode", "createdAt", notes,
          "recurrenceRule")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
      [
        id,
        group.id,
        expense.date,
        expense.title,
        expense.category,
        expense.amount,
        expense.original?.amount ?? null,
        expense.original?.currency ?? null,
        expense.original?.rate ?? null,
        participantId[expense.by],
        expense.reimbursement ?? false,
        expense.split ?? 'EVENLY',
        createdAt,
        expense.notes ?? null,
        expense.recurring ?? 'NONE',
      ],
    )

    for (const key of keys) {
      await client.query(
        `INSERT INTO "ExpensePaidFor" ("expenseId", "participantId", shares)
         VALUES ($1, $2, $3)`,
        [id, participantId[key], expense.shares?.[key] ?? 1],
      )
    }
  }

  return group.expenses.length
}

/**
 * Writes the demo data. Called by the CLI below and by /api/demo-seed, so the
 * command line and the in-app button cannot drift apart.
 */
export async function seedDemoGroups({ log = () => {} } = {}) {
  const connectionString = process.env.POSTGRES_PRISMA_URL
  if (!connectionString) {
    throw new Error(
      'POSTGRES_PRISMA_URL is not set. Copy .env.example to .env first.',
    )
  }

  const client = new Client({ connectionString })
  await client.connect()

  try {
    // Idempotent by fixed ids: only the demo groups go. Cascades take
    // participants, expenses, paid-for rows and activities with them, and a
    // group the participant created themselves is untouched.
    const { rowCount } = await client.query(
      `DELETE FROM "Group" WHERE id = ANY($1::text[])`,
      [DEMO_GROUP_IDS],
    )
    if (rowCount > 0) log(`Removed ${rowCount} existing demo group(s).`)

    let total = 0
    for (const group of GROUPS) {
      const count = await writeGroup(client, group)
      total += count
      log(`  ${group.name} — ${count} expenses`)
    }

    log(`\nSeeded ${GROUPS.length} groups, ${total} expenses.`)
    return { groups: demoGroupSummaries(), expenses: total }
  } finally {
    await client.end()
  }
}

// CLI entry point. Skipped when this module is imported by the app.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await seedDemoGroups({ log: (line) => console.log(line) })
  console.log(
    'Now open http://localhost:3000/demo once — the group list lives in the',
  )
  console.log(
    'browser, so that page adds the four groups to it and signs you in as Alice.',
  )
}
