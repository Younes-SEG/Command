import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@/generated/prisma/client';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString)
    throw new Error(
      'DATABASE_URL is missing. Configure the database connection for this deployment.',
    );
  const adapter = new PrismaPg({ connectionString, connectionTimeoutMillis: 5_000, max: 5 });
  return new PrismaClient({ adapter });
}

// Importing a route during next build must not open a database or require secrets.
// Runtime access still fails closed if the connection is unavailable.
export const db = new Proxy({} as PrismaClient, {
  get(_target, property) {
    const client = (globalForPrisma.prisma ??= createClient());
    const value = Reflect.get(client, property);
    return typeof value === 'function' ? value.bind(client) : value;
  },
});
