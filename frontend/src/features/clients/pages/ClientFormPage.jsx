/**
 * Formulario para crear o editar cliente (compacto)
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import * as clientService from '@/features/clients/services/clientService';
import { checkEmailAvailability, checkDocumentAvailability } from '@/features/auth/services/authService';
import {
  sanitizeDocumentNumber,
  sanitizePhone,
  sanitizePersonName,
  validateDocumentNumber,
  validateDocumentType,
  validateEmail,
  validatePersonName,
  CLIENT_DOCUMENT_MAX_DIGITS,
  CLIENT_FIRST_NAME_MIN,
  CLIENT_LAST_NAME_MIN,
  CLIENT_NAME_MAX,
  CLIENT_PHONE_MAX_DIGITS,
  CLIENT_NOTES_MAX,
  DOCUMENT_TYPE_OPTIONS,
} from '@/shared/utils/authValidation';
import { validatePhone } from '@/shared/utils/formValidation';
import {
  FieldHint,
  EmailAvailabilityHint,
  DocumentAvailabilityHint,
  adminFieldStateClass,
  adminEmailBorderClass,
  adminDocumentBorderClass,
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
import { useAppToast } from '@/shared/feedback/ToastContext';
import CustomSelect from '@/shared/components/CustomSelect';

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
  const toast = useAppToast();
  const initialEmailRef = useRef('');
  const initialDocumentRef = useRef({ type: '', number: '' });

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
  const [documentAvailability, setDocumentAvailability] = useState('idle');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isEdit && editId) {
      clientService
        .getClientById(editId)
        .then((client) => {
          const email = client.email || '';
          initialEmailRef.current = email.trim();
          initialDocumentRef.current = {
            type: (client.document_type || '').trim(),
            number: (client.document_number || '').trim(),
          };
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

  /**
   * Los clientes creados desde la reserva pública nacen sin documento, así que al
   * EDITAR se admite dejarlo en blanco: de lo contrario no se podría ni corregirles
   * el teléfono sin inventarles una cédula. En el alta sigue siendo obligatorio, y
   * si se rellena solo uno de los dos campos se valida la pareja completa.
   */
  const documentOmitted =
    isEdit && !formData.documentType.trim() && !formData.documentNumber.trim();
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
  const phoneValidation = useMemo(
    () => validatePhone(formData.phone, { required: false }),
    [formData.phone]
  );
  const notesValidation = useMemo(() => {
    const len = String(formData.notes ?? '').length;
    if (len > CLIENT_NOTES_MAX) {
      return {
        valid: false,
        message: `Las notas no pueden superar ${CLIENT_NOTES_MAX} caracteres.`,
      };
    }
    return { valid: true, message: '' };
  }, [formData.notes]);

  const emailUnchanged =
    isEdit && formData.email.trim().toLowerCase() === initialEmailRef.current.toLowerCase();
  const shouldCheckEmail = emailValidation.valid && !emailUnchanged;
  const emailShow = fieldTouched(touched, 'email', formData.email);
  const emailReady = emailValidation.valid && (emailUnchanged || emailAvailability === 'available');

  const documentUnchanged =
    isEdit &&
    formData.documentType.trim() === initialDocumentRef.current.type &&
    formData.documentNumber.trim() === initialDocumentRef.current.number;
  const shouldCheckDocument =
    !documentOmitted && documentTypeValidation.valid && documentValidation.valid && !documentUnchanged;
  const documentReady =
    documentOmitted ||
    (documentTypeValidation.valid &&
      documentValidation.valid &&
      (documentUnchanged || documentAvailability === 'available'));

  const formValid = useMemo(
    () =>
      documentReady &&
      firstNameValidation.valid &&
      lastNameValidation.valid &&
      emailReady &&
      phoneValidation.valid &&
      notesValidation.valid,
    [
      documentReady,
      firstNameValidation.valid,
      lastNameValidation.valid,
      emailReady,
      phoneValidation.valid,
      notesValidation.valid,
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

  useEffect(() => {
    if (!shouldCheckDocument) {
      setDocumentAvailability(documentUnchanged ? 'available' : 'idle');
      return undefined;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setDocumentAvailability('checking');
      try {
        const result = await checkDocumentAvailability(
          {
            documentType: formData.documentType.trim(),
            documentNumber: formData.documentNumber.trim(),
          },
          { signal: controller.signal }
        );
        setDocumentAvailability(result?.available ? 'available' : 'taken');
      } catch (err) {
        if (controller.signal.aborted || err?.code === 'ERR_CANCELED') return;
        // Igual que el chequeo de correo de este mismo formulario: un error de red dejará
        // `documentReady` en falso (no es "available"), así que bloquea el guardado hasta
        // que se pueda comprobar. Es más estricto que `RegisterPage` (que sí falla abierto);
        // se mantiene así por consistencia con el resto de este archivo, no con el registro.
        setDocumentAvailability('error');
      }
    }, 500);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [formData.documentType, formData.documentNumber, shouldCheckDocument, documentUnchanged]);

  const markTouched = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'notes' && value.length > CLIENT_NOTES_MAX) return;
    let next = value;
    if (name === 'documentNumber') next = sanitizeDocumentNumber(value);
    else if (name === 'phone') next = sanitizePhone(value);
    else if (name === 'firstName' || name === 'lastName') next = sanitizePersonName(value);
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
      notes: true,
    });

    if (!formValid) {
      if (!documentOmitted && !documentTypeValidation.valid) {
        setError(documentTypeValidation.message);
        return;
      }
      if (!documentOmitted && !documentValidation.valid) {
        setError(documentValidation.message || 'Revisa el número de documento.');
        return;
      }
      if (!documentOmitted && documentAvailability === 'taken') {
        setError('Ya existe un cliente con este documento.');
        return;
      }
      if (!documentOmitted && !documentUnchanged && documentAvailability !== 'available') {
        setError('Espera a que se compruebe el documento.');
        return;
      }
      if (!firstNameValidation.valid) {
        setError(firstNameValidation.message);
        return;
      }
      if (!lastNameValidation.valid) {
        setError(lastNameValidation.message);
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
      if (!phoneValidation.valid) {
        setError(phoneValidation.message);
        return;
      }
      if (!notesValidation.valid) {
        setError(notesValidation.message);
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
      // Omitidos (undefined) en vez de cadena vacía: client.service.update solo
      // toca el documento si el campo viene, y con '' lanzaría 400.
      documentType: documentOmitted ? undefined : formData.documentType.trim(),
      documentNumber: documentOmitted ? undefined : formData.documentNumber.trim(),
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
        toast.success(isEdit ? 'Cliente actualizado correctamente' : 'Cliente registrado correctamente');
        navigate('/clients', { replace: true });
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
  const phoneShow = fieldTouched(touched, 'phone', formData.phone);
  const notesShow = fieldTouched(touched, 'notes', formData.notes);

  return (
    <AdminFormShell
      backTo="/clients"
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

        {error && <div className={ADMIN_FORM_ERROR_CLASS} role="alert">{error}</div>}

        <div className={ADMIN_FORM_GRID_CLASS}>
          <div className="group">
            <label htmlFor="documentType" className={ADMIN_FORM_LABEL_CLASS}>
              Tipo de documento{' '}
              {documentOmitted ? (
                <span className="normal-case font-medium text-stone-400">(opcional)</span>
              ) : (
                <span className="text-red-600 normal-case">*</span>
              )}
            </label>
            <CustomSelect
              id="documentType"
              name="documentType"
              value={formData.documentType}
              onChange={(id) => {
                setFormData((prev) => ({ ...prev, documentType: id }));
                setTouched((prev) => ({ ...prev, documentType: true }));
              }}
              onBlur={() => setTouched((prev) => ({ ...prev, documentType: true }))}
              options={[
                ...DOCUMENT_TYPE_OPTIONS.map((type) => ({ id: type, label: type })),
                ...(isEdit &&
                formData.documentType &&
                !DOCUMENT_TYPE_OPTIONS.includes(formData.documentType)
                  ? [{ id: formData.documentType, label: formData.documentType }]
                  : []),
              ]}
              placeholder="Selecciona…"
              variant="form"
              ariaLabel="Tipo de documento"
              ariaInvalid={docTypeShow && !documentOmitted && !documentTypeValidation.valid}
              selectClassName={adminFieldStateClass(
                documentOmitted || documentTypeValidation.valid,
                docTypeShow
              )}
            />
            <FieldHint
              valid={documentOmitted || documentTypeValidation.valid}
              touched={docTypeShow}
              message={documentTypeValidation.message}
            />
          </div>
          <div className="group">
            <label htmlFor="documentNumber" className={ADMIN_FORM_LABEL_CLASS}>
              Número de documento{' '}
              {documentOmitted ? (
                <span className="normal-case font-medium text-stone-400">(opcional)</span>
              ) : (
                <span className="text-red-600 normal-case">*</span>
              )}
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
              className={`${ADMIN_FORM_FIELD_COMPACT} ${
                documentOmitted
                  ? adminFieldStateClass(true, docShow)
                  : adminDocumentBorderClass(documentValidation.valid, documentAvailability, docShow)
              }`}
              placeholder="Solo números"
              maxLength={CLIENT_DOCUMENT_MAX_DIGITS}
              required={!documentOmitted}
              autoComplete="off"
            />
            {!documentOmitted && !documentValidation.valid && docShow && (
              <FieldHint valid={false} touched message={documentValidation.message} />
            )}
            {!documentOmitted && documentValidation.valid && !documentUnchanged && (
              <DocumentAvailabilityHint
                formatValid={documentValidation.valid && documentTypeValidation.valid}
                availability={documentAvailability}
                show={docShow}
              />
            )}
            {!documentOmitted && documentUnchanged && docShow && documentValidation.valid && (
              <FieldHint valid touched message="" successMessage="Documento actual del cliente." />
            )}
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
              maxLength={CLIENT_NAME_MAX}
              required
              autoComplete="given-name"
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
              maxLength={CLIENT_NAME_MAX}
              required
              autoComplete="family-name"
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
              className={`${ADMIN_FORM_FIELD_COMPACT} ${adminFieldStateClass(phoneValidation.valid, phoneShow && Boolean(formData.phone))}`}
              placeholder="Solo números (opcional)"
              maxLength={CLIENT_PHONE_MAX_DIGITS}
              autoComplete="tel"
            />
            <FieldHint
              valid={phoneValidation.valid}
              touched={phoneShow && Boolean(formData.phone)}
              message={phoneValidation.message}
            />
          </div>
        </div>

        <div className="group shrink-0">
          <div className="flex items-baseline justify-between gap-2 mb-0.5">
            <label htmlFor="notes" className={`${ADMIN_FORM_LABEL_CLASS} mb-0`}>
              Notas internas
            </label>
            <span className="text-[10px] text-stone-400 tabular-nums">
              {formData.notes.length}/{CLIENT_NOTES_MAX}
            </span>
          </div>
          <textarea
            id="notes"
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            onBlur={handleBlur}
            rows={2}
            maxLength={CLIENT_NOTES_MAX}
            className={`${ADMIN_FORM_FIELD_COMPACT} resize-none min-h-[3.25rem] max-h-24 leading-snug ${adminFieldStateClass(notesValidation.valid, notesShow)}`}
            placeholder="Breve: preferencias, alergias…"
          />
          <FieldHint
            valid={notesValidation.valid}
            touched={notesShow}
            message={notesValidation.message}
          />
        </div>

        <AdminFormFooterActions className="mt-1">
          <AdminFormPrimaryButton
            disabled={
              loading ||
              !formValid ||
              emailAvailability === 'checking' ||
              documentAvailability === 'checking'
            }
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
