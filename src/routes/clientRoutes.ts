// src/routes/clientRoutes.ts

import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

export async function clientRoutes(server: FastifyInstance) {
  // Create Client
  server.post(
    '/create',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { name, email, plan } = request.body as {
        name: string;
        email: string;
        plan: string;
      };

      // Get the owner's ID from the authenticated user
      const ownerId = request.user.userId;

      // Check if the client already exists
      const existingClient = await server.prisma.client.findUnique({
        where: { email },
      });

      if (existingClient) {
        return reply.status(400).send({ error: 'Client already exists' });
      }

      // Create the client
      const client = await server.prisma.client.create({
        data: {
          name,
          email,
          plan,
          owner: {
            connect: { id: ownerId },
          },
        },
      });

      return reply.status(201).send(client);
    },
  );

  // Get Client by Email
  server.get(
    '/:email',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { email } = request.params as { email: string };

      const client = await server.prisma.client.findUnique({
        where: { email },
      });

      if (!client) {
        return reply.status(404).send({ error: 'Client not found' });
      }

      return reply.send(client);
    },
  );
}
