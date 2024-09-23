// src/plugins/jwtPlugin.ts

import fp from 'fastify-plugin';
import fastifyJwt from '@fastify/jwt';
import '@fastify/jwt';

export const jwtPlugin = fp(async (server) => {
  server.register(fastifyJwt, {
    secret: process.env.JWT_SECRET || 'fallback-secret',
  });
});
