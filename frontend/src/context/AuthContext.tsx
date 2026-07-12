import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User, UserScope, RoleType } from '../types';
import { authApi } from '../api';
import { setAccessToken, getRefreshToken, handleHardLogout } from '../api/client';
import { MockStorage } from '../api/mockData';

interface AuthContextType {
  user: User | null;
  roles: RoleType[];
  scope: UserScope;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<{ otpRequired: boolean }>;
  verifyOtp: (email: string, code: string, purpose?: string) => Promise<void>;
  register: (data: { email: string; password: string; full_name: string; org_id?: string }) => Promise<{ status: string; email: string }>;
  logout: () => Promise<void>;
  hasRole: (...allowedRoles: RoleType[]) => boolean;
  hasScope: (kind: 'region' | 'sector', value: string) => boolean;
  switchUserMock: (userId: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const storedUser = localStorage.getItem('ecosphere_user');
      const refreshToken = getRefreshToken();

      // A session is restored ONLY when both a stored user and a refresh token
      // exist. Without a valid refresh token no authenticated API call can
      // succeed, so we must not present an authenticated shell. Anonymous
      // visitors fall through to the login screen — we never auto-create a
      // session (that would silently grant access without authentication).
      if (storedUser && refreshToken) {
        try {
          setUser(JSON.parse(storedUser)); // optimistic; corrected by getMe below
        } catch {
          handleHardLogout();
          setIsLoading(false);
          return;
        }
        // Re-validate against the server. The 401 interceptor refreshes the
        // access token transparently; if the refresh token is dead it triggers
        // a hard logout back to /login.
        authApi
          .getMe()
          .then((me) => {
            setUser(me);
            localStorage.setItem('ecosphere_user', JSON.stringify(me));
          })
          .catch(() => {
            /* interceptor handles hard-logout on refresh failure */
          });
      }

      setIsLoading(false);
    };

    initAuth();
  }, []);

  const roles: RoleType[] = user?.roles
    ? user.roles.map((r) => (typeof r === 'string' ? r : r.role))
    : [];

  const scope: UserScope = user?.scope || {
    is_master: roles.includes('master_admin'),
    region: [],
    sector: [],
  };

  const login = async (email: string, pass: string) => {
    return await authApi.login(email, pass);
  };

  const verifyOtp = async (email: string, code: string, purpose = 'login') => {
    const res = await authApi.verifyOtp(email, code, purpose);
    if (res && res.user) {
      setUser(res.user);
      setAccessToken(res.access_token);
      localStorage.setItem('ecosphere_user', JSON.stringify(res.user));
    }
  };

  const register = async (data: { email: string; password: string; full_name: string; org_id?: string }) => {
    return await authApi.register(data);
  };

  const logout = async () => {
    await authApi.logout();
    setUser(null);
    handleHardLogout();
  };

  const hasRole = (...allowedRoles: RoleType[]): boolean => {
    if (!user) return false;
    if (roles.includes('master_admin')) return true;
    return allowedRoles.some((r) => roles.includes(r));
  };

  const hasScope = (kind: 'region' | 'sector', value: string): boolean => {
    if (!user) return false;
    if (scope.is_master || roles.includes('master_admin')) return true;
    const valuesList = kind === 'region' ? scope.region : scope.sector;
    if (!valuesList || valuesList.length === 0) return false;
    return valuesList.some((v) => v.toLowerCase() === value.toLowerCase());
  };

  const switchUserMock = (userId: string) => {
    const users = MockStorage.get<User[]>('users', []);
    const target = users.find((u) => u._id === userId);
    if (target) {
      setUser(target);
      setAccessToken(`mock_jwt_${target._id}`);
      localStorage.setItem('ecosphere_user', JSON.stringify(target));
      localStorage.setItem('ecosphere_refresh_token', `mock_refresh_${target._id}`);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        roles,
        scope,
        isAuthenticated: !!user,
        isLoading,
        login,
        verifyOtp,
        register,
        logout,
        hasRole,
        hasScope,
        switchUserMock,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
