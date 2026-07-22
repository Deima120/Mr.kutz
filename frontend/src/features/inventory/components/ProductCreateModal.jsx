/**
 * Alta de producto en portal (fuera del form padre — evita forms anidados).
 */

import { ProductForm } from '@/features/inventory/components/ProductForm';
import AdminModalShell from '@/shared/components/admin/AdminModalShell';

export default function ProductCreateModal({
  open,
  initialName = '',
  onClose,
  onCreated,
}) {
  return (
    <AdminModalShell
      open={open}
      onClose={onClose}
      size="lg"
      zIndexClass="z-[70]"
      bodyClassName="!pt-3"
      labelledBy="product-create-title"
    >
      <h2 id="product-create-title" className="sr-only">
        Crear producto
      </h2>
      <ProductForm
        variant="modal"
        initialName={initialName}
        onCancel={onClose}
        onSuccess={({ product }) => {
          onCreated?.(product);
          onClose?.();
        }}
      />
    </AdminModalShell>
  );
}
