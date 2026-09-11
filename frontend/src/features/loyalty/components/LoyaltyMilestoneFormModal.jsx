/**
 * Crear/editar un hito de fidelización: cada cuántos servicios completados se
 * otorga, y entre qué OPCIONES de premio puede elegir el cliente. Cada opción
 * agrupa uno o varios ítems (servicio y/o producto) que se entregan juntos —
 * un hito con una sola opción no le pide nada al cliente, se otorga sola.
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

function emptyOption() {
  return { items: [emptyItem()] };
}

function optionsFromRule(rule) {
  if (!rule?.options?.length) return [emptyOption()];
  return rule.options.map((option) => ({
    items: (option.items ?? []).map((item) => ({
      itemType: item.item_type ?? item.itemType,
      serviceId: item.service_id ?? item.serviceId ?? '',
      productId: item.product_id ?? item.productId ?? '',
      quantity: item.quantity ?? 1,
    })),
  }));
}

export default function LoyaltyMilestoneFormModal({ open, rule = null, onClose, onSaved }) {
  const toast = useAppToast();
  const isEdit = rule != null;

  const [everyCount, setEveryCount] = useState('');
  const [label, setLabel] = useState('');
  const [options, setOptions] = useState([emptyOption()]);
  const [services, setServices] = useState([]);
  const [products, setProducts] = useState([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setEveryCount(rule ? String(rule.every_count ?? rule.everyCount) : '');
    setLabel(rule ? rule.label : '');
    setOptions(optionsFromRule(rule));
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

  const addOption = () => setOptions((prev) => [...prev, emptyOption()]);
  const removeOption = (optionIndex) =>
    setOptions((prev) => prev.filter((_, i) => i !== optionIndex));

  const addItem = (optionIndex) =>
    setOptions((prev) =>
      prev.map((opt, i) => (i === optionIndex ? { ...opt, items: [...opt.items, emptyItem()] } : opt))
    );
  const removeItem = (optionIndex, itemIndex) =>
    setOptions((prev) =>
      prev.map((opt, i) =>
        i === optionIndex ? { ...opt, items: opt.items.filter((_, j) => j !== itemIndex) } : opt
      )
    );
  const updateItem = (optionIndex, itemIndex, patch) =>
    setOptions((prev) =>
      prev.map((opt, i) =>
        i === optionIndex
          ? { ...opt, items: opt.items.map((it, j) => (j === itemIndex ? { ...it, ...patch } : it)) }
          : opt
      )
    );

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
    const invalidItem = options.some((opt) =>
      opt.items.some(
        (it) =>
          (it.itemType === 'service' && !it.serviceId) || (it.itemType === 'product' && !it.productId)
      )
    );
    if (invalidItem) {
      setError('Elige un servicio o producto para cada premio de cada opción.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const payload = {
        everyCount: parsedEvery,
        label: label.trim(),
        options: options.map((opt) => ({
          items: opt.items.map((it) => ({
            itemType: it.itemType,
            serviceId: it.itemType === 'service' ? parseInt(it.serviceId, 10) : undefined,
            productId: it.itemType === 'product' ? parseInt(it.productId, 10) : undefined,
            quantity: it.quantity,
          })),
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
      subtitle="Elige cada cuántos servicios completados se otorga, y entre qué opciones de premio elige el cliente"
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
            <span className="text-xs font-semibold text-stone-600">
              Opciones de premio{' '}
              <span className="font-normal text-stone-400">
                — con más de una, el cliente elige cuál quiere
              </span>
            </span>
            <button
              type="button"
              onClick={addOption}
              className="inline-flex items-center gap-1 text-xs font-semibold text-gold-dark hover:underline"
            >
              <Plus className="h-3.5 w-3.5" /> Agregar opción
            </button>
          </div>

          <div className="space-y-3">
            {options.map((option, optionIndex) => (
              <div key={optionIndex} className="rounded-lg border border-stone-200 bg-white p-2.5">
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-gold-dark">
                    Opción {optionIndex + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeOption(optionIndex)}
                    disabled={options.length <= 1}
                    className="rounded-lg p-1 text-stone-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-30"
                    aria-label="Quitar opción"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="space-y-2">
                  {option.items.map((item, itemIndex) => (
                    <div
                      key={itemIndex}
                      className="grid grid-cols-[6.5rem_1fr_4rem_auto] items-center gap-2 rounded-lg border border-stone-200 bg-stone-50 p-2"
                    >
                      <CustomSelect
                        value={item.itemType}
                        onChange={(v) =>
                          updateItem(optionIndex, itemIndex, { itemType: v, serviceId: '', productId: '' })
                        }
                        options={[
                          { id: 'service', label: 'Servicio' },
                          { id: 'product', label: 'Producto' },
                        ]}
                        ariaLabel="Tipo de premio"
                      />
                      {item.itemType === 'service' ? (
                        <CustomSelect
                          value={item.serviceId}
                          onChange={onCustomSelectValue((v) => updateItem(optionIndex, itemIndex, { serviceId: v }))}
                          options={serviceOptions}
                          placeholder="Elige un servicio…"
                          ariaLabel="Servicio"
                        />
                      ) : (
                        <CustomSelect
                          value={item.productId}
                          onChange={onCustomSelectValue((v) => updateItem(optionIndex, itemIndex, { productId: v }))}
                          options={productOptions}
                          placeholder="Elige un producto…"
                          ariaLabel="Producto"
                        />
                      )}
                      <input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={(e) =>
                          updateItem(optionIndex, itemIndex, { quantity: Number(e.target.value) || 1 })
                        }
                        className="input-premium w-full py-1.5 text-xs"
                        aria-label="Cantidad"
                      />
                      <button
                        type="button"
                        onClick={() => removeItem(optionIndex, itemIndex)}
                        disabled={option.items.length <= 1}
                        className="rounded-lg p-1.5 text-stone-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-30"
                        aria-label="Quitar premio"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => addItem(optionIndex)}
                  className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-gold-dark hover:underline"
                >
                  <Plus className="h-3 w-3" /> Agregar premio a esta opción
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
