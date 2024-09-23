import 'fastify';
import { PermissionOptions } from '../config/permissions';

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (
      request: FastifyRequest,
      reply: FastifyReply,
    ) => Promise<void>;
    authorize: (options: PermissionOptions) => any;
    prisma: import('@prisma/client').PrismaClient;
  }
}
