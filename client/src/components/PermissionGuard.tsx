import { ReactNode } from "react";
import { useHasPermission, useCanAccessRoute, useCurrentUser } from "@/hooks/usePermissions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Shield, AlertTriangle, Lock } from "lucide-react";

interface PermissionGuardProps {
  resource?: string;
  action?: string;
  route?: string;
  children: ReactNode;
  fallback?: ReactNode;
  showFallback?: boolean;
  requireAll?: boolean; // If multiple permissions, require all vs any
  permissions?: { resource: string; action: string }[];
}

interface AccessDeniedProps {
  reason?: string;
  canRequest?: boolean;
  onRequestAccess?: () => void;
}

function AccessDenied({ reason, canRequest = false, onRequestAccess }: AccessDeniedProps) {
  return (
    <div className="flex items-center justify-center min-h-[400px] p-8">
      <div className="text-center max-w-md">
        <div className="mb-4">
          <Shield className="h-16 w-16 mx-auto text-gray-400" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Access Restricted
        </h2>
        <p className="text-gray-600 mb-6">
          {reason || "You don't have permission to access this feature. Contact your administrator if you need access."}
        </p>
        {canRequest && onRequestAccess && (
          <Button onClick={onRequestAccess} variant="outline">
            <AlertTriangle className="h-4 w-4 mr-2" />
            Request Access
          </Button>
        )}
      </div>
    </div>
  );
}

// Main permission guard component
export function PermissionGuard({
  resource,
  action,
  route,
  children,
  fallback,
  showFallback = true,
  requireAll = true,
  permissions = []
}: PermissionGuardProps) {
  const { data: user, isLoading } = useCurrentUser();
  
  // Show loading state while user data is being fetched
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-sm text-gray-600">Checking permissions...</p>
        </div>
      </div>
    );
  }

  // Check if user is active
  if (!user || !user.isActive) {
    return showFallback ? (
      fallback || (
        <AccessDenied 
          reason="Your account is inactive. Please contact your administrator."
        />
      )
    ) : null;
  }

  // Check route-based access
  if (route) {
    const hasRouteAccess = useCanAccessRoute(route);
    if (!hasRouteAccess) {
      return showFallback ? (
        fallback || (
          <AccessDenied 
            reason="You don't have permission to access this page."
          />
        )
      ) : null;
    }
  }

  // Check single permission
  if (resource && action) {
    const hasPermission = useHasPermission(resource, action);
    if (!hasPermission) {
      return showFallback ? (
        fallback || (
          <AccessDenied 
            reason={`You don't have permission to ${action} ${resource}.`}
          />
        )
      ) : null;
    }
  }

  // Check multiple permissions
  if (permissions.length > 0) {
    const permissionResults = permissions.map(p => useHasPermission(p.resource, p.action));
    
    const hasAccess = requireAll 
      ? permissionResults.every(result => result)
      : permissionResults.some(result => result);

    if (!hasAccess) {
      return showFallback ? (
        fallback || (
          <AccessDenied 
            reason={`You don't have the required permissions to access this feature.`}
          />
        )
      ) : null;
    }
  }

  // All checks passed, render children
  return <>{children}</>;
}

// Component for protecting individual UI elements
interface ProtectedElementProps {
  resource: string;
  action: string;
  children: ReactNode;
  fallback?: ReactNode;
}

export function ProtectedElement({ resource, action, children, fallback }: ProtectedElementProps) {
  const hasPermission = useHasPermission(resource, action);
  
  if (!hasPermission) {
    return fallback || null;
  }
  
  return <>{children}</>;
}

// Component for showing different content based on permissions
interface ConditionalRenderProps {
  permissions: { resource: string; action: string }[];
  requireAll?: boolean;
  children: ReactNode;
  fallback?: ReactNode;
}

export function ConditionalRender({ 
  permissions, 
  requireAll = true, 
  children, 
  fallback 
}: ConditionalRenderProps) {
  const permissionResults = permissions.map(p => useHasPermission(p.resource, p.action));
  
  const hasAccess = requireAll 
    ? permissionResults.every(result => result)
    : permissionResults.some(result => result);

  return hasAccess ? <>{children}</> : <>{fallback}</>;
}

// Higher-order component for protecting entire pages
export function withPermissionGuard<T extends Record<string, any>>(
  WrappedComponent: React.ComponentType<T>,
  guardProps: Omit<PermissionGuardProps, 'children'>
) {
  return function PermissionGuardedComponent(props: T) {
    return (
      <PermissionGuard {...guardProps}>
        <WrappedComponent {...props} />
      </PermissionGuard>
    );
  };
}

// Role-based conditional rendering
interface RoleGuardProps {
  allowedRoles: string[];
  children: ReactNode;
  fallback?: ReactNode;
}

export function RoleGuard({ allowedRoles, children, fallback }: RoleGuardProps) {
  const { data: user } = useCurrentUser();
  
  if (!user || !allowedRoles.includes(user.role)) {
    return fallback || null;
  }
  
  return <>{children}</>;
}

// Department-based conditional rendering
interface DepartmentGuardProps {
  allowedDepartments: string[];
  children: ReactNode;
  fallback?: ReactNode;
}

export function DepartmentGuard({ allowedDepartments, children, fallback }: DepartmentGuardProps) {
  const { data: user } = useCurrentUser();
  
  if (!user || !allowedDepartments.includes(user.department)) {
    return fallback || null;
  }
  
  return <>{children}</>;
}

// Permission status indicator
interface PermissionStatusProps {
  resource: string;
  action: string;
  showDetails?: boolean;
}

export function PermissionStatus({ resource, action, showDetails = false }: PermissionStatusProps) {
  const hasPermission = useHasPermission(resource, action);
  const { data: user } = useCurrentUser();

  return (
    <Alert className={hasPermission ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
      <div className="flex items-center">
        {hasPermission ? (
          <Shield className="h-4 w-4 text-green-600" />
        ) : (
          <Lock className="h-4 w-4 text-red-600" />
        )}
        <AlertDescription className="ml-2">
          <span className={hasPermission ? "text-green-800" : "text-red-800"}>
            {hasPermission ? "Access Granted" : "Access Denied"}
          </span>
          {showDetails && (
            <span className="text-sm text-gray-600 ml-2">
              for {action} on {resource} (Role: {user?.role})
            </span>
          )}
        </AlertDescription>
      </div>
    </Alert>
  );
}
