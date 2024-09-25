// src/plugins/authPlugin.ts

import fp from 'fastify-plugin';
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { PermissionOptions, rolePermissions } from '../config/permission';
import '@fastify/jwt';

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

  // Authorization decorator to check roles and permissions
  server.decorate('authorize', function (options: PermissionOptions) {
    return async function (request: FastifyRequest, reply: FastifyReply) {
      try {
        // Accessing roleId and roleName from the JWT token
        const userRoleId = request.user.roleId;
        const userRoleName = request.user.roleName;

        // Check if the user's roleId is in the allowed roles (for performance)
        if (options.roles && !options.roles.includes(userRoleName)) {
          return reply.status(403).send({
            error: `Forbidden - required roleId: ${options.roles.join(', ')} (you are ${userRoleName})`,
          });
        }

        // If permissions are specified, check if the user has the necessary permissions
        if (options.permissions) {
          const userPermissions = rolePermissions[userRoleName] || []; // Permissions are tied to the roleName for readability
          const hasPermission = options.permissions.every((perm) =>
            userPermissions.includes(perm),
          );

          // If the user lacks the required permissions, return a 403 Forbidden error
          if (!hasPermission) {
            return reply.status(403).send({
              error: `Insufficient permissions for role: ${userRoleName}`,
            });
          }
        }
      } catch (err) {
        reply.send(err); // Handle any other errors in authorization
      }
    };
  });
});
