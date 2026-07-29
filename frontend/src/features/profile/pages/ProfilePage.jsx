import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Pencil } from 'lucide-react';
import { useAuth } from '@/shared/contexts/AuthContext';
import * as authService from '@/features/auth/services/authService';
import {
  validateClientProfileForm,
  getApiErrorMessage,
  sanitizePhone,
  sanitizePersonName,
} from '@/shared/utils/formValidation';
import { useFormValidation } from '@/shared/hooks/useFormValidation';
import { formatDisplayDate } from '@/shared/utils/formatDisplayDate';
import { FieldErrorMessage, FieldHint } from '@/shared/components/FormValidationFields';

function safeDate(value) {
  return formatDisplayDate(value, { year: 'numeric', month: 'long', day: 'numeric' });
}

const FIELD_CLASS =
  'w-full px-3.5 py-2.5 rounded-xl text-sm text-stone-900 placeholder-stone-400 ' +
  'bg-stone-50/90 border border-stone-200/90 focus:bg-white focus:border-gold/50 ' +
  'focus:ring-2 focus:ring-gold/20 outline-none transition-all min-h-[42px]';

export default function ProfilePage() {
  const { user, applyUser } = useAuth();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
  });
  const { fieldError, applyValidation, clearFieldError, markTouched, clearValidation, fieldBorderClass } =
    useFormValidation();

  useEffect(() => {
    if (!user) return;
    setForm({
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      email: user.email || '',
      phone: user.phone || '',
    });
  }, [user]);

  useEffect(() => {
    if (!success) return undefined;
    const timer = window.setTimeout(() => setSuccess(''), 5000);
    return () => window.clearTimeout(timer);
  }, [success]);

  const fullName = useMemo(
    () => [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim() || 'Cliente',
    [user?.firstName, user?.lastName],
  );
  const initial = fullName.charAt(0).toUpperCase();

  const startEdit = () => {
    setForm({
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      email: user?.email || '',
      phone: user?.phone || '',
    });
    clearValidation();
    setError('');
    setSuccess('');
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setError('');
    clearValidation();
    setForm({
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      email: user?.email || '',
      phone: user?.phone || '',
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    let next = value;
    if (name === 'firstName' || name === 'lastName') next = sanitizePersonName(value);
    if (name === 'phone') next = sanitizePhone(value);
    setForm((prev) => ({ ...prev, [name]: next }));
    clearFieldError(name);
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validation = validateClientProfileForm(form);
    if (!applyValidation(validation)) {
      setError(validation.firstError);
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const updated = await authService.updateProfile({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
      });
      applyUser(updated);
      setEditing(false);
      setSuccess('Perfil actualizado correctamente.');
    } catch (err) {
      setError(getApiErrorMessage(err, 'No se pudo actualizar el perfil.'));
    } finally {
      setSaving(false);
    }
  };

  const hintOrError = (name, value, okHint) => {
    const err = fieldError(name);
    if (err) return <FieldErrorMessage>{err}</FieldErrorMessage>;
    if (value) return <FieldHint>{okHint}</FieldHint>;
    return null;
  };

  return (
    <div className="min-h-[70vh] bg-stone-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        <div className="max-w-4xl mx-auto">
          <p className="section-label text-gold">Mi cuenta</p>
          <div className="flex flex-wrap items-end justify-between gap-4 mb-2">
            <h1 className="font-serif text-3xl sm:text-4xl text-stone-900 font-medium tracking-tight">
              Mi perfil
            </h1>
            {!editing && (
              <button
                type="button"
                onClick={startEdit}
                className="inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm font-semibold text-stone-800 hover:border-gold/50 hover:bg-gold/5 transition-colors"
              >
                <Pencil className="w-4 h-4 text-gold" strokeWidth={2} aria-hidden />
                Editar perfil
              </button>
            )}
          </div>
          <p className="text-stone-500 mb-8">
            Gestiona tu información y accede rápido a tus acciones principales.
          </p>

          {success && !editing && (
            <div
              className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
              role="status"
            >
              {success}
            </div>
          )}

          <div className="grid lg:grid-cols-3 gap-6">
            <section className="panel-card lg:col-span-2 p-6 sm:p-8">
              <div className="flex flex-wrap items-center gap-4 mb-6">
                <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-barber-dark text-gold text-xl font-semibold">
                  {initial}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs tracking-widest text-stone-500">Cliente</p>
                  <p className="font-serif text-2xl text-stone-900 font-medium truncate">{fullName}</p>
                </div>
              </div>

              {editing ? (
                <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                  {error && (
                    <div
                      className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
                      role="alert"
                    >
                      {error}
                    </div>
                  )}

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="profile-firstName" className="block text-xs tracking-wider text-stone-500 mb-1.5">
                        Nombre *
                      </label>
                      <input
                        id="profile-firstName"
                        name="firstName"
                        value={form.firstName}
                        onChange={handleChange}
                        onBlur={() => markTouched('firstName')}
                        className={`${FIELD_CLASS} ${fieldBorderClass('firstName', !fieldError('firstName'), form.firstName)}`}
                        autoComplete="given-name"
                      />
                      {hintOrError('firstName', form.firstName, 'Nombre listo.')}
                    </div>
                    <div>
                      <label htmlFor="profile-lastName" className="block text-xs tracking-wider text-stone-500 mb-1.5">
                        Apellido *
                      </label>
                      <input
                        id="profile-lastName"
                        name="lastName"
                        value={form.lastName}
                        onChange={handleChange}
                        onBlur={() => markTouched('lastName')}
                        className={`${FIELD_CLASS} ${fieldBorderClass('lastName', !fieldError('lastName'), form.lastName)}`}
                        autoComplete="family-name"
                      />
                      {hintOrError('lastName', form.lastName, 'Apellido listo.')}
                    </div>
                    <div>
                      <label htmlFor="profile-email" className="block text-xs tracking-wider text-stone-500 mb-1.5">
                        Correo *
                      </label>
                      <input
                        id="profile-email"
                        name="email"
                        type="email"
                        value={form.email}
                        onChange={handleChange}
                        onBlur={() => markTouched('email')}
                        className={`${FIELD_CLASS} ${fieldBorderClass('email', !fieldError('email'), form.email)}`}
                        autoComplete="email"
                      />
                      {hintOrError('email', form.email, 'Correo listo.')}
                    </div>
                    <div>
                      <label htmlFor="profile-phone" className="block text-xs tracking-wider text-stone-500 mb-1.5">
                        Teléfono
                      </label>
                      <input
                        id="profile-phone"
                        name="phone"
                        value={form.phone}
                        onChange={handleChange}
                        onBlur={() => markTouched('phone')}
                        className={`${FIELD_CLASS} ${fieldBorderClass('phone', !fieldError('phone'), form.phone)}`}
                        autoComplete="tel"
                        placeholder="Opcional"
                      />
                      {hintOrError('phone', form.phone, 'Teléfono listo.')}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3 pt-2">
                    <button
                      type="submit"
                      disabled={saving}
                      className="btn-dark disabled:opacity-60"
                    >
                      {saving ? 'Guardando…' : 'Guardar cambios'}
                    </button>
                    <button
                      type="button"
                      onClick={cancelEdit}
                      disabled={saving}
                      className="btn-outline"
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              ) : (
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="rounded-xl border border-stone-200 bg-white px-4 py-3">
                    <p className="text-xs tracking-wider text-stone-500 mb-1">Correo</p>
                    <p className="text-stone-800">{user?.email || '—'}</p>
                  </div>
                  <div className="rounded-xl border border-stone-200 bg-white px-4 py-3">
                    <p className="text-xs tracking-wider text-stone-500 mb-1">Teléfono</p>
                    <p className="text-stone-800">{user?.phone || '—'}</p>
                  </div>
                  <div className="rounded-xl border border-stone-200 bg-white px-4 py-3">
                    <p className="text-xs tracking-wider text-stone-500 mb-1">Rol</p>
                    <p className="text-stone-800 capitalize">{user?.role || '—'}</p>
                  </div>
                  <div className="rounded-xl border border-stone-200 bg-white px-4 py-3">
                    <p className="text-xs tracking-wider text-stone-500 mb-1">Miembro desde</p>
                    <p className="text-stone-800">{safeDate(user?.createdAt)}</p>
                  </div>
                </div>
              )}
            </section>

            <aside className="panel-card-soft p-6 sm:p-8">
              <h2 className="font-serif text-xl text-stone-900 font-medium mb-4">Acciones rápidas</h2>
              <div className="space-y-3">
                <Link to="/appointments/new" className="btn-dark w-full text-center">
                  Agendar cita
                </Link>
                <Link to="/appointments" className="btn-outline w-full text-center">
                  Ver mis citas
                </Link>
                <button
                  type="button"
                  className="btn-outline w-full text-center"
                  onClick={() => navigate({ pathname: '/', hash: 'satisfaccion' })}
                >
                  Ver satisfacción
                </button>
              </div>
              <p className="text-xs text-stone-500 mt-5">
                Para cambiar la contraseña usa «¿Olvidaste tu contraseña?» en el inicio de sesión.
              </p>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}
