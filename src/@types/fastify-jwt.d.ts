import '@fastify/jwt';

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { userId: number }; // for signing and verifying
    user: {
      userId: number;
    }; // for request.user
  }
}
