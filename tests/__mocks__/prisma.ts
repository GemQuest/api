// tests/__mocks__/prisma.ts

const prisma = {
  user: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  // Mock other models if needed
};

export default prisma;
