import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchCurrentUser = async () => {
    try {
      const data = await api.auth.me();
      if (data?.success && data?.user) {
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const login = async (email, password) => {
    const data = await api.auth.login({ email, password });
    if (data?.success && data?.user) {
      setUser(data.user);
      // Fetch full profile with reputation
      await fetchCurrentUser();
      return data.user;
    }
    throw new Error('Login failed');
  };

  const register = async (name, email, password) => {
    const data = await api.auth.register({ name, email, password });
    if (data?.success && data?.user) {
      setUser(data.user);
      await fetchCurrentUser();
      return data.user;
    }
    throw new Error('Registration failed');
  };

  const logout = async () => {
    try {
      await api.auth.logout();
    } finally {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        refreshUser: fetchCurrentUser,
        isModerator: user?.role === 'moderator',
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
