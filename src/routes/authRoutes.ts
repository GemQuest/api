// src/routes/authRoutes.ts

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import bcrypt from 'bcryptjs';

export async function authRoutes(server: FastifyInstance) {
  // Register route
  server.post(
    '/register',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { username, email, password } = request.body as {
        username: string;
        email: string;
        password: string;
      };

      // Check if the user already exists
      const existingUser = await server.prisma.user.findUnique({
        where: { username },
      });
      if (existingUser) {
        return reply.status(400).send({ error: 'User already exists' });
      }

      // Hash the password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Assign default role
      let role = await server.prisma.role.findUnique({
        where: { name: 'End User' },
      });
      if (!role) {
        role = await server.prisma.role.create({ data: { name: 'End User' } });
      }

      // Create the user
      await server.prisma.user.create({
        data: {
          username,
          email, // Include the email here
          password: hashedPassword,
          role: {
            connect: { id: role.id },
          },
        },
      });

      return reply
        .status(200)
        .send({ message: 'User registered successfully' });
    },
  );

  // Login route
  server.post('/login', async (request, reply) => {
    const { username, password } = request.body as {
      username: string;
      password: string;
    };

    const user = await server.prisma.user.findUnique({
      where: { username },
      include: { role: true },
    });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return reply.status(401).send({ error: 'Invalid username or password' });
    }

    const token = server.jwt.sign({
      userId: user.id,
      username: user.username,
      role: user.role.name,
    });

    return reply.status(200).send({ token });
  });

  // Profile route
  server.get(
    '/profile',
    { preValidation: [server.authenticate] },
    async (request, reply) => {
      const user = await server.prisma.user.findUnique({
        where: { id: request.user.userId },
        select: { id: true, username: true, createdAt: true },
      });

      if (!user) {
        return reply.status(404).send({ error: 'User not found' });
      }

      return reply.status(200).send(user);
    },
  );
}
