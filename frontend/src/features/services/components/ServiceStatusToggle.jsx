/**
 * Badge/botón para activar o desactivar un servicio del catálogo.
 *
 * El control visual vive en `shared/components/admin/AdminStatusToggle` desde que Barberos
 * necesitó el mismo patrón; aquí solo se fija el texto de ayuda propio de Servicios. La API
 * pública de este módulo no cambió: mismo default export y mismo `isServiceActive`.
 */

import AdminStatusToggle from '@/shared/components/admin/AdminStatusToggle';

export function isServiceActive(service) {
  return (service?.is_active ?? service?.isActive) !== false;
}

export default function ServiceStatusToggle({ active, onClick, disabled = false, className = '' }) {
  return (
    <AdminStatusToggle
      active={active}
      onClick={onClick}
      disabled={disabled}
      className={className}
      activeTitle="Clic para desactivar (no visible al agendar)"
      inactiveTitle="Clic para activar"
    />
  );
}
