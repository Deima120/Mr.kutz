/**
 * Validaciones de registro alineadas con el backend (auth.routes + strongPassword).
 */

const EMAIL_RE =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

export const CLIENT_DOCUMENT_MIN_DIGITS = 10;

export function sanitizeDocumentNumber(value) {
  return String(value ?? '').replace(/\D/g, '');
}

export function sanitizePhone(value) {
  return String(value ?? '').replace(/\D/g, '');
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

export function validateDocumentType(value) {
  return validateRequiredField(value, 'El tipo de documento');
}

export function validateDocumentNumber(value, minDigits = CLIENT_DOCUMENT_MIN_DIGITS) {
  const num = sanitizeDocumentNumber(value);
  if (!num) {
    return { valid: false, message: 'El número de documento es obligatorio.' };
  }
  if (num.length < minDigits) {
    return { valid: false, message: `Mínimo ${minDigits} dígitos.` };
  }
  if (!/^\d+$/.test(num)) {
    return { valid: false, message: 'Solo se permiten números.' };
  }
  return { valid: true, message: '' };
}

export function getDocumentNumberHint(value, minDigits = CLIENT_DOCUMENT_MIN_DIGITS) {
  const result = validateDocumentNumber(value, minDigits);
  if (result.valid) return '';
  return result.message;
}

export function isRegisterFormValid(formData) {
  const emailOk = validateEmail(formData.email).valid;
  const passwordOk = isPasswordStrong(formData.password);
  const confirmOk = validateConfirmPassword(formData.password, formData.confirmPassword).valid;
  const docOk = validateDocumentNumber(formData.documentNumber).valid;

  return (
    emailOk &&
    passwordOk &&
    confirmOk &&
    docOk &&
    formData.firstName.trim() &&
    formData.lastName.trim() &&
    formData.documentType.trim()
  );
}
