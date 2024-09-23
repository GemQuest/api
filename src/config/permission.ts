// src/config/permissions.ts

export interface PermissionOptions {
  roles?: string[];
  permissions?: string[];
}

export const rolePermissions: { [key: string]: string[] } = {
  'Super Administrator': ['create', 'read', 'update', 'delete', 'manage'],
  'Client Administrator': ['create', 'read', 'update', 'delete'],
  'Staff Member': ['read', 'update'],
  'End User': ['read', 'execute'],
  // Add other roles as needed
};
