// src/types/user.ts

import { Prisma } from '@prisma/client';

export type UserWithRoles = Prisma.UserGetPayload<{
  include: {
    userRoles: {
      include: {
        role: true;
      };
    };
  };
}>;
