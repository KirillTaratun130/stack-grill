import { prisma } from '@repo/db';
import type { CreateExpressContextOptions } from '@trpc/server/adapters/express';

export async function createContext({ req, res }: CreateExpressContextOptions) {
  const cookies = req.cookies as Record<string, string | undefined>;
  const sessionToken =
    cookies['authjs.session-token'] ?? cookies['__Secure-authjs.session-token'];

  if (!sessionToken) {
    return { user: null, res };
  }

  const session = await prisma.session.findUnique({
    where: { sessionToken },
    include: { user: true },
  });

  if (!session || session.expires < new Date()) {
    return { user: null, res };
  }

  return { user: session.user, res };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
