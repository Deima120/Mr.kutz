/**
 * Formulario crear/editar barbero
 * Solo admin
 */

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import * as barberService from '@/features/barbers/services/barberService';
import { sanitizeDocumentNumber, sanitizePhone } from '@/shared/utils/authValidation';
import AdminFormShell, {
  AdminFormCard,
  AdminFormCardHeader,
  ADMIN_FORM_LABEL_CLASS,
  ADMIN_FORM_FIELD_COMPACT,
  ADMIN_FORM_ERROR_CLASS,
  ADMIN_FORM_GRID_CLASS,
  AdminFormFooterActions,
  AdminFormPrimaryButton,
  AdminFormSecondaryButton,
  AdminFormPreviewField,
  AdminFormPreviewPanel,
  AdminFormLoadingButton,
} from '@/shared/components/admin/AdminFormShell';

export function BarberForm({
  embedded = false,
  editId = null,
  onSuccess,
  onCancel,
}) {
  const isEdit = Boolean(editId);
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
    if (isEdit && editId) {
      barberService
        .getBarberById(editId)
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
  }, [editId, isEdit]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    let next = type === 'checkbox' ? checked : value;
    if (name === 'documentNumber') next = sanitizeDocumentNumber(value);
    else if (name === 'phone') next = sanitizePhone(value);
    setFormData((prev) => ({
      ...prev,
      [name]: next,
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
        await barberService.updateBarber(editId, {
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
      if (embedded) {
        onSuccess?.({ created: !isEdit, updated: isEdit });
      } else {
        navigate('/barbers', { replace: true });
      }
    } catch (err) {
      setError(err?.message || err?.errors?.[0]?.message || 'Error al guardar');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (embedded) onCancel?.();
    else navigate(-1);
  };

  return (
    <AdminFormShell
      backTo="/barbers"
      backLabel="Barberos"
      onBackClick={embedded ? handleCancel : undefined}
      modeBadge={isEdit ? 'Edición' : 'Alta'}
      fullBleed={!embedded}
      compact={embedded}
      showBackNav={!embedded}
      aside={{
        kicker: 'Vista previa',
        title: isEdit ? 'Barbero en edición' : 'Nuevo barbero',
        subtitle: formData.firstName ? `${formData.firstName} ${formData.lastName}`.trim() : 'Completa los datos',
        bullets: [],
        statusLabel: 'Estado',
        statusValue: isEdit ? 'Modo edición' : 'Registro nuevo',
        children: (
          <AdminFormPreviewPanel>
            <AdminFormPreviewField
              label="Nombre"
              value={[formData.firstName, formData.lastName].filter(Boolean).join(' ')}
            />
            <AdminFormPreviewField
              label="Documento"
              value={
                formData.documentType && formData.documentNumber
                  ? `${formData.documentType} · ${formData.documentNumber}`
                  : ''
              }
            />
            <AdminFormPreviewField label="Correo" value={formData.email} breakAll />
            <AdminFormPreviewField label="Teléfono" value={formData.phone} />
            <AdminFormPreviewField label="Especialidades" value={formData.specialties} multiline />
          </AdminFormPreviewPanel>
        ),
      }}
    >
      <AdminFormCard onSubmit={handleSubmit}>
          <AdminFormCardHeader
            eyebrow="Integrante"
            title={isEdit ? 'Editar barbero' : 'Nuevo barbero'}
          />

          {error && <div className={ADMIN_FORM_ERROR_CLASS} role="alert">{error}</div>}

          <div className={ADMIN_FORM_GRID_CLASS}>
            <div className="group">
              <label className={ADMIN_FORM_LABEL_CLASS}>Tipo de documento *</label>
              <input
                name="documentType"
                list="barber-doc-types"
                value={formData.documentType}
                onChange={handleChange}
                className={ADMIN_FORM_FIELD_COMPACT}
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
                type="text"
                inputMode="numeric"
                pattern="\d*"
                value={formData.documentNumber}
                onChange={handleChange}
                className={ADMIN_FORM_FIELD_COMPACT}
                placeholder="Solo números"
                maxLength={20}
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
                className={ADMIN_FORM_FIELD_COMPACT}
                required
              />
            </div>
            <div className="group">
              <label className={ADMIN_FORM_LABEL_CLASS}>Apellido *</label>
              <input
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                className={ADMIN_FORM_FIELD_COMPACT}
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
                className={ADMIN_FORM_FIELD_COMPACT}
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
                className={ADMIN_FORM_FIELD_COMPACT}
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
                inputMode="numeric"
                value={formData.phone}
                onChange={handleChange}
                className={ADMIN_FORM_FIELD_COMPACT}
                placeholder="Solo números"
                maxLength={15}
              />
            </div>
            <div className="group sm:col-span-2">
              <label className={ADMIN_FORM_LABEL_CLASS}>Especialidades (separadas por coma)</label>
              <input
                name="specialties"
                value={formData.specialties}
                onChange={handleChange}
                placeholder="Ej: Corte clásico, Barba, Degradado"
                className={ADMIN_FORM_FIELD_COMPACT}
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

          <AdminFormFooterActions className="mt-1">
            <AdminFormPrimaryButton disabled={loading}>
              <AdminFormLoadingButton loading={loading} loadingLabel="Guardando…">
                Guardar barbero
              </AdminFormLoadingButton>
            </AdminFormPrimaryButton>
            <AdminFormSecondaryButton onClick={handleCancel}>Cancelar</AdminFormSecondaryButton>
          </AdminFormFooterActions>
      </AdminFormCard>
    </AdminFormShell>
  );
}

export default function BarberFormPage() {
  const { id } = useParams();
  return <BarberForm editId={id ? parseInt(id, 10) : null} />;
}

