/**
 * Etiqueta de un rol para mostrar en pantalla: en español y en mayúsculas.
 *
 * Los tres roles del sistema (`admin`, `barber`, `client`) se guardan en
 * inglés porque el backend los usa como identificadores estables (rutas,
 * permisos, `assertAssignableRole`) — no se pueden traducir en la base sin
 * romper ese código. Aquí solo se traduce lo que ve el usuario.
 *
 * Los roles personalizados (p. ej. "Contador") no tienen traducción: se
 * muestran tal cual, solo en mayúsculas.
 */
const ROLE_LABELS_ES = {
  admin: 'Administrador',
  barber: 'Barbero',
  client: 'Cliente',
};

export function formatRoleLabel(name) {
  if (!name) return '';
  const traducido = ROLE_LABELS_ES[name.toLowerCase()] ?? name;
  return traducido.toUpperCase();
}
