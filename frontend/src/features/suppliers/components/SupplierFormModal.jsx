/**
 * Alta/edición de proveedor en portal (fuera del form padre).
 */

import SupplierForm from '@/features/suppliers/components/SupplierForm';
import AdminModalShell from '@/shared/components/admin/AdminModalShell';

export default function SupplierFormModal({
  open,
  supplierId = null,
  initialName = '',
  onClose,
  onSaved,
}) {
  const isEdit = supplierId != null;
  if (!open) return null;

  return (
    <AdminModalShell
      open={open}
      onClose={onClose}
      size="lg"
      zIndexClass="z-[70]"
      bodyClassName="!pt-3"
      title={isEdit ? 'Editar proveedor' : 'Crear proveedor'}
      subtitle={isEdit ? 'Actualiza los datos del directorio' : 'Quedará seleccionado en la orden'}
      labelledBy="supplier-form-title"
    >
      <h2 id="supplier-form-title" className="sr-only">
        {isEdit ? 'Editar proveedor' : 'Crear proveedor'}
      </h2>
      <SupplierForm
        variant="modal"
        supplierId={supplierId}
        initialName={initialName}
        onCancel={onClose}
        onSuccess={({ supplier }) => {
          onSaved?.(supplier);
          onClose?.();
        }}
      />
    </AdminModalShell>
  );
}
