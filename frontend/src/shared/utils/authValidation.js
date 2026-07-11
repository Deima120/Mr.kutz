/**
 * Validaciones de registro alineadas con el backend (auth.routes + strongPassword).
 */

const EMAIL_RE =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

/** Alineado con auth.routes / formularios de cliente. */
export const CLIENT_DOCUMENT_MIN_DIGITS = 5;
export const CLIENT_DOCUMENT_MAX_DIGITS = 20;
export const CLIENT_DOC_TYPE_MAX = 40;
export const CLIENT_FIRST_NAME_MIN = 2;
export const CLIENT_LAST_NAME_MIN = 2;
export const CLIENT_NAME_MAX = 100;
export const CLIENT_PHONE_MAX_DIGITS = 15;
export const CLIENT_NOTES_MAX = 500;

/** Tipos de documento permitidos (selector cerrado). */
export const DOCUMENT_TYPE_OPTIONS = ['CC', 'CE', 'TI', 'Pasaporte', 'NIT'];

const PERSON_NAME_RE =
  /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+(?:[ '\-][A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)*$/;

export function sanitizeDocumentNumber(value) {
  return String(value ?? '').replace(/\D/g, '').slice(0, CLIENT_DOCUMENT_MAX_DIGITS);
}

export function sanitizePhone(value) {
  return String(value ?? '').replace(/\D/g, '').slice(0, CLIENT_PHONE_MAX_DIGITS);
}

export function sanitizePersonName(value) {
  return String(value ?? '')
    .replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ '\-]/g, '')
    .replace(/\s+/g, ' ')
    .slice(0, CLIENT_NAME_MAX);
}

export function validateEmail(value) {
  const email = String(value ?? '').trim();
  if (!email) {
    return { valid: false, message: 'El correo es obligatorio.' };
  }
  if (!EMAIL_RE.test(email)) {
    return { valid: false, message: 'Indica un correo electrónico válido.' };
  }
  return { valid: true, message: 'Correo válido.' };
}

export function getPasswordChecks(password) {
  const pwd = String(password ?? '');
  return [
    {
      id: 'length',
      label: 'Al menos 8 caracteres',
      met: pwd.length >= 8,
    },
    {
      id: 'upper',
      label: 'Una letra mayúscula',
      met: /[A-Z]/.test(pwd),
    },
    {
      id: 'lower',
      label: 'Una letra minúscula',
      met: /[a-z]/.test(pwd),
    },
    {
      id: 'digit',
      label: 'Un número',
      met: /\d/.test(pwd),
    },
  ];
}

export function isPasswordStrong(password) {
  return getPasswordChecks(password).every((rule) => rule.met);
}

export function validateConfirmPassword(password, confirmPassword) {
  const confirm = String(confirmPassword ?? '');
  if (!confirm) {
    return { valid: false, message: 'Confirma tu contraseña.' };
  }
  if (confirm !== password) {
    return { valid: false, message: 'Las contraseñas no coinciden.' };
  }
  return { valid: true, message: 'Las contraseñas coinciden.' };
}

export function validateRequiredField(value, label = 'Este campo') {
  if (!String(value ?? '').trim()) {
    return { valid: false, message: `${label} es obligatorio.` };
  }
  return { valid: true, message: '' };
}

export function validatePersonName(
  value,
  label = 'El nombre',
  { minLength = CLIENT_FIRST_NAME_MIN } = {}
) {
  const name = String(value ?? '').trim();
  if (!name) {
    return { valid: false, message: `${label} es obligatorio.` };
  }
  if (!PERSON_NAME_RE.test(name)) {
    return { valid: false, message: `${label} solo puede contener letras.` };
  }
  // Longitud mínima: sin mensaje escrito (solo bloquea el envío / borde).
  if (name.length < minLength) {
    return { valid: false, message: '' };
  }
  return { valid: true, message: '' };
}

export function validateDocumentType(value) {
  const type = String(value ?? '').trim();
  if (!type) {
    return { valid: false, message: 'El tipo de documento es obligatorio.' };
  }
  if (!DOCUMENT_TYPE_OPTIONS.includes(type)) {
    return { valid: false, message: 'Selecciona un tipo de documento válido.' };
  }
  return { valid: true, message: '' };
}

export function validateDocumentNumber(
  value,
  {
    minDigits = CLIENT_DOCUMENT_MIN_DIGITS,
    maxDigits = CLIENT_DOCUMENT_MAX_DIGITS,
  } = {}
) {
  const num = sanitizeDocumentNumber(value).slice(0, maxDigits);
  if (!num) {
    return { valid: false, message: 'El número de documento es obligatorio.' };
  }
  if (!/^\d+$/.test(num)) {
    return { valid: false, message: 'Solo se permiten números.' };
  }
  // Longitud: se limita con maxLength en el input (sin mensaje escrito).
  if (num.length < minDigits || num.length > maxDigits) {
    return { valid: false, message: '' };
  }
  return { valid: true, message: '' };
}

export function getDocumentNumberHint(value, options) {
  const result = validateDocumentNumber(value, options);
  if (result.valid) return '';
  return result.message;
}

export function isRegisterFormValid(formData) {
  const emailOk = validateEmail(formData.email).valid;
  const passwordOk = isPasswordStrong(formData.password);
  const confirmOk = validateConfirmPassword(formData.password, formData.confirmPassword).valid;
  const docTypeOk = validateDocumentType(formData.documentType).valid;
  const docOk = validateDocumentNumber(formData.documentNumber).valid;
  const firstNameOk = validatePersonName(formData.firstName, 'El nombre', {
    minLength: CLIENT_FIRST_NAME_MIN,
  }).valid;
  const lastNameOk = validatePersonName(formData.lastName, 'El apellido', {
    minLength: CLIENT_LAST_NAME_MIN,
  }).valid;
  const phoneDigits = sanitizePhone(formData.phone);
  const phoneOk =
    !phoneDigits ||
    (phoneDigits.length >= 7 && phoneDigits.length <= CLIENT_PHONE_MAX_DIGITS);

  return (
    emailOk &&
    passwordOk &&
    confirmOk &&
    docTypeOk &&
    docOk &&
    firstNameOk &&
    lastNameOk &&
    phoneOk
  );
}
