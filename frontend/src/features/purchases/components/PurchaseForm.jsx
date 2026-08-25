/**
 * Formulario de compra — inline dentro de la tarjeta de Compras
 */

import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, Check, X } from 'lucide-react';
import * as purchaseService from '@/features/purchases/services/purchaseService';
import * as productService from '@/features/inventory/services/productService';
import ProductPicker from '@/features/inventory/components/ProductPicker';
import SupplierPicker from '@/features/suppliers/components/SupplierPicker';
import { proposedUnitCostFromProduct } from '@/features/inventory/models/productFormModel';
import { formatPurchaseAmount } from '@/features/purchases/utils/purchaseFormatters';
import { validatePurchaseForm, getApiErrorMessage, validateMoney, validatePositiveInt } from '@/shared/utils/formValidation';
import { useFormValidation } from '@/shared/hooks/useFormValidation';
import { FieldErrorMessage } from '@/shared/components/FormValidationFields';
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

const ITEM_FIELD_FEEDBACK_CLASS = 'min-h-[1.125rem] mt-1 text-[11px] leading-tight';

/** Primer aviso con algo que decir, para no reservar tres renglones por fila. */
function pickLive(...lives) {
  return lives.find((live) => live?.show) ?? null;
}

function ItemFieldFeedback({ error, live }) {
  if (error) {
    return (
      <div className={ITEM_FIELD_FEEDBACK_CLASS} role="alert">
        <p className="flex items-center gap-1 text-red-600 truncate">
          <X className="w-3.5 h-3.5 shrink-0" aria-hidden />
          <span className="truncate">{error}</span>
        </p>
      </div>
    );
  }

  if (live?.show) {
    if (live.valid && live.successMessage) {
      return (
        <div className={ITEM_FIELD_FEEDBACK_CLASS} role="status">
          <p className="flex items-center gap-1 text-emerald-700 truncate">
            <Check className="w-3.5 h-3.5 shrink-0" aria-hidden />
            <span className="truncate">{live.successMessage}</span>
          </p>
        </div>
      );
    }
    if (!live.valid && live.message) {
      return (
        <div className={ITEM_FIELD_FEEDBACK_CLASS} role="status">
          <p className="flex items-center gap-1 text-red-600 truncate">
            <X className="w-3.5 h-3.5 shrink-0" aria-hidden />
            <span className="truncate">{live.message}</span>
          </p>
        </div>
      );
    }
  }

  return <div className={ITEM_FIELD_FEEDBACK_CLASS} aria-hidden>&nbsp;</div>;
}

export function PurchaseForm({ contained = false, onSuccess, onCancel, initialProductId = null }) {
  /** Catálogo local solo para validación/preview; se enriquece al elegir o crear. */
  const [productsById, setProductsById] = useState({});
  const [supplierName, setSupplierName] = useState('');
  const [form, setForm] = useState({
    supplierId: '',
    invoiceNumber: '',
    notes: '',
    items: [emptyItem()],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { fieldError, applyValidation, clearFieldError, markTouched, buildLiveHint, fieldBorderClass } =
    useFormValidation();

  const products = useMemo(() => Object.values(productsById), [productsById]);
  const focusSupplier = Boolean(initialProductId);

  useEffect(() => {
    const pid = parseInt(initialProductId, 10);
    if (!Number.isFinite(pid) || pid < 1) return undefined;
    let cancelled = false;
    productService
      .getProductById(pid)
      .then((res) => {
        if (cancelled) return;
        const product = res?.data ?? res;
        if (!product?.id) return;
        setProductsById((prev) => ({ ...prev, [String(product.id)]: product }));
        const proposed = proposedUnitCostFromProduct(product);
        setForm((prev) => ({
          ...prev,
          items: [
            {
              productId: String(product.id),
              quantity: '1',
              unitCost: proposed || '',
            },
          ],
        }));
      })
      .catch(() => {
        if (!cancelled) setError('No se pudo precargar el producto en la orden.');
      });
    return () => {
      cancelled = true;
    };
  }, [initialProductId]);

  const rememberProduct = (product) => {
    if (!product?.id) return;
    setProductsById((prev) => ({ ...prev, [String(product.id)]: product }));
  };

  const selectProductForItem = (idx, productId, product) => {
    if (product) rememberProduct(product);
    setForm((prev) => {
      const current = prev.items[idx];
      if (!current) return prev;
      const proposed = product ? proposedUnitCostFromProduct(product) : '';
      const shouldPropose =
        proposed &&
        (current.unitCost === '' || current.unitCost == null || Number(current.unitCost) <= 0);
      return {
        ...prev,
        items: prev.items.map((it, i) =>
          i === idx
            ? {
                ...it,
                productId: productId || '',
                unitCost: shouldPropose ? proposed : it.unitCost,
              }
            : it
        ),
      };
    });
    setError('');
    clearFieldError(`items.${idx}.productId`);
    clearFieldError(`items.${idx}.unitCost`);
    clearFieldError('items');
  };

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
        supplierId: Number(form.supplierId),
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
    subtitle: supplierName || 'Orden sin movimiento de stock',
    bullets: [],
    statusLabel: 'Total estimado',
    statusValue: formatPurchaseAmount(totalPreview),
    children: (
      <AdminFormPreviewPanel>
        <AdminFormPreviewField label="Proveedor" value={supplierName} />
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
      onBackClick={onCancel}
      modeBadge="Compra"
      fullBleed={false}
      compact
      contained={contained}
      showBackNav
      aside={aside}
    >
      <AdminFormCard onSubmit={handleSubmit}>
        <AdminFormCardHeader eyebrow="Abastecimiento" title="Crear orden de compra" />

        {error && <div className={ADMIN_FORM_ERROR_CLASS} role="alert">{error}</div>}

        <div className={ADMIN_FORM_GRID_CLASS}>
          <div className="group">
            <label className={ADMIN_FORM_LABEL_CLASS}>Proveedor activo *</label>
            <SupplierPicker
              value={form.supplierId}
              onChange={(value, supplier) => {
                setForm((current) => ({ ...current, supplierId: value }));
                setSupplierName(supplier?.name || '');
                clearFieldError('supplierId');
              }}
              onBlur={() => markTouched('supplierId')}
              placeholder="Buscar o crear proveedor…"
              autoFocus={focusSupplier}
              selectClassName={fieldError('supplierId') ? '!border-red-400' : ''}
              ariaInvalid={Boolean(fieldError('supplierId')) || undefined}
            />
            <FieldErrorMessage message={fieldError('supplierId')} />
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
          <div className="min-h-[1.125rem]">
            <FieldErrorMessage message={fieldError('items')} />
          </div>

          {/* Cabecera de columnas: evita repetir tres etiquetas en cada fila, que era
              lo que disparaba el alto de la lista al agregar varios productos. */}
          <div className="hidden sm:grid sm:grid-cols-12 gap-2 px-2.5 pb-1">
            <span className={`sm:col-span-5 ${ADMIN_FORM_LABEL_CLASS} mb-0`}>Producto</span>
            <span className={`sm:col-span-2 ${ADMIN_FORM_LABEL_CLASS} mb-0`}>Cantidad</span>
            <span className={`sm:col-span-2 ${ADMIN_FORM_LABEL_CLASS} mb-0`}>Costo unit.</span>
            <span className={`sm:col-span-2 ${ADMIN_FORM_LABEL_CLASS} mb-0 text-right`}>Subtotal</span>
            <span className="sm:col-span-1" />
          </div>

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
              min: 0.01,
            });
            const productLive = buildLiveHint(productKey, item.productId, productValidation, 'Producto seleccionado.');
            const qtyLive = buildLiveHint(qtyKey, item.quantity, qtyValidation, 'Cantidad válida.');
            const costLive = buildLiveHint(costKey, item.unitCost, costValidation, 'Costo válido.');

            const lineSubtotal =
              (Number(item.quantity) || 0) * (Number(item.unitCost) || 0);

            return (
            <div key={idx} className="rounded-lg border border-stone-200/80 bg-stone-50/60 px-2.5 py-2">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                <div className="sm:col-span-5">
                  <label className={`${ADMIN_FORM_LABEL_CLASS} sm:hidden`}>Producto</label>
                  <ProductPicker
                    value={item.productId}
                    onChange={(nextId, product) => selectProductForItem(idx, nextId, product)}
                    onBlur={() => markTouched(productKey)}
                    placeholder="Buscar o crear…"
                    selectClassName={
                      fieldError(productKey)
                        ? fieldBorderClass(productKey, false, item.productId)
                        : fieldBorderClass(productKey, productValidation.valid, item.productId)
                    }
                    ariaInvalid={Boolean(fieldError(productKey)) || undefined}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className={`${ADMIN_FORM_LABEL_CLASS} sm:hidden`}>Cantidad</label>
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                    onBlur={() => markTouched(qtyKey)}
                    aria-label={`Cantidad del artículo ${idx + 1}`}
                    className={`${ADMIN_FORM_FIELD_COMPACT} ${fieldBorderClass(qtyKey, qtyValidation.valid, item.quantity)}`}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className={`${ADMIN_FORM_LABEL_CLASS} sm:hidden`}>Costo unit. ($)</label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={item.unitCost}
                    onChange={(e) => updateItem(idx, 'unitCost', e.target.value)}
                    onBlur={() => markTouched(costKey)}
                    aria-label={`Costo unitario del artículo ${idx + 1}`}
                    className={`${ADMIN_FORM_FIELD_COMPACT} ${fieldBorderClass(costKey, costValidation.valid, item.unitCost)}`}
                  />
                </div>
                {/* Subtotal por línea: antes solo existía el total de la orden, así que
                    con varios artículos no había forma de cuadrar uno a uno. */}
                <div className="sm:col-span-2 flex items-center justify-between sm:justify-end gap-2">
                  <span className={`${ADMIN_FORM_LABEL_CLASS} mb-0 sm:hidden`}>Subtotal</span>
                  <span className="text-sm font-semibold tabular-nums text-stone-800">
                    {formatPurchaseAmount(lineSubtotal)}
                  </span>
                </div>
                <div className="sm:col-span-1 flex sm:justify-end">
                  <button
                    type="button"
                    onClick={() => removeItem(idx)}
                    disabled={form.items.length === 1}
                    className="inline-flex items-center justify-center h-9 w-9 shrink-0 rounded-lg border border-stone-200 text-stone-500 hover:text-red-600 hover:border-red-200 disabled:opacity-40"
                    aria-label={`Quitar artículo ${idx + 1}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              {/* Un solo renglón de aviso por fila en vez de tres reservados: el borde
                  rojo de cada campo sigue indicando cuál falla. */}
              <ItemFieldFeedback
                error={fieldError(productKey) || fieldError(qtyKey) || fieldError(costKey)}
                live={pickLive(productLive, qtyLive, costLive)}
              />
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
              Crear orden
            </AdminFormLoadingButton>
          </AdminFormPrimaryButton>
        </AdminFormFooterActions>
      </AdminFormCard>
    </AdminFormShell>
  );
}
