// src/plugins/jwtPlugin.ts

import fp from 'fastify-plugin';
import fastifyJwt from '@fastify/jwt';
import { FastifyInstance } from 'fastify';

export default fp(async (server: FastifyInstance) => {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error('JWT_SECRET environment variable is not set.');
  }

  server.register(fastifyJwt, {
    secret: jwtSecret,
  });
});
