/**
 * Formulario crear/editar barbero
 * Solo admin
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import * as barberService from '@/features/barbers/services/barberService';
import {
  sanitizeDocumentNumber,
  sanitizePhone,
  sanitizePersonName,
  validateBarberForm,
  getApiErrorMessage,
  validateDocumentType,
  validateAdminDocumentNumber,
  validatePersonName,
  validateEmail,
  validatePassword,
  validatePhone,
  DOCUMENT_TYPE_OPTIONS,
  CLIENT_FIRST_NAME_MIN,
  CLIENT_LAST_NAME_MIN,
  CLIENT_NAME_MAX,
  TEXT_SPECIALTIES_JOINED_MAX,
} from '@/shared/utils/formValidation';
import { useFormValidation } from '@/shared/hooks/useFormValidation';
import { AdminFormField } from '@/shared/components/FormValidationFields';
import AdminFormShell, {
  AdminFormCard,
  AdminFormCardHeader,
  ADMIN_FORM_LABEL_CLASS,
  ADMIN_FORM_FIELD_COMPACT,
  ADMIN_FORM_ERROR_CLASS,
  ADMIN_FORM_GRID_CLASS,
  AdminFormFooterActions,
  AdminFormPrimaryButton,
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
  const { fieldError, applyValidation, clearFieldError, markTouched, buildLiveHint } = useFormValidation();

  const documentTypeValidation = useMemo(
    () => validateDocumentType(formData.documentType),
    [formData.documentType]
  );
  const documentNumberValidation = useMemo(
    () => validateAdminDocumentNumber(formData.documentNumber),
    [formData.documentNumber]
  );
  const firstNameValidation = useMemo(
    () =>
      validatePersonName(formData.firstName, 'El nombre', {
        minLength: CLIENT_FIRST_NAME_MIN,
      }),
    [formData.firstName]
  );
  const lastNameValidation = useMemo(
    () =>
      validatePersonName(formData.lastName, 'El apellido', {
        minLength: CLIENT_LAST_NAME_MIN,
      }),
    [formData.lastName]
  );
  const emailValidation = useMemo(() => validateEmail(formData.email), [formData.email]);
  const passwordValidation = useMemo(
    () => validatePassword(formData.password, { required: !isEdit }),
    [formData.password, isEdit]
  );
  const phoneValidation = useMemo(
    () => validatePhone(formData.phone, { required: false }),
    [formData.phone]
  );

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
    else if (name === 'firstName' || name === 'lastName') next = sanitizePersonName(value);
    else if (name === 'specialties') next = String(value).slice(0, TEXT_SPECIALTIES_JOINED_MAX);
    setFormData((prev) => ({
      ...prev,
      [name]: next,
    }));
    setError('');
    clearFieldError(name);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validation = validateBarberForm(formData, isEdit);
    if (!applyValidation(validation)) {
      setError(validation.firstError);
      return;
    }
    setLoading(true);
    setError('');

    try {
      const specialties = formData.specialties
        ? formData.specialties.split(',').map((s) => s.trim()).filter(Boolean)
        : [];

      if (isEdit) {
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
      setError(getApiErrorMessage(err, 'Error al guardar'));
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (embedded) onCancel?.();
    else navigate('/barbers');
  };

  return (
    <AdminFormShell
      backTo="/barbers"
      onBackClick={embedded ? handleCancel : undefined}
      modeBadge={isEdit ? 'Edición' : 'Alta'}
      fullBleed={!embedded}
      compact={embedded}
      contained={embedded}
      showBackNav
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
          {!embedded && (
            <AdminFormCardHeader
              eyebrow="Integrante"
              title={isEdit ? 'Editar barbero' : 'Nuevo barbero'}
            />
          )}

          {error && <div className={ADMIN_FORM_ERROR_CLASS} role="alert">{error}</div>}

          <div className={ADMIN_FORM_GRID_CLASS}>
            <AdminFormField
              label="Tipo de documento"
              htmlFor="barber-doc-type"
              required
              error={fieldError('documentType')}
              live={buildLiveHint('documentType', formData.documentType, documentTypeValidation, 'Tipo válido.')}
            >
              {({ errorId, invalid, liveBorderClass, submitBorderClass }) => (
                <select
                  id="barber-doc-type"
                  name="documentType"
                  value={formData.documentType}
                  onChange={handleChange}
                  onBlur={() => markTouched('documentType')}
                  className={`${ADMIN_FORM_FIELD_COMPACT} ${submitBorderClass || liveBorderClass}`}
                  aria-invalid={invalid || undefined}
                  aria-describedby={errorId}
                >
                  <option value="">Selecciona…</option>
                  {DOCUMENT_TYPE_OPTIONS.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                  {isEdit &&
                    formData.documentType &&
                    !DOCUMENT_TYPE_OPTIONS.includes(formData.documentType) && (
                      <option value={formData.documentType}>{formData.documentType}</option>
                    )}
                </select>
              )}
            </AdminFormField>
            <AdminFormField
              label="Número de documento"
              htmlFor="barber-doc-number"
              required
              error={fieldError('documentNumber')}
              live={buildLiveHint('documentNumber', formData.documentNumber, documentNumberValidation, 'Documento válido.')}
            >
              {({ errorId, invalid, liveBorderClass, submitBorderClass }) => (
                <input
                  id="barber-doc-number"
                  name="documentNumber"
                  type="text"
                  inputMode="numeric"
                  value={formData.documentNumber}
                  onChange={handleChange}
                  onBlur={() => markTouched('documentNumber')}
                  className={`${ADMIN_FORM_FIELD_COMPACT} ${submitBorderClass || liveBorderClass}`}
                  placeholder="Solo números"
                  maxLength={20}
                  autoComplete="off"
                  aria-invalid={invalid || undefined}
                  aria-describedby={errorId}
                />
              )}
            </AdminFormField>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2 sm:gap-3">
            <AdminFormField
              label="Nombre"
              htmlFor="barber-first-name"
              required
              error={fieldError('firstName')}
              live={buildLiveHint('firstName', formData.firstName, firstNameValidation, 'Nombre válido.')}
            >
              {({ errorId, invalid, liveBorderClass, submitBorderClass }) => (
                <input
                  id="barber-first-name"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  onBlur={() => markTouched('firstName')}
                  className={`${ADMIN_FORM_FIELD_COMPACT} ${submitBorderClass || liveBorderClass}`}
                  maxLength={CLIENT_NAME_MAX}
                  aria-invalid={invalid || undefined}
                  aria-describedby={errorId}
                />
              )}
            </AdminFormField>
            <AdminFormField
              label="Apellido"
              htmlFor="barber-last-name"
              required
              error={fieldError('lastName')}
              live={buildLiveHint('lastName', formData.lastName, lastNameValidation, 'Apellido válido.')}
            >
              {({ errorId, invalid, liveBorderClass, submitBorderClass }) => (
                <input
                  id="barber-last-name"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  onBlur={() => markTouched('lastName')}
                  className={`${ADMIN_FORM_FIELD_COMPACT} ${submitBorderClass || liveBorderClass}`}
                  maxLength={CLIENT_NAME_MAX}
                  aria-invalid={invalid || undefined}
                  aria-describedby={errorId}
                />
              )}
            </AdminFormField>
            <AdminFormField
              label="Correo electrónico"
              htmlFor="barber-email"
              required={!isEdit}
              error={fieldError('email')}
              live={!isEdit ? buildLiveHint('email', formData.email, emailValidation, 'Correo válido.') : null}
              className="sm:col-span-2 xl:col-span-2"
            >
              {({ errorId, invalid, liveBorderClass, submitBorderClass }) => (
                <>
                  <input
                    id="barber-email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    onBlur={() => markTouched('email')}
                    className={`${ADMIN_FORM_FIELD_COMPACT} ${submitBorderClass || liveBorderClass}`}
                    disabled={isEdit}
                    aria-invalid={invalid || undefined}
                    aria-describedby={errorId}
                  />
                  {isEdit && <p className="text-xs text-stone-500 mt-1">El correo no se puede modificar.</p>}
                </>
              )}
            </AdminFormField>
          </div>

          {!isEdit && (
            <AdminFormField
              label="Contraseña"
              htmlFor="barber-password"
              required
              error={fieldError('password')}
              live={buildLiveHint('password', formData.password, passwordValidation, 'Contraseña segura.')}
            >
              {({ errorId, invalid, liveBorderClass, submitBorderClass }) => (
                <input
                  id="barber-password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  onBlur={() => markTouched('password')}
                  className={`${ADMIN_FORM_FIELD_COMPACT} ${submitBorderClass || liveBorderClass}`}
                  placeholder="Mín. 8 caracteres, con mayúscula, minúscula y número"
                  aria-invalid={invalid || undefined}
                  aria-describedby={errorId}
                />
              )}
            </AdminFormField>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
            <AdminFormField
              label="Teléfono"
              htmlFor="barber-phone"
              error={fieldError('phone')}
              live={buildLiveHint('phone', formData.phone, phoneValidation, 'Teléfono válido.')}
            >
              {({ errorId, invalid, liveBorderClass, submitBorderClass }) => (
                <input
                  id="barber-phone"
                  name="phone"
                  type="tel"
                  inputMode="numeric"
                  value={formData.phone}
                  onChange={handleChange}
                  onBlur={() => markTouched('phone')}
                  className={`${ADMIN_FORM_FIELD_COMPACT} ${submitBorderClass || liveBorderClass}`}
                  placeholder="Solo números"
                  maxLength={15}
                  aria-invalid={invalid || undefined}
                  aria-describedby={errorId}
                />
              )}
            </AdminFormField>
            <div className="group sm:col-span-2">
              <label className={ADMIN_FORM_LABEL_CLASS}>Especialidades (separadas por coma)</label>
              <input
                name="specialties"
                value={formData.specialties}
                onChange={handleChange}
                placeholder="Ej: Corte clásico, Barba, Degradado"
                className={ADMIN_FORM_FIELD_COMPACT}
                maxLength={TEXT_SPECIALTIES_JOINED_MAX}
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
          </AdminFormFooterActions>
      </AdminFormCard>
    </AdminFormShell>
  );
}

export default function BarberFormPage() {
  const { id } = useParams();
  return <BarberForm editId={id ? parseInt(id, 10) : null} />;
}

