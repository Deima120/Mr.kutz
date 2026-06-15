/**
 * Formulario para crear o editar cliente (compacto)
 */

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import * as clientService from '@/features/clients/services/clientService';
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

const NOTES_MAX = 500;

export function ClientForm({
  embedded = false,
  editId = null,
  onSuccess,
  onCancel,
}) {
  const isEdit = Boolean(editId);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    documentType: '',
    documentNumber: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (isEdit && editId) {
      clientService
        .getClientById(editId)
        .then((client) => {
          setFormData({
            firstName: client.first_name || '',
            lastName: client.last_name || '',
            email: client.email || '',
            phone: client.phone || '',
            documentType: client.document_type || '',
            documentNumber: client.document_number || '',
            notes: client.notes || '',
          });
        })
        .catch(() => setError('Cliente no encontrado'));
    }
  }, [editId, isEdit]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'notes' && value.length > NOTES_MAX) return;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!formData.documentType.trim() || !formData.documentNumber.trim()) {
      setError('El tipo y número de documento son obligatorios.');
      setLoading(false);
      return;
    }

    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      setError('Nombre y apellido son obligatorios.');
      setLoading(false);
      return;
    }

    if (formData.email && !formData.email.includes('@')) {
      setError('Correo inválido.');
      setLoading(false);
      return;
    }

    const payload = {
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email || undefined,
      phone: formData.phone || undefined,
      documentType: formData.documentType.trim(),
      documentNumber: formData.documentNumber.trim(),
      notes: formData.notes.trim(),
    };

    try {
      if (isEdit) {
        await clientService.updateClient(editId, payload);
      } else {
        await clientService.createClient(payload);
      }
      if (embedded) {
        onSuccess?.({ created: !isEdit, updated: isEdit });
      } else {
        setSuccess(true);
        setTimeout(() => navigate('/clients', { replace: true }), 1500);
      }
    } catch (err) {
      const msg = err?.errors?.[0]?.message || err?.message || 'Error al guardar';
      setError(msg);
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
      backTo="/clients"
      backLabel="Clientes"
      onBackClick={embedded ? handleCancel : undefined}
      modeBadge={isEdit ? 'Edición' : 'Alta'}
      fullBleed={!embedded}
      compact={embedded}
      showBackNav={!embedded}
      aside={{
        kicker: 'Vista previa',
        title: isEdit ? 'Datos actualizados' : 'Nuevo cliente',
        subtitle: isEdit ? formData.firstName || 'Cliente' : 'Completa los datos',
        bullets: [],
        statusLabel: 'Estado',
        statusValue: isEdit ? 'Modo edición' : 'Registro nuevo',
        children: (
          <AdminFormPreviewPanel>
            <AdminFormPreviewField label="Nombre" value={formData.firstName} />
            <AdminFormPreviewField label="Apellido" value={formData.lastName} />
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
            {formData.notes ? (
              <AdminFormPreviewField label="Notas" value={formData.notes} multiline />
            ) : null}
          </AdminFormPreviewPanel>
        ),
      }}
    >
      <AdminFormCard onSubmit={handleSubmit}>
          <AdminFormCardHeader
            eyebrow="Ficha de cliente"
            title={isEdit ? 'Actualizar datos' : 'Registrar cliente'}
          />

          {success && !embedded && (
            <div className="alert-success shrink-0 text-xs py-2 flex items-center justify-between" role="status">
              <span>{isEdit ? '✓ Cliente actualizado correctamente' : '✓ Cliente registrado correctamente'}</span>
            </div>
          )}

          {error && <div className={ADMIN_FORM_ERROR_CLASS} role="alert">{error}</div>}

          <div className={ADMIN_FORM_GRID_CLASS}>
            <div className="group">
              <label htmlFor="documentType" className={ADMIN_FORM_LABEL_CLASS}>
                Tipo de documento <span className="text-red-600 normal-case">*</span>
              </label>
              <input
                id="documentType"
                name="documentType"
                list="client-doc-types"
                value={formData.documentType}
                onChange={handleChange}
                className={ADMIN_FORM_FIELD_COMPACT}
                placeholder="Ej. CC, CE, NIT…"
                maxLength={40}
                required
                autoComplete="off"
              />
              <datalist id="client-doc-types">
                <option value="CC" />
                <option value="CE" />
                <option value="TI" />
                <option value="Pasaporte" />
                <option value="NIT" />
              </datalist>
            </div>
            <div className="group">
              <label htmlFor="documentNumber" className={ADMIN_FORM_LABEL_CLASS}>
                Número de documento <span className="text-red-600 normal-case">*</span>
              </label>
              <input
                id="documentNumber"
                name="documentNumber"
                value={formData.documentNumber}
                onChange={handleChange}
                className={ADMIN_FORM_FIELD_COMPACT}
                placeholder="Sin puntos ni espacios, si aplica"
                maxLength={80}
                required
                autoComplete="off"
              />
            </div>
          </div>

          <div className={ADMIN_FORM_GRID_CLASS}>
            <div className="group">
              <label htmlFor="firstName" className={ADMIN_FORM_LABEL_CLASS}>
                Nombre <span className="text-red-600 normal-case">*</span>
              </label>
              <input
                id="firstName"
                name="firstName"
                type="text"
                value={formData.firstName}
                onChange={handleChange}
                className={ADMIN_FORM_FIELD_COMPACT}
                required
              />
            </div>
            <div className="group">
              <label htmlFor="lastName" className={ADMIN_FORM_LABEL_CLASS}>
                Apellido <span className="text-red-600 normal-case">*</span>
              </label>
              <input
                id="lastName"
                name="lastName"
                type="text"
                value={formData.lastName}
                onChange={handleChange}
                className={ADMIN_FORM_FIELD_COMPACT}
                required
              />
            </div>
            <div className="group">
              <label htmlFor="email" className={ADMIN_FORM_LABEL_CLASS}>
                Correo <span className="text-red-600 normal-case">*</span>
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                className={ADMIN_FORM_FIELD_COMPACT}
                placeholder="correo@ejemplo.com"
                required
              />
            </div>
            <div className="group">
              <label htmlFor="phone" className={ADMIN_FORM_LABEL_CLASS}>
                Teléfono
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleChange}
                className={ADMIN_FORM_FIELD_COMPACT}
                placeholder="Opcional"
              />
            </div>
          </div>

          <div className="group shrink-0">
            <div className="flex items-baseline justify-between gap-2 mb-0.5">
              <label htmlFor="notes" className={`${ADMIN_FORM_LABEL_CLASS} mb-0`}>
                Notas internas
              </label>
              <span className="text-[10px] text-stone-400 tabular-nums">
                {formData.notes.length}/{NOTES_MAX}
              </span>
            </div>
            <textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={2}
              maxLength={NOTES_MAX}
              className={`${ADMIN_FORM_FIELD_COMPACT} resize-none min-h-[3.25rem] max-h-24 leading-snug`}
              placeholder="Breve: preferencias, alergias…"
            />
          </div>

          <AdminFormFooterActions className="mt-1">
            <AdminFormPrimaryButton disabled={loading}>
              <AdminFormLoadingButton loading={loading} loadingLabel="Guardando…">
                Guardar cliente
              </AdminFormLoadingButton>
            </AdminFormPrimaryButton>
            <AdminFormSecondaryButton onClick={handleCancel}>Cancelar</AdminFormSecondaryButton>
          </AdminFormFooterActions>
      </AdminFormCard>
    </AdminFormShell>
  );
}

export default function ClientFormPage() {
  const { id } = useParams();
  return <ClientForm editId={id ? parseInt(id, 10) : null} />;
}
