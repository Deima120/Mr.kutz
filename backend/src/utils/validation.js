import { body } from 'express-validator';

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
