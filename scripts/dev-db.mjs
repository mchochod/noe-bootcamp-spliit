// Local Postgres for development, with no Docker and no install.
// Runs PGlite (PostgreSQL compiled to WebAssembly) in this Node process and
// exposes it on 127.0.0.1 speaking the PostgreSQL wire protocol, so the Prisma
// CLI and the app connect to it exactly as they would to a real server.
// Data is persisted in ./pglite-data.
import { PGlite } from '@electric-sql/pglite'
import { PGLiteSocketServer } from '@electric-sql/pglite-socket'

// Override with DEV_DB_PORT if 5432 is already taken by another Postgres.
// Remember to change the port in .env too.
const port = Number(process.env.DEV_DB_PORT ?? 5432)

const db = await PGlite.create({ dataDir: './pglite-data' })
const server = new PGLiteSocketServer({
  db,
  port,
  host: '127.0.0.1',
  // Prisma's `pg` adapter opens a connection pool; the default of 1 makes it
  // drop connections with "Server has closed the connection".
  maxConnections: 20,
})
await server.start()
console.log(`dev-db listening on 127.0.0.1:${port} (data in ./pglite-data)`)

for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, async () => {
    await server.stop()
    await db.close()
    process.exit(0)
  })
}
