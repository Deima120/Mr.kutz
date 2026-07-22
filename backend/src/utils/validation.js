import { body, query } from 'express-validator';

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

/** Identificación fiscal laxa: trim, máx. 50, letras/números/guiones. */
export const optionalTaxIdField = (field = 'taxId') =>
  body(field)
    .optional({ checkFalsy: true, nullable: true })
    .trim()
    .isLength({ max: 50 })
    .withMessage('La identificación fiscal no puede superar 50 caracteres.')
    .matches(/^[A-Za-z0-9-]+$/)
    .withMessage('La identificación fiscal solo puede contener letras, números y guiones.');

/** Fecha opcional en query (ISO8601 / YYYY-MM-DD). */
export const optionalDateQuery = (field, label) =>
  query(field)
    .optional({ checkFalsy: true })
    .isISO8601()
    .withMessage(`${label} no válida.`);

/** Paginación común en listados GET. */
export const paginationQuery = ({ maxLimit = 100 } = {}) => [
  query('limit')
    .optional()
    .isInt({ min: 1, max: maxLimit })
    .withMessage(`El límite debe ser un entero entre 1 y ${maxLimit}.`),
  query('offset').optional().isInt({ min: 0 }).withMessage('El offset debe ser un entero ≥ 0.'),
];
