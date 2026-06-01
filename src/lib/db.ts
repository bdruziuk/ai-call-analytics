import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  adapter?: PrismaPg;
};

function getClient(): PrismaClient {
  if (globalForPrisma.prisma) return globalForPrisma.prisma;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is not defined');

  const adapter = globalForPrisma.adapter ?? new PrismaPg({ connectionString });
  const client  = new PrismaClient({ adapter, log: ['error', 'warn'] });

  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.adapter = adapter;
    globalForPrisma.prisma  = client;
  }

  return client;
}

// Lazy proxy: the module can be imported at build time without DATABASE_URL.
// The real client is only created when the first property is accessed (i.e.
// when an actual query runs at request time).
export const db = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    return Reflect.get(getClient(), prop, getClient());
  },
});
