import { defineConfig } from 'prisma/config';

// DATABASE_URL is a runtime variable on Railway — it is not available during
// `prisma generate` (build phase). Providing it conditionally means generate
// succeeds without a database, while migrate/studio still work locally and in CI.
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  ...(process.env.DATABASE_URL
    ? { datasource: { url: process.env.DATABASE_URL } }
    : {}),
});