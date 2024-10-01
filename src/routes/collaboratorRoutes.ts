// src/routes/collaboratorRoutes.ts

import { FastifyInstance } from 'fastify';
import crypto from 'crypto';
import { addHours } from '../utils/dateHelpers';
import { sendEmail } from '../utils/emailService';

export async function collaboratorRoutes(server: FastifyInstance) {
  // Create a new collaborator and send an invitation email
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
      const {
        email,
        clientId,
        role: roleName,
      } = request.body as {
        email: string;
        clientId: number;
        role: string;
      };

      // Check if the user already exists
      let user = await server.prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        // If user doesn't exist, create a new user with a temporary password and reset token
        const token = crypto.randomBytes(32).toString('hex');
        const tokenExpiry = addHours(24);

        user = await server.prisma.user.create({
          data: {
            username: email,
            email,
            password: 'temporaryPassword',
            resetToken: token,
            resetTokenExpiry: tokenExpiry,
          },
        });

        // Send invitation email with reset token
        const resetLink = `${process.env.PROJECT_URL}/auth/set-password?token=${token}`;
        try {
          await sendEmail(
            email,
            'You have been invited to GemQuest',
            'invitation', // Email template
            {
              resetLink,
            },
          );
        } catch (error) {
          console.error(`Failed to send invitation email to ${email}:`, error);
          // Handle the error as needed
        }
      }

      // Check if the user already has a role for the client
      const existingUserRole = await server.prisma.userRole.findFirst({
        where: {
          userId: user.id,
          clientId,
        },
      });

      if (existingUserRole) {
        return reply
          .status(400)
          .send({ error: 'User already has a role for this client' });
      }

      // Assign the role to the user for the client
      const role = await server.prisma.role.findUnique({
        where: { name: roleName },
      });
      if (!role) {
        return reply.status(400).send({ error: 'Invalid role name' });
      }

      const userRole = await server.prisma.userRole.create({
        data: {
          userId: user.id,
          roleId: role.id,
          clientId,
        },
      });

      reply.send({
        id: userRole.id,
        role: role.name,
        userId: user.id,
        clientId,
      });
    },
  );

  // Fetch all collaborators with user and client details
  server.get(
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
      const userRoles = await server.prisma.userRole.findMany({
        include: {
          user: true,
          client: true,
          role: true,
        },
      });

      const collaborators = userRoles.map((ur) => ({
        id: ur.id,
        role: ur.role.name,
        user: {
          id: ur.user.id,
          email: ur.user.email,
          username: ur.user.username,
        },
        client: ur.client
          ? {
              id: ur.client.id,
              name: ur.client.name,
            }
          : null,
      }));

      reply.send(collaborators);
    },
  );
}
