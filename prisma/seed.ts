// prisma/seed.ts

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

// Charger les variables d'environnement depuis le fichier .env
dotenv.config();

const prisma = new PrismaClient();

async function main() {
  // Étape 1 : Créer les rôles standard
  const roles = [
    {
      name: 'Super Administrator',
      description: 'Global administrator with all permissions',
    },
    {
      name: 'Client Administrator',
      description: 'Administrator for a specific client',
    },
    {
      name: 'Project Manager',
      description: 'Manages projects and experiences',
    },
    {
      name: 'Developer',
      description: 'Contributes to projects and experiences',
    },
    {
      name: 'Viewer',
      description: 'Read-only access to projects and experiences',
    },
    { name: 'Collaborator', description: 'Default role for new users' },
  ];

  for (const roleData of roles) {
    await prisma.role.upsert({
      where: { name: roleData.name },
      update: {},
      create: roleData,
    });
  }

  // Étape 2 : Créer l'utilisateur Super Administrator initial
  const adminPassword = process.env.GEMQUEST_ADMIN_PASS;
  if (!adminPassword) {
    console.error('GEMQUEST_ADMIN_PASS environment variable is not set.');
    process.exit(1);
  }
  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  const superAdminRole = await prisma.role.findUnique({
    where: { name: 'Super Administrator' },
  });
  if (!superAdminRole) {
    console.error('Role "Super Administrator" not found.');
    process.exit(1);
  }

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      username: 'admin',
      email: 'admin@example.com',
      password: hashedPassword,
      emailConfirmed: true,
    },
  });

  // Assigner le rôle Super Administrator à l'utilisateur admin
  const existingUserRole = await prisma.userRole.findFirst({
    where: {
      userId: adminUser.id,
      roleId: superAdminRole.id,
      clientId: null,
    },
  });

  if (!existingUserRole) {
    await prisma.userRole.create({
      data: {
        userId: adminUser.id,
        roleId: superAdminRole.id,
        clientId: null, // Rôle global
      },
    });
  }

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
