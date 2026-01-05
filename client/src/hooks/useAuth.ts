// Re-export from AuthContext for backward compatibility
// All components using useAuth will now share the same auth state
export { useAuth, AuthProvider } from '@/contexts/AuthContext';
