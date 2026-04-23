import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { User } from '@shared/schema';
import { apiEndpoint, getSubdomain } from '@/lib/config';
import { refreshTokenIfNeeded, isTokenExpired, clearAuthData } from '@/lib/api-client';
import { logger } from '@/lib/logger';
import {
  getStoredToken,
  getStoredUser,
  getStoredSubdomain,
  setStoredAuth,
  setStoredUser,
  clearStoredAuth,
} from '@/lib/auth-storage';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
}

interface LoginData {
  username: string;
  email?: string;
  password: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (loginData: LoginData) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  getAuthHeaders: () => Record<string, string>;
  updateUser: (userData: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    token: null,
    isAuthenticated: false
  });
  
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for stored auth on component mount
    // Support both old and new token keys
    const checkInitialAuth = async () => {
      const storedToken = getStoredToken();
      const storedUser = getStoredUser();
      
      if (storedToken && storedUser) {
        // Validate subdomain matches stored session
        const storedSubdomain = getStoredSubdomain();
        const currentSubdomain = getSubdomain();
        
        if (storedSubdomain && storedSubdomain !== currentSubdomain) {
          logger.info('Subdomain mismatch (session from ' + storedSubdomain + '), clearing auth');
          clearAuthData();
          setAuthState({ user: null, token: null, isAuthenticated: false });
          setIsLoading(false);
          return;
        }

        // If token is expired, try to refresh it immediately
        if (isTokenExpired()) {
          logger.info('Initial token expired, attempting refresh...');
          const refreshed = await refreshTokenIfNeeded();
          if (!refreshed) {
            logger.info('Initial refresh failed, clearing auth');
            clearAuthData();
            setAuthState({ user: null, token: null, isAuthenticated: false });
            setIsLoading(false);
            return;
          }
          const newToken = getStoredToken();
          const newUserStr = getStoredUser();
          if (newToken && newUserStr) {
            setAuthState({
              user: JSON.parse(newUserStr),
              token: newToken,
              isAuthenticated: true
            });
          }
        } else {
          try {
            const user = JSON.parse(storedUser);
            setAuthState({
              user,
              token: storedToken,
              isAuthenticated: true
            });
          } catch (error) {
            clearAuthData();
            setAuthState({ user: null, token: null, isAuthenticated: false });
          }
        }
      }
      setIsLoading(false);
    };

    checkInitialAuth();

    // Listen for profile updates from other components
    const handleProfileUpdate = () => {
      const updatedUser = getStoredUser();
      if (updatedUser) {
        try {
          const user = JSON.parse(updatedUser);
          setAuthState(prev => ({
            ...prev,
            user
          }));
        } catch (error) {
          logger.error('Failed to parse updated user data:', error);
        }
      }
    };

    window.addEventListener('storage', handleProfileUpdate);
    window.addEventListener('profile-updated', handleProfileUpdate);

    return () => {
      window.removeEventListener('storage', handleProfileUpdate);
      window.removeEventListener('profile-updated', handleProfileUpdate);
    };
  }, []);

  // Proactive token refresh
  useEffect(() => {
    if (!authState.isAuthenticated) return;

    const checkToken = async () => {
      // API client's refreshTokenIfNeeded will check expiry with buffer and refresh if needed
      await refreshTokenIfNeeded();
      
      // Sync state with storage if token changed
      const currentToken = getStoredToken();
      if (currentToken && currentToken !== authState.token) {
        try {
          const userStr = getStoredUser();
          const user = userStr ? JSON.parse(userStr) : authState.user;
          setAuthState(prev => ({
            ...prev,
            token: currentToken,
            user
          }));
        } catch (e) {
          logger.error('Failed to sync auth state after refresh', e);
        }
      }
    };

    // Check every minute
    const intervalId = setInterval(checkToken, 60 * 1000);
    
    return () => clearInterval(intervalId);
  }, [authState.isAuthenticated, authState.token, authState.user]);

  const login = async (loginData: LoginData): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch(apiEndpoint('/api/auth/login'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-Subdomain': getSubdomain(),
        },
        body: JSON.stringify(loginData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return { success: false, error: errorData.message || 'Login failed' };
      }

      const { token, user } = await response.json();
      
      // Store auth data (acadize_* keys)
      setStoredAuth(token, user, getSubdomain());
      
      setAuthState({
        user,
        token,
        isAuthenticated: true
      });

      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Network error' 
      };
    }
  };

  const logout = () => {
    clearStoredAuth();
    setAuthState({
      user: null,
      token: null,
      isAuthenticated: false
    });
    
    // Optional: Call logout API endpoint
    fetch(apiEndpoint('/api/auth/logout'), {
      method: 'POST',
      credentials: 'include'
    }).catch(() => {
      // Ignore errors during logout API call
    });
  };

  const getAuthHeaders = (): Record<string, string> => {
    const subdomain = getSubdomain();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Tenant-Subdomain': subdomain,
    };
    
    if (authState.token) {
      headers['Authorization'] = `Bearer ${authState.token}`;
    }
    
    return headers;
  };

  // Function to update user data directly (for profile updates)
  const updateUser = (userData: Partial<User>) => {
    setAuthState(prev => {
      if (!prev.user) return prev;
      
      const updatedUser = { ...prev.user, ...userData };
      
      // Also update localStorage
      setStoredUser(updatedUser);
      
      return {
        ...prev,
        user: updatedUser
      };
    });
  };

  return (
    <AuthContext.Provider value={{
      user: authState.user,
      token: authState.token,
      isAuthenticated: authState.isAuthenticated,
      isLoading,
      login,
      logout,
      getAuthHeaders,
      updateUser
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

