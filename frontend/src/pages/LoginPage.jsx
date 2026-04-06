/**
 * Inicio de sesión — Diseño alineado con la marca
 */

import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { isAuthenticated, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const recovered = location.state?.recovered;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [errorReason, setErrorReason] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) navigate('/', { replace: true });
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setErrorReason(null);
    setLoading(true);
    try {
      await login(email, password);
      navigate('/', { replace: true });
    } catch (err) {
      const validationMsg =
        Array.isArray(err?.errors) && err.errors.length > 0
          ? err.errors.find((e) => e.field === 'email')?.message || err.errors[0]?.message
          : null;
      setError(
        validationMsg ||
          err?.message ||
          (typeof err === 'string' ? err : 'Error al iniciar sesión')
      );
      setErrorReason(err?.reason || null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="panel-card overflow-hidden">
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
              {recovered && (
                <div
                  className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
                  role="status"
                >
                  Contraseña actualizada. Ya puedes iniciar sesión con la nueva clave.
                </div>
              )}
              {error && (
                <div className="alert-error space-y-2" role="alert">
                  <p>{error}</p>
                  {errorReason === 'USER_NOT_FOUND' && (
                    <p className="text-sm font-normal opacity-95 border-t border-red-200/60 pt-2 mt-2">
                      ¿Primera vez aquí?{' '}
                      <Link to="/register" className="font-semibold underline underline-offset-2 hover:no-underline">
                        Crear cuenta
                      </Link>
                    </p>
                  )}
                  {errorReason === 'INVALID_PASSWORD' && (
                    <p className="text-sm font-normal opacity-95 border-t border-red-200/60 pt-2 mt-2">
                      <Link to="/forgot-password" className="font-semibold underline underline-offset-2 hover:no-underline">
                        Recuperar contraseña
                      </Link>
                    </p>
                  )}
                </div>
              )}

              <div>
                <label htmlFor="email" className="label-premium">
                  Correo electrónico
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-premium"
                  placeholder="tu@email.com"
                  required
                  autoComplete="email"
                />
              </div>

              <div>
                <label htmlFor="password" className="label-premium">
                  Contraseña
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-premium"
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
              </div>

              <div className="text-right">
                <Link
                  to="/forgot-password"
                  className="text-sm text-gold font-medium hover:text-gold-dark transition-colors"
                >
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full btn-dark py-3.5 disabled:opacity-50 disabled:cursor-not-allowed"
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

            <details className="mt-8">
              <summary className="text-xs font-semibold text-stone-500 uppercase tracking-wider cursor-pointer">
                Cuentas de prueba (solo desarrollo)
              </summary>
              <div className="mt-3 p-4 bg-stone-50 rounded-xl border border-stone-200 text-left">
                <p className="text-xs text-stone-500 font-mono break-all">admin@mrkutz.com / password123</p>
                <p className="text-xs text-stone-500 font-mono break-all">barber@mrkutz.com / password123</p>
                <p className="text-xs text-stone-500 font-mono break-all">client@mrkutz.com / password123</p>
              </div>
            </details>
          </div>
        </div>
      </div>
    </div>
  );
}
