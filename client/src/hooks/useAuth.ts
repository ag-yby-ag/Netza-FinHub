import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import type { User } from '../types/auth';
import * as authService from '../services/auth';

interface AuthState {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  isMaster: boolean;
  hasPermission: (module: string, action: 'view' | 'create' | 'edit' | 'delete' | 'export') => boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

// Context
export const AuthContext = createContext<AuthState | null>(null);

export function useAuthState(): AuthState {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    const token = localStorage.getItem('netza-finhub-token');
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const u = await authService.getMe();
      setUser(u);
    } catch {
      authService.clearToken();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = useCallback(async (email: string, password: string) => {
    const session = await authService.login(email, password);
    authService.setToken(session.token);
    setUser(session.user);
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    authService.clearToken();
    setUser(null);
  }, []);

  const hasPermission = useCallback(
    (module: string, action: 'view' | 'create' | 'edit' | 'delete' | 'export'): boolean => {
      if (!user) return false;
      if (user.role === 'master') return true;
      const perm = user.permissions?.find((p) => p.module === module);
      if (!perm) return false;
      return (perm[`can_${action}` as keyof typeof perm] as number) === 1;
    },
    [user],
  );

  return {
    user,
    loading,
    isAuthenticated: !!user,
    isMaster: user?.role === 'master',
    hasPermission,
    login,
    logout,
    refreshUser,
  };
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
