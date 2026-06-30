/**
 * Formulario de compra — inline dentro de la tarjeta de Compras
 */

import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import * as purchaseService from '@/features/purchases/services/purchaseService';
import * as productService from '@/features/inventory/services/productService';
import { formatPurchaseAmount } from '@/features/purchases/utils/purchaseFormatters';
import { validatePurchaseForm, getApiErrorMessage, validateMoney, validatePositiveInt } from '@/shared/utils/formValidation';
import { useFormValidation } from '@/shared/hooks/useFormValidation';
import { FieldErrorMessage, FieldHint } from '@/shared/components/FormValidationFields';
import AdminFormShell, {
  AdminFormCard,
  AdminFormCardHeader,
  ADMIN_FORM_FIELD_COMPACT,
  ADMIN_FORM_LABEL_CLASS,
  ADMIN_FORM_ERROR_CLASS,
  ADMIN_FORM_GRID_CLASS,
  AdminFormFooterActions,
  AdminFormPrimaryButton,
  AdminFormPreviewField,
  AdminFormPreviewPanel,
  AdminFormLoadingButton,
} from '@/shared/components/admin/AdminFormShell';

const emptyItem = () => ({ productId: '', quantity: '1', unitCost: '' });

export function PurchaseForm({ contained = false, onSuccess, onCancel }) {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({
    supplierName: '',
    invoiceNumber: '',
    notes: '',
    items: [emptyItem()],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { fieldError, applyValidation, clearFieldError, markTouched, buildLiveHint, fieldBorderClass } =
    useFormValidation();

  useEffect(() => {
    productService
      .getProducts({ limit: 200 })
      .then((result) => setProducts(result?.data ?? []))
      .catch(() => setProducts([]));
  }, []);

  const totalPreview = useMemo(
    () =>
      form.items.reduce(
        (sum, i) => sum + (Number(i.quantity) || 0) * (Number(i.unitCost) || 0),
        0
      ),
    [form.items]
  );

  const validItems = form.items.filter((i) => i.productId && Number(i.quantity) > 0);

  const updateItem = (idx, field, value) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((it, i) => (i === idx ? { ...it, [field]: value } : it)),
    }));
    setError('');
    clearFieldError(`items.${idx}.${field}`);
    clearFieldError('items');
  };

  const addItem = () => setForm((prev) => ({ ...prev, items: [...prev.items, emptyItem()] }));

  const removeItem = (idx) =>
    setForm((prev) => ({
      ...prev,
      items: prev.items.length > 1 ? prev.items.filter((_, i) => i !== idx) : prev.items,
    }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validation = validatePurchaseForm(form, products);
    if (!applyValidation(validation)) {
      setError(validation.firstError);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const items = form.items
        .filter((i) => i.productId)
        .map((i) => ({
          productId: Number(i.productId),
          quantity: Number(i.quantity),
          unitCost: Number(i.unitCost),
        }));

      await purchaseService.createPurchase({
        supplierName: form.supplierName.trim() || undefined,
        invoiceNumber: form.invoiceNumber.trim() || undefined,
        notes: form.notes.trim() || undefined,
        items,
      });
      onSuccess?.();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Error al registrar compra'));
    } finally {
      setLoading(false);
    }
  };

  const aside = {
    kicker: 'Vista previa',
    title: 'Nueva compra',
    subtitle: form.supplierName || 'Ingreso a inventario',
    bullets: [],
    statusLabel: 'Total estimado',
    statusValue: formatPurchaseAmount(totalPreview),
    children: (
      <AdminFormPreviewPanel>
        <AdminFormPreviewField label="Proveedor" value={form.supplierName} />
        <AdminFormPreviewField label="Factura" value={form.invoiceNumber} />
        <AdminFormPreviewField label="Artículos" value={validItems.length ? `${validItems.length} producto(s)` : ''} />
        {validItems.slice(0, 4).map((item, idx) => {
          const product = products.find((p) => String(p.id) === String(item.productId));
          const subtotal = (Number(item.quantity) || 0) * (Number(item.unitCost) || 0);
          return (
            <AdminFormPreviewField
              key={idx}
              label={product?.name || 'Producto'}
              value={`${item.quantity} × ${formatPurchaseAmount(item.unitCost)} = ${formatPurchaseAmount(subtotal)}`}
            />
          );
        })}
        {validItems.length > 4 ? (
          <p className="text-[10px] text-stone-500">+ {validItems.length - 4} más</p>
        ) : null}
      </AdminFormPreviewPanel>
    ),
  };

  return (
    <AdminFormShell
      backTo="/purchases"
      backLabel="Volver al listado"
      onBackClick={onCancel}
      modeBadge="Compra"
      fullBleed={false}
      compact
      contained={contained}
      showBackNav
      aside={aside}
    >
      <AdminFormCard onSubmit={handleSubmit}>
        <AdminFormCardHeader eyebrow="Abastecimiento" title="Registrar compra" />

        {error && <div className={ADMIN_FORM_ERROR_CLASS} role="alert">{error}</div>}

        <div className={ADMIN_FORM_GRID_CLASS}>
          <div className="group">
            <label className={ADMIN_FORM_LABEL_CLASS}>Proveedor</label>
            <input
              value={form.supplierName}
              onChange={(e) => setForm((p) => ({ ...p, supplierName: e.target.value }))}
              className={ADMIN_FORM_FIELD_COMPACT}
              placeholder="Nombre del proveedor"
              maxLength={150}
            />
          </div>
          <div className="group">
            <label className={ADMIN_FORM_LABEL_CLASS}>No. factura</label>
            <input
              value={form.invoiceNumber}
              onChange={(e) => setForm((p) => ({ ...p, invoiceNumber: e.target.value }))}
              className={ADMIN_FORM_FIELD_COMPACT}
              placeholder="Folio o referencia"
              maxLength={80}
            />
          </div>
        </div>

        <div className="group">
          <label className={ADMIN_FORM_LABEL_CLASS}>Notas</label>
          <textarea
            value={form.notes}
            onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
            rows={2}
            maxLength={500}
            placeholder="Opcional: observaciones del pedido"
            className={`${ADMIN_FORM_FIELD_COMPACT} resize-none`}
          />
        </div>

        <div className="space-y-2 shrink-0">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-bold tracking-wider text-stone-500">Artículos *</p>
            <button type="button" onClick={addItem} className="btn-admin-outline text-xs py-1.5 px-2.5 inline-flex items-center gap-1">
              <Plus className="w-3.5 h-3.5" aria-hidden />
              Agregar
            </button>
          </div>
          <FieldErrorMessage message={fieldError('items')} />

          {form.items.map((item, idx) => {
            const productKey = `items.${idx}.productId`;
            const qtyKey = `items.${idx}.quantity`;
            const costKey = `items.${idx}.unitCost`;
            const productValidation = item.productId
              ? { valid: true, message: '' }
              : { valid: false, message: 'Selecciona un producto.' };
            const qtyValidation = validatePositiveInt(item.quantity, 'La cantidad', {
              required: !!item.productId,
              min: 1,
            });
            const costValidation = validateMoney(item.unitCost, 'El costo unitario', {
              required: !!item.productId,
              min: 0,
            });
            const productLive = buildLiveHint(productKey, item.productId, productValidation, 'Producto seleccionado.');
            const qtyLive = buildLiveHint(qtyKey, item.quantity, qtyValidation, 'Cantidad válida.');
            const costLive = buildLiveHint(costKey, item.unitCost, costValidation, 'Costo válido.');

            return (
            <div key={idx} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end rounded-lg border border-stone-200/80 bg-stone-50/60 p-2.5">
              <div className="sm:col-span-5 group">
                <label className={ADMIN_FORM_LABEL_CLASS}>Producto</label>
                <select
                  value={item.productId}
                  onChange={(e) => updateItem(idx, 'productId', e.target.value)}
                  onBlur={() => markTouched(productKey)}
                  className={`${ADMIN_FORM_FIELD_COMPACT} ${fieldError(productKey) ? fieldBorderClass(productKey, false, item.productId) : fieldBorderClass(productKey, productValidation.valid, item.productId)}`}
                >
                  <option value="">Seleccionar…</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}{p.sku ? ` · ${p.sku}` : ''}
                    </option>
                  ))}
                </select>
                {fieldError(productKey) ? (
                  <FieldErrorMessage message={fieldError(productKey)} />
                ) : (
                  <FieldHint
                    valid={productLive.valid}
                    touched={productLive.show}
                    message={productLive.message}
                    successMessage={productLive.successMessage}
                  />
                )}
              </div>
              <div className="sm:col-span-2 group">
                <label className={ADMIN_FORM_LABEL_CLASS}>Cantidad</label>
                <input
                  type="number"
                  min="1"
                  value={item.quantity}
                  onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                  onBlur={() => markTouched(qtyKey)}
                  className={`${ADMIN_FORM_FIELD_COMPACT} ${fieldBorderClass(qtyKey, qtyValidation.valid, item.quantity)}`}
                />
                {fieldError(qtyKey) ? (
                  <FieldErrorMessage message={fieldError(qtyKey)} />
                ) : (
                  <FieldHint
                    valid={qtyLive.valid}
                    touched={qtyLive.show}
                    message={qtyLive.message}
                    successMessage={qtyLive.successMessage}
                  />
                )}
              </div>
              <div className="sm:col-span-3 group">
                <label className={ADMIN_FORM_LABEL_CLASS}>Costo unit. ($)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={item.unitCost}
                  onChange={(e) => updateItem(idx, 'unitCost', e.target.value)}
                  onBlur={() => markTouched(costKey)}
                  className={`${ADMIN_FORM_FIELD_COMPACT} ${fieldBorderClass(costKey, costValidation.valid, item.unitCost)}`}
                />
                {fieldError(costKey) ? (
                  <FieldErrorMessage message={fieldError(costKey)} />
                ) : (
                  <FieldHint
                    valid={costLive.valid}
                    touched={costLive.show}
                    message={costLive.message}
                    successMessage={costLive.successMessage}
                  />
                )}
              </div>
              <div className="sm:col-span-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => removeItem(idx)}
                  disabled={form.items.length === 1}
                  className="inline-flex items-center justify-center h-9 w-9 rounded-lg border border-stone-200 text-stone-500 hover:text-red-600 hover:border-red-200 disabled:opacity-40"
                  aria-label="Quitar artículo"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            );
          })}
        </div>

        <p className="text-xs text-stone-600 text-right">
          Total: <strong className="text-stone-900">{formatPurchaseAmount(totalPreview)}</strong>
        </p>

        <AdminFormFooterActions>
          <AdminFormPrimaryButton disabled={loading}>
            <AdminFormLoadingButton loading={loading} loadingLabel="Guardando…">
              Registrar compra
            </AdminFormLoadingButton>
          </AdminFormPrimaryButton>
        </AdminFormFooterActions>
      </AdminFormCard>
    </AdminFormShell>
  );
}
