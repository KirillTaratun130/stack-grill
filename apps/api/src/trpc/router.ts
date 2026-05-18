import { router, publicProcedure, protectedProcedure } from './trpc.js';
import { authRouter } from './auth.router.js';

export const appRouter = router({
  healthcheck: publicProcedure.query(() => 'ok'),

  me: protectedProcedure.query(({ ctx }) => {
    return {
      user: {
        id: ctx.user.id,
        name: ctx.user.name,
        email: ctx.user.email,
        image: ctx.user.image,
        createdAt: ctx.user.createdAt,
        updatedAt: ctx.user.updatedAt,
      },
    };
  }),

  auth: authRouter,
});

export type AppRouter = typeof appRouter;
