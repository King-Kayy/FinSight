import React, { createContext, useContext, useState, useEffect } from 'react';
import type { UserProfile, AuthResponse } from '../../shared/api';

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, name: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(() => {
    try {
      return JSON.parse(localStorage.getItem('finance_user') ?? 'null');
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem('finance_token')
  );

  const saveAuth = (newToken: string, newUser: UserProfile) => {
    localStorage.setItem('finance_token', newToken);
    localStorage.setItem('finance_user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const login = async (email: string, password: string): Promise<void> => {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Login failed' }));
      throw new Error(err.error ?? 'Login failed');
    }
    const data: AuthResponse = await res.json();
    saveAuth(data.token, data.user);
  };

  const register = async (
    email: string,
    name: string,
    password: string
  ): Promise<void> => {
    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, name, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Registration failed' }));
      throw new Error(err.error ?? 'Registration failed');
    }
    // Auto-login after successful registration
    await login(email, password);
  };

  const logout = (): void => {
    localStorage.removeItem('finance_token');
    localStorage.removeItem('finance_user');
    setToken(null);
    setUser(null);
  };

  return React.createElement(
    AuthContext.Provider,
    {
      value: {
        user,
        token,
        login,
        register,
        logout,
        isAuthenticated: !!token && !!user,
      },
    },
    children
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
