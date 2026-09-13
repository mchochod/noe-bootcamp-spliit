// Local Postgres for development, with no Docker and no install.
// Runs PGlite (PostgreSQL compiled to WebAssembly) in this Node process and
// exposes it on 127.0.0.1 speaking the PostgreSQL wire protocol, so the Prisma
// CLI and the app connect to it exactly as they would to a real server.
// Data is persisted in ./pglite-data.
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { PGlite } from '@electric-sql/pglite'
import { PGLiteSocketServer } from '@electric-sql/pglite-socket'

// Override with DEV_DB_PORT if 5432 is already taken by another Postgres.
// Remember to change the port in .env too.
const port = Number(process.env.DEV_DB_PORT ?? 5432)
const dataDir = './pglite-data'
const lockFile = join(dataDir, 'dev-db.lock')

// PGlite does not refuse a second process opening the same dataDir, and two
// writers corrupt it silently. Refuse to start instead, and say what to do.
if (existsSync(lockFile)) {
  const pid = Number(readFileSync(lockFile, 'utf8').trim())
  let running = false
  try {
    process.kill(pid, 0)
    running = true
  } catch {
    // No such process: the lock is stale, left by a previous hard kill.
  }
  if (running) {
    console.error(
      `dev-db is already running in this folder (pid ${pid}).\n` +
        `Stop it with Ctrl+C in its terminal, or run: kill ${pid}`,
    )
    process.exit(1)
  }
  console.warn(`Removing a stale lock left by pid ${pid}.`)
  rmSync(lockFile, { force: true })
}

const db = await PGlite.create({ dataDir })
const server = new PGLiteSocketServer({
  db,
  port,
  host: '127.0.0.1',
  // Prisma's `pg` adapter opens a connection pool; the default of 1 makes it
  // drop connections with "Server has closed the connection".
  maxConnections: 20,
})
await server.start()
writeFileSync(lockFile, String(process.pid))
console.log(`dev-db listening on 127.0.0.1:${port} (data in ./pglite-data)`)
console.log('Press Ctrl+C to stop.')

const releaseLock = () => rmSync(lockFile, { force: true })
process.on('exit', releaseLock)

let stopping = false
const shutdown = async () => {
  // A second Ctrl+C means "I am not waiting any longer".
  if (stopping) process.exit(1)
  stopping = true
  console.log('\nStopping dev-db…')
  // An open connection can keep the socket server from settling. Never let a
  // hung close leave the participant with a process they think they killed.
  const giveUp = setTimeout(() => {
    console.error('dev-db did not close cleanly, exiting anyway.')
    process.exit(1)
  }, 5000)
  try {
    await server.stop()
    await db.close()
  } finally {
    clearTimeout(giveUp)
    releaseLock()
    process.exit(0)
  }
}

for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP']) process.on(sig, shutdown)
