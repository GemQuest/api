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
          clientParam: 'clientId', // Assuming clientId is in request.params
        }),
      ],
    },
    async (request, reply) => {
      const { name, description, clientId } = request.body as {
        name: string;
        description?: string;
        clientId: number;
      };

      // Validate clientId
      if (!clientId) {
        return reply.status(400).send({ error: 'clientId is required' });
      }

      // Proceed with creating the experience for the specified client
      const experience = await server.prisma.experience.create({
        data: {
          name,
          description,
          clientId,
          createdById: request.user.userId,
        },
      });

      return reply.status(201).send(experience);
    },
  );

  // Get All Experiences for a Client
  server.get(
    '/client/:clientId',
    {
      preValidation: [
        server.authenticate,
        server.authorize({
          roles: ['Client Administrator', 'Super Administrator'],
          clientParam: 'clientId',
        }),
      ],
    },
    async (request, reply) => {
      const { clientId } = request.params as { clientId: string };

      const experiences = await server.prisma.experience.findMany({
        where: { clientId: parseInt(clientId, 10) },
      });
      return reply.send(experiences);
    },
  );

  // Update Experience
  server.put(
    '/:id',
    {
      preValidation: [
        server.authenticate,
        server.authorize({
          roles: ['Client Administrator', 'Super Administrator'],
          // You may need to fetch the clientId associated with the experience here
        }),
      ],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const { name, description } = request.body as {
        name?: string;
        description?: string;
      };

      // Fetch the experience to get clientId
      const existingExperience = await server.prisma.experience.findUnique({
        where: { id: parseInt(id, 10) },
      });

      if (!existingExperience) {
        return reply.status(404).send({ error: 'Experience not found' });
      }

      // Authorize using clientId of the experience
      await server.authorize({
        roles: ['Client Administrator', 'Super Administrator'],
        clientId: existingExperience.clientId,
      })(request, reply);

      // Proceed with update
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
      preValidation: [server.authenticate],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      // Fetch the experience to get clientId
      const existingExperience = await server.prisma.experience.findUnique({
        where: { id: parseInt(id, 10) },
      });

      if (!existingExperience) {
        return reply.status(404).send({ error: 'Experience not found' });
      }

      // Authorize using clientId of the experience
      await server.authorize({
        roles: ['Client Administrator', 'Super Administrator'],
        clientId: existingExperience.clientId,
      })(request, reply);

      // Proceed with deletion
      await server.prisma.experience.delete({
        where: { id: parseInt(id, 10) },
      });

      return reply.status(204).send();
    },
  );
}
