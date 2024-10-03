// src/routes/authRoutes.ts

import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { addHours } from '../utils/dateHelpers';
import prisma from '../utils/prisma';
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { sendEmail } from '../utils/emailService';

import '@fastify/jwt'; // Import for module augmentation

export async function authRoutes(server: FastifyInstance) {
  /**
   * @notice Registers a new user and sends a confirmation email.
   */
  server.post(
    '/register',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { email, password, username } = request.body as {
        email: string;
        password: string;
        username: string;
      };

      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        return reply.status(400).send({ error: 'User already exists' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      // Generate a random confirmation token
      const confirmationToken = crypto.randomBytes(32).toString('hex');
      const confirmationTokenExpiry = addHours(24); // Token expires in 24 hours

      const newUser = await prisma.user.create({
        data: {
          email,
          username,
          password: hashedPassword,
          emailConfirmed: false,
          confirmationToken,
          confirmationTokenExpiry,
        },
      });

      const defaultRole = await prisma.role.findUnique({
        where: { name: 'Collaborator' },
      });

      if (defaultRole) {
        await prisma.userRole.create({
          data: {
            userId: newUser.id,
            roleId: defaultRole.id,
            clientId: null, // Global role
          },
        });
      } else {
        console.error('Default role "Collaborator" not found.');
        return reply.status(500).send({ error: 'Server configuration error' });
      }

      const confirmationLink = `${process.env.PROJECT_URL}/auth/confirm-email?token=${confirmationToken}`;

      try {
        await sendEmail(
          email,
          'Welcome to GemQuest - Please Confirm Your Email',
          'welcome', // Template name without .hbs extension
          { username, confirmationLink },
        );
      } catch (error) {
        console.error(`Failed to send confirmation email to ${email}:`, error);
        return reply
          .status(500)
          .send({ error: 'Failed to send confirmation email' });
      }

      reply.status(201).send({
        message:
          'User registered successfully. Please check your email to confirm your account.',
        user: {
          id: newUser.id,
          email: newUser.email,
          username: newUser.username,
          createdAt: newUser.createdAt,
        },
      });
    },
  );

  /**
   * @notice Confirms a user's email using a token.
   */
  server.get(
    '/confirm-email',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { token } = request.query as { token: string };

      if (!token) {
        return reply.status(400).send({ error: 'Token is required.' });
      }

      try {
        // Find the user by the confirmation token
        const user = await prisma.user.findFirst({
          where: {
            confirmationToken: token,
            confirmationTokenExpiry: {
              gte: new Date(), // Ensure token is still valid
            },
          },
        });

        if (!user) {
          return reply.status(400).send({ error: 'Invalid or expired token.' });
        }

        // Confirm the user's email
        await prisma.user.update({
          where: { id: user.id },
          data: {
            emailConfirmed: true,
            confirmationToken: null, // Clear the token after confirmation
            confirmationTokenExpiry: null,
          },
        });

        reply.send({ message: 'Email confirmed successfully.' });
      } catch (error) {
        console.error('Error during email confirmation:', error);
        reply.status(500).send({ error: 'An unknown error occurred.' });
      }
    },
  );

  /**
   * @notice Logs in a user and returns a JWT token
   */
  server.post(
    '/login',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { email, password } = request.body as {
        email: string;
        password: string;
      };

      // Fetch the user
      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        return reply.status(401).send({ error: 'Invalid email or password' });
      }

      // Check if the email is confirmed
      if (!user.emailConfirmed) {
        return reply
          .status(401)
          .send({ error: 'Please confirm your email before logging in' });
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);

      if (!isPasswordValid) {
        return reply.status(401).send({ error: 'Invalid email or password' });
      }

      // Generate the JWT, including only userId
      const token = server.jwt.sign({
        userId: user.id,
      });

      // Return the token to the user
      reply.send({ token });
    },
  );

  // ... (other routes remain unchanged)
}
