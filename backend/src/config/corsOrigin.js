/**
 * Decisión de origen para CORS, aislada del arranque para poder testearla.
 *
 * El filtro anterior hacía `origin.includes('localhost')`, una comparación por
 * SUBCADENA sobre la URL completa: `https://localhost.attacker.com` la pasaba, y
 * con `credentials: true` eso permite peticiones autenticadas cross-origin.
 * Aquí se compara el HOSTNAME exacto, y la excepción de desarrollo solo existe
 * fuera de producción.
 */

/** Orígenes de desarrollo, permitidos solo si NODE_ENV !== 'production'. */
const DEV_HOSTNAMES = new Set(['localhost', '127.0.0.1', '[::1]']);

const PREVIEW_HOST_RE = /\.vercel\.app$|\.netlify\.app$/i;

/**
 * Construye el predicado de origen que consume el paquete `cors`.
 *
 * @param {object} [opts]
 * @param {string[]} [opts.allowedOrigins] orígenes fijos permitidos
 * @param {string[]} [opts.envOrigins] orígenes desde FRONTEND_URL / PUBLIC_FRONTEND_URL
 * @param {boolean} [opts.allowPreviews] permitir *.vercel.app / *.netlify.app
 * @param {boolean} [opts.isProduction]
 * @returns {(origin: string|undefined) => boolean}
 */
export function createOriginChecker({
  allowedOrigins = [],
  envOrigins = [],
  allowPreviews = false,
  isProduction = false,
} = {}) {
  const exact = new Set([...allowedOrigins, ...envOrigins].filter(Boolean));

  return function isOriginAllowed(origin) {
    // Sin cabecera Origin: peticiones no-navegador (app Flutter, curl, health checks).
    // El navegador siempre la envía en cross-origin, así que esto no debilita la política.
    if (!origin) return true;

    if (exact.has(origin)) return true;

    let hostname;
    try {
      hostname = new URL(origin).hostname;
    } catch {
      return false; // origen no parseable
    }

    if (!isProduction && DEV_HOSTNAMES.has(hostname)) return true;

    if (allowPreviews && PREVIEW_HOST_RE.test(hostname)) return true;

    return false;
  };
}
