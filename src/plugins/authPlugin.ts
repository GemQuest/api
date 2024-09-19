import fp from 'fastify-plugin';
import { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify';

async function authPlugin(fastify: FastifyInstance) {
  fastify.decorate(
    'authenticate',
    async function (request: FastifyRequest, reply: FastifyReply) {
      try {
        await request.jwtVerify();
      } catch (err) {
        reply.send(err);
      }
    },
  );
}

export default fp(authPlugin);
