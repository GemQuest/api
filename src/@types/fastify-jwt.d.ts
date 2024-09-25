// src/@types/fastify-jwt.d.ts

import '@fastify/jwt';

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: {
      userId: number;
      username: string;
      roleId: number;
      roleName: string;
    };
    user: {
      userId: number;
      username: string;
      roleId: number;
      roleName: string;
    };
  }
}
