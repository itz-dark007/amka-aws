import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { fetchDemoUsers, loginUser } from '../lib/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  demoUsers: User[];
  isLoading: boolean;
  canPost: boolean;
  canPin: boolean;
  canDelete: boolean;
  canViewAudit: boolean;
  login: (email?: string, token?: string) => Promise<void>;
  logout: () => void;
  switchPersona: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('amka_token'));
  const [demoUsers, setDemoUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Load demo users on mount
  useEffect(() => {
    fetchDemoUsers()
      .then((users) => {
        setDemoUsers(users);
        const storedToken = localStorage.getItem('amka_token');
        if (storedToken) {
          const matched = users.find((u) => u.token === storedToken);
          if (matched) {
            setUser(matched);
            setToken(matched.token || null);
            return;
          }
        }
        // Default to Super Admin for seamless administrative management
        if (users.length > 0) {
          const defaultUser = users[0];
          setUser(defaultUser);
          const defaultToken = defaultUser.token || 'token_super_admin_amka';
          setToken(defaultToken);
          localStorage.setItem('amka_token', defaultToken);
        }
      })
      .catch((err) => console.error('Failed to load demo users:', err))
      .finally(() => setIsLoading(false));
  }, []);

  const login = async (email?: string, directToken?: string) => {
    setIsLoading(true);
    try {
      const res = await loginUser(email, directToken);
      setUser(res.user);
      setToken(res.token);
      localStorage.setItem('amka_token', res.token);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('amka_token');
  };

  const switchPersona = (selectedUser: User) => {
    setUser(selectedUser);
    const userToken = selectedUser.token || `token_${selectedUser.id}`;
    setToken(userToken);
    localStorage.setItem('amka_token', userToken);
  };

  const role = user?.role;
  const canPost = role === 'super_admin' || role === 'department_head' || role === 'staff_officer';
  const canPin = role === 'super_admin' || role === 'department_head';
  const canDelete = role === 'super_admin' || role === 'department_head' || role === 'staff_officer';
  const canViewAudit = role === 'super_admin' || role === 'department_head';

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        demoUsers,
        isLoading,
        canPost,
        canPin,
        canDelete,
        canViewAudit,
        login,
        logout,
        switchPersona,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
