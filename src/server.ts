// src/server.ts

import Fastify from 'fastify';
import fastifyFormbody from '@fastify/formbody';
import authPlugin from './plugins/authPlugin';
import jwtPlugin from './plugins/jwtPlugin';
import prismaPlugin from './plugins/prismaPlugin';
import { authRoutes } from './routes/authRoutes';
import { experienceRoutes } from './routes/experienceRoutes';
import { nftRoutes } from './routes/nftRoutes';
import { clientRoutes } from './routes/clientRoutes'; // Import the clientRoutes
import dotenvFlow from 'dotenv-flow'; // Import dotenv-flow to load .env files

// Load environment variables from .env files
dotenvFlow.config();

const server = Fastify({ logger: true });

// Register plugins
server.register(fastifyFormbody);
server.register(jwtPlugin);
server.register(prismaPlugin);
server.register(authPlugin);

// Register routes
server.register(authRoutes, { prefix: '/auth' });
server.register(experienceRoutes, { prefix: '/experiences' });
server.register(nftRoutes, { prefix: '/nfts' });
server.register(clientRoutes, { prefix: '/clients' }); // Register the clientRoutes

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
