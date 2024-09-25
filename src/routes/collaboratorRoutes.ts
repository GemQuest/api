// src/routes/collaboratorRoutes.ts

import crypto from 'crypto'; // For generating secure tokens
import { addHours } from '../utils/dateHelpers'; // Import the global helper function
import prisma from '../utils/prisma';
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

/**
 * @notice Defines routes related to collaborator management
 * @dev Handles collaborator creation, fetching all collaborators, and token generation for new users.
 */
export async function collaboratorRoutes(server: FastifyInstance) {
  /**
   * @notice Creates a new collaborator and user, generates a token for setting a password
   * @dev Checks if the user exists, generates a token for password setup, and links the user as a collaborator to a client.
   * @param request The Fastify request object containing the body with email, clientId, and role
   * @param reply The Fastify reply object to send back the response
   * @return The newly created collaborator or an error message if the collaborator already exists
   */
  server.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const { email, clientId, role } = request.body as {
      email: string;
      clientId: number;
      role: string;
    };

    // Check if the user exists
    let user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Generate a secure token for password setup
      const token = crypto.randomBytes(32).toString('hex');
      const tokenExpiry = addHours(1); // Token expires in 1 hour

      // Create a new user with resetToken and resetTokenExpiry
      user = await prisma.user.create({
        data: {
          username: email, // Use email as the username
          email,
          password: 'temporaryPassword', // Temporary password, handle securely later
          resetToken: token,
          resetTokenExpiry: tokenExpiry,
          role: {
            connect: { name: 'Collaborator' }, // Assign Collaborator role
          },
        },
      });

      // TODO: Send an invitation email to the collaborator to set their password using the token
    }

    // Check if the user is already a collaborator for the specified client
    const existingCollaborator = await prisma.collaborator.findFirst({
      where: {
        userId: user.id,
        clientId,
      },
    });

    if (existingCollaborator) {
      return reply
        .status(400)
        .send({ error: 'Collaborator already exists for this client' });
    }

    // Create the collaborator for the specified client
    const collaborator = await prisma.collaborator.create({
      data: {
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

  /**
   * @notice Fetches all collaborators with related user and client details
   * @dev Fetches all records from the Collaborator model with included relations to User and Client
   * @param request The Fastify request object (unused in this route)
   * @param reply The Fastify reply object to send back the list of collaborators
   * @return A list of all collaborators along with associated user and client information
   */
  server.get('/', async (_request: FastifyRequest, reply: FastifyReply) => {
    const collaborators = await prisma.collaborator.findMany({
      include: {
        user: true,
        client: true,
      },
    });
    reply.send(collaborators);
  });
}
