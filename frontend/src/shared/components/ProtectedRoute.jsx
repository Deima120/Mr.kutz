/**
 * ProtectedRoute - Protege rutas que requieren autenticación
 * Redirige a /login si el usuario no está autenticado
 */

import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/shared/contexts/AuthContext';

/**
 * @param {string[]} [allowedRoles] forma antigua, por nombre de rol. Sigue en uso
 *   en la mayoría de rutas y no hace falta migrarlas de golpe.
 * @param {string} [requiredPermission] forma nueva. Cuando se indica, manda sobre
 *   `allowedRoles`: es lo que permite que un rol personalizado entre a una
 *   pantalla sin tener que listarlo en ninguna parte.
 */
export default function ProtectedRoute({ children, allowedRoles, requiredPermission }) {
  const { user, isAuthenticated, loading, can } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // El permiso, cuando se pide, sustituye por completo a la lista de roles.
  if (requiredPermission) {
    if (!can(requiredPermission)) return <Navigate to="/" replace />;
    return children;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}
