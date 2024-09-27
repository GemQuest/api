// src/routes/authRoutes.ts

import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { addHours } from '../utils/dateHelpers'; // Import the global helper function
import prisma from '../utils/prisma';
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { sendEmail } from '../utils/emailService'; // Import the sendEmail function
import { UserWithRole } from 'types/user';

/**
 * Defines routes related to authentication, password setup, and reset
 */
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

      // Create the user with default role and confirmation token
      const newUser: UserWithRole = await prisma.user.create({
        data: {
          email,
          username,
          password: hashedPassword,
          emailConfirmed: false,
          confirmationToken,
          confirmationTokenExpiry,
          role: {
            connect: { name: 'Collaborator' }, // Assign default role, adjust as needed
          },
        },
        include: { role: true }, // Include the role relation
      });

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
        // Optionally, handle email sending failure
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
          role: newUser.role.name,
          createdAt: newUser.createdAt,
        },
      });
    },
  );

  /**
   * @notice Confirms a user's email using a confirmation token
   */
  server.get(
    '/confirm-email',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { token } = request.query as { token: string };

      if (!token) {
        return reply.status(400).send({ error: 'Token is required' });
      }

      // Find the user with the matching confirmation token and ensure it's not expired
      const user = await prisma.user.findFirst({
        where: {
          confirmationToken: token,
          confirmationTokenExpiry: {
            gte: new Date(), // Token must not be expired
          },
        },
      });

      if (!user) {
        return reply
          .status(400)
          .send({ error: 'Invalid or expired confirmation token' });
      }

      // Update the user's emailConfirmed status and clear the confirmation token
      await prisma.user.update({
        where: { id: user.id },
        data: {
          emailConfirmed: true,
          confirmationToken: null,
          confirmationTokenExpiry: null,
        },
      });

      reply.send({ message: 'Email confirmed successfully' });
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

      // Fetch the user and their role
      const user = await prisma.user.findUnique({
        where: { email },
        include: {
          role: true, // Include the role relation to get roleId and roleName
        },
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

      // Generate the JWT, including both roleId and roleName
      const token = server.jwt.sign({
        userId: user.id,
        username: user.username,
        roleId: user.roleId, // roleId for internal use
        roleName: user.role.name, // roleName for readability
      });

      // Return the token to the user
      reply.send({ token });
    },
  );

  /**
   * @notice Sets a new password for a user using a reset token
   * @dev Validates the reset token and sets the new password, clearing the resetToken and resetTokenExpiry fields
   * @param request The Fastify request object containing the body with token and newPassword
   * @param reply The Fastify reply object to send back the response
   * @return A success message if the password is set, or an error message if the token is invalid or expired
   */
  server.post(
    '/set-password',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { token, newPassword } = request.body as {
        token: string;
        newPassword: string;
      };

      // Validate input
      if (!token || !newPassword) {
        return reply
          .status(400)
          .send({ error: 'Token and new password are required' });
      }

      // Find the user with the matching reset token and ensure the token is still valid
      const user = await prisma.user.findFirst({
        where: {
          resetToken: token,
          resetTokenExpiry: {
            gte: new Date(), // Token must not be expired
          },
        },
      });

      if (!user) {
        return reply
          .status(400)
          .send({ error: 'Invalid or expired reset token' });
      }

      // Hash the new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update the user's password and clear the reset token and expiry
      await prisma.user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          resetToken: null,
          resetTokenExpiry: null,
        },
      });

      // Optionally, send a confirmation email about the password reset
      try {
        await sendEmail(
          user.email,
          'Your GemQuest Password Has Been Reset',
          'passwordResetConfirmation', // Template name without .hbs extension
          {
            username: user.username,
          },
        );
      } catch (error) {
        console.error(
          `Failed to send password reset confirmation email to ${user.email}:`,
          error,
        );
        // Decide if you want to fail the response or proceed
        // Here, we'll proceed with the response even if the email fails
      }

      reply.send({ message: 'Password has been reset successfully' });
    },
  );

  /**
   * @notice Requests a password reset by generating a reset token and expiry
   * @dev Generates a reset token and updates the user with this token and its expiry, sending an email with the token
   * @param request The Fastify request object containing the body with email
   * @param reply The Fastify reply object to send back the response
   * @return A success message indicating the token has been sent, or an error message if the user is not found
   */
  server.post(
    '/request-password-reset',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { email } = request.body as { email: string };

      // Validate input
      if (!email) {
        return reply.status(400).send({ error: 'Email is required' });
      }

      // Find the user by email
      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        // For security, we send the same response even if the user doesn't exist
        return reply.status(200).send({
          message:
            'If that email is registered, you will receive a password reset email shortly.',
        });
      }

      // Generate a new reset token and expiry
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenExpiry = addHours(1); // Token expires in 1 hour

      // Update the user with the new reset token and expiry
      await prisma.user.update({
        where: { email },
        data: {
          resetToken,
          resetTokenExpiry,
        },
      });

      // Generate the reset link
      const resetLink = `${process.env.PROJECT_URL}/auth/reset-password?token=${resetToken}`;

      // Send the password reset email
      try {
        await sendEmail(
          email,
          'GemQuest - Password Reset Request',
          'passwordReset', // Template name without .hbs extension
          {
            username: user.username,
            resetLink,
          },
        );
      } catch (error) {
        console.error(
          `Failed to send password reset email to ${email}:`,
          error,
        );
        return reply
          .status(500)
          .send({ error: 'Failed to send password reset email' });
      }

      reply.send({
        message:
          'If that email is registered, you will receive a password reset email shortly.',
      });
    },
  );
}
