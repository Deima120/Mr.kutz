/**
 * Crear/editar un hito de fidelización: cada cuántos servicios completados se
 * otorga, y qué premios (uno o varios: servicio y/o producto) se entregan.
 */

import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import AdminModalShell from '@/shared/components/admin/AdminModalShell';
import CustomSelect from '@/shared/components/CustomSelect';
import { onCustomSelectValue } from '@/shared/utils/customSelectAdapters';
import { FieldErrorMessage } from '@/shared/components/FormValidationFields';
import { useAppToast } from '@/shared/feedback/ToastContext';
import { getApiErrorMessage } from '@/shared/utils/formValidation';
import * as loyaltyService from '@/features/loyalty/services/loyaltyService';
import * as serviceService from '@/features/services/services/serviceService';
import * as productService from '@/features/inventory/services/productService';

function emptyItem() {
  return { itemType: 'service', serviceId: '', productId: '', quantity: 1 };
}

function itemsFromRule(rule) {
  if (!rule?.rewardItems?.length) return [emptyItem()];
  return rule.rewardItems.map((item) => ({
    itemType: item.item_type ?? item.itemType,
    serviceId: item.service_id ?? item.serviceId ?? '',
    productId: item.product_id ?? item.productId ?? '',
    quantity: item.quantity ?? 1,
  }));
}

export default function LoyaltyMilestoneFormModal({ open, rule = null, onClose, onSaved }) {
  const toast = useAppToast();
  const isEdit = rule != null;

  const [everyCount, setEveryCount] = useState('');
  const [label, setLabel] = useState('');
  const [items, setItems] = useState([emptyItem()]);
  const [services, setServices] = useState([]);
  const [products, setProducts] = useState([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setEveryCount(rule ? String(rule.every_count ?? rule.everyCount) : '');
    setLabel(rule ? rule.label : '');
    setItems(itemsFromRule(rule));
    setError('');
  }, [open, rule]);

  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    serviceService
      .getServices({ active: 'true' })
      .then((data) => {
        if (!cancelled) setServices(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) setServices([]);
      });
    productService
      .getProducts({ active: 'true', limit: 200 })
      .then((res) => {
        if (!cancelled) setProducts(res.data || []);
      })
      .catch(() => {
        if (!cancelled) setProducts([]);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const serviceOptions = useMemo(
    () => services.map((s) => ({ id: String(s.id), label: s.name })),
    [services]
  );
  const productOptions = useMemo(
    () => products.map((p) => ({ id: String(p.id), label: p.name })),
    [products]
  );

  const updateItem = (index, patch) => {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  };

  const addItem = () => setItems((prev) => [...prev, emptyItem()]);
  const removeItem = (index) => setItems((prev) => prev.filter((_, i) => i !== index));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const parsedEvery = parseInt(everyCount, 10);
    if (!Number.isFinite(parsedEvery) || parsedEvery <= 0) {
      setError('Indica cada cuántos servicios completados se otorga el hito.');
      return;
    }
    if (!label.trim()) {
      setError('Indica un nombre para el hito.');
      return;
    }
    const invalidItem = items.some(
      (it) =>
        (it.itemType === 'service' && !it.serviceId) ||
        (it.itemType === 'product' && !it.productId)
    );
    if (invalidItem) {
      setError('Elige un servicio o producto para cada premio.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const payload = {
        everyCount: parsedEvery,
        label: label.trim(),
        rewardItems: items.map((it) => ({
          itemType: it.itemType,
          serviceId: it.itemType === 'service' ? parseInt(it.serviceId, 10) : undefined,
          productId: it.itemType === 'product' ? parseInt(it.productId, 10) : undefined,
          quantity: it.quantity,
        })),
      };
      if (isEdit) {
        await loyaltyService.updateMilestoneRule(rule.id, payload);
        toast.success('Hito actualizado.');
      } else {
        await loyaltyService.createMilestoneRule(payload);
        toast.success('Hito creado.');
      }
      onSaved?.();
      onClose?.();
    } catch (err) {
      setError(getApiErrorMessage(err, 'No se pudo guardar el hito.'));
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <AdminModalShell
      open={open}
      onClose={saving ? undefined : onClose}
      size="lg"
      title={isEdit ? 'Editar hito de fidelización' : 'Nuevo hito de fidelización'}
      subtitle="Elige cada cuántos servicios completados se otorga, y qué premio(s) se entregan"
      labelledBy="loyalty-milestone-form-title"
    >
      <h2 id="loyalty-milestone-form-title" className="sr-only">
        {isEdit ? 'Editar hito' : 'Nuevo hito'}
      </h2>
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold text-stone-600" htmlFor="loyalty-every-count">
              Cada cuántos servicios completados
            </label>
            <input
              id="loyalty-every-count"
              type="number"
              min={1}
              value={everyCount}
              onChange={(e) => setEveryCount(e.target.value)}
              className="input-premium w-full py-2 text-sm"
              placeholder="Ej. 5"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-stone-600" htmlFor="loyalty-label">
              Nombre del hito
            </label>
            <input
              id="loyalty-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="input-premium w-full py-2 text-sm"
              placeholder="Ej. Cada 5 servicios"
              maxLength={120}
            />
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-600">Premios de este hito</span>
            <button
              type="button"
              onClick={addItem}
              className="inline-flex items-center gap-1 text-xs font-semibold text-gold-dark hover:underline"
            >
              <Plus className="h-3.5 w-3.5" /> Agregar premio
            </button>
          </div>
          <div className="space-y-2">
            {items.map((item, index) => (
              <div
                key={index}
                className="grid grid-cols-[6.5rem_1fr_4rem_auto] items-center gap-2 rounded-lg border border-stone-200 bg-stone-50 p-2"
              >
                <CustomSelect
                  value={item.itemType}
                  onChange={(v) => updateItem(index, { itemType: v, serviceId: '', productId: '' })}
                  options={[
                    { id: 'service', label: 'Servicio' },
                    { id: 'product', label: 'Producto' },
                  ]}
                  ariaLabel="Tipo de premio"
                />
                {item.itemType === 'service' ? (
                  <CustomSelect
                    value={item.serviceId}
                    onChange={onCustomSelectValue((v) => updateItem(index, { serviceId: v }))}
                    options={serviceOptions}
                    placeholder="Elige un servicio…"
                    ariaLabel="Servicio"
                  />
                ) : (
                  <CustomSelect
                    value={item.productId}
                    onChange={onCustomSelectValue((v) => updateItem(index, { productId: v }))}
                    options={productOptions}
                    placeholder="Elige un producto…"
                    ariaLabel="Producto"
                  />
                )}
                <input
                  type="number"
                  min={1}
                  value={item.quantity}
                  onChange={(e) => updateItem(index, { quantity: Number(e.target.value) || 1 })}
                  className="input-premium w-full py-1.5 text-xs"
                  aria-label="Cantidad"
                />
                <button
                  type="button"
                  onClick={() => removeItem(index)}
                  disabled={items.length <= 1}
                  className="rounded-lg p-1.5 text-stone-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-30"
                  aria-label="Quitar premio"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <FieldErrorMessage message={error} />

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-admin-outline text-sm" onClick={onClose} disabled={saving}>
            Cancelar
          </button>
          <button type="submit" className="btn-admin text-sm" disabled={saving}>
            {saving ? 'Guardando…' : 'Guardar hito'}
          </button>
        </div>
      </form>
    </AdminModalShell>
  );
}
