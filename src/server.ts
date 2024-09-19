import Fastify from 'fastify';
import fastifyJwt from '@fastify/jwt';
import { authRoutes } from './routes/auth';
import fastifyFormbody from '@fastify/formbody';
import dotenvFlow from 'dotenv-flow';
import authPlugin from './plugins/authPlugin';
import fastify from './@types/fastify';

// Load environment variables
dotenvFlow.config();

const server = Fastify({ logger: true });

// Register the form-body parser
server.register(authPlugin);

// Register JWT plugin
server.register(fastifyJwt, {
  secret: process.env.JWT_SECRET || 'fallback-secret',
});

// Register the auth routes
server.register(authRoutes, { prefix: '/auth' });

const start = async () => {
  try {
    server.log.info('JWT Secret: ' + process.env.JWT_SECRET);
    await server.listen({ port: 3000, host: '0.0.0.0' });
    server.log.info(`Server listening on http://localhost:3000`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

// Start the server
start();
