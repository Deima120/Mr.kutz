/**
 * Clasificación de violaciones de unicidad (P2002) al crear un cobro.
 *
 * Antes CUALQUIER P2002 se traducía a "Esta cita ya tiene un cobro activo". Pero
 * en el primer cobro del día dos cajas simultáneas chocan en `document_sequences`
 * al pedir folio, y eso también es P2002: la caja leía "ya está cobrada", no
 * reintentaba, y la venta se perdía.
 *
 * Puro y sin I/O para poder probarlo aislado.
 */

/**
 * Índice único parcial "una línea de servicio activa por cita"
 * (migración payment_lines_stage1). Es el único P2002 que de verdad
 * significa que la cita ya estaba cobrada.
 */
export const ACTIVE_APPOINTMENT_UIDX = 'payment_lines_active_appointment_uidx';

/**
 * Colisiones de asignación de folio: transitorias, merecen reintento.
 *
 * Se comparan normalizadas porque `meta.target` puede venir como nombre físico del
 * índice (`document_sequences_doc_type_period_key_key`) o como campos del modelo en
 * camelCase (`['docType','periodKey']`) según la restricción y la versión de Prisma.
 */
const FOLIO_COLLISION_HINTS = ['documentsequences', 'doctype', 'periodkey', 'reference'];

/** minúsculas y sin guiones bajos, para que snake_case y camelCase colapsen. */
function normalize(value) {
  return String(value ?? '').toLowerCase().replace(/_/g, '');
}

/**
 * `meta.target` llega como nombre de índice (string) o lista de columnas (array)
 * según el tipo de restricción y la versión de Prisma.
 * @param {unknown} err
 * @returns {string}
 */
export function p2002Target(err) {
  const target = err?.meta?.target;
  if (Array.isArray(target)) return target.join(',');
  return String(target ?? '');
}

/** @returns {boolean} la cita ya tenía un cobro activo */
export function isActiveAppointmentCollision(err) {
  return normalize(p2002Target(err)).includes(normalize(ACTIVE_APPOINTMENT_UIDX));
}

/** @returns {boolean} carrera al asignar el número de comprobante */
export function isFolioCollision(err) {
  const target = normalize(p2002Target(err));
  if (!target) return false;
  return FOLIO_COLLISION_HINTS.some((hint) => target.includes(hint));
}
