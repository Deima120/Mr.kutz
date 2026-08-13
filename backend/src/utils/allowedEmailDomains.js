/**
 * Proveedores de correo permitidos en el registro público.
 *
 * Es la fuente de verdad del servidor: el frontend tiene su propia copia en
 * `frontend/src/shared/utils/authValidation.js`, pero esta es la que manda —
 * impide saltarse la restricción llamando a la API directamente.
 *
 * Solo aplica al registro público de clientes. NO se usa en login, recuperación
 * de contraseña ni en los formularios internos (proveedores, barberos, clientes
 * creados por un admin), que aceptan cualquier dominio válido.
 */

/** Dominios aceptados, en minúsculas. Coincidencia exacta. */
export const ALLOWED_EMAIL_DOMAINS = Object.freeze([
  'gmail.com',
  'hotmail.com',
  'outlook.com',
  'yahoo.com',
  'icloud.com',
  'live.com',
  'msn.com',
  'proton.me',
  'protonmail.com',
]);

/** Mensaje único para el usuario, compartido por backend y frontend. */
export const ALLOWED_EMAIL_DOMAINS_MESSAGE =
  'Solo se permiten correos de Gmail, Hotmail, Outlook, Yahoo, iCloud, Live, MSN o Proton.';

/**
 * ¿El correo pertenece a un proveedor permitido?
 *
 * Normaliza (minúsculas + sin espacios alrededor) y exige:
 *  - exactamente un '@'
 *  - parte local no vacía
 *  - dominio EXACTAMENTE igual a uno de la lista
 *
 * La comparación exacta es lo que descarta subdominios y sufijos parecidos:
 * `gmail.fake.com` y `gmail.com.fake` no son iguales a `gmail.com`.
 *
 * @param {unknown} email
 * @returns {boolean}
 */
export function isAllowedEmailDomain(email) {
  const normalized = String(email ?? '').trim().toLowerCase();
  if (!normalized) return false;

  const parts = normalized.split('@');
  if (parts.length !== 2) return false; // ninguno o más de un '@'

  const [localPart, domain] = parts;
  if (!localPart || !domain) return false;

  return ALLOWED_EMAIL_DOMAINS.includes(domain);
}
