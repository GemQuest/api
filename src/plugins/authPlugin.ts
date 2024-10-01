// src/plugins/authPlugin.ts

import fp from 'fastify-plugin';
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { PermissionOptions } from '../config/permission';
import '@fastify/jwt';
import 'fastify';
import '@fastify/jwt'; // Import for module augmentation

export const authPlugin = fp(async (server: FastifyInstance) => {
  // Authentication decorator to verify JWT tokens
  server.decorate(
    'authenticate',
    async function (request: FastifyRequest, reply: FastifyReply) {
      try {
        // Verifies the JWT token attached to the request
        await request.jwtVerify();
      } catch (err) {
        // Sends an error if the JWT verification fails
        reply.send(err);
      }
    },
  );

  // Authorization decorator to check roles
  server.decorate('authorize', function (options: PermissionOptions) {
    return async function (
      request: FastifyRequest<{ Params: Record<string, any> }>,
      reply: FastifyReply,
    ) {
      try {
        const userId = request.user.userId;

        // Determine clientId from request if applicable
        let clientId: number | null = null;
        if (options.clientParam) {
          const params = request.params as Record<string, any>;
          clientId = parseInt(params[options.clientParam], 10);
        } else if (options.clientId) {
          clientId = options.clientId;
        }

        // Fetch user's individual roles
        const userRoles = await server.prisma.userRole.findMany({
          where: {
            userId,
            OR: [
              { clientId }, // Client-specific roles
              { clientId: null }, // Global roles
            ],
          },
          include: {
            role: true,
          },
        });

        // Fetch user's groups
        const userGroups = await server.prisma.userGroup.findMany({
          where: { userId },
          select: { groupId: true },
        });
        const groupIds = userGroups.map((ug) => ug.groupId);

        // Fetch roles assigned to user's groups
        const groupRoles = await server.prisma.groupRole.findMany({
          where: {
            groupId: { in: groupIds },
            OR: [
              { clientId }, // Client-specific roles
              { clientId: null }, // Global roles
            ],
          },
          include: {
            role: true,
          },
        });

        // Combine roles from userRoles and groupRoles
        const allRoles = [
          ...userRoles.map((ur) => ur.role.name),
          ...groupRoles.map((gr) => gr.role.name),
        ];

        // Remove duplicates
        const uniqueRoles = Array.from(new Set(allRoles));

        // Check if user has any of the required roles
        if (options.roles) {
          const roles = options.roles; // Assign to a constant
          const hasRole = uniqueRoles.some((role) => roles.includes(role));
          if (!hasRole) {
            return reply.status(403).send({
              error: `Forbidden - required roles: ${roles.join(', ')}`,
            });
          }
        }

        // If you plan to implement permissions later, you can add code here
        // to check permissions based on roles
      } catch (err) {
        reply.send(err); // Handle any other errors in authorization
      }
    };
  });
});
