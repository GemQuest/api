// src/routes/collaboratorRoutes.ts

import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import prisma from '../utils/prisma';

export async function collaboratorRoutes(server: FastifyInstance) {
  server.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const { email, clientId, role } = request.body as {
      email: string;
      clientId: number;
      role: string;
    };

    // Check if the collaborator already exists
    const existingCollaborator = await prisma.collaborator.findUnique({
      where: { email },
    });

    if (existingCollaborator) {
      return reply.status(400).send({ error: 'Collaborator already exists' });
    }

    // Check if the user exists
    let user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Create a new user if not exists
      user = await prisma.user.create({
        data: {
          username: email, // Or generate a username based on your logic
          email,
          password: 'temporaryPassword', // Handle this securely
          role: {
            connect: { name: 'Collaborator' }, // Ensure this role exists
          },
        },
      });

      // TODO: Send an invitation email to the collaborator to set their password
    }

    // Create the collaborator
    const collaborator = await prisma.collaborator.create({
      data: {
        email,
        role,
        client: {
          connect: { id: clientId },
        },
        user: {
          connect: { id: user.id },
        },
      },
    });

    reply.send(collaborator);
  });

  // GET all collaborators
  server.get('/', async (_request: FastifyRequest, reply: FastifyReply) => {
    const collaborators = await prisma.collaborator.findMany({
      include: {
        user: true,
        client: true,
      },
    });
    reply.send(collaborators);
  });

  // Add other CRUD operations as needed
}
