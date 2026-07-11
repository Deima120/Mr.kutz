import { body } from 'express-validator';

export const DOCUMENT_TYPES = ['CC', 'CE', 'TI', 'Pasaporte', 'NIT'];

export const PERSON_NAME_RE =
  /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+(?:[ '\-][A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)*$/;

export const strongPassword = (field = 'password') => [
  body(field)
    .isLength({ min: 8 })
    .withMessage('La contraseña debe tener al menos 8 caracteres.')
    .matches(/[A-Z]/)
    .withMessage('La contraseña debe incluir al menos una mayúscula.')
    .matches(/[a-z]/)
    .withMessage('La contraseña debe incluir al menos una minúscula.')
    .matches(/\d/)
    .withMessage('La contraseña debe incluir al menos un número.'),
];

/** Nombre o apellido de persona (letras, 2–100). */
export const personNameField = (field, label) =>
  body(field)
    .trim()
    .notEmpty()
    .withMessage(`${label} es obligatorio.`)
    .isLength({ min: 2, max: 100 })
    .withMessage(`${label} debe tener entre 2 y 100 caracteres.`)
    .matches(PERSON_NAME_RE)
    .withMessage(`${label} solo puede contener letras.`);

export const optionalPersonNameField = (field, label) =>
  body(field)
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage(`${label} debe tener entre 2 y 100 caracteres.`)
    .matches(PERSON_NAME_RE)
    .withMessage(`${label} solo puede contener letras.`);

/** Teléfono opcional: solo dígitos, 7–15. */
export const optionalPhoneField = (field = 'phone') =>
  body(field)
    .optional({ checkFalsy: true })
    .trim()
    .matches(/^\d*$/)
    .withMessage('El teléfono solo puede contener dígitos.')
    .isLength({ min: 7, max: 15 })
    .withMessage('El teléfono debe tener entre 7 y 15 dígitos.');

export const documentTypeField = (field = 'documentType') =>
  body(field)
    .trim()
    .notEmpty()
    .withMessage('El tipo de documento es obligatorio.')
    .isIn(DOCUMENT_TYPES)
    .withMessage('Selecciona un tipo de documento válido.');

export const documentNumberField = (field = 'documentNumber') =>
  body(field)
    .trim()
    .notEmpty()
    .withMessage('El número de documento es obligatorio.')
    .matches(/^\d+$/)
    .withMessage('El número de documento solo puede contener dígitos.')
    .isLength({ min: 5, max: 20 })
    .withMessage('El número de documento debe tener entre 5 y 20 dígitos.');

export const optionalNotesField = (field = 'notes', max = 500) =>
  body(field)
    .optional({ checkFalsy: true, nullable: true })
    .trim()
    .isLength({ max })
    .withMessage(`Las notas no pueden superar ${max} caracteres.`);
