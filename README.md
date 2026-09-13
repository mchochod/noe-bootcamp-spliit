> ## Pedagogical fork — Noé bootcamp
>
> This is a **teaching fork** of [Spliit](https://github.com/spliit-app/spliit) by
> [Sebastien Castiel](https://github.com/scastiel), used as the demo codebase for a
> two-day *Claude Code for PMs* bootcamp run with [Noé](https://noe.co) (17–18 September 2026).
>
> It exists so participants have a real, non-trivial codebase to read, debug and ship to.
> Some bugs in this fork are **deliberately planted** as exercises, and the local setup is
> adapted for a classroom (no Docker required — see [Run locally](#run-locally)).
>
> **Do not deploy this fork.** If you want to use or self-host Spliit, go to the
> [upstream project](https://github.com/spliit-app/spliit) or the official instance at
> [spliit.app](https://spliit.app) — and consider
> [supporting it](https://opencollective.com/spliit).
>
> Original work © 2023 Sebastien Castiel, MIT licensed. Bootcamp changes © 2026 Martin Chochod,
> same licence. See [License](#license).

[<img alt="Spliit" height="60" src="https://github.com/spliit-app/spliit/blob/main/public/logo-with-text.png?raw=true" />](https://spliit.app)

Spliit is a free and open source alternative to Splitwise. Use the official instance at
[Spliit.app](https://spliit.app), or [run your own](docs/self-hosting.md).

## Run locally

### What your machine needs

| | |
|---|---|
| **Node.js ≥ 24** | `package.json` declares it, and it is a hard requirement |
| **npm ≥ 11** | ships with Node 24, nothing extra to install |
| **git** | any recent version |
| **A code editor** | anything; nothing in this repo assumes one |

npm only — the repository has a `package-lock.json` and no pnpm or yarn lockfile.
**No Docker, no PostgreSQL, no account anywhere**: the local database runs inside Node
(see below), and every feature that needs a third-party key is off by default.

Check the three in one command, identical on macOS, Linux and Windows PowerShell:

```
node -e "const cp=require('child_process'),v=s=>+s.split('.')[0],n=v(process.versions.node),m=v(cp.execSync('npm -v').toString().trim());let g='';try{g=cp.execSync('git --version').toString().trim()}catch{g='ABSENT'};console.log('node '+process.version+' -> '+(n>=24?'OK':'KO (need >=24)'));console.log('npm  '+cp.execSync('npm -v').toString().trim()+' -> '+(m>=11?'OK':'KO (need >=11)'));console.log(g+' -> '+(g==='ABSENT'?'KO':'OK'))"
```

Three `OK` and you are ready. Anything else, install [Node 24 LTS](https://nodejs.org)
first — it brings npm with it.

On **Windows**, clone into a short path such as `C:\dev\` rather than `Documents` or a
OneDrive folder: the sync client locks the database files while they are in use.

### Running it

You need **two terminals**, both in the repository folder.

1. Clone the repository
2. Copy the file `.env.example` as `.env`
3. Run `npm install` to install dependencies and generate Prisma Client
4. *Terminal 1* — run `npm run db` to start the local database, and leave it running.
   This is [PGlite](https://pglite.dev), PostgreSQL compiled to WebAssembly, served on
   `127.0.0.1:5432` over the real PostgreSQL wire protocol. No server to install, no
   container. Data is persisted in `./pglite-data`, which is git-ignored — delete that
   folder to start from a clean database.
   If port 5432 is already taken on your machine, pick another one:

   ```bash
   DEV_DB_PORT=5499 npm run db          # macOS / Linux
   ```
   ```powershell
   $env:DEV_DB_PORT=5499; npm run db    # Windows PowerShell
   ```

   Then set the same port in `.env`, on **both** `POSTGRES_PRISMA_URL` and
   `POSTGRES_URL_NON_POOLING` (e.g. `postgresql://postgres:1234@localhost:5499`).
5. *Terminal 2* — run `npm run db:migrate` to apply the database migrations
6. *Terminal 2* — run `npm run dev` to start the development server

### Demo data

The app starts empty. Loading the sample data takes one of three routes, all of which
run the same seed:

- open **http://localhost:3000/demo**, which seeds and then opens the group list;
- click **Load the demo groups** on the empty group list;
- run **`npm run db:seed`** from a terminal.

Whichever you use, do it **once per browser**. The seed writes to the database, but the
"My groups" list is browser state rather than a query, so a browser that has never
opened those groups still shows nothing — including the browser your AI assistant
drives. `/demo` and the button both register the groups locally and sign you in as
Alice; the terminal command cannot, so after it you still need `/demo` or the button.

You get six groups, all dated relative to the day you seed, so the app always opens on
a "Today" section and a populated last month:

| Group | | |
|---|---|---|
| **Alice & Bob** ★ | a couple, eighteen months of history | open, starred |
| **Coloc Oberkampf** | a year of flatsharing, ended when they moved in together | settled, archived |
| **Londres entre amis** | six people, four days, five months ago | settled, archived |
| **Copenhague** | five people, three months ago | open, nobody has paid anyone back |
| **YC Combinator Summer26** | a month in San Francisco, **in dollars** | open |
| **Week-end à Étretat** | five friends, one weekend, two weeks ago | open |

Alice is in all six, so the balances and the "your share" figures tell one story: she is
owed a little over a thousand euros across the open groups, and owes a few hundred
dollars from San Francisco. The two settled groups are the contrast — they show what
"nothing left to reimburse" looks like, and they start out archived, so the list opens
on the groups that still need attention.

Starring and archiving live in the browser, not in the database — Spliit has no accounts,
so there is nobody to attach a preference to server-side. That is why `/demo` and the
button set them, and `npm run db:seed` cannot.

### Starting over

Seeding is idempotent, by whichever route: it replaces the six demo groups and leaves
any group you created yourself alone. Re-run it whenever the demo data drifts.

`/demo` and the button go through an unauthenticated endpoint that recreates groups, so
they are enabled in development and disabled in a production build. Set
`ENABLE_DEMO_SEED=true` to turn them back on — that is how you load the sample data into
a real deployment to test it under real conditions. `npm run db:seed` is unaffected: it
never goes through the app.

`npm run db:reset` is the bigger hammer — it deletes **every** group, yours included,
then re-seeds. Both work with the database running, so you never have to stop
`npm run db`.

If the database itself is broken rather than the data, stop `npm run db`, delete the
`pglite-data` folder, then run `npm run db:migrate` and `npm run db:seed` again.

Upstream uses a Docker-based Postgres (`./scripts/start-local-db.sh`), which still works
if you prefer it.

### Changing the database schema

⛔ **Never run `prisma migrate dev` or `prisma migrate reset` here.** `migrate dev` fails,
and the fix it suggests destroys your data. Read this before touching
`prisma/schema.prisma`.

A migration is a change to the *shape* of the database — a new column, a new value in an
enum — saved as a SQL file under `prisma/migrations/`. Those files, in order, are the
database's whole history.

`prisma migrate dev` does not just apply them. To check your schema is consistent it
rebuilds the entire history from scratch in a throwaway copy, the *shadow database*. That
needs a second database, and PGlite only holds one — so the connection drops and Prisma
reports `P1017`. Prisma then suggests `prisma migrate reset`, which does work: it empties
the database and rebuilds it clean. You get a correct schema and lose every expense,
every group and your seed. An AI assistant reading that error message will suggest it too.

`prisma migrate deploy` needs no shadow database. It applies the pending files and stops,
which is also what production does. So write the migration file yourself, then deploy it:

```bash
mkdir -p prisma/migrations/$(date +%Y%m%d%H%M%S)_describe_your_change
npx prisma migrate diff \
  --from-config-datasource \
  --to-schema prisma/schema.prisma \
  --script > prisma/migrations/<the folder you just created>/migration.sql
npx prisma migrate deploy
npx prisma generate
```

Restart `npm run dev` afterwards — the generated Prisma client is not hot-reloaded.

Read the generated `migration.sql` before deploying it. `migrate diff` writes what it
takes to make the database match the schema, which on a destructive edit can include a
`DROP`.

## Tests

`npm run verify` runs the four checks that gate a pull request — tests, TypeScript,
Prettier, ESLint — in one command:

```bash
npm run verify
```

Run it before you push. It needs nothing beyond the dependencies: no database, no
Docker, no account. That makes it a faithful local replica of CI, so a green `verify`
means a green pull request, and you find out in seconds instead of minutes.

The checks run tests first, so a real failure is not hidden behind a formatting one.
Each is also available on its own:

| Command | What it checks | If it fails |
| --- | --- | --- |
| `npm test` | the unit suite, in three timezones | a behaviour changed — read the failing test |
| `npm run check-types` | `tsc --noEmit` | the types do not line up |
| `npm run check-formatting` | Prettier | `npm run prettier` fixes every one of these |
| `npm run lint` | ESLint | warnings are tolerated, errors are not |

`verify` runs ESLint with `--quiet`, which gates on errors exactly like CI does but
keeps the inherited warnings out of the way. `npm run lint` still shows them.

`npx jest --watch` reruns the suite on every save — the fastest way to work a failing
test back to green.

`npm run e2e` drives the built container with Playwright, so it needs Docker and a
free port; it is not part of the normal loop. See
[docs/self-hosting.md](docs/self-hosting.md) for the container setup it relies on.

## Self-hosting

Running your own instance — container image, Docker Compose, health checks,
environment variables, and the opt-in features (expense documents, receipt scanning,
analytics) — is documented separately in
**[docs/self-hosting.md](docs/self-hosting.md)**.

## Features

- [x] Create a group and share it with friends
- [x] Create expenses with description
- [x] Display group balances
- [x] Create reimbursement expenses
- [x] Progressive Web App
- [x] Select all/no participant for expenses
- [x] Split expenses unevenly [(#6)](https://github.com/spliit-app/spliit/issues/6)
- [x] Mark a group as favorite [(#29)](https://github.com/spliit-app/spliit/issues/29)
- [x] Tell the application who you are when opening a group [(#7)](https://github.com/spliit-app/spliit/issues/7)
- [x] Assign a category to expenses [(#35)](https://github.com/spliit-app/spliit/issues/35)
- [x] Search for expenses in a group [(#51)](https://github.com/spliit-app/spliit/issues/51)
- [x] Upload and attach images to expenses [(#63)](https://github.com/spliit-app/spliit/issues/63)
- [x] Create expense by scanning a receipt [(#23)](https://github.com/spliit-app/spliit/issues/23)

### Possible incoming features

- [ ] Ability to create recurring expenses [(#5)](https://github.com/spliit-app/spliit/issues/5)
- [ ] Import expenses from Splitwise [(#22)](https://github.com/spliit-app/spliit/issues/22)

## Stack

- [Next.js](https://nextjs.org/) for the web application
- [TailwindCSS](https://tailwindcss.com/) for the styling
- [shadcn/UI](https://ui.shadcn.com/) for the UI components
- [Prisma](https://prisma.io) to access the database
- [Vercel](https://vercel.com/) for hosting (application and database)

## Contribute

The project is open to contributions. Feel free to open an issue or even a pull-request! 
Join the discussion in [the Spliit Discord server](https://discord.gg/YSyVXbwvSY).

### Contribute financially

Spliit is free, open source, and has no ads. Hosting, database and API costs are
paid for by donations. If you want to help keep it that way, you can:

- 🧡 [Support us on Open Collective](https://opencollective.com/spliit) — recurring or one-time,
  with a public and transparent ledger of what comes in and what it is spent on, or
- 💜 [Sponsor me (Sebastien)](https://github.com/sponsors/scastiel).

Contributions of any size are appreciated, and so is simply telling people about
the project.

### Translation

The project's translations are managed using [our Weblate project](https://hosted.weblate.org/projects/spliit/spliit/). 
You can easily add missing translations to the project or even add a new language!
Here is the current state of translation:

<a href="https://hosted.weblate.org/engage/spliit/">
<img src="https://hosted.weblate.org/widget/spliit/spliit/multi-auto.svg" alt="Translation status" />
</a>

## License

MIT, see [LICENSE](./LICENSE).

Spliit is © 2023 Sebastien Castiel. This fork keeps the original licence and copyright
notice unchanged; the bootcamp-specific changes are © 2026 Martin Chochod and are released
under the same MIT terms. Nothing here is endorsed by or affiliated with the upstream
project or its author.
