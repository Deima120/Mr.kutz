/**
 * Formulario crear/editar barbero
 * Solo admin
 */

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import * as barberService from '@/features/barbers/services/barberService';
import AdminFormShell, {
  AdminFormCardHeader,
  ADMIN_FORM_FIELD_CLASS,
  ADMIN_FORM_LABEL_CLASS,
  AdminFormFooterActions,
  AdminFormPrimaryButton,
  AdminFormSecondaryButton,
} from '@/shared/components/admin/AdminFormShell';

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
    documentType: '',
    documentNumber: '',
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
            documentType: b.document_type || '',
            documentNumber: b.document_number || '',
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
        if (!formData.documentType.trim() || !formData.documentNumber.trim()) {
          setError('El tipo y número de documento son obligatorios');
          setLoading(false);
          return;
        }
        await barberService.updateBarber(id, {
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: formData.phone || undefined,
          documentType: formData.documentType.trim(),
          documentNumber: formData.documentNumber.trim(),
          specialties,
          isActive: formData.isActive,
        });
      } else {
        if (!formData.documentType.trim() || !formData.documentNumber.trim()) {
          setError('El tipo y número de documento son obligatorios');
          setLoading(false);
          return;
        }
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
          documentType: formData.documentType.trim(),
          documentNumber: formData.documentNumber.trim(),
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
          'Primero registra tipo y número de documento del integrante.',
          'Las especialidades ayudan a filtrar citas y mostrar talento en la app.',
          'El correo de alta no se puede cambiar; desactiva si está de baja temporal.',
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
        <div className="px-4 py-3 sm:px-5 sm:py-4 flex flex-col gap-2.5 flex-1 min-h-0 overflow-y-auto">
          <AdminFormCardHeader
            eyebrow="Integrante"
            title={isEdit ? 'Editar barbero' : 'Nuevo barbero'}
          />

          {error && <div className="alert-error text-xs py-2 shrink-0">{error}</div>}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
            <div className="group">
              <label className={ADMIN_FORM_LABEL_CLASS}>Tipo de documento *</label>
              <input
                name="documentType"
                list="barber-doc-types"
                value={formData.documentType}
                onChange={handleChange}
                className={`${ADMIN_FORM_FIELD_CLASS} py-2 text-sm`}
                placeholder="Ej. CC, CE, NIT…"
                maxLength={40}
                required
                autoComplete="off"
              />
              <datalist id="barber-doc-types">
                <option value="CC" />
                <option value="CE" />
                <option value="TI" />
                <option value="Pasaporte" />
                <option value="NIT" />
              </datalist>
            </div>
            <div className="group">
              <label className={ADMIN_FORM_LABEL_CLASS}>Número de documento *</label>
              <input
                name="documentNumber"
                value={formData.documentNumber}
                onChange={handleChange}
                className={`${ADMIN_FORM_FIELD_CLASS} py-2 text-sm`}
                placeholder="Sin puntos ni espacios, si aplica"
                maxLength={80}
                required
                autoComplete="off"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2 sm:gap-3">
            <div className="group">
              <label className={ADMIN_FORM_LABEL_CLASS}>Nombre *</label>
              <input
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                className={`${ADMIN_FORM_FIELD_CLASS} py-2 text-sm`}
                required
              />
            </div>
            <div className="group">
              <label className={ADMIN_FORM_LABEL_CLASS}>Apellido *</label>
              <input
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                className={`${ADMIN_FORM_FIELD_CLASS} py-2 text-sm`}
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
                className={`${ADMIN_FORM_FIELD_CLASS} py-2 text-sm`}
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
                className={`${ADMIN_FORM_FIELD_CLASS} py-2 text-sm`}
                placeholder="Mín. 8 caracteres, con mayúscula, minúscula y número"
                required={!isEdit}
              />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
            <div className="group">
              <label className={ADMIN_FORM_LABEL_CLASS}>Teléfono</label>
              <input
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleChange}
                className={`${ADMIN_FORM_FIELD_CLASS} py-2 text-sm`}
              />
            </div>
            <div className="group sm:col-span-2">
              <label className={ADMIN_FORM_LABEL_CLASS}>Especialidades (separadas por coma)</label>
              <input
                name="specialties"
                value={formData.specialties}
                onChange={handleChange}
                placeholder="Ej: Corte clásico, Barba, Degradado"
                className={`${ADMIN_FORM_FIELD_CLASS} py-2 text-sm`}
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

