import { useQuery } from "@tanstack/react-query";
import { hasPermission, canAccessRoute, getRolePermissions, type Permission } from "@shared/permissions";
import { useAuth } from "./useAuth";

// Hook to get current user from authentication system
export function useCurrentUser() {
  const { user, isAuthenticated } = useAuth();
  
  return useQuery({
    queryKey: ['current-user', user?.id],
    queryFn: async () => {
      if (!isAuthenticated || !user) {
        throw new Error('Not authenticated');
      }
      return user;
    },
    enabled: isAuthenticated && !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Hook to check if user has specific permission
export function useHasPermission(resource: string, action: string) {
  const { data: user } = useCurrentUser();
  
  if (!user || !user.isActive) return false;
  
  return hasPermission(user.role, resource, action);
}

// Hook to check if user can access a route
export function useCanAccessRoute(route: string) {
  const { data: user } = useCurrentUser();
  
  if (!user || !user.isActive) return false;
  
  return canAccessRoute(user.role, route);
}

// Hook to get all permissions for current user's role
export function useUserPermissions() {
  const { data: user } = useCurrentUser();
  
  return useQuery({
    queryKey: ['user-permissions', user?.role],
    queryFn: async () => {
      if (!user) return [];
      return getRolePermissions(user.role);
    },
    enabled: !!user,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

// Hook to check multiple permissions at once
export function useHasPermissions(permissions: { resource: string; action: string }[]) {
  const { data: user } = useCurrentUser();
  
  if (!user || !user.isActive) return {};
  
  const results: Record<string, boolean> = {};
  permissions.forEach(({ resource, action }) => {
    const key = `${resource}:${action}`;
    results[key] = hasPermission(user.role, resource, action);
  });
  
  return results;
}

// Helper function to check permission with fallback
export function checkPermission(userRole: string | undefined, resource: string, action: string): boolean {
  if (!userRole) return false;
  return hasPermission(userRole, resource, action);
}

// Hook to get permissions grouped by resource
export function useGroupedPermissions() {
  const { data: permissions = [] } = useUserPermissions();
  
  const grouped = permissions.reduce((acc, permission) => {
    if (!acc[permission.resource]) {
      acc[permission.resource] = [];
    }
    acc[permission.resource].push(permission);
    return acc;
  }, {} as Record<string, Permission[]>);
  
  return grouped;
}
