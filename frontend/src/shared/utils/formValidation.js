/**
 * Validaciones de formularios — alineadas con reglas del backend.
 * Mensajes en español, sin depender del validador HTML5 del navegador.
 */

export {
  validateEmail,
  validateRequiredField,
  validateDocumentType,
  validateDocumentNumber,
  validateConfirmPassword,
  isPasswordStrong,
  getPasswordChecks,
  sanitizeDocumentNumber,
  sanitizePhone,
  CLIENT_DOCUMENT_MIN_DIGITS,
} from '@/shared/utils/authValidation';

import {
  validateEmail,
  validateRequiredField,
  validateDocumentType,
  validateDocumentNumber,
  validateConfirmPassword,
  isPasswordStrong,
} from '@/shared/utils/authValidation';

/** @typedef {{ valid: boolean, errors: Record<string, string>, firstError: string }} ValidationResult */

export function validationResult(errors = {}) {
  const keys = Object.keys(errors);
  return {
    valid: keys.length === 0,
    errors,
    firstError: keys.length ? errors[keys[0]] : '',
  };
}

export function mapApiErrors(apiErrors) {
  if (!Array.isArray(apiErrors)) return {};
  return apiErrors.reduce((acc, item) => {
    if (item?.field && item?.message && !acc[item.field]) {
      acc[item.field] = item.message;
    }
    return acc;
  }, {});
}

export function getApiErrorMessage(err, fallback = 'Algo salió mal.') {
  const fieldErrors = mapApiErrors(err?.errors);
  const firstField = Object.values(fieldErrors)[0];
  if (firstField) return firstField;
  if (Array.isArray(err?.errors) && err.errors[0]?.message) return err.errors[0].message;
  return err?.message || fallback;
}

export function validateMoney(value, label = 'El monto', { required = true, min = 0 } = {}) {
  const raw = String(value ?? '').trim();
  if (!raw) {
    return required
      ? { valid: false, message: `${label} es obligatorio.` }
      : { valid: true, message: '' };
  }
  const num = Number(raw);
  if (Number.isNaN(num)) {
    return { valid: false, message: `${label} debe ser un número válido.` };
  }
  if (num < min) {
    return {
      valid: false,
      message: min === 0 ? `${label} no puede ser negativo.` : `${label} debe ser al menos ${min}.`,
    };
  }
  return { valid: true, message: '' };
}

export function validatePositiveInt(value, label = 'La cantidad', { required = true, min = 1 } = {}) {
  const raw = String(value ?? '').trim();
  if (!raw) {
    return required
      ? { valid: false, message: `${label} es obligatorio.` }
      : { valid: true, message: '' };
  }
  const num = Number(raw);
  if (!Number.isFinite(num) || !Number.isInteger(num) || num < min) {
    return { valid: false, message: `${label} debe ser un entero de al menos ${min}.` };
  }
  return { valid: true, message: '' };
}

export function validateNonNegativeInt(value, label = 'El valor', { required = false } = {}) {
  const raw = String(value ?? '').trim();
  if (!raw) {
    return required
      ? { valid: false, message: `${label} es obligatorio.` }
      : { valid: true, message: '' };
  }
  const num = parseInt(raw, 10);
  if (!Number.isFinite(num) || num < 0) {
    return { valid: false, message: `${label} debe ser un número entero mayor o igual a 0.` };
  }
  return { valid: true, message: '' };
}

export function validatePhone(value, { required = false } = {}) {
  const digits = String(value ?? '').replace(/\D/g, '');
  if (!digits) {
    return required
      ? { valid: false, message: 'El teléfono es obligatorio.' }
      : { valid: true, message: '' };
  }
  if (digits.length < 7) {
    return { valid: false, message: 'El teléfono debe tener al menos 7 dígitos.' };
  }
  if (digits.length > 15) {
    return { valid: false, message: 'El teléfono no puede superar 15 dígitos.' };
  }
  return { valid: true, message: '' };
}

export function validatePassword(value, { required = true } = {}) {
  const pwd = String(value ?? '');
  if (!pwd) {
    return required
      ? { valid: false, message: 'La contraseña es obligatoria.' }
      : { valid: true, message: '' };
  }
  if (!isPasswordStrong(pwd)) {
    return {
      valid: false,
      message: 'Mín. 8 caracteres, con mayúscula, minúscula y número.',
    };
  }
  return { valid: true, message: '' };
}

export function validateVerificationCode(value) {
  const code = String(value ?? '').trim();
  if (!code) return { valid: false, message: 'Ingresa el código de verificación.' };
  if (!/^\d{6}$/.test(code)) {
    return { valid: false, message: 'El código debe tener 6 dígitos.' };
  }
  return { valid: true, message: '' };
}

export function validateTimeRange(startTime, endTime) {
  if (!startTime || !endTime) {
    return { valid: true, message: '' };
  }
  if (startTime >= endTime) {
    return { valid: false, message: 'La hora de inicio debe ser anterior a la de cierre.' };
  }
  return { valid: true, message: '' };
}

/** @returns {ValidationResult} */
export function validateServiceForm(data) {
  const errors = {};
  const name = validateRequiredField(data.name, 'El nombre');
  if (!name.valid) errors.name = name.message;

  const price = validateMoney(data.price, 'El precio', { required: true, min: 0 });
  if (!price.valid) errors.price = price.message;

  const duration = validatePositiveInt(data.durationMinutes, 'La duración', { required: true, min: 1 });
  if (!duration.valid) errors.durationMinutes = duration.message;

  return validationResult(errors);
}

/** @returns {ValidationResult} */
export function validateProductForm(data) {
  const errors = {};
  const name = validateRequiredField(data.name, 'El nombre');
  if (!name.valid) errors.name = name.message;

  if (data.retailPrice !== '' && data.retailPrice != null) {
    const retail = validateMoney(data.retailPrice, 'El precio de venta', { required: false, min: 0 });
    if (!retail.valid) errors.retailPrice = retail.message;
  }
  if (data.costPrice !== '' && data.costPrice != null) {
    const cost = validateMoney(data.costPrice, 'El precio de costo', { required: false, min: 0 });
    if (!cost.valid) errors.costPrice = cost.message;
  }

  const minStock = validateNonNegativeInt(
    data.minStock != null ? String(data.minStock) : '',
    'El stock mínimo',
    { required: false }
  );
  if (!minStock.valid) errors.minStock = minStock.message;

  return validationResult(errors);
}

/** Documento admin/barbero — mínimo 5 dígitos (backend auth). */
export function validateAdminDocumentNumber(value) {
  const num = String(value ?? '').replace(/\D/g, '');
  if (!num) return { valid: false, message: 'El número de documento es obligatorio.' };
  if (num.length < 5) return { valid: false, message: 'Mínimo 5 dígitos.' };
  if (num.length > 20) return { valid: false, message: 'Máximo 20 dígitos.' };
  if (!/^\d+$/.test(num)) return { valid: false, message: 'Solo se permiten números.' };
  return { valid: true, message: '' };
}

/** @returns {ValidationResult} */
export function validateBarberForm(data, isEdit = false) {
  const errors = {};

  const docType = validateDocumentType(data.documentType);
  if (!docType.valid) errors.documentType = docType.message;

  const docNum = validateAdminDocumentNumber(data.documentNumber);
  if (!docNum.valid) errors.documentNumber = docNum.message;

  const firstName = validateRequiredField(data.firstName, 'El nombre');
  if (!firstName.valid) errors.firstName = firstName.message;

  const lastName = validateRequiredField(data.lastName, 'El apellido');
  if (!lastName.valid) errors.lastName = lastName.message;

  if (!isEdit) {
    const email = validateEmail(data.email);
    if (!email.valid) errors.email = email.message;

    const password = validatePassword(data.password, { required: true });
    if (!password.valid) errors.password = password.message;
  }

  if (data.phone?.trim()) {
    const phone = validatePhone(data.phone, { required: false });
    if (!phone.valid) errors.phone = phone.message;
  }

  return validationResult(errors);
}

/** @returns {ValidationResult} */
export function validatePaymentForm(data, mode, extras = {}) {
  const errors = {};
  const { saleProduct, productQty, appointmentSelectRows = [] } = extras;

  if (mode === 'product') {
    if (!data.productId) errors.productId = 'Selecciona un producto.';
    else if (!saleProduct) errors.productId = 'Producto no válido.';
    else {
      const qty = validatePositiveInt(productQty, 'La cantidad', { required: true, min: 1 });
      if (!qty.valid) errors.productQty = qty.message;
      else {
        const max = Number(saleProduct.quantity) || 0;
        if (max > 0 && parseInt(productQty, 10) > max) {
          errors.productQty = `Stock insuficiente (máx. ${max}).`;
        }
      }
    }
  } else if (mode === 'service') {
    if (!data.appointmentId) {
      errors.appointmentId =
        appointmentSelectRows.length === 0
          ? 'No hay citas completadas pendientes de cobro.'
          : 'Selecciona la cita a cobrar.';
    }
  }

  const amount = validateMoney(data.amount, 'El monto', { required: true, min: 0.01 });
  if (!amount.valid) errors.amount = amount.message;

  if (!data.paymentMethodId) {
    errors.paymentMethodId = 'Selecciona un método de pago.';
  }

  return validationResult(errors);
}

/** @returns {ValidationResult} */
export function validatePurchaseForm(form, products = []) {
  const errors = {};

  const items = form.items
    .map((item, idx) => ({ ...item, idx }))
    .filter((i) => i.productId || i.quantity || i.unitCost);

  if (items.length === 0) {
    errors.items = 'Agrega al menos un producto con cantidad y costo.';
    return validationResult(errors);
  }

  items.forEach((item) => {
    if (!item.productId) {
      errors[`items.${item.idx}.productId`] = 'Selecciona un producto.';
      return;
    }
    const qty = validatePositiveInt(item.quantity, 'La cantidad', { required: true, min: 1 });
    if (!qty.valid) errors[`items.${item.idx}.quantity`] = qty.message;

    const cost = validateMoney(item.unitCost, 'El costo unitario', { required: true, min: 0 });
    if (!cost.valid) errors[`items.${item.idx}.unitCost`] = cost.message;
  });

  if (form.supplierName && form.supplierName.length > 150) {
    errors.supplierName = 'Máximo 150 caracteres.';
  }
  if (form.invoiceNumber && form.invoiceNumber.length > 80) {
    errors.invoiceNumber = 'Máximo 80 caracteres.';
  }
  if (form.notes && form.notes.length > 500) {
    errors.notes = 'Máximo 500 caracteres.';
  }

  return validationResult(errors);
}

/** @returns {ValidationResult} */
export function validateAppointmentForm(data, { isEdit = false, isClient = false } = {}) {
  const errors = {};

  if (!isClient && !isEdit) {
    if (!data.clientId) errors.clientId = 'Selecciona un cliente.';
  }

  if (!data.barberId) errors.barberId = 'Selecciona un barbero.';
  if (!data.appointmentDate) errors.appointmentDate = 'Selecciona una fecha.';
  if (!data.startTime) errors.startTime = 'Selecciona una hora disponible.';

  if (!isEdit) {
    if (!data.serviceIds?.length) errors.serviceIds = 'Agrega al menos un servicio.';
  } else if (!data.serviceIds?.length) {
    errors.serviceIds = 'Selecciona un servicio.';
  }

  return validationResult(errors);
}

/** @returns {ValidationResult} */
export function validateBookingForm(form) {
  const errors = {};

  if (!form.serviceId) errors.serviceId = 'Selecciona un servicio.';
  if (!form.barberId) errors.barberId = 'Selecciona un barbero.';
  if (!form.appointmentDate) errors.appointmentDate = 'Selecciona una fecha.';
  if (!form.startTime) errors.startTime = 'Selecciona una hora disponible.';

  const firstName = validateRequiredField(form.firstName, 'El nombre');
  if (!firstName.valid) errors.firstName = firstName.message;

  const lastName = validateRequiredField(form.lastName, 'El apellido');
  if (!lastName.valid) errors.lastName = lastName.message;

  const email = validateEmail(form.email);
  if (!email.valid) errors.email = email.message;

  if (form.phone?.trim()) {
    const phone = validatePhone(form.phone, { required: false });
    if (!phone.valid) errors.phone = phone.message;
  }

  return validationResult(errors);
}

/** @returns {ValidationResult} */
export function validateLoginForm(email, password) {
  const errors = {};
  const emailResult = validateEmail(email);
  if (!emailResult.valid) errors.email = emailResult.message;

  const pwd = validateRequiredField(password, 'La contraseña');
  if (!pwd.valid) errors.password = pwd.message;

  return validationResult(errors);
}

/** @returns {ValidationResult} */
export function validateForgotEmailStep(email) {
  const errors = {};
  const emailResult = validateEmail(email);
  if (!emailResult.valid) errors.email = emailResult.message;
  return validationResult(errors);
}

/** @returns {ValidationResult} */
export function validateForgotResetStep({ code, codeVerified, newPassword, confirmPassword }) {
  const errors = {};

  if (!codeVerified) {
    const codeResult = validateVerificationCode(code);
    if (!codeResult.valid) errors.code = codeResult.message;
    else errors.code = 'Verifica el código antes de guardar la contraseña.';
  }

  const pwd = validatePassword(newPassword, { required: true });
  if (!pwd.valid) errors.newPassword = pwd.message;

  const confirm = validateConfirmPassword(newPassword, confirmPassword);
  if (!confirm.valid) errors.confirmPassword = confirm.message;

  return validationResult(errors);
}

/** @returns {ValidationResult} */
export function validateCategoryName(name) {
  const errors = {};
  const result = validateRequiredField(name, 'El nombre');
  if (!result.valid) errors.name = result.message;
  return validationResult(errors);
}
