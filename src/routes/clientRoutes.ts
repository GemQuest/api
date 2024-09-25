// src/routes/clientRoutes.ts

import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

export async function clientRoutes(server: FastifyInstance) {
  // Create Client
  server.post(
    '/create',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { name, plan } = request.body as {
        name: string;
        plan: string;
      };

      // Get the owner's ID from the authenticated user
      const ownerId = request.user.userId;

      // Check if a client with the same name already exists
      const existingClient = await server.prisma.client.findUnique({
        where: { name },
      });

      if (existingClient) {
        return reply
          .status(400)
          .send({ error: 'Client with this name already exists' });
      }

      try {
        // Create the client
        const client = await server.prisma.client.create({
          data: {
            name,
            plan,
            owner: {
              connect: { id: ownerId },
            },
          },
        });

        return reply.status(201).send(client);
      } catch (error) {
        reply
          .status(500)
          .send({ error: 'An error occurred while creating the client' });
      }
    },
  );

  // Get Client by Name
  server.get('/:name', async (request: FastifyRequest, reply: FastifyReply) => {
    const { name } = request.params as { name: string };

    const client = await server.prisma.client.findUnique({
      where: { name },
    });

    if (!client) {
      return reply.status(404).send({ error: 'Client not found' });
    }

    return reply.send(client);
  });

  // To be completed
}
