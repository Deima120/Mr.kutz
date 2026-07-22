/**
 * Validaciones de formularios — alineadas con reglas del backend.
 * Mensajes en español, sin depender del validador HTML5 del navegador.
 */

export {
  validateEmail,
  validateRequiredField,
  validatePersonName,
  validateDocumentType,
  validateDocumentNumber,
  validateConfirmPassword,
  isPasswordStrong,
  getPasswordChecks,
  sanitizeDocumentNumber,
  sanitizePhone,
  sanitizePersonName,
  CLIENT_DOCUMENT_MIN_DIGITS,
  CLIENT_DOCUMENT_MAX_DIGITS,
  CLIENT_DOC_TYPE_MAX,
  CLIENT_FIRST_NAME_MIN,
  CLIENT_LAST_NAME_MIN,
  CLIENT_NAME_MAX,
  CLIENT_PHONE_MAX_DIGITS,
  CLIENT_NOTES_MAX,
  DOCUMENT_TYPE_OPTIONS,
} from '@/shared/utils/authValidation';

import {
  validateEmail,
  validateRequiredField,
  validatePersonName,
  validateDocumentType,
  validateDocumentNumber,
  validateConfirmPassword,
  isPasswordStrong,
  CLIENT_NOTES_MAX,
  CLIENT_FIRST_NAME_MIN,
  CLIENT_LAST_NAME_MIN,
} from '@/shared/utils/authValidation';

/** Límites de texto alineados con backend. */
export const TEXT_NAME_MAX = 150;
export const TEXT_DESCRIPTION_MAX = 1000;
export const TEXT_CATEGORY_DESCRIPTION_MAX = 500;
export const TEXT_REFERENCE_MAX = 100;
export const TEXT_SPECIALTIES_JOINED_MAX = 300;
export const TEXT_NOTES_MAX = CLIENT_NOTES_MAX;

export function validateNotes(value, { max = TEXT_NOTES_MAX, label = 'Las notas' } = {}) {
  const notes = String(value ?? '');
  if (notes.length > max) {
    return { valid: false, message: `${label} no pueden superar ${max} caracteres.` };
  }
  return { valid: true, message: '' };
}

export function fieldMessage(result, fallback) {
  if (result.valid) return '';
  return result.message || fallback;
}

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
      : { valid: true, message: '', value: null };
  }
  if (digits.length < 7) {
    return { valid: false, message: 'El teléfono debe tener al menos 7 dígitos.' };
  }
  if (digits.length > 15) {
    return { valid: false, message: 'El teléfono no puede superar 15 dígitos.' };
  }
  return { valid: true, message: '', value: digits };
}

/** Identificación fiscal laxa (proveedores): letras, números y guiones. */
export function validateTaxId(value, { required = false } = {}) {
  const raw = String(value ?? '').trim();
  if (!raw) {
    return required
      ? { valid: false, message: 'La identificación fiscal es obligatoria.' }
      : { valid: true, message: '', value: null };
  }
  if (raw.length > 50) {
    return { valid: false, message: 'La identificación fiscal no puede superar 50 caracteres.' };
  }
  if (!/^[A-Za-z0-9-]+$/.test(raw)) {
    return {
      valid: false,
      message: 'La identificación fiscal solo puede contener letras, números y guiones.',
    };
  }
  return { valid: true, message: '', value: raw };
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
  else if (String(data.name).trim().length > TEXT_NAME_MAX) {
    errors.name = `Máximo ${TEXT_NAME_MAX} caracteres.`;
  }

  const price = validateMoney(data.price, 'El precio', { required: true, min: 0.01 });
  if (!price.valid) errors.price = price.message;

  const duration = validatePositiveInt(data.durationMinutes, 'La duración', { required: true, min: 1 });
  if (!duration.valid) errors.durationMinutes = duration.message;

  const description = validateNotes(data.description, {
    max: TEXT_DESCRIPTION_MAX,
    label: 'La descripción',
  });
  if (!description.valid) errors.description = description.message;

  return validationResult(errors);
}

/** @returns {ValidationResult} */
export function validateProductForm(data) {
  const errors = {};
  const name = validateRequiredField(data.name, 'El nombre');
  if (!name.valid) errors.name = name.message;
  else if (String(data.name).trim().length > TEXT_NAME_MAX) {
    errors.name = `Máximo ${TEXT_NAME_MAX} caracteres.`;
  }

  if (data.retailPrice !== '' && data.retailPrice != null) {
    const retail = validateMoney(data.retailPrice, 'El precio de venta', { required: false, min: 0.01 });
    if (!retail.valid) errors.retailPrice = retail.message;
  }

  const minStock = validateNonNegativeInt(
    data.minStock != null ? String(data.minStock) : '',
    'El stock mínimo',
    { required: false }
  );
  if (!minStock.valid) errors.minStock = minStock.message;

  const description = validateNotes(data.description, {
    max: TEXT_DESCRIPTION_MAX,
    label: 'La descripción',
  });
  if (!description.valid) errors.description = description.message;

  return validationResult(errors);
}

/** Documento admin/barbero — misma regla que cliente (longitud silenciosa). */
export function validateAdminDocumentNumber(value) {
  const result = validateDocumentNumber(value);
  if (result.valid) return result;
  return {
    valid: false,
    message: result.message || 'Revisa el número de documento.',
  };
}

/** @returns {ValidationResult} */
export function validateBarberForm(data, isEdit = false) {
  const errors = {};

  const docType = validateDocumentType(data.documentType);
  if (!docType.valid) errors.documentType = docType.message;

  const docNum = validateAdminDocumentNumber(data.documentNumber);
  if (!docNum.valid) errors.documentNumber = docNum.message;

  const firstName = validatePersonName(data.firstName, 'El nombre', {
    minLength: CLIENT_FIRST_NAME_MIN,
  });
  if (!firstName.valid) errors.firstName = fieldMessage(firstName, 'Revisa el nombre.');

  const lastName = validatePersonName(data.lastName, 'El apellido', {
    minLength: CLIENT_LAST_NAME_MIN,
  });
  if (!lastName.valid) errors.lastName = fieldMessage(lastName, 'Revisa el apellido.');

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

  const specialties = String(data.specialties ?? '');
  if (specialties.length > TEXT_SPECIALTIES_JOINED_MAX) {
    errors.specialties = `Máximo ${TEXT_SPECIALTIES_JOINED_MAX} caracteres.`;
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
  } else if (mode === 'cash') {
    const amount = validateMoney(data.amount, 'El monto', { required: true, min: 0.01 });
    if (!amount.valid) errors.amount = amount.message;
  }

  if (!data.paymentMethodId) {
    errors.paymentMethodId = 'Selecciona un método de pago.';
  }

  const reference = String(data.reference ?? '');
  if (reference.length > TEXT_REFERENCE_MAX) {
    errors.reference = `Máximo ${TEXT_REFERENCE_MAX} caracteres.`;
  }

  const notes = validateNotes(data.notes);
  if (!notes.valid) errors.notes = notes.message;

  return validationResult(errors);
}

/** Carrito de cobro multi-línea. */
export function validatePaymentCartForm({ paymentMethodId, reference, notes, lines = [] } = {}) {
  const errors = {};

  if (!paymentMethodId) errors.paymentMethodId = 'Selecciona un método de pago.';
  if (!Array.isArray(lines) || lines.length === 0) {
    errors.lines = 'Agrega al menos una línea al cobro.';
  } else {
    lines.forEach((line, index) => {
      if (line.type === 'service' && !line.appointmentId) {
        errors[`lines.${index}`] = 'Línea de servicio sin cita.';
      }
      if (line.type === 'product') {
        if (!line.productId) errors[`lines.${index}`] = 'Línea de producto sin producto.';
        const qty = validatePositiveInt(line.quantity, 'La cantidad', { required: true, min: 1 });
        if (!qty.valid) errors[`lines.${index}`] = qty.message;
      }
      if (line.type === 'manual') {
        const amount = validateMoney(line.unitPrice, 'El monto', { required: true, min: 0.01 });
        if (!amount.valid) errors[`lines.${index}`] = amount.message;
        if (!String(line.description || '').trim()) {
          errors[`lines.${index}`] = 'La descripción es obligatoria en líneas de caja.';
        }
      }
    });
  }

  const ref = String(reference ?? '');
  if (ref.length > TEXT_REFERENCE_MAX) {
    errors.reference = `Máximo ${TEXT_REFERENCE_MAX} caracteres.`;
  }
  const notesResult = validateNotes(notes);
  if (!notesResult.valid) errors.notes = notesResult.message;

  return validationResult(errors);
}

/** Recepción de compra: referencia + cantidades/costos con helpers compartidos. */
export function validatePurchaseReceiptForm({ reference, notes, receivable = [] } = {}) {
  const errors = {};

  const ref = validateRequiredField(reference, 'La referencia');
  if (!ref.valid) errors.reference = ref.message;
  else if (String(reference).trim().length > 80) {
    errors.reference = 'Máximo 80 caracteres.';
  }

  const notesResult = validateNotes(notes, { max: 500 });
  if (!notesResult.valid) errors.notes = notesResult.message;

  const selected = receivable.filter((item) => String(item.quantity ?? '').trim() !== '');
  const withQty = selected.filter((item) => Number(item.quantity) > 0);
  if (withQty.length === 0) {
    errors.items = 'Indica al menos una cantidad recibida.';
    return validationResult(errors);
  }

  withQty.forEach((item) => {
    const qty = validatePositiveInt(item.quantity, 'La cantidad', { required: true, min: 1 });
    if (!qty.valid) {
      errors[`item.${item.purchaseItemId}.quantity`] = qty.message;
    } else if (Number(item.quantity) > Number(item.pending)) {
      errors[`item.${item.purchaseItemId}.quantity`] =
        `No puedes recibir más de ${item.pending} unidades de ${item.name}.`;
    }

    const cost = validateMoney(item.unitCost, 'El costo unitario', { required: true, min: 0.01 });
    if (!cost.valid) {
      errors[`item.${item.purchaseItemId}.unitCost`] = cost.message;
    }
  });

  return validationResult(errors);
}

/** @returns {ValidationResult} */
export function validatePurchaseForm(form, products = []) {
  const errors = {};

  if (!form.supplierId) {
    errors.supplierId = 'Selecciona un proveedor activo.';
  }

  const items = form.items
    .map((item, idx) => ({ ...item, idx }))
    .filter((i) => i.productId || i.quantity || i.unitCost);

  if (items.length === 0) {
    errors.items = 'Agrega al menos un producto con cantidad y costo.';
    return validationResult(errors);
  }

  const seenProducts = new Set();
  items.forEach((item) => {
    if (!item.productId) {
      errors[`items.${item.idx}.productId`] = 'Selecciona un producto.';
      return;
    }
    const productKey = String(item.productId);
    if (seenProducts.has(productKey)) {
      errors[`items.${item.idx}.productId`] = 'El producto ya está incluido en la orden.';
    } else if (
      products.length > 0 &&
      !products.some((product) => String(product.id) === productKey)
    ) {
      errors[`items.${item.idx}.productId`] = 'El producto no está disponible en el catálogo activo.';
    }
    seenProducts.add(productKey);
    const qty = validatePositiveInt(item.quantity, 'La cantidad', { required: true, min: 1 });
    if (!qty.valid) errors[`items.${item.idx}.quantity`] = qty.message;

    const cost = validateMoney(item.unitCost, 'El costo unitario', { required: true, min: 0.01 });
    if (!cost.valid) errors[`items.${item.idx}.unitCost`] = cost.message;
  });

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

  const notes = validateNotes(data.notes);
  if (!notes.valid) errors.notes = notes.message;

  return validationResult(errors);
}

/** @returns {ValidationResult} */
export function validateBookingForm(form) {
  const errors = {};

  if (!form.serviceId) errors.serviceId = 'Selecciona un servicio.';
  if (!form.barberId) errors.barberId = 'Selecciona un barbero.';
  if (!form.appointmentDate) errors.appointmentDate = 'Selecciona una fecha.';
  if (!form.startTime) errors.startTime = 'Selecciona una hora disponible.';

  const firstName = validatePersonName(form.firstName, 'El nombre', {
    minLength: CLIENT_FIRST_NAME_MIN,
  });
  if (!firstName.valid) errors.firstName = fieldMessage(firstName, 'Revisa el nombre.');

  const lastName = validatePersonName(form.lastName, 'El apellido', {
    minLength: CLIENT_LAST_NAME_MIN,
  });
  if (!lastName.valid) errors.lastName = fieldMessage(lastName, 'Revisa el apellido.');

  const email = validateEmail(form.email);
  if (!email.valid) errors.email = email.message;

  if (form.phone?.trim()) {
    const phone = validatePhone(form.phone, { required: false });
    if (!phone.valid) errors.phone = phone.message;
  }

  const notes = validateNotes(form.notes);
  if (!notes.valid) errors.notes = notes.message;

  return validationResult(errors);
}

/** @returns {ValidationResult} */
export function validateBarberSchedulesForm(schedules = []) {
  const errors = {};
  schedules.forEach((row) => {
    if (!row?.isAvailable) return;
    const range = validateTimeRange(row.startTime, row.endTime);
    if (!range.valid) {
      errors[`day_${row.dayOfWeek}`] = range.message;
    }
  });
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
  else if (String(name).trim().length > 100) {
    errors.name = 'Máximo 100 caracteres.';
  }
  return validationResult(errors);
}

export function validateCategoryForm({ name, description }) {
  const errors = {};
  const nameResult = validateCategoryName(name);
  if (!nameResult.valid) Object.assign(errors, nameResult.errors);

  const desc = validateNotes(description, {
    max: TEXT_CATEGORY_DESCRIPTION_MAX,
    label: 'La descripción',
  });
  if (!desc.valid) errors.description = desc.message;

  return validationResult(errors);
}
