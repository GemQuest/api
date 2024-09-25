import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

const prisma = new PrismaClient();

async function main() {
  // Step 1: Create Basic Roles
  const adminRole = await prisma.role.upsert({
    where: { name: 'Admin' },
    update: {},
    create: { name: 'Admin' },
  });

  const collaboratorRole = await prisma.role.upsert({
    where: { name: 'Collaborator' },
    update: {},
    create: { name: 'Collaborator' },
  });

  // Step 2: Create the First Admin User
  const adminPassword = process.env.GEMQUEST_ADMIN_PASS;
  if (!adminPassword) {
    console.error('GEMQUEST_ADMIN_PASS environment variable is not set.');
    process.exit(1);
  }
  const hashedPassword = await bcrypt.hash(adminPassword, 10); // Use a secure password

  const adminUser = await prisma.user.upsert({
    where: { email: 'remy.cerlo.nas@gmail.com' },
    update: {},
    create: {
      username: 'goulvy',
      email: 'remy.cerlo.nas@gmail.com',
      password: hashedPassword, // Store the hashed password
      role: {
        connect: { id: adminRole.id }, // Assign the 'Admin' role to this user
      },
    },
  });

  console.log('Seed data inserted successfully!');
  console.log('Admin User:', adminUser);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
