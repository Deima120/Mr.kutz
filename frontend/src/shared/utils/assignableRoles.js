/**
 * Roles que se pueden ofrecer como destino al cambiar el rol de una cuenta,
 * desde Usuarios, Clientes o Barberos.
 *
 * `client` y `barber` se excluyen siempre: el backend los rechaza (ver
 * `assertAssignableRole` en `user.service.js`) porque cada uno tiene su
 * propia vía de alta que crea también la ficha correspondiente (Cliente,
 * Barbero + horarios) — asignarlos aquí solo cambiaría el rol de la cuenta,
 * dejándola sin esa ficha.
 */
export const getAssignableRoles = (roles) =>
  (roles ?? []).filter((r) => r.is_active && r.name !== 'client' && r.name !== 'barber');
