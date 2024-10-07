// src/server.ts

import Fastify from 'fastify';
import fastifyFormbody from '@fastify/formbody';
import fastifyCors from '@fastify/cors';
import fastifyRateLimit from '@fastify/rate-limit';

import authPlugin from './plugins/authPlugin';
import jwtPlugin from './plugins/jwtPlugin';
import prismaPlugin from './plugins/prismaPlugin';
import { authRoutes } from './routes/authRoutes';
import { experienceRoutes } from './routes/experienceRoutes';
import { nftRoutes } from './routes/nftRoutes';
import { clientRoutes } from './routes/clientRoutes';
import dotenvFlow from 'dotenv-flow'; // Import dotenv-flow to load .env files

// Load environment variables from .env files
dotenvFlow.config();

const server = Fastify({ logger: true });

// Register plugins
server.register(fastifyFormbody);
server.register(jwtPlugin);
server.register(prismaPlugin);
server.register(authPlugin);

// Register CORS plugin and configure it
server.register(fastifyCors, {
  origin: true, // Allow all origins
  methods: ['GET', 'POST', 'PUT', 'DELETE'], // Specify allowed methods
  credentials: true, // Enable credentials if necessary
});

// Register routes
server.register(authRoutes, { prefix: '/auth' });
server.register(experienceRoutes, { prefix: '/experiences' });
server.register(nftRoutes, { prefix: '/nfts' });
server.register(clientRoutes, { prefix: '/clients' }); // Register the clientRoutes
server.register(fastifyRateLimit, {
  max: 5, // Maximum number of requests
  timeWindow: '1 minute', // Time window
  allowList: ['::1'], // Allow localhost for testing
});

// Start the server
const startServer = async () => {
  try {
    await server.listen({ port: 3030, host: '0.0.0.0' });
    server.log.info('Server started');
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

startServer();
