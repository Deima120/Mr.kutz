/**
 * Registro — Diseño alineado con la marca
 */

import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const inputClass = "input-premium";
const labelClass = "label-premium";

export default function RegisterPage() {
  const { isAuthenticated, register } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    phone: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) navigate('/', { replace: true });
  }, [isAuthenticated, navigate]);

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }
    if (formData.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    setLoading(true);
    try {
      await register({
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone || undefined,
        role: 'client',
      });
      navigate('/', { replace: true });
    } catch (err) {
      setError(err?.errors?.[0]?.message || err?.message || (typeof err === 'string' ? err : 'Error al registrarse'));
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
            <p className="text-gold tracking-[0.2em] uppercase text-xs font-semibold mb-2">Nueva cuenta</p>
            <h1 className="font-serif text-2xl sm:text-3xl text-stone-900 font-medium mb-2">Crear cuenta</h1>
            <p className="text-stone-500 text-sm mb-8">Regístrate para gestionar tus citas</p>

            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="alert-error" role="alert">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="firstName" className={labelClass}>Nombre</label>
                  <input id="firstName" name="firstName" type="text" value={formData.firstName} onChange={handleChange} className={inputClass} required />
                </div>
                <div>
                  <label htmlFor="lastName" className={labelClass}>Apellido</label>
                  <input id="lastName" name="lastName" type="text" value={formData.lastName} onChange={handleChange} className={inputClass} required />
                </div>
              </div>

              <div>
                <label htmlFor="email" className={labelClass}>Email</label>
                <input id="email" name="email" type="email" value={formData.email} onChange={handleChange} className={inputClass} placeholder="tu@email.com" required />
              </div>

              <div>
                <label htmlFor="phone" className={labelClass}>Teléfono (opcional)</label>
                <input id="phone" name="phone" type="tel" value={formData.phone} onChange={handleChange} className={inputClass} />
              </div>

              <div>
                <label htmlFor="password" className={labelClass}>Contraseña</label>
                <input id="password" name="password" type="password" value={formData.password} onChange={handleChange} className={inputClass} placeholder="Mínimo 6 caracteres, 1 número" required minLength={6} />
              </div>

              <div>
                <label htmlFor="confirmPassword" className={labelClass}>Confirmar contraseña</label>
                <input id="confirmPassword" name="confirmPassword" type="password" value={formData.confirmPassword} onChange={handleChange} className={inputClass} required />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full btn-dark py-3.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creando cuenta...' : 'Registrarme'}
              </button>
            </form>

            <p className="mt-8 text-center text-stone-600 text-sm">
              ¿Ya tienes cuenta?{' '}
              <Link to="/login" className="text-gold font-semibold hover:text-gold-dark transition-colors">
                Inicia sesión
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
