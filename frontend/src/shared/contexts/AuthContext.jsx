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

  const refreshUser = async () => {
    const profile = await authService.getProfile();
    if (profile?.id) {
      setUser(profile);
      localStorage.setItem(USER_KEY, JSON.stringify(profile));
    }
    return profile;
  };

  const applyUser = (userData) => {
    if (!userData?.id) return;
    setUser(userData);
    localStorage.setItem(USER_KEY, JSON.stringify(userData));
  };

  /**
   * ¿Puede el usuario hacer esto?
   *
   * **Sirve solo para ocultar cosas de la interfaz.** La decisión real la toma el
   * backend en cada petición, que consulta los permisos en la base y no se fía de
   * nada que venga del navegador. Aquí los permisos pueden estar desfasados: si
   * una petición falla por algo que no parece de autenticación, se restaura el
   * usuario cacheado de `localStorage`, con los permisos que tuviera entonces.
   *
   * Falla cerrado: sin permisos cargados, `can()` devuelve false y el botón
   * simplemente no aparece.
   */
  const can = (code) => Boolean(user?.permissions?.includes(code));

  const value = {
    user,
    isAuthenticated,
    loading,
    login,
    logout,
    register,
    refreshUser,
    applyUser,
    permissions: user?.permissions ?? [],
    can,
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
