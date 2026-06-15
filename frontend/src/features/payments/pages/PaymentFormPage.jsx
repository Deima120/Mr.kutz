/**
 * Formulario para registrar pago (cita completada o venta de inventario)
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import * as paymentService from '@/features/payments/services/paymentService';
import * as appointmentService from '@/features/appointments/services/appointmentService';
import * as productService from '@/features/inventory/services/productService';
import AdminFormShell, {
  AdminFormCard,
  AdminFormCardHeader,
  ADMIN_FORM_FIELD_COMPACT,
  ADMIN_FORM_LABEL_CLASS,
  ADMIN_FORM_ERROR_CLASS,
  ADMIN_FORM_GRID_CLASS,
  AdminFormFooterActions,
  AdminFormPrimaryButton,
  AdminFormSecondaryButton,
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

export function PaymentForm({
  embedded = false,
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
  const [formData, setFormData] = useState({
    amount: '',
    paymentMethodId: '',
    appointmentId: '',
    reference: generatePaymentReference(),
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [linkToAppointment, setLinkToAppointment] = useState(true);

  const [saleProduct, setSaleProduct] = useState(null);
  const [productQty, setProductQty] = useState('1');
  const [productLoadError, setProductLoadError] = useState('');
  const [appointmentFromUrl, setAppointmentFromUrl] = useState(null);
  const [appointmentPrefillError, setAppointmentPrefillError] = useState('');

  useEffect(() => {
    paymentService.getPaymentMethods().then((m) => {
      setMethods(Array.isArray(m) ? m : []);
    });
  }, []);

  useEffect(() => {
    if (!prefillProductId) {
      setSaleProduct(null);
      setProductLoadError('');
      return;
    }
    setAppointmentFromUrl(null);
    setAppointmentPrefillError('');
    const pid = parseInt(prefillProductId, 10);
    if (!Number.isFinite(pid) || pid < 1) {
      setProductLoadError('Producto no válido.');
      setSaleProduct(null);
      return;
    }
    setLinkToAppointment(false);
    setProductLoadError('');
    productService
      .getProductById(pid)
      .then((res) => {
        const p = res?.data ?? res;
        setSaleProduct(p);
      })
      .catch(() => {
        setSaleProduct(null);
        setProductLoadError('No se pudo cargar el producto.');
      });
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
      setAppointmentFromUrl(null);
      return;
    }
    setAppointmentPrefillError('');
    setLinkToAppointment(true);
    appointmentService
      .getAppointmentById(aid)
      .then((row) => {
        const a = row?.data ?? row;
        if (!a) {
          setAppointmentPrefillError('Cita no encontrada.');
          setAppointmentFromUrl(null);
          return;
        }
        if (a.status !== 'completed') {
          setAppointmentPrefillError(
            'La cita debe estar en estado completada para registrar el cobro. Vuelve a citas y márcala como completada primero.'
          );
          setAppointmentFromUrl(null);
          return;
        }
        if (a.has_active_payment) {
          setAppointmentPrefillError('Esta cita ya tiene un pago registrado.');
          setAppointmentFromUrl(null);
          return;
        }
        setAppointmentFromUrl(a);
        const price = a.price ?? a.service_price;
        setFormData((prev) => ({
          ...prev,
          appointmentId: String(a.id),
          amount:
            price != null && price !== '' && !Number.isNaN(Number(price))
              ? String(Number(price))
              : prev.amount,
        }));
      })
      .catch(() => {
        setAppointmentPrefillError('No se pudo cargar la cita.');
        setAppointmentFromUrl(null);
      });
  }, [prefillAppointmentId, prefillProductId]);

  useEffect(() => {
    if (!saleProduct) return;
    const unit = Number(saleProduct.retail_price);
    const q = Math.max(1, parseInt(productQty, 10) || 1);
    if (Number.isFinite(unit) && unit > 0) {
      setFormData((prev) => ({ ...prev, amount: (unit * q).toFixed(2) }));
    }
  }, [saleProduct, productQty]);

  useEffect(() => {
    if (saleProduct) return;
    if (linkToAppointment) {
      appointmentService
        .getAppointments({ status: 'completed', limit: 100 })
        .then((data) => {
          setCompletedAppointments(data.appointments ?? []);
        })
        .catch(() => setCompletedAppointments([]));
    } else {
      setCompletedAppointments([]);
      setFormData((prev) => ({ ...prev, appointmentId: '' }));
    }
  }, [linkToAppointment, saleProduct]);

  const appointmentSelectRows = useMemo(() => {
    const rows = completedAppointments.filter((x) => !x?.has_active_payment);
    if (appointmentFromUrl && !rows.some((x) => x.id === appointmentFromUrl.id)) {
      if (!appointmentFromUrl?.has_active_payment) rows.unshift(appointmentFromUrl);
    }
    return rows;
  }, [completedAppointments, appointmentFromUrl]);

  const handleAppointmentSelect = (e) => {
    const idSel = e.target.value;
    const apt = appointmentSelectRows.find((a) => a.id === parseInt(idSel, 10));
    const p = apt?.price ?? apt?.service_price;
    setFormData((prev) => ({
      ...prev,
      appointmentId: idSel || '',
      amount:
        idSel && p != null && p !== '' && !Number.isNaN(Number(p)) ? String(Number(p)) : prev.amount,
    }));
  };

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const payload = {
        amount: parseFloat(formData.amount),
        paymentMethodId: parseInt(formData.paymentMethodId, 10),
        reference: formData.reference || undefined,
      };
      if (saleProduct) {
        const q = Math.max(1, parseInt(productQty, 10) || 1);
        payload.productId = saleProduct.id;
        payload.productQuantity = q;
      } else if (linkToAppointment && formData.appointmentId) {
        payload.appointmentId = parseInt(formData.appointmentId, 10);
      }

      await paymentService.createPayment(payload);
      if (embedded) {
        onSuccess?.({ created: true });
      } else {
        navigate('/payments', { replace: true });
      }
    } catch (err) {
      setError(err?.message || 'Error al registrar pago');
    } finally {
      setLoading(false);
    }
  };

  const selectedMethod = methods.find((m) => String(m.id) === String(formData.paymentMethodId));

  const paymentAside = {
    kicker: 'Vista previa',
    title: saleProduct ? 'Venta de producto' : appointmentFromUrl ? 'Cobro de servicio' : 'Registro de pago',
    subtitle: saleProduct?.name || appointmentFromUrl?.service_name || 'Completa los datos',
    bullets: [],
    statusLabel: 'Origen',
    statusValue: saleProduct ? 'Inventario' : linkToAppointment && formData.appointmentId ? 'Cita completada' : 'Caja',
    children: (
      <AdminFormPreviewPanel>
        {saleProduct ? (
          <AdminFormPreviewField label="Producto" value={saleProduct.name} />
        ) : null}
        {appointmentFromUrl && !saleProduct ? (
          <AdminFormPreviewField
            label="Cliente"
            value={`${appointmentFromUrl.client_first_name || ''} ${appointmentFromUrl.client_last_name || ''}`.trim()}
          />
        ) : null}
        <AdminFormPreviewField
          label="Monto"
          value={formData.amount ? `$${parseFloat(formData.amount).toFixed(2)}` : ''}
        />
        <AdminFormPreviewField label="Método" value={selectedMethod?.name} />
        <AdminFormPreviewField label="Referencia" value={formData.reference} breakAll />
      </AdminFormPreviewPanel>
    ),
  };

  const maxQty = saleProduct != null ? Math.max(0, Number(saleProduct.quantity) || 0) : undefined;

  const handleCancel = () => {
    if (embedded) onCancel?.();
    else navigate(-1);
  };

  return (
    <AdminFormShell
      backTo="/payments"
      backLabel="Pagos"
      onBackClick={embedded ? handleCancel : undefined}
      modeBadge="Registro"
      fullBleed={!embedded}
      compact={embedded}
      showBackNav={!embedded}
      aside={paymentAside}
    >
      <AdminFormCard onSubmit={handleSubmit}>
          <AdminFormCardHeader eyebrow="Pago" title="Registrar pago" />

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
          {appointmentFromUrl && !saleProduct && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-900 text-xs py-2 px-2.5 shrink-0">
              Cobro sugerido para la cita que acabas de completar:{' '}
              <span className="font-semibold">
                {appointmentFromUrl.client_first_name} {appointmentFromUrl.client_last_name} —{' '}
                {appointmentFromUrl.service_name}
              </span>
              . Confirma método de pago y monto.
            </div>
          )}

          {saleProduct && (
            <div className="rounded-xl border border-stone-200 bg-stone-50/90 p-4 space-y-3 shrink-0">
              <p className="text-sm font-semibold text-stone-800">Venta desde inventario</p>
              <p className="text-sm text-stone-600">
                <span className="font-medium text-stone-900">{saleProduct.name}</span>
                {saleProduct.sku ? (
                  <span className="text-stone-500"> · SKU {saleProduct.sku}</span>
                ) : null}
              </p>
              <p className="text-[11px] text-stone-500">
                Stock disponible: <strong className="text-stone-700">{saleProduct.quantity ?? 0}</strong>
                {saleProduct.retail_price != null && Number(saleProduct.retail_price) > 0 ? (
                  <> · Precio unitario: ${Number(saleProduct.retail_price).toFixed(2)}</>
                ) : (
                  <> · Sin precio de venta en ficha: indica el monto manualmente</>
                )}
              </p>
              <div className="group max-w-[12rem]">
                <label className={ADMIN_FORM_LABEL_CLASS}>Cantidad *</label>
                <input
                  type="number"
                  min={1}
                  max={maxQty !== undefined && maxQty > 0 ? maxQty : undefined}
                  value={productQty}
                  onChange={(e) => {
                    setProductQty(e.target.value);
                    setError('');
                  }}
                  className={ADMIN_FORM_FIELD_COMPACT}
                  required
                />
              </div>
            </div>
          )}

          <label
            className={`flex items-center gap-2 shrink-0 ${saleProduct ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}
          >
            <input
              type="checkbox"
              checked={linkToAppointment && !saleProduct}
              disabled={!!saleProduct}
              onChange={(e) => setLinkToAppointment(e.target.checked)}
              className="rounded border-stone-300 text-gold focus:ring-gold/40"
            />
            <span className="text-sm text-stone-700">
              {saleProduct ? 'Venta de inventario (sin cita)' : 'Vincular a cita completada'}
            </span>
          </label>

          {!saleProduct && linkToAppointment && appointmentSelectRows.length > 0 && (
            <div className="group">
              <label className={ADMIN_FORM_LABEL_CLASS}>Cita</label>
              <select
                name="appointmentId"
                value={formData.appointmentId}
                onChange={handleAppointmentSelect}
                className={ADMIN_FORM_FIELD_COMPACT}
              >
                <option value="">Seleccionar cita…</option>
                {appointmentSelectRows.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.client_first_name} {a.client_last_name} — {a.service_name} — $
                    {a.price ?? a.service_price ?? 0} — {String(a.appointment_date).slice(0, 10)}{' '}
                    {(() => {
                      const t = a.start_time;
                      if (!t) return '';
                      if (t instanceof Date) {
                        const hh = String(t.getHours()).padStart(2, '0');
                        const mm = String(t.getMinutes()).padStart(2, '0');
                        return `${hh}:${mm}`;
                      }
                      const s = String(t);
                      const d = new Date(s);
                      if (!Number.isNaN(d.getTime()) && s.includes('T')) {
                        const hh = String(d.getHours()).padStart(2, '0');
                        const mm = String(d.getMinutes()).padStart(2, '0');
                        return `${hh}:${mm}`;
                      }
                      const iso = s.match(/T(\d{1,2}):(\d{2})/);
                      if (iso) return `${String(iso[1]).padStart(2, '0')}:${iso[2]}`;
                      const any = s.match(/(\d{1,2}):(\d{2})/);
                      if (any) return `${String(any[1]).padStart(2, '0')}:${any[2]}`;
                      return s.slice(0, 5);
                    })()}
                  </option>
                ))}
              </select>
            </div>
          )}
          {!saleProduct && linkToAppointment && appointmentSelectRows.length === 0 && (
            <div className="rounded-lg border border-stone-200 bg-stone-50 text-stone-600 text-xs py-2 px-2.5 shrink-0">
              No hay citas completadas pendientes de cobro.
            </div>
          )}

          <div className={ADMIN_FORM_GRID_CLASS}>
            <div className="group">
              <label className={ADMIN_FORM_LABEL_CLASS}>Monto ($) *</label>
              <input
                name="amount"
                type="number"
                step="0.01"
                min="0"
                value={formData.amount}
                onChange={handleChange}
                className={ADMIN_FORM_FIELD_COMPACT}
                required
              />
            </div>
            <div className="group">
              <label className={ADMIN_FORM_LABEL_CLASS}>Método de pago *</label>
              <select
                name="paymentMethodId"
                value={formData.paymentMethodId}
                onChange={handleChange}
                className={ADMIN_FORM_FIELD_COMPACT}
                required
              >
                <option value="">Seleccionar…</option>
                {methods.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.description ? `${m.name} — ${m.description}` : m.name}
                  </option>
                ))}
              </select>
            </div>
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
                onClick={() =>
                  setFormData((prev) => ({ ...prev, reference: generatePaymentReference() }))
                }
                className="px-3 rounded-lg border border-stone-300 text-xs text-stone-700 hover:bg-stone-50"
                title="Generar una nueva referencia"
              >
                Generar
              </button>
            </div>
            <p className="text-[11px] text-stone-500 mt-1">
              Puedes editarla. Si la dejas vacía, el servidor generará una automáticamente.
            </p>
          </div>

          <AdminFormFooterActions className="mt-1">
            <AdminFormPrimaryButton disabled={loading}>
              <AdminFormLoadingButton loading={loading} loadingLabel="Registrando…">
                Registrar pago
              </AdminFormLoadingButton>
            </AdminFormPrimaryButton>
            <AdminFormSecondaryButton onClick={handleCancel}>Cancelar</AdminFormSecondaryButton>
          </AdminFormFooterActions>
      </AdminFormCard>
    </AdminFormShell>
  );
}

export default function PaymentFormPage() {
  return <PaymentForm />;
}
