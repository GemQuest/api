// src/plugins/authorize.ts

import { FastifyReply, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import { PermissionOptions, rolePermissions } from '../config/permission';
import 'fastify';
import '@fastify/jwt'; // Import for module augmentation

export default fp(async (server) => {
  server.decorate('authorize', function (options: PermissionOptions) {
    return async function (request: FastifyRequest, reply: FastifyReply) {
      try {
        await request.jwtVerify();

        const userRole = request.user.role;

        // Check if the user's role is allowed
        if (options.roles && !options.roles.includes(userRole)) {
          return reply.status(403).send({ error: 'Forbidden' });
        }

        // Check if the user has the required permissions
        if (options.permissions) {
          const userPermissions = rolePermissions[userRole] || [];
          const hasPermission = options.permissions.every((perm) =>
            userPermissions.includes(perm),
          );

          if (!hasPermission) {
            return reply
              .status(403)
              .send({ error: 'Insufficient permissions' });
          }
        }
      } catch (err) {
        reply.send(err);
      }
    };
  });
});
