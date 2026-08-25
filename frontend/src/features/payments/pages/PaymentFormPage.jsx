/**
 * Carrito de venta: servicio + producto(s) + línea manual en un solo registro.
 */

import { useState, useEffect, useMemo, useId } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CalendarCheck, Package, Wallet, Plus, Trash2 } from 'lucide-react';
import * as paymentService from '@/features/payments/services/paymentService';
import * as appointmentService from '@/features/appointments/services/appointmentService';
import * as productService from '@/features/inventory/services/productService';
import { formatAppointmentClockTime, extractAppointmentDateYmd } from '@/shared/utils/appointmentTime';
import { blockNonDigitKeys, formatMoneyInputDigits, parseMoneyInput } from '@/shared/utils/money';
import { formatPaymentAmount, formatPaymentMethodName, isPaymentMethodCash } from '@/features/payments/utils/paymentFormatters';
import {
  SPLIT_SOURCE_AUTO,
  addMethodSplitRow,
  allocateMethodSplitAmounts,
  methodSplitAllocationStatus,
  removeMethodSplitRow,
  setMethodSplitManualAmount,
} from '@/features/payments/utils/allocateMethodSplitAmounts';
import {
  validatePaymentCartForm,
  validateAmountTendered,
  getApiErrorMessage,
  validatePositiveInt,
} from '@/shared/utils/formValidation';
import { FieldErrorMessage } from '@/shared/components/FormValidationFields';
import CustomSelect from '@/shared/components/CustomSelect';
import { onCustomSelectValue } from '@/shared/utils/customSelectAdapters';
import ProductPicker from '@/features/inventory/components/ProductPicker';
import AppInlineAlert from '@/shared/feedback/AppInlineAlert';
import { useCashRegisterOptional } from '@/features/cash-registers/CashRegisterContext';
import AdminFormShell, {
  AdminFormCard,
  AdminFormCardHeader,
  ADMIN_FORM_FIELD_COMPACT,
  ADMIN_FORM_LABEL_CLASS,
  ADMIN_FORM_GRID_CLASS,
  AdminFormFooterActions,
  AdminFormPrimaryButton,
  AdminFormSecondaryButton,
  AdminFormPreviewField,
  AdminFormPreviewPanel,
  AdminFormLoadingButton,
} from '@/shared/components/admin/AdminFormShell';

function lineKey() {
  return `L-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function methodRowKey() {
  return `M-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function emptyMethodRow() {
  return {
    key: methodRowKey(),
    paymentMethodId: '',
    amount: '',
    source: SPLIT_SOURCE_AUTO,
  };
}

function toAmountDisplay(n) {
  if (!Number.isFinite(n)) return '';
  const rounded = Math.round(n);
  if (rounded === 0) return '';
  const formatted = formatMoneyInputDigits(String(Math.abs(rounded)));
  return rounded < 0 ? `-${formatted}` : formatted;
}

function rowsForAllocator(rows) {
  return (rows || []).map((row) => {
    const parsed = parseMoneyInput(row.amount);
    return {
      key: row.key,
      paymentMethodId: row.paymentMethodId,
      amount: Number.isFinite(parsed) ? parsed : 0,
      source: row.source === 'manual' ? 'manual' : 'auto',
    };
  });
}

function displayRowsFromAllocated(allocated) {
  return allocated.map((row) => ({
    key: row.key,
    paymentMethodId: row.paymentMethodId ?? '',
    source: row.source,
    amount: toAmountDisplay(row.amount),
  }));
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
  const cashRegister = useCashRegisterOptional();
  const canCharge = cashRegister ? Boolean(cashRegister.canCharge) : true;
  const cashLoading = Boolean(cashRegister?.loading);
  const prefillProductId = prefillProductIdProp ?? searchParams.get('productId');
  const prefillAppointmentId = prefillAppointmentIdProp ?? searchParams.get('appointmentId');
  const draftManualId = useId();
  const tenderedErrorId = useId();

  const [methodsLocal, setMethodsLocal] = useState([]);
  const methods = Array.isArray(methodsProp) && methodsProp.length ? methodsProp : methodsLocal;

  const [lines, setLines] = useState([]);
  const [methodRows, setMethodRows] = useState([emptyMethodRow()]);
  const [amountTendered, setAmountTendered] = useState('');
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

  // Recalcula autos cuando cambia el total (1 método = total; mixto = solo filas auto).
  useEffect(() => {
    setMethodRows((prev) => {
      const allocated = allocateMethodSplitAmounts({
        total: cartTotal,
        rows: rowsForAllocator(prev),
      });
      const next = displayRowsFromAllocated(allocated);
      const same =
        prev.length === next.length &&
        prev.every(
          (row, i) =>
            row.key === next[i].key &&
            row.amount === next[i].amount &&
            row.source === next[i].source &&
            String(row.paymentMethodId) === String(next[i].paymentMethodId)
        );
      return same ? prev : next;
    });
  }, [cartTotal]);

  const allocationStatus = useMemo(
    () => methodSplitAllocationStatus(cartTotal, rowsForAllocator(methodRows)),
    [cartTotal, methodRows]
  );

  const cashPortion = useMemo(() => {
    return methodRows.reduce((sum, row) => {
      const method = methods.find((m) => String(m.id) === String(row.paymentMethodId));
      if (!isPaymentMethodCash(method)) return sum;
      const amount = parseMoneyInput(row.amount);
      return sum + (Number.isFinite(amount) ? amount : 0);
    }, 0);
  }, [methodRows, methods]);

  const hasCashMethodSelected = useMemo(
    () =>
      methodRows.some((row) => {
        const method = methods.find((m) => String(m.id) === String(row.paymentMethodId));
        return isPaymentMethodCash(method);
      }),
    [methodRows, methods]
  );

  const tenderedNum = parseMoneyInput(amountTendered);
  const changePreview = (() => {
    if (!hasCashMethodSelected || !(cashPortion > 0)) return null;
    if (!String(amountTendered).trim()) return 0;
    if (!Number.isFinite(tenderedNum)) return null;
    return Math.round((tenderedNum - cashPortion) * 100) / 100;
  })();

  useEffect(() => {
    if (!hasCashMethodSelected && amountTendered) setAmountTendered('');
  }, [hasCashMethodSelected, amountTendered]);

  /**
   * Validación en vivo del efectivo recibido: misma regla que aplica el envío
   * (validatePaymentCartForm reutiliza esta función), pero evaluada mientras se
   * teclea para no obligar al cajero a pulsar «Registrar pago» para enterarse.
   */
  const tenderedValidation = useMemo(
    () => validateAmountTendered({ amountTendered, cashAmount: cashPortion }),
    [amountTendered, cashPortion]
  );

  /** Solo se avisa si ya escribió algo: en blanco significa pago exacto. */
  const showTenderedError =
    hasCashMethodSelected &&
    String(amountTendered).trim() !== '' &&
    !tenderedValidation.valid;

  const methodLabelSummary = useMemo(() => {
    const parts = methodRows
      .map((row) => {
        const method = methods.find((m) => String(m.id) === String(row.paymentMethodId));
        if (!method) return null;
        return formatPaymentMethodName(method.description || method.name);
      })
      .filter(Boolean);
    if (parts.length === 0) return '—';
    return parts.join(' + ');
  }, [methodRows, methods]);

  const addMethodRow = () => {
    if (methodRows.length >= methods.length) return;
    setMethodRows((prev) => {
      const allocated = addMethodSplitRow({
        total: cartTotal,
        rows: rowsForAllocator(prev),
        newRow: {
          key: methodRowKey(),
          paymentMethodId: '',
          amount: 0,
          source: SPLIT_SOURCE_AUTO,
        },
      });
      // Conservar paymentMethodId de filas previas (el allocator ya los trae).
      return displayRowsFromAllocated(allocated);
    });
    setError('');
  };

  const removeMethodRow = (key) => {
    setMethodRows((prev) => {
      if (prev.length <= 1) return prev;
      const allocated = removeMethodSplitRow({
        total: cartTotal,
        rows: rowsForAllocator(prev),
        key,
      });
      return displayRowsFromAllocated(allocated);
    });
    setError('');
  };

  const updateMethodRowMethod = (key, paymentMethodId) => {
    setMethodRows((prev) =>
      prev.map((row) => (row.key === key ? { ...row, paymentMethodId } : row))
    );
    setError('');
  };

  const updateMethodRowAmount = (key, displayValue) => {
    const formatted = formatMoneyInputDigits(displayValue);
    const parsed = parseMoneyInput(formatted);
    setMethodRows((prev) => {
      const allocated = setMethodSplitManualAmount({
        total: cartTotal,
        rows: rowsForAllocator(prev),
        key,
        amount: Number.isFinite(parsed) ? parsed : 0,
      });
      return allocated.map((row) => {
        if (row.key === key) {
          const prevRow = prev.find((p) => p.key === key);
          return {
            key: row.key,
            paymentMethodId: prevRow?.paymentMethodId ?? row.paymentMethodId ?? '',
            source: 'manual',
            // Mantener lo que el usuario está escribiendo (no reformatear a mitad de tipeo).
            amount: formatted,
          };
        }
        const prevRow = prev.find((p) => p.key === row.key);
        return {
          key: row.key,
          paymentMethodId: prevRow?.paymentMethodId ?? row.paymentMethodId ?? '',
          source: row.source,
          amount: toAmountDisplay(row.amount),
        };
      });
    });
    setError('');
  };

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
          return setPrefillHints((h) => [...h, 'Esta cita ya tiene una venta activa.']);
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
      setError('Selecciona una cita completada pendiente de venta.');
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
      setError('Ese producto ya está en la venta. Quita la línea o ajusta la cantidad.');
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

  /**
   * La línea de caja se valida en vivo y el botón «Agregar» queda deshabilitado
   * hasta que sea válida. El campo Monto solo admite dígitos (ver
   * `blockNonDigitKeys` + `formatMoneyInputDigits`), así que no hay avisos de
   * "símbolo no permitido" ni de monto inválido: simplemente no se puede escribir.
   */
  const manualAmountNum = parseMoneyInput(manualAmount);
  const canAddManual =
    String(manualDescription).trim() !== '' &&
    Number.isFinite(manualAmountNum) &&
    manualAmountNum > 0;

  const handleAddManual = () => {
    if (!canAddManual) return;
    const description = String(manualDescription).trim();
    addLine({
      type: 'manual',
      description,
      label: description,
      unitPrice: parseMoneyInput(manualAmount),
      quantity: 1,
    });
    setManualDescription('');
    setManualAmount('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (cashRegister && !canCharge) {
      setError('No hay caja abierta. Abre la caja antes de registrar cobros.');
      return;
    }
    const methodSplits = methodRows.map((row) => ({
      paymentMethodId: row.paymentMethodId,
      amount: row.amount,
    }));
    const validation = validatePaymentCartForm({
      methodSplits,
      amountTendered: hasCashMethodSelected ? amountTendered : undefined,
      cartTotal,
      methods,
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
      const payload = {
        notes: notes.trim() || undefined,
        methodSplits: methodRows.map((row) => ({
          paymentMethodId: parseInt(row.paymentMethodId, 10),
          amount: parseMoneyInput(row.amount),
        })),
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
      };
      if (hasCashMethodSelected && String(amountTendered).trim() !== '') {
        payload.amountTendered = parseMoneyInput(amountTendered);
      }
      await paymentService.createPayment(payload);
      await cashRegister?.refresh?.({ silent: true });
      if (embedded) onSuccess?.({ created: true });
      else navigate('/payments', { replace: true });
    } catch (err) {
      if (err?.reason === 'NO_OPEN_CASH_REGISTER') {
        setError(err.message || 'No hay caja abierta. Abre la caja antes de registrar cobros.');
        cashRegister?.refresh?.();
      } else {
        setError(getApiErrorMessage(err, 'Error al registrar venta'));
      }
    } finally {
      setLoading(false);
    }
  };

  const isMixedMethodsUi = methodRows.length > 1;

  const paymentStatusLabel = (() => {
    if (!isMixedMethodsUi) return 'Cobro completo';
    if (allocationStatus.kind === 'complete') return 'Completo';
    if (allocationStatus.kind === 'short') {
      return `Falta ${formatPaymentAmount(allocationStatus.remaining)}`;
    }
    return `Sobran ${formatPaymentAmount(allocationStatus.remaining)}`;
  })();

  const paymentStatusTone =
    !isMixedMethodsUi || allocationStatus.kind === 'complete' ? 'ok' : 'warn';

  const handleCancel = () => {
    if (embedded || contained) onCancel?.();
    else navigate('/payments', { replace: true });
  };

  const paymentAside = {
    kicker: 'Cobro',
    title: 'Total a pagar',
    // Resumen colapsado de la barra flotante en móvil.
    barValue: formatPaymentAmount(cartTotal),
    barHint:
      lines.length === 0
        ? 'Primero arma el carrito'
        : `${lines.length} línea${lines.length === 1 ? '' : 's'} · ${paymentStatusLabel}`,
    children: (
      <AdminFormPreviewPanel>
        <div>
          <p className="font-serif text-2xl sm:text-4xl font-medium text-gold tabular-nums leading-none tracking-tight break-all">
            {formatPaymentAmount(cartTotal)}
          </p>
          <p className="mt-2 text-xs text-stone-400">
            {lines.length === 0
              ? 'Primero arma el carrito'
              : isMixedMethodsUi
                ? 'Pago mixto'
                : 'Un solo método'}
          </p>
        </div>
        <AdminFormPreviewField
          label="Forma de pago"
          value={lines.length === 0 ? '—' : methodLabelSummary}
        />
        <AdminFormPreviewField
          label="Estado"
          value={lines.length === 0 ? '—' : paymentStatusLabel}
        />
        {hasCashMethodSelected ? (
          <>
            <AdminFormPreviewField
              label="En efectivo"
              value={formatPaymentAmount(cashPortion)}
            />
            <AdminFormPreviewField
              label="Vuelto"
              value={
                changePreview != null
                  ? formatPaymentAmount(Math.max(0, changePreview))
                  : formatPaymentAmount(0)
              }
            />
          </>
        ) : null}
      </AdminFormPreviewPanel>
    ),
  };

  return (
    <AdminFormShell
      embedded={embedded}
      contained={contained}
      showBackNav={false}
      aside={paymentAside}
      asideFloating
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {error ? (
          <div className="alert-error text-sm" role="alert">
            {error}
          </div>
        ) : null}
        {cashRegister && !cashLoading && !canCharge ? (
          <AppInlineAlert variant="warning" title="Caja cerrada" className="text-xs py-2 px-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p>Abre la caja del día para poder confirmar ventas.</p>
              <button
                type="button"
                onClick={() => cashRegister.requestOpen?.()}
                className="shrink-0 rounded-xl border border-amber-300/80 bg-white px-3 py-1.5 text-xs font-semibold text-amber-950 shadow-sm hover:bg-amber-50"
              >
                Abrir caja
              </button>
            </div>
          </AppInlineAlert>
        ) : null}
        {prefillHints.length > 0 ? (
          <AppInlineAlert variant="warning" className="text-xs py-2 px-3">
            {prefillHints.map((hint) => (
              <p key={hint}>{hint}</p>
            ))}
          </AppInlineAlert>
        ) : null}

        {/* 1) Carrito — qué se cobra */}
        <AdminFormCard>
          <AdminFormCardHeader eyebrow="Paso 1" title="Qué se cobra" />
          <div className="space-y-4 mt-1">
            <div className="space-y-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                <div className="flex-1 min-w-0">
                  <span className={ADMIN_FORM_LABEL_CLASS}>
                    <CalendarCheck className="inline h-3 w-3 mr-1 text-sky-700" />
                    Servicio (cita)
                  </span>
                  <CustomSelect
                    value={appointmentPick}
                    onChange={onCustomSelectValue(setAppointmentPick)}
                    variant="form"
                    options={appointmentOptions.map((a) => ({
                      id: String(a.id),
                      label: appointmentLabel(a),
                    }))}
                    placeholder={
                      appointmentOptions.length ? 'Cita completada…' : 'No hay citas pendientes'
                    }
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAddService}
                  className="btn-admin-outline text-sm inline-flex items-center gap-1 shrink-0"
                >
                  <Plus className="h-3.5 w-3.5" /> Agregar
                </button>
              </div>

              <div className="grid gap-2 sm:grid-cols-[1fr_5.5rem_auto] sm:items-end">
                <div className="min-w-0">
                  <span className={ADMIN_FORM_LABEL_CLASS}>
                    <Package className="inline h-3 w-3 mr-1 text-violet-700" />
                    Producto
                  </span>
                  <ProductPicker
                    value={productPick?.id ? String(productPick.id) : ''}
                    onChange={(id, product) => {
                      setProductPick(product || null);
                    }}
                  />
                </div>
                <label>
                  <span className={ADMIN_FORM_LABEL_CLASS}>Cant.</span>
                  {/* type=text + solo dígitos: type=number deja teclear «-», «+» y «e». */}
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    value={productQty}
                    onKeyDown={blockNonDigitKeys}
                    onChange={(e) => setProductQty(e.target.value.replace(/\D/g, ''))}
                    className={ADMIN_FORM_FIELD_COMPACT}
                    placeholder="1"
                  />
                </label>
                <button
                  type="button"
                  onClick={handleAddProduct}
                  className="btn-admin-outline text-sm inline-flex items-center gap-1"
                >
                  <Plus className="h-3.5 w-3.5" /> Agregar
                </button>
              </div>

              {/*
                Línea de caja (manual): cobro libre que no viene de una cita ni de un
                producto del inventario. Ver private/frontend/CLAUDE.md §«Línea de caja
                (manual)» para el detalle del flujo y sus límites.
              */}
              <div className="grid gap-2 sm:grid-cols-[1fr_8rem_auto] sm:items-end">
                <label>
                  <span className={ADMIN_FORM_LABEL_CLASS}>
                    <Wallet className="inline h-3 w-3 mr-1 text-stone-600" />
                    Caja (manual)
                  </span>
                  <input
                    id={draftManualId}
                    value={manualDescription}
                    onChange={(e) => setManualDescription(e.target.value.slice(0, 200))}
                    className={ADMIN_FORM_FIELD_COMPACT}
                    placeholder="Descripción…"
                    maxLength={200}
                  />
                </label>
                <label>
                  <span className={ADMIN_FORM_LABEL_CLASS}>Monto</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    value={manualAmount}
                    onKeyDown={blockNonDigitKeys}
                    onChange={(e) => setManualAmount(formatMoneyInputDigits(e.target.value))}
                    className={ADMIN_FORM_FIELD_COMPACT}
                    placeholder="0"
                  />
                </label>
                <button
                  type="button"
                  onClick={handleAddManual}
                  disabled={!canAddManual}
                  className="btn-admin-outline text-sm inline-flex items-center gap-1 disabled:opacity-40"
                >
                  <Plus className="h-3.5 w-3.5" /> Agregar
                </button>
                <p className="text-[11px] text-stone-500 sm:col-span-3">
                  Cobro suelto que no viene de una cita ni del inventario (recargo, propina,
                  servicio no catalogado). Requiere descripción y un monto mayor que cero.
                </p>
              </div>
            </div>

            <div className="border-t border-stone-100 pt-3 space-y-2">
              {lines.length === 0 ? (
                <p className="py-3 text-center text-sm text-stone-500">
                  Aún no hay líneas en la venta.
                </p>
              ) : (
                lines.map((line) => (
                  <div
                    key={line.key}
                    className="flex items-start justify-between gap-3 rounded-lg px-1 py-2 border-b border-stone-100 last:border-0"
                  >
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-500">
                        {line.type === 'service'
                          ? 'Servicio'
                          : line.type === 'product'
                            ? 'Producto'
                            : 'Caja'}
                      </p>
                      <p className="text-sm font-medium text-stone-900 truncate">{line.label}</p>
                      {line.type === 'product' ? (
                        <p className="text-xs text-stone-500">
                          {formatPaymentAmount(line.unitPrice)} × {line.quantity}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-sm font-semibold tabular-nums text-stone-900">
                        {formatPaymentAmount(
                          (Number(line.unitPrice) || 0) * (Number(line.quantity) || 1)
                        )}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeLine(line.key)}
                        className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-50 hover:text-rose-700"
                        aria-label="Quitar línea"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex items-end justify-between gap-3 rounded-xl bg-stone-50/90 border border-stone-100 px-4 py-3">
              <div>
                <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-stone-500">
                  Total a pagar
                </p>
                <p className="text-xs text-stone-500 mt-0.5">Suma de las líneas</p>
              </div>
              <p className="font-serif text-2xl sm:text-3xl font-medium text-gold tabular-nums leading-none tracking-tight break-all">
                {formatPaymentAmount(cartTotal)}
              </p>
            </div>
          </div>
        </AdminFormCard>

        {/* 2) Forma de pago — cómo se cobra */}
        <AdminFormCard>
          <AdminFormCardHeader eyebrow="Paso 2" title="Cómo se paga" />
          <div className="space-y-3 mt-1">
            {!isMixedMethodsUi ? (
              <div className="space-y-3">
                <label className="group block max-w-md">
                  <span className={ADMIN_FORM_LABEL_CLASS}>Método de pago *</span>
                  <CustomSelect
                    value={methodRows[0]?.paymentMethodId || ''}
                    onChange={onCustomSelectValue((v) =>
                      updateMethodRowMethod(methodRows[0].key, v)
                    )}
                    variant="form"
                    options={methods.map((m) => ({
                      id: String(m.id),
                      label: formatPaymentMethodName(m.description || m.name),
                    }))}
                    placeholder="Selecciona…"
                  />
                </label>
                <p className="text-sm text-stone-600">
                  Se cobra el total completo:{' '}
                  <span className="font-semibold tabular-nums text-stone-900">
                    {formatPaymentAmount(cartTotal)}
                  </span>
                </p>
                <button
                  type="button"
                  onClick={addMethodRow}
                  disabled={methods.length < 2 || cartTotal <= 0}
                  className="text-sm font-semibold text-gold-dark hover:text-barber-dark underline-offset-2 hover:underline disabled:opacity-40 disabled:no-underline"
                >
                  Dividir en otro método
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div
                  className={`flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm tabular-nums ${
                    paymentStatusTone === 'ok'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-100'
                      : 'bg-amber-50 text-amber-900 border border-amber-100'
                  }`}
                >
                  <span className="font-semibold">{paymentStatusLabel}</span>
                  <span className="text-xs opacity-80">
                    Total {formatPaymentAmount(cartTotal)}
                  </span>
                </div>

                {methodRows.map((row, index) => {
                  const usedElsewhere = new Set(
                    methodRows
                      .filter((r) => r.key !== row.key && r.paymentMethodId)
                      .map((r) => String(r.paymentMethodId))
                  );
                  const options = methods
                    .filter(
                      (m) =>
                        String(m.id) === String(row.paymentMethodId) ||
                        !usedElsewhere.has(String(m.id))
                    )
                    .map((m) => ({
                      id: String(m.id),
                      label: formatPaymentMethodName(m.description || m.name),
                    }));
                  return (
                    <div
                      key={row.key}
                      className="grid gap-2 sm:grid-cols-[1fr_8rem_auto] sm:items-end"
                    >
                      <label className="group min-w-0">
                        <span className={ADMIN_FORM_LABEL_CLASS}>Método {index + 1} *</span>
                        <CustomSelect
                          value={row.paymentMethodId}
                          onChange={onCustomSelectValue((v) =>
                            updateMethodRowMethod(row.key, v)
                          )}
                          variant="form"
                          options={options}
                          placeholder="Selecciona…"
                        />
                      </label>
                      <label className="group">
                        <span className={ADMIN_FORM_LABEL_CLASS}>
                          Monto *
                          {row.source === 'auto' ? (
                            <span className="ml-1 font-medium normal-case tracking-normal text-stone-400">
                              (resto)
                            </span>
                          ) : null}
                        </span>
                        <input
                          type="text"
                          inputMode="numeric"
                          autoComplete="off"
                          value={row.amount}
                          onKeyDown={blockNonDigitKeys}
                          onChange={(e) => updateMethodRowAmount(row.key, e.target.value)}
                          className={ADMIN_FORM_FIELD_COMPACT}
                          placeholder="0"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => removeMethodRow(row.key)}
                        className="rounded-lg border border-stone-200 p-2 text-stone-500 hover:bg-white hover:text-rose-700 self-end"
                        aria-label="Quitar método"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })}

                <button
                  type="button"
                  onClick={addMethodRow}
                  disabled={methods.length === 0 || methodRows.length >= methods.length}
                  className="btn-admin-outline text-sm inline-flex items-center gap-1"
                >
                  <Plus className="h-3.5 w-3.5" /> Agregar otro método
                </button>
              </div>
            )}

            {hasCashMethodSelected ? (
              <div className="rounded-xl border border-stone-200 bg-stone-50/80 p-3 space-y-2">
                <p className="text-xs font-semibold text-stone-700">Efectivo recibido</p>
                <div className={ADMIN_FORM_GRID_CLASS}>
                  <label className="group">
                    <span className={ADMIN_FORM_LABEL_CLASS}>Recibido</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                      value={amountTendered}
                      onKeyDown={blockNonDigitKeys}
                      onChange={(e) => setAmountTendered(formatMoneyInputDigits(e.target.value))}
                      className={`${ADMIN_FORM_FIELD_COMPACT} ${
                        showTenderedError ? '!border-red-400' : ''
                      }`}
                      placeholder={toAmountDisplay(cashPortion) || '0'}
                      aria-invalid={showTenderedError || undefined}
                      aria-describedby={showTenderedError ? tenderedErrorId : undefined}
                    />
                    {showTenderedError ? (
                      <FieldErrorMessage
                        message={tenderedValidation.message}
                        id={tenderedErrorId}
                      />
                    ) : (
                      <p className="mt-1 text-[11px] text-stone-500">
                        Asignado a efectivo: {formatPaymentAmount(cashPortion)}. Si dejas
                        Recibido vacío, se asume pago exacto. El vuelto no cambia los otros
                        métodos.
                      </p>
                    )}
                  </label>
                  <label className="group">
                    <span className={ADMIN_FORM_LABEL_CLASS}>Vuelto</span>
                    <input
                      value={
                        changePreview != null
                          ? formatPaymentAmount(Math.max(0, changePreview))
                          : formatPaymentAmount(0)
                      }
                      readOnly
                      disabled
                      className={`${ADMIN_FORM_FIELD_COMPACT} bg-white text-stone-800 cursor-default`}
                    />
                  </label>
                </div>
              </div>
            ) : null}

            <p className="text-[11px] text-stone-500">
              Folio MKP se asigna automáticamente al guardar.
            </p>
          </div>
        </AdminFormCard>

        <AdminFormCard>
          <AdminFormCardHeader title="Notas" />
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value.slice(0, 500))}
            rows={2}
            maxLength={500}
            placeholder="Opcional: detalle de la venta…"
            className={`${ADMIN_FORM_FIELD_COMPACT} resize-none`}
          />
        </AdminFormCard>

        <AdminFormFooterActions>
          <AdminFormSecondaryButton onClick={handleCancel} disabled={loading}>
            Cancelar
          </AdminFormSecondaryButton>
          <AdminFormPrimaryButton disabled={loading || lines.length === 0 || !canCharge || cashLoading}>
            <AdminFormLoadingButton loading={loading} loadingLabel="Registrando…">
              Confirmar venta
            </AdminFormLoadingButton>
          </AdminFormPrimaryButton>
        </AdminFormFooterActions>
      </form>
    </AdminFormShell>
  );
}

export default PaymentForm;
