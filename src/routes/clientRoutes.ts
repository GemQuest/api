// src/routes/clientRoutes.ts

import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import '@fastify/jwt'; // Import for module augmentation
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function clientRoutes(server: FastifyInstance) {
  /**
   * @route POST /clients
   * @desc Create a new client
   * @access Protected - Requires 'Super Administrator' role
   */
  server.post(
    '/',
    {
      preValidation: [
        server.authenticate,
        server.authorize({
          roles: ['Super Administrator'],
        }),
      ],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { name, plan, parentId } = request.body as {
        name: string;
        plan: string;
        parentId?: number;
      };

      const ownerId = request.user.userId;

      // Create the client
      const client = await prisma.client.create({
        data: {
          name,
          plan,
          ownerId,
          parentId,
        },
      });

      reply.status(201).send(client);
    },
  );

  /**
   * @route GET /clients
   * @desc Get all clients
   * @access Protected - Requires 'Super Administrator' role
   */
  server.get(
    '/',
    {
      preValidation: [
        server.authenticate,
        server.authorize({
          roles: ['Super Administrator'],
        }),
      ],
    },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      const clients = await prisma.client.findMany();
      reply.send(clients);
    },
  );

  /**
   * @route GET /clients/:id
   * @desc Get a specific client by ID
   * @access Protected - Requires 'Super Administrator' or 'Client Administrator' role
   */
  server.get(
    '/:id',
    {
      preValidation: [
        server.authenticate,
        server.authorize({
          roles: ['Super Administrator', 'Client Administrator'],
          clientParam: 'id',
        }),
      ],
    },
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply,
    ) => {
      const { id } = request.params;

      const client = await prisma.client.findUnique({
        where: { id: parseInt(id, 10) },
      });

      if (!client) {
        return reply.status(404).send({ error: 'Client not found' });
      }

      reply.send(client);
    },
  );

  /**
   * @route PUT /clients/:id
   * @desc Update a client
   * @access Protected - Requires 'Super Administrator' role
   */
  server.put(
    '/:id',
    {
      preValidation: [
        server.authenticate,
        server.authorize({
          roles: ['Super Administrator'],
        }),
      ],
    },
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Body: { name?: string; plan?: string };
      }>,
      reply: FastifyReply,
    ) => {
      const { id } = request.params;
      const { name, plan } = request.body;

      const client = await prisma.client.update({
        where: { id: parseInt(id, 10) },
        data: {
          name,
          plan,
        },
      });

      reply.send(client);
    },
  );

  /**
   * @route DELETE /clients/:id
   * @desc Delete a client
   * @access Protected - Requires 'Super Administrator' role
   */
  server.delete(
    '/:id',
    {
      preValidation: [
        server.authenticate,
        server.authorize({
          roles: ['Super Administrator'],
        }),
      ],
    },
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply,
    ) => {
      const { id } = request.params;

      await prisma.client.delete({
        where: { id: parseInt(id, 10) },
      });

      reply.status(204).send();
    },
  );

  /**
   * @route GET /clients/:id/users
   * @desc Get all users associated with a client
   * @access Protected - Requires 'Super Administrator' or 'Client Administrator' role
   */
  server.get(
    '/:id/users',
    {
      preValidation: [
        server.authenticate,
        server.authorize({
          roles: ['Super Administrator', 'Client Administrator'],
          clientParam: 'id',
        }),
      ],
    },
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply,
    ) => {
      const { id } = request.params;

      const users = await prisma.user.findMany({
        where: {
          userRoles: {
            some: {
              clientId: parseInt(id, 10),
            },
          },
        },
        include: {
          userRoles: {
            where: {
              clientId: parseInt(id, 10),
            },
            include: {
              role: true,
            },
          },
        },
      });

      const formattedUsers = users.map((user) => ({
        id: user.id,
        email: user.email,
        username: user.username,
        roles: user.userRoles.map((ur) => ur.role.name),
      }));

      reply.send(formattedUsers);
    },
  );
}
