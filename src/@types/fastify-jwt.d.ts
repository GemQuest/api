// src/@types/fastify-jwt.d.ts

import '@fastify/jwt';

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: {
      userId: number;
      username: string;
      role: string;
    };
    user: {
      userId: number;
      username: string;
      role: string;
    };
  }
}
