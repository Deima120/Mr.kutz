/**
 * Inicio de sesión — Diseño alineado con la marca
 */

import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { isAuthenticated, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) navigate('/', { replace: true });
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err?.message || (typeof err === 'string' ? err : 'Error al iniciar sesión'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-card border border-stone-200 overflow-hidden">
          {/* Banda dorada lateral — identidad visual */}
          <div className="h-1.5 w-full bg-gradient-to-r from-gold-dark via-gold to-gold-light" aria-hidden />

          <div className="p-8 sm:p-10">
            <p className="text-gold tracking-[0.2em] uppercase text-xs font-semibold mb-2">
              Acceso
            </p>
            <h1 className="font-serif text-2xl sm:text-3xl text-stone-900 font-medium mb-2">
              Iniciar sesión
            </h1>
            <p className="text-stone-500 text-sm mb-8">
              Ingresa tus credenciales para acceder
            </p>

            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="p-4 bg-red-50 border border-red-100 text-red-700 rounded-lg text-sm" role="alert">
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-stone-700 mb-1.5">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-stone-300 rounded-lg text-stone-900 placeholder-stone-400 focus:ring-2 focus:ring-gold/40 focus:border-gold transition-colors outline-none"
                  placeholder="tu@email.com"
                  required
                  autoComplete="email"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-stone-700 mb-1.5">
                  Contraseña
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-stone-300 rounded-lg text-stone-900 placeholder-stone-400 focus:ring-2 focus:ring-gold/40 focus:border-gold transition-colors outline-none"
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 bg-barber-dark text-white font-semibold rounded-lg hover:bg-barber-charcoal focus:ring-2 focus:ring-gold focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Entrando...' : 'Entrar'}
              </button>
            </form>

            <p className="mt-8 text-center text-stone-600 text-sm">
              ¿No tienes cuenta?{' '}
              <Link to="/register" className="text-gold font-semibold hover:text-gold-dark transition-colors">
                Regístrate
              </Link>
            </p>

            <div className="mt-8 p-4 bg-stone-50 rounded-xl border border-stone-200">
              <p className="text-xs font-semibold text-stone-600 mb-2 uppercase tracking-wider">
                Cuentas de prueba
              </p>
              <p className="text-xs text-stone-500 font-mono">admin@mrkutz.com / password123</p>
              <p className="text-xs text-stone-500 font-mono">barber@mrkutz.com / password123</p>
              <p className="text-xs text-stone-500 font-mono">client@mrkutz.com / password123</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
