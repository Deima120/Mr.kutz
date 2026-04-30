/**
 * AuthContext - Gestión de estado de autenticación
 * Proporciona login, logout, register y estado del usuario
 */

import { createContext, useContext, useState, useEffect } from 'react';
import * as authService from '@/features/auth/services/authService';

const AuthContext = createContext(null);

const TOKEN_KEY = 'token';
const USER_KEY = 'user';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const isAuthenticated = !!user;

  const login = async (email, password) => {
    const { user: userData, token } = await authService.login(email, password);
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(userData));
    setUser(userData);
    try {
      const profile = await authService.getProfile();
      if (profile?.id) {
        setUser(profile);
        localStorage.setItem(USER_KEY, JSON.stringify(profile));
      }
    } catch (_) {}
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setUser(null);
  };

  const register = async (data) => {
    const { user: userData, token } = await authService.register(data);
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(userData));
    setUser(userData);
    try {
      const profile = await authService.getProfile();
      if (profile?.id) {
        setUser(profile);
        localStorage.setItem(USER_KEY, JSON.stringify(profile));
      }
    } catch (_) {}
  };

  // Verificar token al montar y recuperar sesión
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem(TOKEN_KEY);
      const storedUser = localStorage.getItem(USER_KEY);

      if (!token || !storedUser) {
        setLoading(false);
        return;
      }

      try {
        const profile = await authService.getProfile();
        setUser(profile);
        localStorage.setItem(USER_KEY, JSON.stringify(profile));
      } catch (err) {
        const msg = err?.message || String(err);
        const isAuthError =
          /401|token|Token|inválid|Inválid|denegad|sesión|Sesión|autenticación/i.test(msg || '');
        if (isAuthError) {
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(USER_KEY);
          setUser(null);
        } else {
          try {
            const parsed = JSON.parse(storedUser);
            if (parsed?.id && parsed?.role) setUser(parsed);
          } catch (_) {}
        }
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const value = {
    user,
    isAuthenticated,
    loading,
    login,
    logout,
    register,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return context;
};
