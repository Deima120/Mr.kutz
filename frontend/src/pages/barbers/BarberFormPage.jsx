/**
 * Formulario crear/editar barbero
 * Solo admin
 */

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import * as barberService from '../../services/barberService';
import AdminFormShell, {
  AdminFormCardHeader,
  ADMIN_FORM_FIELD_CLASS,
  ADMIN_FORM_LABEL_CLASS,
  AdminFormFooterActions,
  AdminFormPrimaryButton,
  AdminFormSecondaryButton,
} from '../../components/admin/AdminFormShell';

export default function BarberFormPage() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phone: '',
    specialties: '',
    isActive: true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isEdit) {
      barberService
        .getBarberById(id)
        .then((b) => {
          setFormData({
            email: b.email || '',
            password: '',
            firstName: b.first_name || '',
            lastName: b.last_name || '',
            phone: b.phone || '',
            specialties: Array.isArray(b.specialties) ? b.specialties.join(', ') : '',
            isActive: b.is_active !== false,
          });
        })
        .catch(() => setError('Barbero no encontrado'));
    }
  }, [id, isEdit]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const specialties = formData.specialties
        ? formData.specialties.split(',').map((s) => s.trim()).filter(Boolean)
        : [];

      if (isEdit) {
        await barberService.updateBarber(id, {
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: formData.phone || undefined,
          specialties,
          isActive: formData.isActive,
        });
      } else {
        if (!formData.password || formData.password.length < 6) {
          setError('La contraseña debe tener al menos 6 caracteres');
          setLoading(false);
          return;
        }
        await barberService.createBarber({
          email: formData.email,
          password: formData.password,
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: formData.phone || undefined,
          specialties,
        });
      }
      navigate('/barbers', { replace: true });
    } catch (err) {
      setError(err?.message || err?.errors?.[0]?.message || 'Error al guardar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminFormShell
      backTo="/barbers"
      backLabel="Barberos"
      modeBadge={isEdit ? 'Edición' : 'Alta'}
      aside={{
        kicker: 'Equipo',
        title: 'Perfiles que marcan la agenda',
        bullets: [
          'Las especialidades ayudan a filtrar citas y mostrar talento en la app.',
          'El correo de alta no se puede cambiar después; el acceso depende de él.',
          'Desactiva un barbero si está de baja temporal sin borrar su historial.',
        ],
        statusLabel: 'Estado',
        statusValue: isEdit ? 'Modo edición' : 'Alta nueva',
      }}
    >
      <form
        onSubmit={handleSubmit}
        className="relative h-full min-h-0 flex flex-col rounded-[1.28rem] bg-white/88 backdrop-blur-xl border border-white shadow-[inset_0_1px_0_rgba(255,255,255,0.92)] overflow-hidden"
      >
        <div className="h-[3px] w-full shrink-0 bg-gradient-to-r from-gold-dark/80 via-gold to-gold-light/80" aria-hidden />
        <div className="px-5 py-4 sm:px-7 sm:py-5 flex flex-col gap-4 flex-1 min-h-0 overflow-y-auto">
          <AdminFormCardHeader
            eyebrow="Integrante"
            title={isEdit ? 'Editar barbero' : 'Nuevo barbero'}
          />

          {error && <div className="alert-error text-sm py-2.5 shrink-0">{error}</div>}

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
            <div className="group">
              <label className={ADMIN_FORM_LABEL_CLASS}>Nombre *</label>
              <input
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                className={ADMIN_FORM_FIELD_CLASS}
                required
              />
            </div>
            <div className="group">
              <label className={ADMIN_FORM_LABEL_CLASS}>Apellido *</label>
              <input
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                className={ADMIN_FORM_FIELD_CLASS}
                required
              />
            </div>
            <div className="group sm:col-span-2 xl:col-span-2">
              <label className={ADMIN_FORM_LABEL_CLASS}>Correo electrónico *</label>
              <input
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                className={ADMIN_FORM_FIELD_CLASS}
                required
                disabled={isEdit}
              />
              {isEdit && <p className="text-xs text-stone-500 mt-1">El correo no se puede modificar.</p>}
            </div>
          </div>

          {!isEdit && (
            <div className="group">
              <label className={ADMIN_FORM_LABEL_CLASS}>Contraseña *</label>
              <input
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                className={ADMIN_FORM_FIELD_CLASS}
                placeholder="Mínimo 6 caracteres"
                required={!isEdit}
              />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="group">
              <label className={ADMIN_FORM_LABEL_CLASS}>Teléfono</label>
              <input name="phone" type="tel" value={formData.phone} onChange={handleChange} className={ADMIN_FORM_FIELD_CLASS} />
            </div>
            <div className="group sm:col-span-2">
              <label className={ADMIN_FORM_LABEL_CLASS}>Especialidades (separadas por coma)</label>
              <input
                name="specialties"
                value={formData.specialties}
                onChange={handleChange}
                placeholder="Ej: Corte clásico, Barba, Degradado"
                className={ADMIN_FORM_FIELD_CLASS}
              />
            </div>
          </div>

          {isEdit && (
            <label className="flex items-center gap-2 cursor-pointer shrink-0">
              <input
                name="isActive"
                type="checkbox"
                checked={formData.isActive}
                onChange={handleChange}
                className="rounded border-stone-300 text-gold focus:ring-gold/40"
              />
              <span className="text-sm text-stone-700">Activo en la agenda</span>
            </label>
          )}

          <AdminFormFooterActions className="mt-auto">
            <AdminFormPrimaryButton disabled={loading}>{loading ? 'Guardando…' : 'Guardar'}</AdminFormPrimaryButton>
            <AdminFormSecondaryButton onClick={() => navigate(-1)}>Cancelar</AdminFormSecondaryButton>
          </AdminFormFooterActions>
        </div>
      </form>
    </AdminFormShell>
  );
}
