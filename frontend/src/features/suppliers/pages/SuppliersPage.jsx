/**
 * Redirección: el directorio vive en Compras → tab Proveedores.
 * Conservado por si algún import legacy apunta aquí.
 */

import { Navigate } from 'react-router-dom';

export default function SuppliersPage() {
  return <Navigate to="/purchases?tab=suppliers" replace />;
}
