/**
 * Página de inicio
 */

import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function HomePage() {
  const { user, isAuthenticated } = useAuth();
  const canManage = user?.role === 'admin' || user?.role === 'barber';

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-gray-800">
        Bienvenido{isAuthenticated && user?.firstName ? `, ${user.firstName}` : ''} a Mr. Kutz
      </h2>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="bg-white rounded-xl shadow border border-gray-100 p-6">
          <h3 className="font-medium text-gray-800 mb-2">Sistema de gestión de barbería</h3>
          <p className="text-gray-600 text-sm">
            Gestiona clientes, citas, pagos e inventario desde un solo lugar.
          </p>
        </div>
        {canManage && (
          <div className="bg-primary-50 rounded-xl border border-primary-100 p-6">
            <h3 className="font-medium text-primary-800 mb-2">Acceso rápido</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/clients" className="text-primary-600 hover:text-primary-700 font-medium">
                  → Clientes
                </Link>
              </li>
              <li>
                <Link to="/services" className="text-primary-600 hover:text-primary-700 font-medium">
                  → Servicios
                </Link>
              </li>
              <li>
                <Link to="/barbers" className="text-primary-600 hover:text-primary-700 font-medium">
                  → Barberos
                </Link>
              </li>
              <li>
                <Link to="/appointments" className="text-primary-600 hover:text-primary-700 font-medium">
                  → Citas
                </Link>
              </li>
              <li>
                <Link to="/payments" className="text-primary-600 hover:text-primary-700 font-medium">
                  → Pagos
                </Link>
              </li>
              <li>
                <Link to="/inventory" className="text-primary-600 hover:text-primary-700 font-medium">
                  → Inventario
                </Link>
              </li>
              <li>
                <Link to="/dashboard" className="text-primary-600 hover:text-primary-700 font-medium">
                  → Dashboard
                </Link>
              </li>
            </ul>
          </div>
        )}
      </div>
      {!isAuthenticated && (
        <p className="text-gray-500 text-sm">
          <Link to="/login" className="text-primary-600 hover:text-primary-700">Inicia sesión</Link>
          {' o '}
          <Link to="/register" className="text-primary-600 hover:text-primary-700">regístrate</Link>
          {' como cliente para reservar citas.'}
        </p>
      )}
    </div>
  );
}
