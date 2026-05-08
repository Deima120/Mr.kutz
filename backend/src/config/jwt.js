/**
 * JWT — secreto obligatorio (sin valor por defecto).
 */

export function getJwtSecret() {
  const s = process.env.JWT_SECRET?.trim();
  if (!s) {
    const err = new Error('JWT_SECRET no está configurado en el entorno.');
    err.statusCode = 500;
    throw err;
  }
  return s;
}
