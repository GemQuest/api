// src/routes/experienceRoutes.ts

import { FastifyInstance } from 'fastify';

export async function experienceRoutes(server: FastifyInstance) {
  // Create Experience
  server.post(
    '/',
    {
      preValidation: [
        server.authenticate,
        server.authorize({
          roles: ['Client Administrator', 'Super Administrator'],
        }),
      ],
    },
    async (request, reply) => {
      const { name, description } = request.body as {
        name: string;
        description?: string;
      };

      const experience = await server.prisma.experience.create({
        data: {
          name,
          description,
          createdById: request.user.userId,
        },
      });

      return reply.status(201).send(experience);
    },
  );

  // Get All Experiences
  server.get('/', async (_request, reply) => {
    const experiences = await server.prisma.experience.findMany();
    return reply.send(experiences);
  });

  // Update Experience
  server.put(
    '/:id',
    {
      preValidation: [
        server.authenticate,
        server.authorize({
          roles: ['Client Administrator', 'Super Administrator'],
        }),
      ],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const { name, description } = request.body as {
        name?: string;
        description?: string;
      };

      const experience = await server.prisma.experience.update({
        where: { id: parseInt(id, 10) },
        data: { name, description },
      });

      return reply.send(experience);
    },
  );

  // Delete Experience
  server.delete(
    '/:id',
    {
      preValidation: [
        server.authenticate,
        server.authorize({
          roles: ['Client Administrator', 'Super Administrator'],
        }),
      ],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      await server.prisma.experience.delete({
        where: { id: parseInt(id, 10) },
      });

      return reply.status(204).send();
    },
  );

  // To be completed
}
