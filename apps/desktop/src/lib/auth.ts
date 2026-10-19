import type { Permission } from '@vibe-pos/config-schema';
import { useAuthStore } from '../store/authStore';

/**
 * Check if the current session's role has the given permission.
 * Roles and permissions are completely dynamic from customer config.
 */
export function can(permission: Permission): boolean {
  const session = useAuthStore.getState().session;
  if (!session) return false;
  const { permissions } = session.role;
  return permissions.includes('*') || permissions.includes(permission);
}

/**
 * React hook version for components.
 */
export function useCan(permission: Permission): boolean {
  const session = useAuthStore((s) => s.session);
  if (!session) return false;
  const { permissions } = session.role;
  return permissions.includes('*') || permissions.includes(permission);
}
