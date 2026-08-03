# AI Call Analytics

AI Call Analytics is a multilingual SaaS application that transcribes customer calls and turns them into structured sales insights. It helps teams review conversations, measure manager performance, identify objections and missed opportunities, and track sales outcomes from a web dashboard or API.

The interface and generated reports support Ukrainian, English, and Russian. Analysis can also adapt to the user's business type, including hospitality, retail, logistics, healthcare, real estate, and B2B sales.

## Features

- Audio upload, transcription, and structured AI analysis
- High-level, medium, and detailed report modes
- Sales score, outcome, customer intent, next step, issues, positives, and coaching recommendations
- Industry-specific insights and KPIs
- Call history, dashboards, analytics, sales profiles, and admin tools
- Credentials and Google authentication through NextAuth
- API keys and a versioned REST API for call ingestion
- Integrations for Aircall, Binotel, Kyivstar, Ringostat, Twilio, VoIPTime, and KeyCRM
- Subscription plans and Stripe billing
- Telegram account linking and daily reports
- Localized UI in Ukrainian (`uk`), English (`en`), and Russian (`ru`)

## Tech Stack

- Next.js 16 App Router, React 19, and TypeScript
- PostgreSQL with Prisma 7
- NextAuth 4
- OpenAI transcription and chat-completion APIs
- Tailwind CSS 4 and Recharts
- Stripe and Nodemailer
- Vitest and Playwright

## How It Works

1. A call recording is uploaded manually, through the REST API, or by a supported integration.
2. The application stores a call record and queues it for processing.
3. OpenAI transcribes the recording and the application detects its language.
4. A structured prompt analyzes the transcript for the selected report depth and business type.
5. Validated results are stored in PostgreSQL and displayed in the dashboard.
6. The temporary audio file is removed after processing.

Processing currently uses an in-process concurrency limiter. Uploaded files are stored on the local filesystem while they are being processed, so production deployments should use persistent/shared storage or replace this layer with object storage and a durable job queue when running multiple instances.

## Prerequisites

- Node.js 20 or later
- npm
- Docker and Docker Compose, or an existing PostgreSQL database
- An OpenAI API key

Optional services are required only for the corresponding features: Google OAuth, SMTP email, Stripe billing, Telegram reports, Railway cost reporting, and telephony/CRM integrations.

## Local Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Start the bundled PostgreSQL database:

   ```bash
   npm run db:up
   ```

3. Create a `.env` file in the project root. The minimum local configuration is:

   ```dotenv
   DATABASE_URL="postgresql://postgres:1234@localhost:5432/ai_call_analytics"
   OPENAI_API_KEY="your-openai-api-key"
   NEXTAUTH_URL="http://localhost:3000"
   NEXTAUTH_SECRET="replace-with-a-long-random-secret"
   NEXT_PUBLIC_APP_URL="http://localhost:3000"
   ```

4. Generate the Prisma client and apply migrations:

   ```bash
   npx prisma generate
   npx prisma migrate dev
   ```

5. Start the development server:

   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000). The application redirects unprefixed routes to the most appropriate locale.

## Environment Variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `OPENAI_API_KEY` | Yes | Transcription and call analysis |
| `NEXTAUTH_URL` | Yes | Canonical authentication URL |
| `NEXTAUTH_SECRET` | Yes | NextAuth session signing secret |
| `NEXT_PUBLIC_APP_URL` | Yes | Public application URL used in redirects and reports |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Optional | Google sign-in |
| `ADMIN_EMAILS` | Optional | Comma-separated administrator allowlist |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | Optional | Transactional email and lead notifications |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Optional | Stripe billing and webhook verification |
| `STRIPE_PRICE_STARTER`, `STRIPE_PRICE_GROWTH`, `STRIPE_PRICE_PRO` | Optional | Stripe price IDs for paid plans |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET` | Optional | Telegram bot and webhook verification |
| `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` | Optional | Telegram deep-link generation |
| `CRON_SECRET` | Recommended | Protects worker endpoints |
| `PROCESSING_CONCURRENCY` | Optional | Maximum concurrent call-processing jobs |
| `PROCESSING_TIMEOUT_MS` | Optional | Timeout for transcription and analysis operations |
| `STUCK_CALL_THRESHOLD_MS` | Optional | Age threshold used by the recovery worker |
| `OPENAI_ADMIN_KEY` | Optional | OpenAI organization cost reporting |
| `RAILWAY_TOKEN`, `RAILWAY_PROJECT_ID` | Optional | Railway cost reporting in the admin dashboard |

Do not commit `.env` files or production credentials.

## API Overview

The public API uses a generated API key. Send it in the `Authorization` header:

```http
Authorization: Bearer YOUR_API_KEY
```

Upload a call recording:

```bash
curl -X POST http://localhost:3000/api/v1/calls \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -F "file=@call.mp3" \
  -F "reportType=medium"
```

The endpoint returns `202 Accepted` and a `pollUrl`. Other primary endpoints are:

- `GET /api/v1/me` — return information about the authenticated API user
- `GET /api/v1/calls` — list calls with pagination and optional status filtering
- `GET /api/v1/calls/:id` — retrieve a call and its processing result

Interactive API documentation is available at `/{locale}/api-docs` after signing in.

## Available Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the development server with Webpack |
| `npm run build` | Generate Prisma Client and create a production build |
| `npm start` | Start the production server |
| `npm run typecheck` | Run TypeScript checks without emitting files |
| `npm run lint` | Run ESLint |
| `npm test` | Run the Vitest suite |
| `npm run test:e2e` | Run Playwright end-to-end tests |
| `npm run db:up` / `npm run db:down` | Start or stop the local PostgreSQL container |
| `npm run prisma:migrate` | Create and apply a development migration |
| `npm run prisma:studio` | Open Prisma Studio |

## Project Structure

```text
src/
├── app/                    # App Router pages and API routes
│   ├── [lang]/             # Localized application pages
│   └── api/                # Auth, calls, integrations, billing, and workers
├── components/             # UI grouped by feature
├── content/niches/         # Industry-specific landing-page content
├── dictionaries/           # uk, en, and ru translations
├── lib/                    # AI, auth, billing, database, and analytics helpers
└── services/               # Call-processing orchestration
prisma/
├── schema.prisma           # Database schema
└── migrations/             # Schema migration history
e2e/                       # Playwright tests
```

## Validation

Before opening a pull request, run:

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

## Security Notes

- Keep API keys, OAuth secrets, webhook secrets, and SMTP credentials outside source control.
- Protect worker routes with `CRON_SECRET` in production.
- Use a strong, unique `NEXTAUTH_SECRET`.
- Review upload size and content-type limits before exposing the service publicly.
- The Docker Compose credentials are intended for local development only.

## License

No open-source license is currently included. All rights are reserved unless the repository owner states otherwise.
