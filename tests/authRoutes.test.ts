// tests/authRoutes.test.ts

// Step 1: Mock external dependencies before importing them
jest.mock('../src/utils/prisma');
jest.mock('../src/utils/emailService', () => ({
  sendEmail: jest.fn(),
}));

// Step 2: Import Fastify and other modules after mocking
import Fastify, { FastifyInstance } from 'fastify';
import { authRoutes } from '../src/routes/authRoutes';
import prisma from '../src/utils/prisma';
import bcrypt from 'bcryptjs';

// Step 3: Import sendEmail using require to ensure the mocked version is used
import { sendEmail } from '../src/utils/emailService';

describe('Authentication Routes', () => {
  let server: FastifyInstance;

  beforeAll(async () => {
    // Initialize Fastify server
    server = Fastify();

    // Register JWT plugin with a test secret
    server.register(require('fastify-jwt'), {
      secret: process.env.JWT_SECRET || 'testsecret',
    });

    // Register authentication routes
    server.register(authRoutes);

    // Await server readiness
    await server.ready();
  });

  afterAll(async () => {
    // Close the Fastify server after all tests
    await server.close();
  });

  beforeEach(() => {
    // Clear all mock calls and instances before each test to ensure test isolation
    jest.clearAllMocks();
  });

  /**
   * POST /register
   */
  describe('POST /register', () => {
    it('should register a new user and send a confirmation email', async () => {
      // Mock Prisma methods
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockResolvedValue({
        id: 1,
        email: 'testuser@example.com',
        username: 'testuser',
        role: { name: 'Collaborator' },
        createdAt: new Date(),
      });

      // Mock sendEmail to resolve successfully
      (sendEmail as jest.Mock).mockResolvedValue(true);

      // Use Fastify's inject method to simulate a POST request
      const response = await server.inject({
        method: 'POST',
        url: '/register',
        payload: {
          email: 'testuser@example.com',
          password: 'SecurePassword123',
          username: 'testuser',
        },
      });

      // Assertions
      expect(response.statusCode).toBe(201);
      const responseBody = JSON.parse(response.body);
      expect(responseBody.message).toBe(
        'User registered successfully. Please check your email to confirm your account.',
      );
      expect(responseBody.user).toHaveProperty('id');
      expect(responseBody.user.email).toBe('testuser@example.com');
      expect(responseBody.user.username).toBe('testuser');
      expect(responseBody.user.role).toBe('Collaborator');

      // Verify Prisma calls
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'testuser@example.com' },
      });
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          email: 'testuser@example.com',
          password: expect.any(String), // Expect the password to be hashed
          username: 'testuser',
          role: { connect: { name: 'Collaborator' } },
        },
      });

      // Verify sendEmail call
      expect(sendEmail).toHaveBeenCalledWith(
        'testuser@example.com',
        'Welcome to GemQuest - Please Confirm Your Email',
        'welcome',
        expect.objectContaining({
          username: 'testuser',
          confirmationLink: expect.stringContaining(
            '/auth/confirm-email?token=',
          ),
        }),
      );
    });

    it('should return 400 if user already exists', async () => {
      // Mock Prisma to simulate an existing user
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 1,
        email: 'testuser@example.com',
      });

      // Use Fastify's inject method to simulate a POST request
      const response = await server.inject({
        method: 'POST',
        url: '/register',
        payload: {
          email: 'testuser@example.com',
          password: 'SecurePassword123',
          username: 'testuser',
        },
      });

      // Assertions
      expect(response.statusCode).toBe(400);
      const responseBody = JSON.parse(response.body);
      expect(responseBody.error).toBe('User already exists');

      // Verify Prisma calls
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'testuser@example.com' },
      });
      expect(prisma.user.create).not.toHaveBeenCalled();

      // Verify sendEmail not called
      expect(sendEmail).not.toHaveBeenCalled();
    });

    it('should handle email sending failure', async () => {
      // Mock Prisma methods
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockResolvedValue({
        id: 1,
        email: 'testuser@example.com',
        username: 'testuser',
        role: { name: 'Collaborator' },
        createdAt: new Date(),
      });

      // Mock sendEmail to throw an error
      (sendEmail as jest.Mock).mockRejectedValue(
        new Error('Email service failed'),
      );

      // Use Fastify's inject method to simulate a POST request
      const response = await server.inject({
        method: 'POST',
        url: '/register',
        payload: {
          email: 'testuser@example.com',
          password: 'SecurePassword123',
          username: 'testuser',
        },
      });

      // Assertions
      expect(response.statusCode).toBe(500);
      const responseBody = JSON.parse(response.body);
      expect(responseBody.error).toBe('Failed to send confirmation email');

      // Verify Prisma calls
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'testuser@example.com' },
      });
      expect(prisma.user.create).toHaveBeenCalled();

      // Verify sendEmail was called
      expect(sendEmail).toHaveBeenCalled();
    });
  });

  /**
   * GET /confirm-email
   */
  describe('GET /confirm-email', () => {
    it('should confirm the user email', async () => {
      // Mock Prisma to find a user with a valid token
      (prisma.user.findFirst as jest.Mock).mockResolvedValue({
        id: 1,
        confirmationToken: 'validtoken',
        confirmationTokenExpiry: new Date(Date.now() + 1000 * 60 * 60), // 1 hour from now
      });

      // Mock Prisma to update the user
      (prisma.user.update as jest.Mock).mockResolvedValue({
        emailConfirmed: true,
        confirmationToken: null,
        confirmationTokenExpiry: null,
      });

      // Use Fastify's inject method to simulate a GET request
      const response = await server.inject({
        method: 'GET',
        url: '/confirm-email',
        query: {
          token: 'validtoken',
        },
      });

      // Assertions
      expect(response.statusCode).toBe(200);
      const responseBody = JSON.parse(response.body);
      expect(responseBody.message).toBe('Email confirmed successfully');

      // Verify Prisma calls
      expect(prisma.user.findFirst).toHaveBeenCalledWith({
        where: {
          confirmationToken: 'validtoken',
          confirmationTokenExpiry: { gte: expect.any(Date) },
        },
      });
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          emailConfirmed: true,
          confirmationToken: null,
          confirmationTokenExpiry: null,
        },
      });
    });

    it('should return 400 for invalid or expired token', async () => {
      // Mock Prisma to not find any user with the provided token
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);

      // Use Fastify's inject method to simulate a GET request
      const response = await server.inject({
        method: 'GET',
        url: '/confirm-email',
        query: {
          token: 'invalidtoken',
        },
      });

      // Assertions
      expect(response.statusCode).toBe(400);
      const responseBody = JSON.parse(response.body);
      expect(responseBody.error).toBe('Invalid or expired confirmation token');

      // Verify Prisma calls
      expect(prisma.user.findFirst).toHaveBeenCalledWith({
        where: {
          confirmationToken: 'invalidtoken',
          confirmationTokenExpiry: { gte: expect.any(Date) },
        },
      });
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('should return 400 if token is missing', async () => {
      // Use Fastify's inject method to simulate a GET request without a token
      const response = await server.inject({
        method: 'GET',
        url: '/confirm-email',
      });

      // Assertions
      expect(response.statusCode).toBe(400);
      const responseBody = JSON.parse(response.body);
      expect(responseBody.error).toBe('Token is required');

      // Verify Prisma not called
      expect(prisma.user.findFirst).not.toHaveBeenCalled();
      expect(prisma.user.update).not.toHaveBeenCalled();
    });
  });

  /**
   * POST /login
   */
  describe('POST /login', () => {
    it('should login a confirmed user and return a JWT token', async () => {
      // Create a mock user with a hashed password
      const hashedPassword = await bcrypt.hash('SecurePassword123', 10);
      const mockUser = {
        id: 1,
        email: 'testuser@example.com',
        username: 'testuser',
        password: hashedPassword,
        emailConfirmed: true,
        role: { id: 1, name: 'Collaborator' },
      };

      // Mock Prisma to find the user
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      // Use Fastify's inject method to simulate a POST request
      const response = await server.inject({
        method: 'POST',
        url: '/login',
        payload: {
          email: 'testuser@example.com',
          password: 'SecurePassword123',
        },
      });

      // Assertions
      expect(response.statusCode).toBe(200);
      const responseBody = JSON.parse(response.body);
      expect(responseBody).toHaveProperty('token');
      expect(typeof responseBody.token).toBe('string');

      // Verify Prisma calls
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'testuser@example.com' },
        include: { role: true },
      });
    });

    it('should not login if email is not confirmed', async () => {
      // Create a mock user without email confirmation
      const hashedPassword = await bcrypt.hash('SecurePassword123', 10);
      const mockUser = {
        id: 1,
        email: 'testuser@example.com',
        username: 'testuser',
        password: hashedPassword,
        emailConfirmed: false,
        role: { id: 1, name: 'Collaborator' },
      };

      // Mock Prisma to find the user
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      // Use Fastify's inject method to simulate a POST request
      const response = await server.inject({
        method: 'POST',
        url: '/login',
        payload: {
          email: 'testuser@example.com',
          password: 'SecurePassword123',
        },
      });

      // Assertions
      expect(response.statusCode).toBe(401);
      const responseBody = JSON.parse(response.body);
      expect(responseBody.error).toBe(
        'Please confirm your email before logging in',
      );

      // Verify Prisma calls
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'testuser@example.com' },
        include: { role: true },
      });
    });

    it('should not login with invalid credentials', async () => {
      // Mock Prisma to not find any user
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      // Use Fastify's inject method to simulate a POST request
      const response = await server.inject({
        method: 'POST',
        url: '/login',
        payload: {
          email: 'nonexistent@example.com',
          password: 'SomePassword',
        },
      });

      // Assertions
      expect(response.statusCode).toBe(401);
      const responseBody = JSON.parse(response.body);
      expect(responseBody.error).toBe('Invalid email or password');

      // Verify Prisma calls
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'nonexistent@example.com' },
        include: { role: true },
      });
    });
  });

  /**
   * POST /request-password-reset
   */
  describe('POST /request-password-reset', () => {
    it('should send a password reset email to an existing user', async () => {
      // Create a mock user
      const mockUser = {
        id: 1,
        email: 'testuser@example.com',
        username: 'testuser',
      };

      // Mock Prisma to find the user
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.user.update as jest.Mock).mockResolvedValue({
        resetToken: 'validresettoken',
        resetTokenExpiry: new Date(Date.now() + 1000 * 60 * 60), // 1 hour from now
      });

      // Mock sendEmail to resolve successfully
      (sendEmail as jest.Mock).mockResolvedValue(true);

      // Use Fastify's inject method to simulate a POST request
      const response = await server.inject({
        method: 'POST',
        url: '/request-password-reset',
        payload: {
          email: 'testuser@example.com',
        },
      });

      // Assertions
      expect(response.statusCode).toBe(200);
      const responseBody = JSON.parse(response.body);
      expect(responseBody.message).toBe(
        'If that email is registered, you will receive a password reset email shortly.',
      );

      // Verify Prisma calls
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'testuser@example.com' },
      });
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { email: 'testuser@example.com' },
        data: {
          resetToken: expect.any(String),
          resetTokenExpiry: expect.any(Date),
        },
      });

      // Verify sendEmail call
      expect(sendEmail).toHaveBeenCalledWith(
        'testuser@example.com',
        'GemQuest - Password Reset Request',
        'passwordReset',
        expect.objectContaining({
          username: 'testuser',
          resetLink: expect.stringContaining('/auth/reset-password?token='),
        }),
      );
    });

    it('should return the same message for non-existing users', async () => {
      // Mock Prisma to not find any user
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      // Use Fastify's inject method to simulate a POST request
      const response = await server.inject({
        method: 'POST',
        url: '/request-password-reset',
        payload: {
          email: 'nonexistent@example.com',
        },
      });

      // Assertions
      expect(response.statusCode).toBe(200);
      const responseBody = JSON.parse(response.body);
      expect(responseBody.message).toBe(
        'If that email is registered, you will receive a password reset email shortly.',
      );

      // Verify Prisma calls
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'nonexistent@example.com' },
      });
      expect(prisma.user.update).not.toHaveBeenCalled();

      // Verify sendEmail not called
      expect(sendEmail).not.toHaveBeenCalled();
    });

    it('should handle email sending failure', async () => {
      // Create a mock user
      const mockUser = {
        id: 1,
        email: 'testuser@example.com',
        username: 'testuser',
      };

      // Mock Prisma to find the user
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.user.update as jest.Mock).mockResolvedValue({
        resetToken: 'validresettoken',
        resetTokenExpiry: new Date(Date.now() + 1000 * 60 * 60), // 1 hour from now
      });

      // Mock sendEmail to throw an error
      (sendEmail as jest.Mock).mockRejectedValue(
        new Error('Email service failed'),
      );

      // Use Fastify's inject method to simulate a POST request
      const response = await server.inject({
        method: 'POST',
        url: '/request-password-reset',
        payload: {
          email: 'testuser@example.com',
        },
      });

      // Assertions
      expect(response.statusCode).toBe(500);
      const responseBody = JSON.parse(response.body);
      expect(responseBody.error).toBe('Failed to send password reset email');

      // Verify Prisma calls
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'testuser@example.com' },
      });
      expect(prisma.user.update).toHaveBeenCalled();

      // Verify sendEmail call
      expect(sendEmail).toHaveBeenCalled();
    });
  });

  /**
   * POST /set-password
   */
  describe('POST /set-password', () => {
    it('should set a new password and send a confirmation email', async () => {
      // Create a mock user with a valid reset token
      const mockUser = {
        id: 1,
        email: 'testuser@example.com',
        username: 'testuser',
        resetToken: 'validresettoken',
        resetTokenExpiry: new Date(Date.now() + 1000 * 60 * 60), // 1 hour from now
      };

      // Mock Prisma to find the user with the reset token
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(mockUser);
      (prisma.user.update as jest.Mock).mockResolvedValue({
        password: 'newhashedpassword',
        resetToken: null,
        resetTokenExpiry: null,
      });

      // Mock sendEmail to resolve successfully
      (sendEmail as jest.Mock).mockResolvedValue(true);

      // Use Fastify's inject method to simulate a POST request
      const response = await server.inject({
        method: 'POST',
        url: '/set-password',
        payload: {
          token: 'validresettoken',
          newPassword: 'NewSecurePassword456',
        },
      });

      // Assertions
      expect(response.statusCode).toBe(200);
      const responseBody = JSON.parse(response.body);
      expect(responseBody.message).toBe('Password has been reset successfully');

      // Verify Prisma calls
      expect(prisma.user.findFirst).toHaveBeenCalledWith({
        where: {
          resetToken: 'validresettoken',
          resetTokenExpiry: { gte: expect.any(Date) },
        },
      });
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          password: expect.any(String), // Hashed password
          resetToken: null,
          resetTokenExpiry: null,
        },
      });

      // Verify sendEmail call
      expect(sendEmail).toHaveBeenCalledWith(
        'testuser@example.com',
        'Your GemQuest Password Has Been Reset',
        'passwordResetConfirmation',
        {
          username: 'testuser',
        },
      );
    });

    it('should not set password with invalid or expired token', async () => {
      // Mock Prisma to not find any user with the provided reset token
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);

      // Use Fastify's inject method to simulate a POST request
      const response = await server.inject({
        method: 'POST',
        url: '/set-password',
        payload: {
          token: 'invalidresettoken',
          newPassword: 'NewSecurePassword456',
        },
      });

      // Assertions
      expect(response.statusCode).toBe(400);
      const responseBody = JSON.parse(response.body);
      expect(responseBody.error).toBe('Invalid or expired reset token');

      // Verify Prisma calls
      expect(prisma.user.findFirst).toHaveBeenCalledWith({
        where: {
          resetToken: 'invalidresettoken',
          resetTokenExpiry: { gte: expect.any(Date) },
        },
      });
      expect(prisma.user.update).not.toHaveBeenCalled();

      // Verify sendEmail not called
      expect(sendEmail).not.toHaveBeenCalled();
    });

    it('should return 400 if token or newPassword is missing', async () => {
      // Use Fastify's inject method to simulate a POST request without token and newPassword
      const response = await server.inject({
        method: 'POST',
        url: '/set-password',
        payload: {
          token: '',
          newPassword: '',
        },
      });

      // Assertions
      expect(response.statusCode).toBe(400);
      const responseBody = JSON.parse(response.body);
      expect(responseBody.error).toBe('Token and new password are required');

      // Verify Prisma calls
      expect(prisma.user.findFirst).not.toHaveBeenCalled();
      expect(prisma.user.update).not.toHaveBeenCalled();

      // Verify sendEmail not called
      expect(sendEmail).not.toHaveBeenCalled();
    });

    it('should handle email sending failure but still reset the password', async () => {
      // Create a mock user with a valid reset token
      const mockUser = {
        id: 1,
        email: 'testuser@example.com',
        username: 'testuser',
        resetToken: 'validresettoken',
        resetTokenExpiry: new Date(Date.now() + 1000 * 60 * 60), // 1 hour from now
      };

      // Mock Prisma to find the user with the reset token
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(mockUser);
      (prisma.user.update as jest.Mock).mockResolvedValue({
        password: 'newhashedpassword',
        resetToken: null,
        resetTokenExpiry: null,
      });

      // Mock sendEmail to throw an error
      (sendEmail as jest.Mock).mockRejectedValue(
        new Error('Email service failed'),
      );

      // Use Fastify's inject method to simulate a POST request
      const response = await server.inject({
        method: 'POST',
        url: '/set-password',
        payload: {
          token: 'validresettoken',
          newPassword: 'NewSecurePassword456',
        },
      });

      // Assertions
      expect(response.statusCode).toBe(200);
      const responseBody = JSON.parse(response.body);
      expect(responseBody.message).toBe('Password has been reset successfully');

      // Verify Prisma calls
      expect(prisma.user.findFirst).toHaveBeenCalledWith({
        where: {
          resetToken: 'validresettoken',
          resetTokenExpiry: { gte: expect.any(Date) },
        },
      });
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          password: expect.any(String), // Hashed password
          resetToken: null,
          resetTokenExpiry: null,
        },
      });

      // Verify sendEmail call
      expect(sendEmail).toHaveBeenCalledWith(
        'testuser@example.com',
        'Your GemQuest Password Has Been Reset',
        'passwordResetConfirmation',
        {
          username: 'testuser',
        },
      );
    });
  });
});
