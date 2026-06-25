/**
 * Registro — Diseño alineado con la marca
 */

import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check, Eye, EyeOff, X } from 'lucide-react';
import { useAuth } from '@/shared/contexts/AuthContext';
import { checkEmailAvailability } from '@/features/auth/services/authService';
import {
  getPasswordChecks,
  isPasswordStrong,
  isRegisterFormValid,
  sanitizeDocumentNumber,
  sanitizePhone,
  validateConfirmPassword,
  validateDocumentNumber,
  validateEmail,
} from '@/shared/utils/authValidation';

const inputClass =
  'w-full px-3 py-2.5 text-sm border rounded-lg text-stone-900 placeholder-stone-400 focus:ring-2 focus:ring-gold/40 focus:border-gold transition-colors outline-none scroll-mt-28';
const labelClass = 'block text-xs font-semibold text-stone-700 mb-1';

function inputStateClass(valid, touched) {
  if (!touched) return 'border-stone-300';
  return valid ? 'border-emerald-500' : 'border-red-400';
}

function FieldHint({ valid, touched, message, successMessage }) {
  if (!touched || !message) return null;
  return (
    <p
      className={`mt-1.5 text-xs flex items-center gap-1 ${valid ? 'text-emerald-700' : 'text-red-600'}`}
      role="status"
    >
      {valid ? <Check className="w-3.5 h-3.5 shrink-0" aria-hidden /> : <X className="w-3.5 h-3.5 shrink-0" aria-hidden />}
      {valid && successMessage ? successMessage : message}
    </p>
  );
}

function PasswordChecklist({ password, touched }) {
  if (!touched || !password) return null;
  const checks = getPasswordChecks(password);

  return (
    <ul className="mt-1.5 grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-0.5" aria-live="polite">
      {checks.map((rule) => (
        <li
          key={rule.id}
          className={`text-xs flex items-center gap-1.5 ${rule.met ? 'text-emerald-700' : 'text-stone-500'}`}
        >
          {rule.met ? (
            <Check className="w-3.5 h-3.5 shrink-0" aria-hidden />
          ) : (
            <span className="w-3.5 h-3.5 shrink-0 rounded-full border border-stone-300" aria-hidden />
          )}
          {rule.label}
        </li>
      ))}
    </ul>
  );
}

function EmailAvailabilityHint({ formatValid, availability, show }) {
  if (!show) return null;

  if (!formatValid) return null;

  if (availability === 'checking') {
    return (
      <p className="mt-1.5 text-xs text-stone-500" role="status" aria-live="polite">
        Comprobando disponibilidad del correo…
      </p>
    );
  }

  if (availability === 'taken') {
    return (
      <FieldHint
        valid={false}
        touched
        message="Este correo electrónico ya está registrado."
      />
    );
  }

  if (availability === 'available') {
    return <FieldHint valid touched message="" successMessage="Correo disponible." />;
  }

  if (availability === 'error') {
    return (
      <FieldHint
        valid={false}
        touched
        message="No se pudo comprobar el correo. Intenta de nuevo."
      />
    );
  }

  return null;
}

function emailBorderClass(formatValid, availability, show) {
  if (!show) return 'border-stone-300';
  if (!formatValid || availability === 'taken') return 'border-red-400';
  if (availability === 'available') return 'border-emerald-500';
  return 'border-stone-300';
}

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
    documentType: '',
    documentNumber: '',
  });
  const [touched, setTouched] = useState({});
  const [emailAvailability, setEmailAvailability] = useState('idle');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);

  useEffect(() => {
    if (isAuthenticated) navigate('/', { replace: true });
  }, [isAuthenticated, navigate]);

  const emailValidation = useMemo(() => validateEmail(formData.email), [formData.email]);
  const passwordValid = useMemo(() => isPasswordStrong(formData.password), [formData.password]);
  const confirmValidation = useMemo(
    () => validateConfirmPassword(formData.password, formData.confirmPassword),
    [formData.password, formData.confirmPassword]
  );
  const documentValidation = useMemo(
    () => validateDocumentNumber(formData.documentNumber),
    [formData.documentNumber]
  );

  const emailShow = touched.email || formData.email.length > 0;
  const emailReady = emailValidation.valid && emailAvailability === 'available';

  const formValid = useMemo(
    () => isRegisterFormValid(formData) && emailReady,
    [formData, emailReady]
  );

  const stepOneValid = useMemo(
    () =>
      documentValidation.valid &&
      formData.firstName.trim() &&
      formData.lastName.trim() &&
      formData.documentType.trim() &&
      emailReady,
    [documentValidation.valid, formData, emailReady]
  );

  const scrollFieldIntoView = (e) => {
    window.setTimeout(() => {
      e.target.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }, 280);
  };

  useEffect(() => {
    if (!emailValidation.valid) {
      setEmailAvailability('idle');
      return undefined;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setEmailAvailability('checking');
      try {
        const result = await checkEmailAvailability(formData.email.trim(), {
          signal: controller.signal,
        });
        setEmailAvailability(result?.available ? 'available' : 'taken');
      } catch (err) {
        if (controller.signal.aborted || err?.code === 'ERR_CANCELED') return;
        setEmailAvailability('error');
      }
    }, 500);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [formData.email, emailValidation.valid]);

  const markTouched = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    let next = value;

    if (name === 'documentNumber') {
      next = sanitizeDocumentNumber(value);
    } else if (name === 'phone') {
      next = sanitizePhone(value);
    }

    setFormData((prev) => ({ ...prev, [name]: next }));
    setError('');
  };

  const handleBlur = (e) => {
    markTouched(e.target.name);
  };

  const handleContinue = () => {
    setError('');
    setTouched((prev) => ({
      ...prev,
      documentNumber: true,
      documentType: true,
      firstName: true,
      lastName: true,
      email: true,
    }));

    if (!stepOneValid) {
      if (!documentValidation.valid) {
        setError(documentValidation.message || 'Revisa el número de documento.');
        return;
      }
      if (!emailValidation.valid) {
        setError(emailValidation.message);
        return;
      }
      if (emailAvailability === 'taken') {
        setError('Este correo electrónico ya está registrado.');
        return;
      }
      if (emailAvailability !== 'available') {
        setError('Espera a que se compruebe la disponibilidad del correo.');
        return;
      }
      setError('Completa todos los campos obligatorios.');
      return;
    }

    setStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setTouched({
      email: true,
      password: true,
      confirmPassword: true,
      documentNumber: true,
      firstName: true,
      lastName: true,
      documentType: true,
    });

    if (!formValid) {
      if (!emailValidation.valid) {
        setError(emailValidation.message);
        return;
      }
      if (emailAvailability === 'taken') {
        setError('Este correo electrónico ya está registrado.');
        return;
      }
      if (emailAvailability !== 'available') {
        setError('Espera a que se compruebe la disponibilidad del correo.');
        return;
      }
      if (!passwordValid) {
        setError('La contraseña no cumple todos los requisitos.');
        return;
      }
      if (!confirmValidation.valid) {
        setError(confirmValidation.message);
        return;
      }
      if (!documentValidation.valid) {
        setError(documentValidation.message || 'Revisa el número de documento.');
        return;
      }
      setError('Completa todos los campos obligatorios.');
      return;
    }

    setLoading(true);
    try {
      await register({
        email: formData.email.trim(),
        password: formData.password,
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        phone: formData.phone || undefined,
        documentType: formData.documentType.trim(),
        documentNumber: formData.documentNumber.trim(),
        role: 'client',
      });
      navigate('/', { replace: true });
    } catch (err) {
      setError(
        err?.errors?.[0]?.message ||
          err?.message ||
          (typeof err === 'string' ? err : 'Error al registrarse')
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-4 sm:py-6">
      <div className="w-full max-w-2xl">
        <div className="bg-white rounded-2xl shadow-card border border-stone-200 overflow-hidden">
          <div className="h-1 w-full bg-gradient-to-r from-gold-dark via-gold to-gold-light" aria-hidden />
          <div className="p-5 sm:p-6">
            <p className="text-gold tracking-[0.2em] text-xs font-semibold mb-1">Nueva cuenta</p>
            <h1 className="font-serif text-xl sm:text-2xl text-stone-900 font-medium mb-1">Crear cuenta</h1>
            <p className="text-stone-500 text-xs sm:text-sm mb-4">Regístrate para gestionar tus citas</p>

            <div className="mb-4 flex items-center gap-2 text-xs font-medium" aria-label="Progreso del registro">
              <span className={step === 1 ? 'text-gold' : 'text-emerald-700'}>
                {step === 1 ? '1. Datos' : '✓ Datos'}
              </span>
              <span className="text-stone-300" aria-hidden>
                →
              </span>
              <span className={step === 2 ? 'text-gold' : 'text-stone-400'}>2. Contraseña</span>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5" noValidate>
              {error && (
                <div className="p-3 bg-red-50 border border-red-100 text-red-700 rounded-lg text-sm" role="alert">
                  {error}
                </div>
              )}

              {step === 1 ? (
                <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="documentType" className={labelClass}>
                    Tipo de documento <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="documentType"
                    name="documentType"
                    list="register-doc-types"
                    value={formData.documentType}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    onFocus={scrollFieldIntoView}
                    className={`${inputClass} border-stone-300`}
                    placeholder="CC, CE…"
                    maxLength={40}
                    required
                    autoComplete="off"
                  />
                  <datalist id="register-doc-types">
                    <option value="CC" />
                    <option value="CE" />
                    <option value="TI" />
                    <option value="Pasaporte" />
                    <option value="NIT" />
                  </datalist>
                </div>
                <div>
                  <label htmlFor="documentNumber" className={labelClass}>
                    Número de documento <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="documentNumber"
                    name="documentNumber"
                    type="text"
                    inputMode="numeric"
                    pattern="\d*"
                    value={formData.documentNumber}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    onFocus={scrollFieldIntoView}
                    className={`${inputClass} ${inputStateClass(documentValidation.valid, touched.documentNumber || formData.documentNumber.length > 0)}`}
                    maxLength={20}
                    required
                    autoComplete="off"
                    aria-describedby="documentNumber-hint"
                  />
                  <FieldHint
                    valid={documentValidation.valid}
                    touched={touched.documentNumber || formData.documentNumber.length > 0}
                    message={
                      !formData.documentNumber
                        ? 'El número de documento es obligatorio.'
                        : formData.documentNumber.length < 10
                          ? 'Mínimo 10 dígitos.'
                          : documentValidation.message
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="firstName" className={labelClass}>
                    Nombre
                  </label>
                  <input
                    id="firstName"
                    name="firstName"
                    type="text"
                    value={formData.firstName}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    onFocus={scrollFieldIntoView}
                    className={`${inputClass} border-stone-300`}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="lastName" className={labelClass}>
                    Apellido
                  </label>
                  <input
                    id="lastName"
                    name="lastName"
                    type="text"
                    value={formData.lastName}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    onFocus={scrollFieldIntoView}
                    className={`${inputClass} border-stone-300`}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="email" className={labelClass}>
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  onFocus={scrollFieldIntoView}
                  className={`${inputClass} ${emailBorderClass(emailValidation.valid, emailAvailability, emailShow)}`}
                  placeholder="tu@email.com"
                  required
                  autoComplete="email"
                  aria-describedby="email-hint"
                />
                {!emailValidation.valid && emailShow && (
                  <FieldHint
                    valid={false}
                    touched
                    message={emailValidation.message}
                  />
                )}
                <EmailAvailabilityHint
                  formatValid={emailValidation.valid}
                  availability={emailAvailability}
                  show={emailShow}
                />
              </div>

              <div>
                <label htmlFor="phone" className={labelClass}>
                  Teléfono (opcional)
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  inputMode="numeric"
                  value={formData.phone}
                  onChange={handleChange}
                  onFocus={scrollFieldIntoView}
                  className={`${inputClass} border-stone-300`}
                  maxLength={15}
                />
              </div>
              </div>

              <button
                type="button"
                onClick={handleContinue}
                disabled={!stepOneValid || emailAvailability === 'checking'}
                className="w-full py-3 px-4 bg-barber-dark text-white text-sm font-semibold rounded-lg hover:bg-barber-charcoal focus:ring-2 focus:ring-gold focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continuar
              </button>
                </>
              ) : (
                <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="password" className={labelClass}>
                  Contraseña
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    onFocus={scrollFieldIntoView}
                    className={`${inputClass} pr-11 ${inputStateClass(passwordValid, touched.password || formData.password.length > 0)}`}
                    placeholder="Crea una contraseña segura"
                    required
                    autoComplete="new-password"
                    aria-describedby="password-hint"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-1"
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <PasswordChecklist
                  password={formData.password}
                  touched={touched.password || formData.password.length > 0}
                />
                {(touched.password || formData.password.length > 0) && formData.password && passwordValid && (
                  <p className="mt-1 text-xs text-emerald-700 flex items-center gap-1" role="status">
                    <Check className="w-3.5 h-3.5 shrink-0" aria-hidden />
                    Contraseña segura
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="confirmPassword" className={labelClass}>
                  Confirmar contraseña
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    onFocus={scrollFieldIntoView}
                    className={`${inputClass} pr-11 ${inputStateClass(confirmValidation.valid, touched.confirmPassword || formData.confirmPassword.length > 0)}`}
                    required
                    autoComplete="new-password"
                    aria-describedby="confirmPassword-hint"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-1"
                    aria-label={showConfirmPassword ? 'Ocultar confirmación' : 'Mostrar confirmación'}
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <FieldHint
                  valid={confirmValidation.valid}
                  touched={touched.confirmPassword || formData.confirmPassword.length > 0}
                  message={confirmValidation.message}
                  successMessage={confirmValidation.message}
                />
              </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={() => {
                  setStep(1);
                  setError('');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="w-full sm:w-auto sm:min-w-[7rem] py-3 px-4 border border-stone-300 text-stone-700 text-sm font-semibold rounded-lg hover:bg-stone-50 transition-colors"
              >
                ← Atrás
              </button>
              <button
                type="submit"
                disabled={loading || !formValid || emailAvailability === 'checking'}
                className="w-full py-3 px-4 bg-barber-dark text-white text-sm font-semibold rounded-lg hover:bg-barber-charcoal focus:ring-2 focus:ring-gold focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creando cuenta...' : 'Registrarme'}
              </button>
              </div>
                </>
              )}
            </form>

            <p className="mt-5 text-center text-stone-600 text-sm">
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
