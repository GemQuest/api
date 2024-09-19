import { FastifyInstance } from 'fastify';
import bcrypt from 'bcryptjs';
import prisma from '../utils/prisma';

/**
 * @notice Registers authentication routes for user registration and login.
 * @param server Fastify instance to which the routes are added.
 */
export async function authRoutes(server: FastifyInstance) {
  /**
   * @notice Route for registering a new user.
   * @param username Username of the new user
   * @param password Password of the new user (plain text, will be hashed)
   * @return Returns a success message or error
   */
  server.post('/register', async (request, reply) => {
    try {
      const { username, password } = request.body as {
        username: string;
        password: string;
      };
      // Check if the user already exists
      const existingUser = await prisma.user.findUnique({
        where: { username },
      });

      // Check if user already exists
      if (existingUser) {
        return reply.status(400).send({ error: 'User already exists' });
      }

      // Hash the password before saving
      const hashedPassword = await bcrypt.hash(password, 10);

      // create the user
      const user = await prisma.user.create({
        data: { username, password: hashedPassword },
      });

      reply.send({ message: 'User registered successfully' });
    } catch (err) {
      server.log.error(err);
      reply
        .status(500)
        .send({ error: 'Something went wrong during registration' });
    }
  });

  /**
   * @notice Route for logging in a user.
   * @param username Username of the user trying to log in
   * @param password Password of the user trying to log in (plain text)
   * @return Returns a JWT token if login is successful
   */
  server.post('/login', async (request, reply) => {
    const { username, password } = request.body as {
      username: string;
      password: string;
    };

    // Fetch the user from the database
    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return reply.status(401).send({ error: 'Invalid username or password' });
    }

    // Generate a JWT token for the user
    const token = server.jwt.sign({ username: user.username });

    reply.send({ token });
  });

  /**
   * @notice Protected route that returns the authenticated user's profile.
   * @return Returns the authenticated user's information
   */
  server.get(
    '/profile',
    { preValidation: [server.authenticate] },
    async (request, reply) => {
      reply.send(request.user); // Return the decoded JWT payload (user info)
    },
  );
}
