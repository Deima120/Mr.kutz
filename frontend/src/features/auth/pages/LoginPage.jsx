/**
 * Inicio de sesión — Diseño alineado con la marca
 */

import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/shared/contexts/AuthContext';
import { validateLoginForm } from '@/shared/utils/formValidation';
import { useFormValidation } from '@/shared/hooks/useFormValidation';
import { PublicFormField } from '@/shared/components/FormValidationFields';

export default function LoginPage() {
  const { isAuthenticated, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const recovered = location.state?.recovered;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [errorReason, setErrorReason] = useState(null);
  const [loading, setLoading] = useState(false);
  const { fieldError, inputInvalidClass, applyValidation, clearFieldError } = useFormValidation();

  useEffect(() => {
    if (isAuthenticated) navigate('/', { replace: true });
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validation = validateLoginForm(email, password);
    if (!applyValidation(validation)) {
      setError('');
      setErrorReason(null);
      return;
    }
    setError('');
    setErrorReason(null);
    setLoading(true);
    try {
      await login(email, password);
      navigate('/', { replace: true });
    } catch (err) {
      const validationMsg =
        Array.isArray(err?.errors) && err.errors.length > 0
          ? err.errors.find((item) => item.field === 'email')?.message || err.errors[0]?.message
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
          <div className="h-1.5 w-full bg-gradient-to-r from-gold-dark via-gold to-gold-light" aria-hidden />

          <div className="p-8 sm:p-10">
            <p className="text-gold tracking-[0.2em] text-xs font-semibold mb-2">Acceso</p>
            <h1 className="font-serif text-2xl sm:text-3xl text-stone-900 font-medium mb-2">Iniciar sesión</h1>
            <p className="text-stone-500 text-sm mb-8">Ingresa tus credenciales para acceder</p>

            <form onSubmit={handleSubmit} noValidate className="space-y-5">
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

              <PublicFormField label="Correo electrónico" htmlFor="email" required error={fieldError('email')}>
                {({ invalid, errorId }) => (
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError('');
                      clearFieldError('email');
                    }}
                    className={`input-premium rounded-lg ${invalid ? inputInvalidClass : ''}`}
                    placeholder="tu@email.com"
                    autoComplete="email"
                    aria-invalid={invalid || undefined}
                    aria-describedby={errorId}
                  />
                )}
              </PublicFormField>

              <PublicFormField label="Contraseña" htmlFor="password" required error={fieldError('password')}>
                {({ invalid, errorId }) => (
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setError('');
                        clearFieldError('password');
                      }}
                      className={`input-premium rounded-lg pr-11 ${invalid ? inputInvalidClass : ''}`}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      aria-invalid={invalid || undefined}
                      aria-describedby={errorId}
                    />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 transition-colors"
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                )}
              </PublicFormField>

              <div className="text-right">
                <Link to="/forgot-password" className="text-sm text-gold font-medium hover:text-gold-dark transition-colors">
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
          </div>
        </div>
      </div>
    </div>
  );
}
