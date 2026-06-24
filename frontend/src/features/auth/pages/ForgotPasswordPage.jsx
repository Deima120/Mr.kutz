/**
 * Recuperación de contraseña — código de verificación solo por correo registrado
 */

import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/shared/contexts/AuthContext';
import * as authService from '@/features/auth/services/authService';

const inputClass = 'input-premium';
const labelClass = 'label-premium';
const RESEND_COOLDOWN_SEC = 120;

function buildInfoMessage(res) {
  const base =
    res?.message ||
    'Si el correo está registrado en Mr. Kutz, recibirás un código de verificación en breve.';
  if (res?.cooldown) {
    return `${base} Si no lo ves, espera unos minutos antes de pedir otro código.`;
  }
  if (res?.emailSent === true) {
    return `${base} Revisa tu bandeja de entrada y la carpeta de spam.`;
  }
  if (res?.emailSent === false) {
    return `${base} No pudimos confirmar el envío; si no lo recibes en unos minutos, vuelve a intentarlo.`;
  }
  return base;
}

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
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [codeVerified, setCodeVerified] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (isAuthenticated) navigate('/', { replace: true });
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (resendCooldown <= 0) return undefined;
    const timer = setInterval(() => {
      setResendCooldown((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const requestCode = useCallback(async () => {
    setError('');
    setInfo('');
    setLoading(true);
    try {
      const res = await authService.forgotPassword(email.trim());
      setInfo(buildInfoMessage(res));
      setResendCooldown(RESEND_COOLDOWN_SEC);
      setStep(2);
      setCode('');
      setCodeVerified(false);
      setNewPassword('');
      setConfirmPassword('');
      return true;
    } catch (err) {
      const status = err?.status ?? err?.response?.status;
      if (status === 429) {
        setError('Demasiados intentos. Espera unos minutos e inténtalo de nuevo.');
      } else if (status === 0 || err?.code === 'ECONNABORTED') {
        setError(
          'La solicitud tardó demasiado. Revisa tu conexión o si el servidor está activo e inténtalo de nuevo.'
        );
      } else {
        setError(err?.message || 'No se pudo procesar la solicitud.');
      }
      return false;
    } finally {
      setLoading(false);
    }
  }, [email]);

  const handleRequestCode = async (e) => {
    e.preventDefault();
    await requestCode();
  };

  const handleResendCode = async () => {
    if (resendCooldown > 0 || loading) return;
    await requestCode();
  };

  const handleVerifyCode = async () => {
    if (!/^\d{6}$/.test(code.trim())) {
      setCodeVerified(false);
      return;
    }
    setError('');
    setVerifyingCode(true);
    try {
      await authService.verifyResetCode(email.trim(), code.trim());
      setCodeVerified(true);
      setInfo('Código verificado. Ahora elige tu nueva contraseña.');
    } catch (err) {
      setCodeVerified(false);
      setError(err?.message || 'El código no es válido.');
    } finally {
      setVerifyingCode(false);
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    setError('');
    if (!codeVerified) {
      setError('Verifica el código de 6 dígitos antes de guardar la contraseña.');
      return;
    }
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
                ? 'Indica el correo con el que te registraste. Solo enviamos el código a cuentas activas en Mr. Kutz.'
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
                  {loading ? 'Enviando código…' : 'Enviar código'}
                </button>
                {loading && (
                  <p className="text-xs text-center text-stone-500">
                    Conectando con el servidor de correo. Suele tardar entre 2 y 10 segundos.
                  </p>
                )}
              </form>
            )}

            {step === 2 && (
              <form onSubmit={handleReset} className="space-y-5">
                {info && (
                  <div
                    className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-700"
                    role="status"
                  >
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
                    Código de verificación (6 dígitos)
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="fp-code"
                      type="text"
                      inputMode="numeric"
                      pattern="\d{6}"
                      maxLength={6}
                      value={code}
                      onChange={(e) => {
                        setCode(e.target.value.replace(/\D/g, '').slice(0, 6));
                        setCodeVerified(false);
                      }}
                      onBlur={handleVerifyCode}
                      className={`${inputClass} flex-1 tracking-widest text-center font-mono`}
                      placeholder="000000"
                      required
                      autoComplete="one-time-code"
                    />
                    <button
                      type="button"
                      onClick={handleVerifyCode}
                      disabled={code.length !== 6 || loading || verifyingCode}
                      className="btn-admin-outline px-3 text-xs whitespace-nowrap disabled:opacity-50"
                    >
                      {verifyingCode ? '…' : codeVerified ? '✓ OK' : 'Verificar'}
                    </button>
                  </div>
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
                    minLength={8}
                    autoComplete="new-password"
                    disabled={!codeVerified}
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
                    minLength={8}
                    autoComplete="new-password"
                    disabled={!codeVerified}
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading || !codeVerified}
                  className="w-full btn-dark py-3.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Guardando...' : 'Guardar contraseña'}
                </button>
                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={loading || resendCooldown > 0}
                  className="w-full text-sm text-gold font-semibold hover:text-gold-dark py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {resendCooldown > 0
                    ? `Reenviar código (${resendCooldown}s)`
                    : 'Reenviar código'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStep(1);
                    setError('');
                    setInfo('');
                    setCode('');
                    setCodeVerified(false);
                    setNewPassword('');
                    setConfirmPassword('');
                    setResendCooldown(0);
                  }}
                  className="w-full text-sm text-stone-500 hover:text-stone-800 py-2"
                >
                  ← Cambiar correo
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
