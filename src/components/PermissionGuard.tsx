// src/components/PermissionGuard.tsx
'use client';

import { useAuth } from '@/contexts/AuthContext';

interface PermissionGuardProps {
  children: React.ReactNode;
  permission: string;
  fallback?: React.ReactNode;
}

/**
 * PermissionGuard - Show/hide UI elements based on user permissions
 *
 * Usage:
 * <PermissionGuard permission="PROJECT_CREATE">
 *   <button>Create Project</button>
 * </PermissionGuard>
 */
export function PermissionGuard({ children, permission, fallback = null }: PermissionGuardProps) {
  const { user } = useAuth();

  if (!user) {
    return <>{fallback}</>;
  }

  // Check if user has the required permission
  const hasPermission = checkPermission(user.roles, permission);

  if (!hasPermission) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

/**
 * Check if user has a specific permission based on their roles
 */
function checkPermission(roles: Array<{ role: string; scope: string; scopeId: string | null }>, permission: string): boolean {
  // Define permission mappings for each role
  const rolePermissions: Record<string, string[]> = {
    // System Admin - All permissions
    SYSTEM_ADMIN: ['*'],

    // Organization Owner - Full control of organization
    ORG_OWNER: [
      'ORG_VIEW',
      'ORG_UPDATE',
      'ORG_DELETE',
      'ORG_INVITE',
      'ORG_MANAGE_MEMBERS',
      'PROJECT_CREATE',
      'PROJECT_VIEW',
      'PROJECT_UPDATE',
      'PROJECT_DELETE',
      'APP_CREATE',
      'APP_VIEW',
      'APP_UPDATE',
      'APP_DELETE',
      'RUN_VIEW',
      'RUN_DELETE',
      'API_KEY_CREATE',
      'API_KEY_VIEW',
      'API_KEY_DELETE',
    ],

    // Organization Admin - Most permissions except org deletion
    ORG_ADMIN: [
      'ORG_VIEW',
      'ORG_UPDATE',
      'ORG_INVITE',
      'PROJECT_CREATE',
      'PROJECT_VIEW',
      'PROJECT_UPDATE',
      'PROJECT_DELETE',
      'APP_CREATE',
      'APP_VIEW',
      'APP_UPDATE',
      'APP_DELETE',
      'RUN_VIEW',
      'RUN_DELETE',
      'API_KEY_CREATE',
      'API_KEY_VIEW',
      'API_KEY_DELETE',
    ],

    // Project Admin - Full control of specific project
    PROJECT_ADMIN: [
      'PROJECT_VIEW',
      'PROJECT_UPDATE',
      'APP_CREATE',
      'APP_VIEW',
      'APP_UPDATE',
      'APP_DELETE',
      'RUN_VIEW',
      'RUN_DELETE',
      'API_KEY_CREATE',
      'API_KEY_VIEW',
      'API_KEY_DELETE',
    ],

    // Project Member - Can create apps and view runs
    PROJECT_MEMBER: [
      'PROJECT_VIEW',
      'APP_CREATE',
      'APP_VIEW',
      'APP_UPDATE',
      'RUN_VIEW',
      'API_KEY_VIEW',
    ],

    // Viewer - Read-only access
    VIEWER: [
      'ORG_VIEW',
      'PROJECT_VIEW',
      'APP_VIEW',
      'RUN_VIEW',
      'API_KEY_VIEW',
    ],
  };

  // Check each role
  for (const roleAssignment of roles) {
    const permissions = rolePermissions[roleAssignment.role] || [];

    // If role has all permissions (*)
    if (permissions.includes('*')) {
      return true;
    }

    // If role has the specific permission
    if (permissions.includes(permission)) {
      return true;
    }
  }

  return false;
}

/**
 * Hook to check permissions programmatically
 */
export function usePermission(permission: string): boolean {
  const { user } = useAuth();

  if (!user) {
    return false;
  }

  return checkPermission(user.roles, permission);
}

/**
 * Hook to check multiple permissions (requires ALL)
 */
export function usePermissions(permissions: string[]): boolean {
  const { user } = useAuth();

  if (!user) {
    return false;
  }

  return permissions.every((permission) => checkPermission(user.roles, permission));
}

/**
 * Hook to check if user has any of the specified permissions
 */
export function useAnyPermission(permissions: string[]): boolean {
  const { user } = useAuth();

  if (!user) {
    return false;
  }

  return permissions.some((permission) => checkPermission(user.roles, permission));
}
