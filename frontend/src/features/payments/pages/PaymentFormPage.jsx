/**
 * Carrito de cobro: servicio + producto(s) + línea manual en un solo pago.
 */

import { useState, useEffect, useMemo, useId } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CalendarCheck, Package, Wallet, Plus, Trash2 } from 'lucide-react';
import * as paymentService from '@/features/payments/services/paymentService';
import * as appointmentService from '@/features/appointments/services/appointmentService';
import * as productService from '@/features/inventory/services/productService';
import { formatAppointmentClockTime, extractAppointmentDateYmd } from '@/shared/utils/appointmentTime';
import { formatPaymentAmount, formatPaymentMethodName } from '@/features/payments/utils/paymentFormatters';
import {
  validatePaymentCartForm,
  getApiErrorMessage,
  validateMoney,
  validatePositiveInt,
  TEXT_REFERENCE_MAX,
} from '@/shared/utils/formValidation';
import CustomSelect from '@/shared/components/CustomSelect';
import { onCustomSelectValue } from '@/shared/utils/customSelectAdapters';
import ProductPicker from '@/features/inventory/components/ProductPicker';
import AdminFormShell, {
  AdminFormCard,
  AdminFormCardHeader,
  ADMIN_FORM_FIELD_COMPACT,
  ADMIN_FORM_LABEL_CLASS,
  ADMIN_FORM_GRID_CLASS,
  AdminFormFooterActions,
  AdminFormPrimaryButton,
  AdminFormPreviewField,
  AdminFormPreviewPanel,
  AdminFormLoadingButton,
} from '@/shared/components/admin/AdminFormShell';

function generatePaymentReference() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `MKP-${yyyy}${mm}${dd}-${random}`;
}

function lineKey() {
  return `L-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function appointmentLabel(a) {
  if (!a) return '';
  const client = `${a.client_first_name || ''} ${a.client_last_name || ''}`.trim();
  const date = extractAppointmentDateYmd(a.appointment_date) || '—';
  const time = formatAppointmentClockTime(a.start_time) || '';
  const service = a.service_name || 'Servicio';
  return `${client || 'Cliente'} · ${service} · ${date}${time ? ` ${time}` : ''}`;
}

export function PaymentForm({
  embedded = false,
  contained = false,
  onSuccess,
  onCancel,
  methods: methodsProp = null,
  prefillProductId: prefillProductIdProp = null,
  prefillAppointmentId: prefillAppointmentIdProp = null,
}) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const prefillProductId = prefillProductIdProp ?? searchParams.get('productId');
  const prefillAppointmentId = prefillAppointmentIdProp ?? searchParams.get('appointmentId');
  const draftManualId = useId();

  const [methodsLocal, setMethodsLocal] = useState([]);
  const methods = Array.isArray(methodsProp) && methodsProp.length ? methodsProp : methodsLocal;

  const [lines, setLines] = useState([]);
  const [paymentMethodId, setPaymentMethodId] = useState('');
  const [reference, setReference] = useState(generatePaymentReference);
  const [notes, setNotes] = useState('');

  const [completedAppointments, setCompletedAppointments] = useState([]);
  const [appointmentPick, setAppointmentPick] = useState('');
  const [productPick, setProductPick] = useState(null);
  const [productQty, setProductQty] = useState('1');
  const [manualDescription, setManualDescription] = useState('');
  const [manualAmount, setManualAmount] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [prefillHints, setPrefillHints] = useState([]);

  useEffect(() => {
    if (Array.isArray(methodsProp) && methodsProp.length) return undefined;
    let cancelled = false;
    paymentService.getPaymentMethods().then((m) => {
      if (!cancelled) setMethodsLocal(Array.isArray(m) ? m : []);
    });
    return () => {
      cancelled = true;
    };
  }, [methodsProp]);

  useEffect(() => {
    appointmentService
      .getAppointments({ status: 'completed', limit: 100 })
      .then((data) => setCompletedAppointments(data.appointments ?? []))
      .catch(() => setCompletedAppointments([]));
  }, []);

  const appointmentOptions = useMemo(() => {
    const taken = new Set(
      lines.filter((l) => l.type === 'service').map((l) => String(l.appointmentId))
    );
    return (completedAppointments || []).filter(
      (a) => !a?.has_active_payment && !taken.has(String(a.id))
    );
  }, [completedAppointments, lines]);

  const cartTotal = useMemo(
    () =>
      lines.reduce((sum, line) => {
        const unit = Number(line.unitPrice) || 0;
        const qty = Number(line.quantity) || 1;
        return sum + unit * qty;
      }, 0),
    [lines]
  );

  const addLine = (line) => {
    setLines((prev) => [...prev, { key: lineKey(), ...line }]);
    setError('');
  };

  const removeLine = (key) => {
    setLines((prev) => prev.filter((l) => l.key !== key));
    setError('');
  };

  useEffect(() => {
    if (!prefillAppointmentId) return;
    const aid = parseInt(prefillAppointmentId, 10);
    if (!Number.isFinite(aid) || aid < 1) {
      setPrefillHints((h) => [...h, 'Cita de enlace no válida.']);
      return;
    }
    appointmentService
      .getAppointmentById(aid)
      .then((row) => {
        const a = row?.data ?? row;
        if (!a) return setPrefillHints((h) => [...h, 'Cita no encontrada.']);
        if (a.status !== 'completed') {
          return setPrefillHints((h) => [...h, 'La cita debe estar completada para cobrar.']);
        }
        if (a.has_active_payment) {
          return setPrefillHints((h) => [...h, 'Esta cita ya tiene un cobro activo.']);
        }
        setLines((prev) => {
          if (prev.some((l) => l.type === 'service' && String(l.appointmentId) === String(a.id))) {
            return prev;
          }
          const price = Number(a.price ?? a.service_price);
          return [
            ...prev,
            {
              key: lineKey(),
              type: 'service',
              appointmentId: a.id,
              label: appointmentLabel(a),
              unitPrice: Number.isFinite(price) ? price : 0,
              quantity: 1,
            },
          ];
        });
      })
      .catch(() => setPrefillHints((h) => [...h, 'No se pudo cargar la cita del enlace.']));
  }, [prefillAppointmentId]);

  useEffect(() => {
    if (!prefillProductId) return;
    const pid = parseInt(prefillProductId, 10);
    if (!Number.isFinite(pid) || pid < 1) {
      setPrefillHints((h) => [...h, 'Producto de enlace no válido.']);
      return;
    }
    productService
      .getProductById(pid)
      .then((res) => {
        const product = res?.data ?? res;
        if (!product) return setPrefillHints((h) => [...h, 'Producto no encontrado.']);
        const unit = Number(product.retailPrice ?? product.retail_price);
        if (!Number.isFinite(unit) || unit <= 0) {
          return setPrefillHints((h) => [...h, 'El producto no tiene precio de venta.']);
        }
        setLines((prev) => {
          if (prev.some((l) => l.type === 'product' && String(l.productId) === String(product.id))) {
            return prev;
          }
          return [
            ...prev,
            {
              key: lineKey(),
              type: 'product',
              productId: product.id,
              label: product.name,
              unitPrice: unit,
              quantity: 1,
              maxStock: Number(product.quantity) || 0,
            },
          ];
        });
      })
      .catch(() => setPrefillHints((h) => [...h, 'No se pudo cargar el producto del enlace.']));
  }, [prefillProductId]);

  const handleAddService = () => {
    const apt = appointmentOptions.find((a) => String(a.id) === String(appointmentPick));
    if (!apt) {
      setError('Selecciona una cita completada pendiente de cobro.');
      return;
    }
    const price = Number(apt.price ?? apt.service_price);
    addLine({
      type: 'service',
      appointmentId: apt.id,
      label: appointmentLabel(apt),
      unitPrice: Number.isFinite(price) ? price : 0,
      quantity: 1,
    });
    setAppointmentPick('');
  };

  const handleAddProduct = () => {
    if (!productPick?.id) {
      setError('Selecciona un producto.');
      return;
    }
    const qtyCheck = validatePositiveInt(productQty, 'La cantidad', { required: true, min: 1 });
    if (!qtyCheck.valid) {
      setError(qtyCheck.message);
      return;
    }
    const qty = parseInt(productQty, 10);
    const max = Number(productPick.quantity) || 0;
    if (max > 0 && qty > max) {
      setError(`Stock insuficiente (máx. ${max}).`);
      return;
    }
    const unit = Number(productPick.retailPrice ?? productPick.retail_price);
    if (!Number.isFinite(unit) || unit <= 0) {
      setError('El producto no tiene precio de venta válido.');
      return;
    }
    if (lines.some((l) => l.type === 'product' && String(l.productId) === String(productPick.id))) {
      setError('Ese producto ya está en el cobro. Quita la línea o ajusta la cantidad.');
      return;
    }
    addLine({
      type: 'product',
      productId: productPick.id,
      label: productPick.name,
      unitPrice: unit,
      quantity: qty,
      maxStock: max,
    });
    setProductPick(null);
    setProductQty('1');
  };

  const handleAddManual = () => {
    const amountCheck = validateMoney(manualAmount, 'El monto', { required: true, min: 0.01 });
    if (!amountCheck.valid) {
      setError(amountCheck.message);
      return;
    }
    const description = String(manualDescription || '').trim();
    if (!description) {
      setError('Indica una descripción para la línea de caja.');
      return;
    }
    addLine({
      type: 'manual',
      description,
      label: description,
      unitPrice: Number(manualAmount),
      quantity: 1,
    });
    setManualDescription('');
    setManualAmount('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validation = validatePaymentCartForm({
      paymentMethodId,
      reference,
      notes,
      lines,
    });
    if (!validation.valid) {
      setError(validation.firstError);
      return;
    }
    setLoading(true);
    setError('');
    try {
      await paymentService.createPayment({
        paymentMethodId: parseInt(paymentMethodId, 10),
        reference: reference || undefined,
        notes: notes.trim() || undefined,
        lines: lines.map((line) => {
          if (line.type === 'service') {
            return { type: 'service', appointmentId: Number(line.appointmentId) };
          }
          if (line.type === 'product') {
            return {
              type: 'product',
              productId: Number(line.productId),
              quantity: Number(line.quantity),
            };
          }
          return {
            type: 'manual',
            unitPrice: Number(line.unitPrice),
            description: line.description || line.label,
          };
        }),
      });
      if (embedded) onSuccess?.({ created: true });
      else navigate('/payments', { replace: true });
    } catch (err) {
      setError(getApiErrorMessage(err, 'Error al registrar pago'));
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (embedded || contained) onCancel?.();
    else navigate(-1);
  };

  const selectedMethod = methods.find((m) => String(m.id) === String(paymentMethodId));

  const paymentAside = {
    kicker: 'Vista previa',
    title: 'Resumen del cobro',
    children: (
      <AdminFormPreviewPanel>
        <AdminFormPreviewField
          label="Método"
          value={selectedMethod ? formatPaymentMethodName(selectedMethod.description || selectedMethod.name) : '—'}
        />
        <AdminFormPreviewField label="Líneas" value={String(lines.length)} />
        <AdminFormPreviewField label="Total" value={formatPaymentAmount(cartTotal)} />
        <AdminFormPreviewField label="Referencia" value={reference} breakAll />
      </AdminFormPreviewPanel>
    ),
  };

  return (
    <AdminFormShell
      embedded={embedded}
      contained={contained}
      title="Registrar cobro"
      subtitle="Agrega servicio, productos o caja en un solo pago. El total se calcula solo."
      onCancel={handleCancel}
      aside={paymentAside}
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {error ? (
          <div className="alert-error text-sm" role="alert">
            {error}
          </div>
        ) : null}
        {prefillHints.length > 0 ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            {prefillHints.map((hint) => (
              <p key={hint}>{hint}</p>
            ))}
          </div>
        ) : null}

        <AdminFormCard>
          <AdminFormCardHeader title="Método y folio" />
          <div className={ADMIN_FORM_GRID_CLASS}>
            <label className="group">
              <span className={ADMIN_FORM_LABEL_CLASS}>Método de pago *</span>
              <CustomSelect
                value={paymentMethodId}
                onChange={onCustomSelectValue(setPaymentMethodId)}
                variant="formCompact"
                selectClassName={ADMIN_FORM_FIELD_COMPACT}
                options={methods.map((m) => ({
                  id: String(m.id),
                  label: formatPaymentMethodName(m.description || m.name),
                }))}
                placeholder="Selecciona…"
              />
            </label>
            <label className="group">
              <span className={ADMIN_FORM_LABEL_CLASS}>Referencia</span>
              <input
                value={reference}
                onChange={(e) => setReference(e.target.value.slice(0, TEXT_REFERENCE_MAX))}
                className={ADMIN_FORM_FIELD_COMPACT}
                maxLength={TEXT_REFERENCE_MAX}
                placeholder="Nº operación, folio…"
              />
            </label>
          </div>
        </AdminFormCard>

        <AdminFormCard>
          <AdminFormCardHeader title="Líneas del cobro" />
          <div className="space-y-4">
            <div className="rounded-xl border border-stone-200 p-3 space-y-2">
              <p className="text-xs font-semibold text-stone-700 inline-flex items-center gap-1.5">
                <CalendarCheck className="h-3.5 w-3.5 text-sky-700" /> Agregar servicio (cita)
              </p>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                <div className="flex-1">
                  <CustomSelect
                    value={appointmentPick}
                    onChange={onCustomSelectValue(setAppointmentPick)}
                    variant="formCompact"
                    selectClassName={ADMIN_FORM_FIELD_COMPACT}
                    options={appointmentOptions.map((a) => ({
                      id: String(a.id),
                      label: appointmentLabel(a),
                    }))}
                    placeholder={
                      appointmentOptions.length ? 'Cita completada…' : 'No hay citas pendientes'
                    }
                  />
                </div>
                <button type="button" onClick={handleAddService} className="btn-admin-outline text-sm inline-flex items-center gap-1">
                  <Plus className="h-3.5 w-3.5" /> Agregar
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-stone-200 p-3 space-y-2">
              <p className="text-xs font-semibold text-stone-700 inline-flex items-center gap-1.5">
                <Package className="h-3.5 w-3.5 text-violet-700" /> Agregar producto
              </p>
              <div className="grid gap-2 sm:grid-cols-[1fr_6rem_auto] sm:items-end">
                <ProductPicker
                  value={productPick?.id ? String(productPick.id) : ''}
                  onChange={(id, product) => {
                    setProductPick(product || null);
                  }}
                />
                <label>
                  <span className={ADMIN_FORM_LABEL_CLASS}>Cant.</span>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={productQty}
                    onChange={(e) => setProductQty(e.target.value)}
                    className={ADMIN_FORM_FIELD_COMPACT}
                  />
                </label>
                <button type="button" onClick={handleAddProduct} className="btn-admin-outline text-sm inline-flex items-center gap-1">
                  <Plus className="h-3.5 w-3.5" /> Agregar
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-stone-200 p-3 space-y-2">
              <p className="text-xs font-semibold text-stone-700 inline-flex items-center gap-1.5">
                <Wallet className="h-3.5 w-3.5 text-stone-700" /> Agregar caja (manual)
              </p>
              <div className="grid gap-2 sm:grid-cols-[1fr_8rem_auto] sm:items-end">
                <label>
                  <span className={ADMIN_FORM_LABEL_CLASS}>Descripción</span>
                  <input
                    id={draftManualId}
                    value={manualDescription}
                    onChange={(e) => setManualDescription(e.target.value.slice(0, 200))}
                    className={ADMIN_FORM_FIELD_COMPACT}
                    placeholder="Ej. producto sin catálogo, ajuste…"
                    maxLength={200}
                  />
                </label>
                <label>
                  <span className={ADMIN_FORM_LABEL_CLASS}>Monto</span>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={manualAmount}
                    onChange={(e) => setManualAmount(e.target.value)}
                    className={ADMIN_FORM_FIELD_COMPACT}
                  />
                </label>
                <button type="button" onClick={handleAddManual} className="btn-admin-outline text-sm inline-flex items-center gap-1">
                  <Plus className="h-3.5 w-3.5" /> Agregar
                </button>
              </div>
            </div>

            <div className="space-y-2">
              {lines.length === 0 ? (
                <p className="py-4 text-center text-sm text-stone-500">Aún no hay líneas en el cobro.</p>
              ) : (
                lines.map((line) => (
                  <div
                    key={line.key}
                    className="flex items-start justify-between gap-3 rounded-xl border border-stone-200 bg-stone-50/80 px-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-500">
                        {line.type === 'service' ? 'Servicio' : line.type === 'product' ? 'Producto' : 'Caja'}
                      </p>
                      <p className="text-sm font-medium text-stone-900 truncate">{line.label}</p>
                      <p className="text-xs text-stone-500">
                        {line.type === 'product'
                          ? `${formatPaymentAmount(line.unitPrice)} × ${line.quantity}`
                          : formatPaymentAmount(line.unitPrice)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-sm font-semibold tabular-nums text-stone-900">
                        {formatPaymentAmount((Number(line.unitPrice) || 0) * (Number(line.quantity) || 1))}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeLine(line.key)}
                        className="rounded-lg border border-stone-200 p-1.5 text-stone-500 hover:bg-white hover:text-rose-700"
                        aria-label="Quitar línea"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex items-center justify-between border-t border-stone-100 pt-3">
              <span className="text-sm font-semibold text-stone-600">Total del cobro</span>
              <span className="font-serif text-xl font-medium text-gold tabular-nums">
                {formatPaymentAmount(cartTotal)}
              </span>
            </div>
          </div>
        </AdminFormCard>

        <AdminFormCard>
          <AdminFormCardHeader title="Notas" />
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value.slice(0, 500))}
            rows={2}
            maxLength={500}
            placeholder="Opcional: detalle del cobro…"
            className={`${ADMIN_FORM_FIELD_COMPACT} resize-none`}
          />
        </AdminFormCard>

        <AdminFormFooterActions>
          <AdminFormPrimaryButton disabled={loading || lines.length === 0}>
            <AdminFormLoadingButton loading={loading} loadingLabel="Registrando…">
              Confirmar cobro
            </AdminFormLoadingButton>
          </AdminFormPrimaryButton>
        </AdminFormFooterActions>
      </form>
    </AdminFormShell>
  );
}

export default PaymentForm;
