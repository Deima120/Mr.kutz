/**
 * Formulario para crear o editar cliente (compacto)
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import * as clientService from '@/features/clients/services/clientService';
import { checkEmailAvailability } from '@/features/auth/services/authService';
import {
  sanitizeDocumentNumber,
  sanitizePhone,
  validateDocumentNumber,
  validateDocumentType,
  validateEmail,
  validateRequiredField,
  getDocumentNumberHint,
} from '@/shared/utils/authValidation';
import {
  FieldHint,
  EmailAvailabilityHint,
  adminFieldStateClass,
  adminEmailBorderClass,
} from '@/shared/components/FormValidationFields';
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

const NOTES_MAX = 500;

function fieldTouched(touched, name, value) {
  return Boolean(touched[name] || String(value ?? '').length > 0);
}

export function ClientForm({
  embedded = false,
  editId = null,
  onSuccess,
  onCancel,
}) {
  const isEdit = Boolean(editId);
  const navigate = useNavigate();
  const initialEmailRef = useRef('');

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    documentType: '',
    documentNumber: '',
    notes: '',
  });
  const [touched, setTouched] = useState({});
  const [emailAvailability, setEmailAvailability] = useState('idle');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (isEdit && editId) {
      clientService
        .getClientById(editId)
        .then((client) => {
          const email = client.email || '';
          initialEmailRef.current = email.trim();
          setFormData({
            firstName: client.first_name || '',
            lastName: client.last_name || '',
            email,
            phone: client.phone || '',
            documentType: client.document_type || '',
            documentNumber: client.document_number || '',
            notes: client.notes || '',
          });
        })
        .catch(() => setError('Cliente no encontrado'));
    }
  }, [editId, isEdit]);

  const documentTypeValidation = useMemo(
    () => validateDocumentType(formData.documentType),
    [formData.documentType]
  );
  const documentValidation = useMemo(
    () => validateDocumentNumber(formData.documentNumber),
    [formData.documentNumber]
  );
  const firstNameValidation = useMemo(
    () => validateRequiredField(formData.firstName, 'El nombre'),
    [formData.firstName]
  );
  const lastNameValidation = useMemo(
    () => validateRequiredField(formData.lastName, 'El apellido'),
    [formData.lastName]
  );
  const emailValidation = useMemo(() => validateEmail(formData.email), [formData.email]);

  const emailUnchanged =
    isEdit && formData.email.trim().toLowerCase() === initialEmailRef.current.toLowerCase();
  const shouldCheckEmail = emailValidation.valid && !emailUnchanged;
  const emailShow = fieldTouched(touched, 'email', formData.email);
  const emailReady = emailValidation.valid && (emailUnchanged || emailAvailability === 'available');

  const formValid = useMemo(
    () =>
      documentTypeValidation.valid &&
      documentValidation.valid &&
      firstNameValidation.valid &&
      lastNameValidation.valid &&
      emailReady,
    [
      documentTypeValidation.valid,
      documentValidation.valid,
      firstNameValidation.valid,
      lastNameValidation.valid,
      emailReady,
    ]
  );

  useEffect(() => {
    if (!shouldCheckEmail) {
      setEmailAvailability(emailUnchanged ? 'available' : 'idle');
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
  }, [formData.email, shouldCheckEmail, emailUnchanged]);

  const markTouched = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'notes' && value.length > NOTES_MAX) return;
    let next = value;
    if (name === 'documentNumber') next = sanitizeDocumentNumber(value);
    else if (name === 'phone') next = sanitizePhone(value);
    setFormData((prev) => ({ ...prev, [name]: next }));
    setError('');
  };

  const handleBlur = (e) => {
    markTouched(e.target.name);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setTouched({
      documentType: true,
      documentNumber: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
    });

    if (!formValid) {
      if (!documentTypeValidation.valid) {
        setError(documentTypeValidation.message);
        return;
      }
      if (!documentValidation.valid) {
        setError(documentValidation.message || 'Revisa el número de documento.');
        return;
      }
      if (!firstNameValidation.valid || !lastNameValidation.valid) {
        setError('Nombre y apellido son obligatorios.');
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
      if (!emailUnchanged && emailAvailability !== 'available') {
        setError('Espera a que se compruebe la disponibilidad del correo.');
        return;
      }
      setError('Completa todos los campos obligatorios.');
      return;
    }

    setLoading(true);

    const payload = {
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      email: formData.email.trim() || undefined,
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
    else navigate('/clients');
  };

  const docShow = fieldTouched(touched, 'documentNumber', formData.documentNumber);
  const docTypeShow = fieldTouched(touched, 'documentType', formData.documentType);
  const firstNameShow = fieldTouched(touched, 'firstName', formData.firstName);
  const lastNameShow = fieldTouched(touched, 'lastName', formData.lastName);

  return (
    <AdminFormShell
      backTo="/clients"
      backLabel="Volver a clientes"
      onBackClick={embedded ? handleCancel : undefined}
      modeBadge={isEdit ? 'Edición' : 'Alta'}
      fullBleed={!embedded}
      compact={embedded}
      showBackNav
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
      <AdminFormCard onSubmit={handleSubmit} noValidate>
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
              onBlur={handleBlur}
              className={`${ADMIN_FORM_FIELD_COMPACT} ${adminFieldStateClass(documentTypeValidation.valid, docTypeShow)}`}
              placeholder="CC, CE…"
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
            <FieldHint
              valid={documentTypeValidation.valid}
              touched={docTypeShow}
              message={documentTypeValidation.message}
            />
          </div>
          <div className="group">
            <label htmlFor="documentNumber" className={ADMIN_FORM_LABEL_CLASS}>
              Número de documento <span className="text-red-600 normal-case">*</span>
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
              className={`${ADMIN_FORM_FIELD_COMPACT} ${adminFieldStateClass(documentValidation.valid, docShow)}`}
              placeholder="Solo números"
              maxLength={20}
              required
              autoComplete="off"
            />
            <FieldHint
              valid={documentValidation.valid}
              touched={docShow}
              message={getDocumentNumberHint(formData.documentNumber)}
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
              onBlur={handleBlur}
              className={`${ADMIN_FORM_FIELD_COMPACT} ${adminFieldStateClass(firstNameValidation.valid, firstNameShow)}`}
              required
            />
            <FieldHint
              valid={firstNameValidation.valid}
              touched={firstNameShow}
              message={firstNameValidation.message}
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
              onBlur={handleBlur}
              className={`${ADMIN_FORM_FIELD_COMPACT} ${adminFieldStateClass(lastNameValidation.valid, lastNameShow)}`}
              required
            />
            <FieldHint
              valid={lastNameValidation.valid}
              touched={lastNameShow}
              message={lastNameValidation.message}
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
              onBlur={handleBlur}
              className={`${ADMIN_FORM_FIELD_COMPACT} ${adminEmailBorderClass(emailValidation.valid, emailAvailability, emailShow)}`}
              placeholder="correo@ejemplo.com"
              required
              autoComplete="email"
            />
            {!emailValidation.valid && emailShow && (
              <FieldHint valid={false} touched message={emailValidation.message} />
            )}
            {emailValidation.valid && !emailUnchanged && (
              <EmailAvailabilityHint
                formatValid={emailValidation.valid}
                availability={emailAvailability}
                show={emailShow}
              />
            )}
            {emailUnchanged && emailShow && emailValidation.valid && (
              <FieldHint valid touched message="" successMessage="Correo actual del cliente." />
            )}
          </div>
          <div className="group">
            <label htmlFor="phone" className={ADMIN_FORM_LABEL_CLASS}>
              Teléfono
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              inputMode="numeric"
              value={formData.phone}
              onChange={handleChange}
              onBlur={handleBlur}
              className={ADMIN_FORM_FIELD_COMPACT}
              placeholder="Solo números (opcional)"
              maxLength={15}
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
          <AdminFormPrimaryButton
            disabled={loading || !formValid || emailAvailability === 'checking'}
          >
            <AdminFormLoadingButton loading={loading} loadingLabel="Guardando…">
              Guardar cliente
            </AdminFormLoadingButton>
          </AdminFormPrimaryButton>
        </AdminFormFooterActions>
      </AdminFormCard>
    </AdminFormShell>
  );
}

export default function ClientFormPage() {
  const { id } = useParams();
  return <ClientForm editId={id ? parseInt(id, 10) : null} />;
}

