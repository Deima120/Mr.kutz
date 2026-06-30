/**
 * Formulario para registrar pago (cita, inventario o caja libre)
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CalendarCheck, Package, Wallet } from 'lucide-react';
import * as paymentService from '@/features/payments/services/paymentService';
import * as appointmentService from '@/features/appointments/services/appointmentService';
import * as productService from '@/features/inventory/services/productService';
import { formatAppointmentClockTime, extractAppointmentDateYmd } from '@/shared/utils/appointmentTime';
import { formatPaymentAmount, formatPaymentMethodName } from '@/features/payments/utils/paymentFormatters';
import { validatePaymentForm, getApiErrorMessage, validateMoney, validatePositiveInt } from '@/shared/utils/formValidation';
import { useFormValidation } from '@/shared/hooks/useFormValidation';
import { AdminFormField } from '@/shared/components/FormValidationFields';
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

const PAYMENT_MODES = [
  { id: 'service', label: 'Servicio', icon: CalendarCheck },
  { id: 'product', label: 'Producto', icon: Package },
  { id: 'cash', label: 'Caja', icon: Wallet },
];

function generatePaymentReference() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `MKP-${yyyy}${mm}${dd}-${random}`;
}

export function PaymentForm({
  embedded = false,
  contained = false,
  onSuccess,
  onCancel,
  prefillProductId: prefillProductIdProp = null,
  prefillAppointmentId: prefillAppointmentIdProp = null,
}) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const prefillProductId = prefillProductIdProp ?? searchParams.get('productId');
  const prefillAppointmentId = prefillProductId ? null : (prefillAppointmentIdProp ?? searchParams.get('appointmentId'));

  const [methods, setMethods] = useState([]);
  const [completedAppointments, setCompletedAppointments] = useState([]);
  const [products, setProducts] = useState([]);
  const [paymentMode, setPaymentMode] = useState(prefillProductId ? 'product' : prefillAppointmentId ? 'service' : 'service');

  const [formData, setFormData] = useState({
    amount: '',
    paymentMethodId: '',
    appointmentId: '',
    productId: '',
    reference: generatePaymentReference(),
    notes: '',
  });
  const [productQty, setProductQty] = useState('1');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [saleProduct, setSaleProduct] = useState(null);
  const [productLoadError, setProductLoadError] = useState('');
  const [appointmentFromUrl, setAppointmentFromUrl] = useState(null);
  const [appointmentPrefillError, setAppointmentPrefillError] = useState('');
  const { fieldError, applyValidation, clearFieldError, markTouched, buildLiveHint } = useFormValidation();

  const amountValidation = useMemo(
    () => validateMoney(formData.amount, 'El monto', { required: true, min: 0.01 }),
    [formData.amount]
  );
  const methodValidation = useMemo(
    () =>
      formData.paymentMethodId
        ? { valid: true, message: '' }
        : { valid: false, message: 'Selecciona un método de pago.' },
    [formData.paymentMethodId]
  );
  const productValidation = useMemo(
    () =>
      formData.productId
        ? { valid: true, message: '' }
        : { valid: false, message: 'Selecciona un producto.' },
    [formData.productId]
  );
  const appointmentValidation = useMemo(
    () =>
      formData.appointmentId
        ? { valid: true, message: '' }
        : { valid: false, message: 'Selecciona la cita a cobrar.' },
    [formData.appointmentId]
  );
  const qtyValidation = useMemo(() => {
    const base = validatePositiveInt(productQty, 'La cantidad', { required: true, min: 1 });
    if (!base.valid) return base;
    const max = saleProduct != null ? Number(saleProduct.quantity) || 0 : 0;
    if (max > 0 && parseInt(productQty, 10) > max) {
      return { valid: false, message: `Stock insuficiente (máx. ${max}).` };
    }
    return { valid: true, message: '' };
  }, [productQty, saleProduct]);

  useEffect(() => {
    paymentService.getPaymentMethods().then((m) => setMethods(Array.isArray(m) ? m : []));
  }, []);

  useEffect(() => {
    if (prefillProductId) setPaymentMode('product');
    else if (prefillAppointmentId) setPaymentMode('service');
  }, [prefillProductId, prefillAppointmentId]);

  useEffect(() => {
    if (paymentMode !== 'product') return;
    productService
      .getProducts({ limit: 200 })
      .then((result) => setProducts(result?.data ?? []))
      .catch(() => setProducts([]));
  }, [paymentMode]);

  const loadProduct = (pid) => {
    if (!Number.isFinite(pid) || pid < 1) {
      setSaleProduct(null);
      setProductLoadError('Producto no válido.');
      return;
    }
    setProductLoadError('');
    productService
      .getProductById(pid)
      .then((res) => setSaleProduct(res?.data ?? res))
      .catch(() => {
        setSaleProduct(null);
        setProductLoadError('No se pudo cargar el producto.');
      });
  };

  useEffect(() => {
    if (!prefillProductId) return;
    const pid = parseInt(prefillProductId, 10);
    setFormData((prev) => ({ ...prev, productId: String(pid) }));
    loadProduct(pid);
  }, [prefillProductId]);

  useEffect(() => {
    if (prefillProductId) return;
    if (!prefillAppointmentId) {
      setAppointmentFromUrl(null);
      setAppointmentPrefillError('');
      return;
    }
    const aid = parseInt(prefillAppointmentId, 10);
    if (!Number.isFinite(aid) || aid < 1) {
      setAppointmentPrefillError('Cita no válida.');
      return;
    }
    setAppointmentPrefillError('');
    appointmentService
      .getAppointmentById(aid)
      .then((row) => {
        const a = row?.data ?? row;
        if (!a) {
          setAppointmentPrefillError('Cita no encontrada.');
          return;
        }
        if (a.status !== 'completed') {
          setAppointmentPrefillError('La cita debe estar completada para cobrar.');
          return;
        }
        if (a.has_active_payment) {
          setAppointmentPrefillError('Esta cita ya tiene un pago registrado.');
          return;
        }
        setAppointmentFromUrl(a);
        const price = a.price ?? a.service_price;
        setFormData((prev) => ({
          ...prev,
          appointmentId: String(a.id),
          amount: price != null && !Number.isNaN(Number(price)) ? String(Number(price)) : prev.amount,
        }));
      })
      .catch(() => setAppointmentPrefillError('No se pudo cargar la cita.'));
  }, [prefillAppointmentId, prefillProductId]);

  useEffect(() => {
    if (paymentMode !== 'service') return;
    appointmentService
      .getAppointments({ status: 'completed', limit: 100 })
      .then((data) => setCompletedAppointments(data.appointments ?? []))
      .catch(() => setCompletedAppointments([]));
  }, [paymentMode]);

  useEffect(() => {
    if (!saleProduct) return;
    const unit = Number(saleProduct.retail_price);
    const q = Math.max(1, parseInt(productQty, 10) || 1);
    if (Number.isFinite(unit) && unit > 0) {
      setFormData((prev) => ({ ...prev, amount: (unit * q).toFixed(2) }));
    }
  }, [saleProduct, productQty]);

  const appointmentSelectRows = useMemo(() => {
    const rows = completedAppointments.filter((x) => !x?.has_active_payment);
    if (appointmentFromUrl && !rows.some((x) => x.id === appointmentFromUrl.id)) {
      if (!appointmentFromUrl?.has_active_payment) rows.unshift(appointmentFromUrl);
    }
    return rows;
  }, [completedAppointments, appointmentFromUrl]);

  const selectedAppointment = appointmentSelectRows.find(
    (a) => a.id === parseInt(formData.appointmentId, 10)
  ) || appointmentFromUrl;

  const selectedMethod = methods.find((m) => String(m.id) === String(formData.paymentMethodId));

  const handleModeChange = (mode) => {
    setPaymentMode(mode);
    setError('');
    setProductLoadError('');
    if (mode !== 'product') {
      setSaleProduct(null);
      setFormData((prev) => ({ ...prev, productId: '' }));
    }
    if (mode !== 'service') {
      setFormData((prev) => ({ ...prev, appointmentId: '' }));
    }
  };

  const handleProductSelect = (e) => {
    const idSel = e.target.value;
    setFormData((prev) => ({ ...prev, productId: idSel }));
    if (idSel) loadProduct(parseInt(idSel, 10));
    else setSaleProduct(null);
  };

  const handleAppointmentSelect = (e) => {
    const idSel = e.target.value;
    const apt = appointmentSelectRows.find((a) => a.id === parseInt(idSel, 10));
    const p = apt?.price ?? apt?.service_price;
    setFormData((prev) => ({
      ...prev,
      appointmentId: idSel || '',
      amount: idSel && p != null && !Number.isNaN(Number(p)) ? String(Number(p)) : prev.amount,
    }));
  };

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
    clearFieldError(e.target.name);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validation = validatePaymentForm(formData, paymentMode, {
      saleProduct,
      productQty,
      appointmentSelectRows,
    });
    if (!applyValidation(validation)) {
      setError(validation.firstError);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const payload = {
        amount: parseFloat(formData.amount),
        paymentMethodId: parseInt(formData.paymentMethodId, 10),
        reference: formData.reference || undefined,
        notes: formData.notes.trim() || undefined,
      };

      if (paymentMode === 'product') {
        const q = Math.max(1, parseInt(productQty, 10) || 1);
        payload.productId = saleProduct.id;
        payload.productQuantity = q;
      } else if (paymentMode === 'service') {
        payload.appointmentId = parseInt(formData.appointmentId, 10);
      }

      await paymentService.createPayment(payload);
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

  const maxQty = saleProduct != null ? Math.max(0, Number(saleProduct.quantity) || 0) : undefined;

  const paymentAside = {
    kicker: 'Vista previa',
    title:
      paymentMode === 'product'
        ? 'Venta de producto'
        : paymentMode === 'service'
        ? 'Cobro de servicio'
        : 'Cobro en caja',
    subtitle: saleProduct?.name || selectedAppointment?.service_name || 'Completa los datos',
    bullets: [],
    statusLabel: 'Origen',
    statusValue:
      paymentMode === 'product' ? 'Inventario' : paymentMode === 'service' ? 'Cita completada' : 'Caja libre',
    children: (
      <AdminFormPreviewPanel>
        {saleProduct ? <AdminFormPreviewField label="Producto" value={saleProduct.name} /> : null}
        {selectedAppointment && paymentMode === 'service' ? (
          <AdminFormPreviewField
            label="Cliente"
            value={`${selectedAppointment.client_first_name || ''} ${selectedAppointment.client_last_name || ''}`.trim()}
          />
        ) : null}
        <AdminFormPreviewField
          label="Monto"
          value={formData.amount ? formatPaymentAmount(formData.amount) : ''}
        />
        <AdminFormPreviewField label="Método" value={formatPaymentMethodName(selectedMethod?.description || selectedMethod?.name)} />
        <AdminFormPreviewField label="Referencia" value={formData.reference} breakAll />
        {formData.notes ? <AdminFormPreviewField label="Notas" value={formData.notes} multiline /> : null}
      </AdminFormPreviewPanel>
    ),
  };

  return (
    <AdminFormShell
      backTo="/payments"
      backLabel={contained ? 'Volver al listado' : 'Pagos'}
      onBackClick={embedded || contained ? handleCancel : undefined}
      modeBadge="Registro"
      fullBleed={!embedded && !contained}
      compact={embedded || contained}
      contained={contained}
      showBackNav={true}
      aside={paymentAside}
    >
      <AdminFormCard onSubmit={handleSubmit}>
        <AdminFormCardHeader eyebrow="Cobro" title="Registrar pago" />

        {error && <div className={ADMIN_FORM_ERROR_CLASS} role="alert">{error}</div>}
        {productLoadError && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 text-amber-900 text-xs py-2 px-2.5 shrink-0">
            {productLoadError}
          </div>
        )}
        {appointmentPrefillError && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 text-amber-900 text-xs py-2 px-2.5 shrink-0">
            {appointmentPrefillError}
          </div>
        )}
        {appointmentFromUrl && paymentMode === 'service' && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-900 text-xs py-2 px-2.5 shrink-0">
            Cobro sugerido:{' '}
            <span className="font-semibold">
              {appointmentFromUrl.client_first_name} {appointmentFromUrl.client_last_name} — {appointmentFromUrl.service_name}
            </span>
          </div>
        )}

        <div className="flex flex-wrap gap-2 shrink-0">
          {PAYMENT_MODES.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => handleModeChange(id)}
              disabled={!!prefillProductId && id !== 'product'}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                paymentMode === id
                  ? 'border-barber-dark bg-barber-dark text-white'
                  : 'border-stone-200 bg-white text-stone-700 hover:border-gold/40'
              } disabled:opacity-50`}
            >
              <Icon className="w-3.5 h-3.5" aria-hidden />
              {label}
            </button>
          ))}
        </div>

        {paymentMode === 'service' && (
          <AdminFormField
            label="Cita completada"
            required
            error={fieldError('appointmentId')}
            live={buildLiveHint('appointmentId', formData.appointmentId, appointmentValidation, 'Cita seleccionada.')}
          >
            {({ invalid, errorId, liveBorderClass, submitBorderClass }) =>
              appointmentSelectRows.length > 0 ? (
                <select
                  name="appointmentId"
                  value={formData.appointmentId}
                  onChange={handleAppointmentSelect}
                  onBlur={() => markTouched('appointmentId')}
                  className={`${ADMIN_FORM_FIELD_COMPACT} ${submitBorderClass || liveBorderClass}`}
                  aria-invalid={invalid || undefined}
                  aria-describedby={errorId}
                >
                  <option value="">Seleccionar cita…</option>
                  {appointmentSelectRows.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.client_first_name} {a.client_last_name} — {a.service_name} — $
                      {a.price ?? a.service_price ?? 0} — {extractAppointmentDateYmd(a.appointment_date)}{' '}
                      {formatAppointmentClockTime(a.start_time)}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="text-xs text-stone-500 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2">
                  No hay citas completadas pendientes de cobro.
                </p>
              )
            }
          </AdminFormField>
        )}

        {paymentMode === 'product' && (
          <div className="space-y-2 shrink-0">
            <AdminFormField
              label="Producto"
              required
              error={fieldError('productId')}
              live={buildLiveHint('productId', formData.productId, productValidation, 'Producto seleccionado.')}
            >
              {({ invalid, errorId, liveBorderClass, submitBorderClass }) => (
                <select
                  name="productId"
                  value={formData.productId}
                  onChange={handleProductSelect}
                  onBlur={() => markTouched('productId')}
                  className={`${ADMIN_FORM_FIELD_COMPACT} ${submitBorderClass || liveBorderClass}`}
                  disabled={!!prefillProductId}
                  aria-invalid={invalid || undefined}
                  aria-describedby={errorId}
                >
                <option value="">Seleccionar producto…</option>
                {products
                  .filter((p) => (p.quantity ?? 0) > 0)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}{p.sku ? ` · ${p.sku}` : ''} — Stock {p.quantity ?? 0}
                    </option>
                  ))}
                </select>
              )}
            </AdminFormField>
            {saleProduct && (
              <div className="rounded-lg border border-stone-200 bg-stone-50/90 px-3 py-2 text-xs text-stone-600">
                Stock: <strong>{saleProduct.quantity ?? 0}</strong>
                {saleProduct.retail_price != null && Number(saleProduct.retail_price) > 0 ? (
                  <> · Precio: {formatPaymentAmount(saleProduct.retail_price)}</>
                ) : (
                  <> · Indica el monto manualmente</>
                )}
              </div>
            )}
            {saleProduct && (
              <AdminFormField
                label="Cantidad"
                required
                error={fieldError('productQty')}
                live={buildLiveHint('productQty', productQty, qtyValidation, 'Cantidad válida.')}
              >
                {({ invalid, errorId, liveBorderClass, submitBorderClass }) => (
                  <input
                    type="number"
                    min={1}
                    max={maxQty > 0 ? maxQty : undefined}
                    value={productQty}
                    onChange={(e) => {
                      setProductQty(e.target.value);
                      setError('');
                      clearFieldError('productQty');
                    }}
                    onBlur={() => markTouched('productQty')}
                    className={`${ADMIN_FORM_FIELD_COMPACT} ${submitBorderClass || liveBorderClass}`}
                    aria-invalid={invalid || undefined}
                    aria-describedby={errorId}
                  />
                )}
              </AdminFormField>
            )}
          </div>
        )}

        <div className={ADMIN_FORM_GRID_CLASS}>
          <AdminFormField
            label="Monto ($)"
            htmlFor="payment-amount"
            required
            error={fieldError('amount')}
            live={buildLiveHint('amount', formData.amount, amountValidation, 'Monto válido.')}
          >
            {({ invalid, errorId, liveBorderClass, submitBorderClass }) => (
              <input
                id="payment-amount"
                name="amount"
                type="number"
                step="0.01"
                min="0"
                value={formData.amount}
                onChange={handleChange}
                onBlur={() => markTouched('amount')}
                className={`${ADMIN_FORM_FIELD_COMPACT} ${submitBorderClass || liveBorderClass}`}
                aria-invalid={invalid || undefined}
                aria-describedby={errorId}
              />
            )}
          </AdminFormField>
          <AdminFormField
            label="Método de pago"
            required
            error={fieldError('paymentMethodId')}
            live={buildLiveHint('paymentMethodId', formData.paymentMethodId, methodValidation, 'Método seleccionado.')}
          >
            {({ invalid, errorId, liveBorderClass, submitBorderClass }) => (
              <select
                name="paymentMethodId"
                value={formData.paymentMethodId}
                onChange={handleChange}
                onBlur={() => markTouched('paymentMethodId')}
                className={`${ADMIN_FORM_FIELD_COMPACT} ${submitBorderClass || liveBorderClass}`}
                aria-invalid={invalid || undefined}
                aria-describedby={errorId}
              >
              <option value="">Seleccionar…</option>
              {methods.map((m) => (
                <option key={m.id} value={m.id}>
                  {formatPaymentMethodName(m.description || m.name)}
                </option>
              ))}
              </select>
            )}
          </AdminFormField>
        </div>

        <div className="group">
          <label className={ADMIN_FORM_LABEL_CLASS}>Referencia</label>
          <div className="flex gap-2">
            <input
              name="reference"
              value={formData.reference}
              onChange={handleChange}
              placeholder="Nº operación, folio…"
              className={ADMIN_FORM_FIELD_COMPACT}
            />
            <button
              type="button"
              onClick={() => setFormData((prev) => ({ ...prev, reference: generatePaymentReference() }))}
              className="px-3 rounded-lg border border-stone-300 text-xs text-stone-700 hover:bg-stone-50 shrink-0"
            >
              Generar
            </button>
          </div>
        </div>

        <div className="group">
          <label className={ADMIN_FORM_LABEL_CLASS}>Notas internas</label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows={2}
            maxLength={500}
            placeholder="Opcional: detalle del cobro, observaciones…"
            className={`${ADMIN_FORM_FIELD_COMPACT} resize-none`}
          />
        </div>

        <AdminFormFooterActions className="mt-1">
          <AdminFormPrimaryButton disabled={loading}>
            <AdminFormLoadingButton loading={loading} loadingLabel="Registrando…">
              Registrar pago
            </AdminFormLoadingButton>
          </AdminFormPrimaryButton>
        </AdminFormFooterActions>
      </AdminFormCard>
    </AdminFormShell>
  );
}

export default function PaymentFormPage() {
  return <PaymentForm />;
}
