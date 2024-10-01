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
   * @notice Registers a new user and sends a confirmation email
   */
  server.post(
    '/register',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { email, password, username } = request.body as {
        email: string;
        password: string;
        username: string;
      };

      // Check if the user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        return reply.status(400).send({ error: 'User already exists' });
      }

      // Hash the user's password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Generate a confirmation token and its expiry
      const confirmationToken = crypto.randomBytes(32).toString('hex');
      const confirmationTokenExpiry = addHours(24); // Token expires in 24 hours

      // Create the user without assigning a role directly
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

      // Assign the default role (e.g., 'Collaborator') to the user
      const defaultRole = await prisma.role.findUnique({
        where: { name: 'Collaborator' },
      });

      if (defaultRole) {
        await prisma.userRole.create({
          data: {
            userId: newUser.id,
            roleId: defaultRole.id,
            clientId: null, // Assuming global role
          },
        });
      } else {
        console.error('Default role "Collaborator" not found.');
        return reply.status(500).send({ error: 'Server configuration error' });
      }

      // Generate the confirmation link
      const confirmationLink = `${process.env.PROJECT_URL}/auth/confirm-email?token=${confirmationToken}`;

      // Send the confirmation email
      try {
        await sendEmail(
          email,
          'Welcome to GemQuest - Please Confirm Your Email',
          'welcome', // Template name without .hbs extension
          {
            username,
            confirmationLink,
          },
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
