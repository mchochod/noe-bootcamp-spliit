# Self-hosting Spliit

Everything you need to run your own instance: building the container image, a
Docker Compose file, the health endpoints, the environment variables, and the
features that are off until you give them a key.

None of this is needed to work on the code. For that, see
[Run locally](../README.md#run-locally) in the README — it needs no Docker, no
PostgreSQL and no account anywhere.

## Run in a container

1. Run `npm run build-image` to build the docker image from the Dockerfile
2. Copy the file `container.env.example` as `container.env`
3. Run `npm run start-container` to start the postgres and the spliit2 containers
4. You can access the app by browsing to http://localhost:3000

## Run with Docker compose

This is a sample `docker-compose.yml` file that you can use to deploy this web app.

```yaml
name: spliit

services:
  app:
    image: ghcr.io/spliit-app/spliit:latest
    user: "1000:1000" # change to your user id or remove if you want root
    ports:
      - "8080:3000/tcp"
    environment:
      POSTGRES_PRISMA_URL: postgresql://spliit:spliit@database:5432/spliit
      POSTGRES_URL_NON_POOLING: postgresql://spliit:spliit@database:5432/spliit
    volumes:
      - ./app/cache:/usr/app/.next/cache
    depends_on:
      - database
    networks:
      - spliit

  database:
    image: postgres:17.3
    user: "1000:1000" # same as above
    environment:
      POSTGRES_USER: spliit
      POSTGRES_PASSWORD: spliit
      POSTGRES_DB: spliit
    volumes:
      - ./database/data:/var/lib/postgresql/data
    networks:
      - spliit

networks:
  spliit:
```

The web app will then be available on your host at http://localhost:8080/.

You can use named volumes in place of bind mounts if you prefer not having
data stored inside local directories.

## Health check

The application has a health check endpoint that can be used to check if the application is running and if the database is accessible.

- `GET /api/health/readiness` or `GET /api/health` - Check if the application is ready to serve requests, including database connectivity.
- `GET /api/health/liveness` - Check if the application is running, but not necessarily ready to serve requests.

## Configuration

Every variable below is read at runtime. For a container deployment, set them in
`container.env` or pass them with `docker run -e`; no rebuild is required, which
means the published image can be configured by whoever runs it.

### Application URL

Set `BASE_URL` to the public URL your instance is reachable at. It is used for
metadata, the sitemap, `robots.txt`, and to accept server actions sent to that
host.

```.env
BASE_URL=https://spliit.example.com
```

Defaults to `http://localhost:3000`.

### Default currency

Set `DEFAULT_CURRENCY_CODE` to pre-select a currency on the new-group form.

```.env
DEFAULT_CURRENCY_CODE=EUR
```

Upstream defaults to `USD`; this teaching fork ships `EUR` in `.env.example`.

### Migrating from the `NEXT_PUBLIC_*` variables

Earlier versions used `NEXT_PUBLIC_`-prefixed variables for the settings above
and for the opt-in feature flags below. Next.js **inlines those into the app at
build time**, so in a prebuilt image — like the published one — they are frozen
at whatever the release build used and setting them at runtime does nothing. The
runtime variables replace them:

| Old (build-time)                       | New (runtime)              |
| -------------------------------------- | -------------------------- |
| `NEXT_PUBLIC_BASE_URL`                 | `BASE_URL`                 |
| `NEXT_PUBLIC_DEFAULT_CURRENCY_CODE`    | `DEFAULT_CURRENCY_CODE`    |
| `NEXT_PUBLIC_ENABLE_EXPENSE_DOCUMENTS` | `ENABLE_EXPENSE_DOCUMENTS` |
| `NEXT_PUBLIC_ENABLE_RECEIPT_EXTRACT`   | `ENABLE_RECEIPT_EXTRACT`   |
| `NEXT_PUBLIC_ENABLE_CATEGORY_EXTRACT`  | `ENABLE_CATEGORY_EXTRACT`  |

**The old variables still work** — the runtime variant simply takes precedence
when both are set, so there is nothing you have to change immediately. They
remain the right choice if you build your own image and want a setting baked in.
To migrate, drop the `NEXT_PUBLIC_` prefix and set the variable wherever your
container gets its environment.

## Opt-in features

### Expense documents

Spliit offers users to upload images (to an AWS S3 bucket) and attach them to expenses. To enable this feature:

- Follow the instructions in the _S3 bucket_ and _IAM user_ sections of [next-s3-upload](https://next-s3-upload.codingvalue.com/setup#s3-bucket) to create and set up an S3 bucket where images will be stored.
- Update your environments variables with appropriate values:

```.env
ENABLE_EXPENSE_DOCUMENTS=true
S3_UPLOAD_KEY=AAAAAAAAAAAAAAAAAAAA
S3_UPLOAD_SECRET=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
S3_UPLOAD_BUCKET=name-of-s3-bucket
S3_UPLOAD_REGION=us-east-1
```

You can also use other S3 providers by providing a custom endpoint:

```.env
S3_UPLOAD_ENDPOINT=http://localhost:9000
```

### Create expense from receipt

You can offer users to create expense by uploading a receipt. This feature relies on a [vision-capable OpenAI model](https://platform.openai.com/docs/guides/vision) and a public S3 storage endpoint.

To enable the feature:

- You must enable expense documents feature as well (see section above). That might change in the future, but for now we need to store images to make receipt scanning work.
- Subscribe to OpenAI API and get access to a vision-capable model (you might need to buy credits in advance).
- Update your environment variables with appropriate values:

```.env
ENABLE_RECEIPT_EXTRACT=true
OPENAI_API_KEY=XXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

The model defaults to `gpt-5-nano` and can be changed with the optional `OPENAI_MODEL_RECEIPT_EXTRACT` variable — a larger model reads poor-quality photos more reliably, at a higher price per scan.

### Deduce category from title

You can offer users to automatically deduce the expense category from the title. Since this feature relies on a OpenAI subscription, follow the signup instructions above and configure the following environment variables:

```.env
ENABLE_CATEGORY_EXTRACT=true
OPENAI_API_KEY=XXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

The model defaults to `gpt-5-nano` and can be changed with the optional `OPENAI_MODEL_CATEGORY_EXTRACT` variable.

### Using another OpenAI-compatible provider

Both AI features above talk to the official OpenAI API by default. Set the optional `OPENAI_BASE_URL` variable to point them at a self-hosted or alternative provider instead:

```.env
OPENAI_BASE_URL=http://localhost:11434/v1
OPENAI_MODEL_RECEIPT_EXTRACT=name-of-a-vision-model
OPENAI_MODEL_CATEGORY_EXTRACT=name-of-a-text-model
```

Whichever provider you choose has to support the `json_schema` response format ([structured outputs](https://platform.openai.com/docs/guides/structured-outputs)), and the receipt feature additionally needs image input. If a response does not match the expected schema, the app reports that nothing could be extracted rather than filling the form with guesses.

If your environment file was created on Windows, make sure it uses **LF line endings**. A trailing carriage return makes `OPENAI_API_KEY` fail authentication and silently switches feature flags off.

### Analytics

Spliit can report anonymous usage events to an analytics service. **It is disabled by default**: nothing is loaded and nothing is sent unless you select a provider.

Select one with `ANALYTICS_PROVIDER`. The variables are read on the server, so a single Docker image can be configured when the container starts.

#### `console` — see what would be reported

Logs every event to the browser console and sends nothing anywhere. Useful while developing, and the shortest example of what a provider looks like.

```.env
ANALYTICS_PROVIDER=console
```

#### `plausible`

Reports to [Plausible](https://plausible.io), a privacy-friendly, cookie-free analytics service. No extra dependency is installed: the provider is a script tag and a function call.

```.env
ANALYTICS_PROVIDER=plausible
PLAUSIBLE_DOMAIN=your-domain.com
```

For a self-hosted Plausible instance, point at it with `PLAUSIBLE_HOST`:

```.env
PLAUSIBLE_HOST=https://plausible.your-domain.com
```

Ad blockers drop requests to known analytics hosts. To avoid that, serve the script and the event endpoint from your own origin by adding [rewrites](https://nextjs.org/docs/app/api-reference/config/next-config-js/rewrites) in `next.config.mjs` and pointing the provider at them:

```.env
PLAUSIBLE_SCRIPT_URL=/js/script.manual.js
PLAUSIBLE_API_URL=/proxy/api/event
```

#### What is reported

Pageviews for a handful of pages, and one event per significant action: creating and updating a group, creating, updating and deleting an expense, attaching a document, scanning a receipt, and exporting expenses.

**Group and expense IDs are never sent.** They are the capability to read someone's group, so `/groups/<id>/expenses` is reported as `/groups/[groupId]/expenses`. Anonymization happens in one place, `anonymizePath` in `src/lib/analytics/`, between the call sites and every provider, and the event types forbid properties that are not explicitly declared — so leaking an ID is a compile error rather than a review question.

Pages are tracked explicitly, with `<TrackPage path="…" />`. A new route reports nothing until someone adds it, which keeps that a deliberate decision.

This is unrelated to the group activity log (the _Activity_ tab), which is stored in your own database and is a product feature rather than analytics.

#### Adding a provider

Providers live in `src/lib/analytics/providers/`. Copy `console.tsx`, then register the new one in three places: `provider-ids.ts`, `registry.ts`, and `config.ts` (to map its environment variables to options). The last two are type-checked against the first, so `npm run check-types` tells you exactly what is missing.

A provider supplies a transport — where events go — and optionally a `Script` component if it needs to load an SDK.
