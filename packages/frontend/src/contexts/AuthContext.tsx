import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { LoginDto, RegisterDto, UserProfile } from '@workout-tracker/shared';

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  login: (data: LoginDto) => Promise<void>;
  register: (data: RegisterDto) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (token) {
        const response = await api.get('/api/v1/auth/me');
        setUser(response.data);
      }
    } catch (error) {
      localStorage.removeItem('accessToken');
    } finally {
      setLoading(false);
    }
  };

  const login = async (data: LoginDto) => {
    const response = await api.post('/api/v1/auth/login', data);
    const { accessToken, user: userData } = response.data;

    localStorage.setItem('accessToken', accessToken);
    setUser(userData);
  };

  const register = async (data: RegisterDto) => {
    const response = await api.post('/api/v1/auth/register', data);
    const { accessToken, user: userData } = response.data;

    localStorage.setItem('accessToken', accessToken);
    setUser(userData);
  };

  const logout = async () => {
    try {
      await api.post('/api/v1/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('accessToken');
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
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
