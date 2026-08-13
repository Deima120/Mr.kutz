/**
 * Fuente única del secreto JWT.
 *
 * Antes cada punto de uso hacía `process.env.JWT_SECRET || 'dev-secret-change-in-production'`.
 * Ese fallback permitía firmar tokens de CUALQUIER usuario (incluido admin) si la variable
 * faltaba, y el guard de arranque solo miraba `NODE_ENV === 'production'`: bastaba un typo en
 * esa variable para abrir el agujero.
 *
 * Aquí no hay fallback. Si el secreto falta o es débil, el proceso no arranca —
 * en cualquier entorno. Falla cerrado, no abierto.
 */

/** Mínimo razonable para HS256; por debajo el secreto es fuerza-brutable. */
export const MIN_JWT_SECRET_LENGTH = 32;

/** Algoritmo fijo: evita confusión de algoritmos al verificar. */
export const JWT_ALGORITHM = 'HS256';

/**
 * Valida el secreto y lo devuelve. Lanza si no sirve.
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {string}
 */
export function resolveJwtSecret(env = process.env) {
  const secret = String(env.JWT_SECRET ?? '').trim();

  if (!secret) {
    throw new Error(
      'Falta JWT_SECRET. Define una cadena aleatoria de al menos ' +
        `${MIN_JWT_SECRET_LENGTH} caracteres (ej. \`openssl rand -base64 48\`).`
    );
  }

  if (secret.length < MIN_JWT_SECRET_LENGTH) {
    throw new Error(
      `JWT_SECRET es demasiado corto (${secret.length} caracteres). ` +
        `Se requieren al menos ${MIN_JWT_SECRET_LENGTH}.`
    );
  }

  return secret;
}

/**
 * Igual que resolveJwtSecret pero cacheado, para el camino caliente
 * (cada petición autenticada verifica un token).
 */
let cached = null;
export function getJwtSecret() {
  if (cached === null) cached = resolveJwtSecret();
  return cached;
}

/** Solo para tests: olvida el valor cacheado. */
export function resetJwtSecretCache() {
  cached = null;
}
