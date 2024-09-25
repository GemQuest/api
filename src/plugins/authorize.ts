// src/plugins/authorize.ts

import { FastifyReply, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import { PermissionOptions, rolePermissions } from '../config/permission';
import 'fastify';
import '@fastify/jwt'; // Import for module augmentation

export default fp(async (server) => {
  // Authorization decorator
  server.decorate('authorize', function (options: PermissionOptions) {
    return async function (request: FastifyRequest, reply: FastifyReply) {
      try {
        // Verify JWT token to authenticate the user
        await request.jwtVerify();

        // Extract roleId and roleName from the JWT
        const userRoleId = request.user.roleId;
        const userRoleName = request.user.roleName;

        // Check if the user's roleId is in the allowed roles for performance
        if (options.roles && !options.roles.includes(userRoleName)) {
          return reply.status(403).send({
            error: `Forbidden - required roleId: ${options.roles.join(', ')} (you are ${userRoleName})`,
          });
        }

        // If permissions are specified, verify if the user has them
        if (options.permissions) {
          const userPermissions = rolePermissions[userRoleName] || []; // Permissions are linked to the roleName
          const hasPermission = options.permissions.every((perm) =>
            userPermissions.includes(perm),
          );

          // If the user lacks permissions, return a 403 Forbidden error
          if (!hasPermission) {
            return reply
              .status(403)
              .send({
                error: `Insufficient permissions for role: ${userRoleName}`,
              });
          }
        }
      } catch (err) {
        reply.send(err); // Handle errors related to authorization
      }
    };
  });
});
