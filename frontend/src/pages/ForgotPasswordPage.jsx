/**
 * Recuperación de contraseña — el código llega solo por correo
 */

import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import * as authService from '../services/authService';

const inputClass = 'input-premium';
const labelClass = 'label-premium';

export default function ForgotPasswordPage() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) navigate('/', { replace: true });
  }, [isAuthenticated, navigate]);

  const handleRequestCode = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setLoading(true);
    try {
      const res = await authService.forgotPassword(email.trim());
      const baseMessage =
        res?.message || 'Si el correo existe, recibirás instrucciones en breve.';
      const emailSent = res?.emailSent;
      let message;
      if (emailSent === true) {
        message = `${baseMessage} Revisa tu bandeja de entrada y la carpeta de spam.`;
      } else if (emailSent === false) {
        message = `${baseMessage} No pudimos confirmar el envío del correo; si no lo recibes en unos minutos, vuelve a intentarlo.`;
      } else {
        message = baseMessage;
      }
      setInfo(message);
      setStep(2);
    } catch (err) {
      setError(err?.message || 'No se pudo procesar la solicitud.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    setError('');
    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }
    if (newPassword.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres');
      return;
    }
    if (
      !/[A-Z]/.test(newPassword) ||
      !/[a-z]/.test(newPassword) ||
      !/\d/.test(newPassword)
    ) {
      setError(
        'La contraseña debe incluir al menos una mayúscula, una minúscula y un número.'
      );
      return;
    }
    if (!/^\d{6}$/.test(code.trim())) {
      setError('El código debe ser de 6 dígitos');
      return;
    }
    setLoading(true);
    try {
      await authService.resetPassword(email.trim(), code.trim(), newPassword);
      navigate('/login', {
        replace: true,
        state: { recovered: true },
      });
    } catch (err) {
      setError(err?.message || 'No se pudo actualizar la contraseña.');
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
            <p className="text-gold tracking-[0.2em] text-xs font-semibold mb-2">Recuperar acceso</p>
            <h1 className="font-serif text-2xl sm:text-3xl text-stone-900 font-medium mb-2">
              {step === 1 ? '¿Olvidaste tu contraseña?' : 'Nueva contraseña'}
            </h1>
            <p className="text-stone-500 text-sm mb-8">
              {step === 1
                ? 'Indica el correo de tu cuenta. Si existe, podrás restablecer la contraseña con el código que te enviemos.'
                : 'Introduce el código de 6 dígitos que te enviamos por correo y elige una contraseña nueva.'}
            </p>

            {step === 1 && (
              <form onSubmit={handleRequestCode} className="space-y-5">
                {error && (
                  <div className="alert-error" role="alert">
                    {error}
                  </div>
                )}
                <div>
                  <label htmlFor="fp-email" className={labelClass}>
                    Correo electrónico
                  </label>
                  <input
                    id="fp-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={inputClass}
                    placeholder="tu@email.com"
                    required
                    autoComplete="email"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full btn-dark py-3.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Enviando...' : 'Continuar'}
                </button>
              </form>
            )}

            {step === 2 && (
              <form onSubmit={handleReset} className="space-y-5">
                {info && (
                  <div className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-700" role="status">
                    {info}
                  </div>
                )}
                {error && (
                  <div className="alert-error" role="alert">
                    {error}
                  </div>
                )}
                <div>
                  <label htmlFor="fp-email-ro" className={labelClass}>
                    Correo
                  </label>
                  <input
                    id="fp-email-ro"
                    type="email"
                    value={email}
                    readOnly
                    className={`${inputClass} bg-stone-100 text-stone-600`}
                  />
                </div>
                <div>
                  <label htmlFor="fp-code" className={labelClass}>
                    Código de 6 dígitos
                  </label>
                  <input
                    id="fp-code"
                    type="text"
                    inputMode="numeric"
                    pattern="\d{6}"
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className={inputClass}
                    placeholder="000000"
                    required
                    autoComplete="one-time-code"
                  />
                </div>
                <div>
                  <label htmlFor="fp-new" className={labelClass}>
                    Nueva contraseña
                  </label>
                  <input
                    id="fp-new"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className={inputClass}
                    placeholder="Mín. 8 caracteres, con mayúscula, minúscula y número"
                    required
                    minLength={6}
                    autoComplete="new-password"
                  />
                </div>
                <div>
                  <label htmlFor="fp-confirm" className={labelClass}>
                    Confirmar contraseña
                  </label>
                  <input
                    id="fp-confirm"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={inputClass}
                    required
                    minLength={6}
                    autoComplete="new-password"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full btn-dark py-3.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Guardando...' : 'Guardar contraseña'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStep(1);
                    setError('');
                    setInfo('');
                    setCode('');
                    setNewPassword('');
                    setConfirmPassword('');
                  }}
                  className="w-full text-sm text-stone-500 hover:text-stone-800 py-2"
                >
                  ← Volver al paso anterior
                </button>
              </form>
            )}

            <p className="mt-8 text-center text-stone-600 text-sm">
              <Link to="/login" className="text-gold font-semibold hover:text-gold-dark transition-colors">
                Volver al inicio de sesión
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
