// src/plugins/prismaPlugin.ts

import fp from 'fastify-plugin';
import { PrismaClient } from '@prisma/client';

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
  }
}

export const prismaPlugin = fp(async (server) => {
  const prisma = new PrismaClient();

  // Make Prisma Client available through the server instance
  server.decorate('prisma', prisma);

  // Clean up Prisma Client on server close
  server.addHook('onClose', async (serverInstance) => {
    await serverInstance.prisma.$disconnect();
  });
});
