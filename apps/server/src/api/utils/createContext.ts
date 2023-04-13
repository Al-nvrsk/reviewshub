import { PrismaClient } from '@prisma/client'
import { inferAsyncReturnType } from '@trpc/server';
import { CreateExpressContextOptions } from '@trpc/server/adapters/express';

const prisma = new PrismaClient()

export const createContext = ({ req, res }: CreateExpressContextOptions) => {
  return { req, res, prisma };
};

export type Context = inferAsyncReturnType<typeof createContext>;