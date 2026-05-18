import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import crypto from 'node:crypto';
import type { Response } from 'express';
import { prisma } from '@repo/db';
import { router, publicProcedure, protectedProcedure } from './trpc.js';

const SALT_ROUNDS = 10;
const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function setSessionCookie(res: Response, token: string) {
  res.cookie('authjs.session-token', token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE_MS,
    secure: process.env.NODE_ENV === 'production',
  });
}

export const authRouter = router({
  register: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string().min(6),
        name: z.string().min(1),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const existing = await prisma.user.findUnique({
        where: { email: input.email },
      });

      if (existing) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'User with this email already exists',
        });
      }

      const hashedPassword = await bcrypt.hash(input.password, SALT_ROUNDS);

      const user = await prisma.user.create({
        data: {
          email: input.email,
          name: input.name,
          password: hashedPassword,
        },
      });

      const sessionToken = crypto.randomUUID();
      await prisma.session.create({
        data: {
          sessionToken,
          userId: user.id,
          expires: new Date(Date.now() + SESSION_MAX_AGE_MS),
        },
      });

      setSessionCookie(ctx.res, sessionToken);

      return { user: { id: user.id, email: user.email, name: user.name, createdAt: user.createdAt, updatedAt: user.updatedAt } };
    }),

  login: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string().min(1),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const user = await prisma.user.findUnique({
        where: { email: input.email },
      });

      if (!user?.password) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Invalid email or password',
        });
      }

      const valid = await bcrypt.compare(input.password, user.password);
      if (!valid) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Invalid email or password',
        });
      }

      const sessionToken = crypto.randomUUID();
      await prisma.session.create({
        data: {
          sessionToken,
          userId: user.id,
          expires: new Date(Date.now() + SESSION_MAX_AGE_MS),
        },
      });

      setSessionCookie(ctx.res, sessionToken);

      return { user: { id: user.id, email: user.email, name: user.name, createdAt: user.createdAt, updatedAt: user.updatedAt } };
    }),

  logout: protectedProcedure.mutation(async ({ ctx }) => {
    const cookies = ctx.res.req.cookies as Record<string, string | undefined>;
    const sessionToken =
      cookies['authjs.session-token'] ??
      cookies['__Secure-authjs.session-token'];

    if (sessionToken) {
      await prisma.session.deleteMany({ where: { sessionToken } });
    }

    ctx.res.clearCookie('authjs.session-token', { path: '/' });

    return { success: true };
  }),
});
