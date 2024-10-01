// src/plugins/prismaPlugin.ts

import fp from 'fastify-plugin';
import { PrismaClient } from '@prisma/client';
import { FastifyInstance } from 'fastify';

const prisma = new PrismaClient();

export default fp(async (server: FastifyInstance) => {
  server.decorate('prisma', prisma);

  // Optional: Gracefully disconnect Prisma on server close
  server.addHook('onClose', async (server) => {
    await prisma.$disconnect();
  });
});
