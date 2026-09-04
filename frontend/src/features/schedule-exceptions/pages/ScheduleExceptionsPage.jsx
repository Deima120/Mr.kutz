/**
 * Festivos y cierres (`/schedule-exceptions`).
 *
 * Muestra el año resuelto: los 18 festivos colombianos que el backend calcula,
 * más los cierres y horarios especiales cargados a mano, cada uno con el horario
 * con el que queda realmente el negocio ese día.
 *
 * La columna «Horario del negocio» es la que responde a la pregunta de siempre:
 * un festivo que cae en lunes se atiende 11:00-18:00, no 10:00-20:00. Ese cálculo
 * NO se hace aquí — llega ya resuelto en los campos `effective_*` desde
 * `backend/src/services/barberScheduleRules.js`, para que la regla viva en un
 * solo sitio y la pantalla no pueda contradecir a la agenda.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pencil, Trash2, X } from 'lucide-react';
import PageHeader from '@/shared/components/admin/PageHeader';
import DataCard from '@/shared/components/admin/DataCard';
import Table, {
  TableHead,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
} from '@/shared/components/admin/Table';
import AdminIconButton from '@/shared/components/admin/AdminIconButton';
import AdminConfirmModal from '@/shared/feedback/AdminConfirmModal';
import { FieldErrorMessage } from '@/shared/components/FormValidationFields';
import { useAppToast } from '@/shared/feedback/ToastContext';
import { getApiErrorMessage, validateScheduleExceptionForm } from '@/shared/utils/formValidation';
import * as scheduleExceptionService from '@/features/schedule-exceptions/services/scheduleExceptionService';

const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

const MESES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

/**
 * Los tres modos son excluyentes, y cada uno se traduce a una combinación
 * concreta de `isClosed` + horas que el backend ya entiende.
 */
const MODOS = [
  {
    value: 'closed',
    label: 'Cerrado',
    ayuda: 'La barbería no abre ese día. No se ofrece ningún turno.',
  },
  {
    value: 'hours',
    label: 'Horario especial',
    ayuda: 'Se atiende, pero en una franja distinta a la habitual.',
  },
  {
    value: 'normal',
    label: 'Día normal',
    ayuda: 'Se trabaja con el horario de siempre. Sirve para abrir un festivo.',
  },
];

const FORM_VACIO = { date: '', mode: 'closed', startTime: '', endTime: '', reason: '' };

/**
 * Fecha larga en español. No pasa por `new Date` a propósito: hacerlo
 * interpretaría el texto en la zona del navegador y podría mostrar el día
 * anterior, que es exactamente el error que este módulo vino a corregir.
 */
const fechaLarga = (ymd) => {
  const [, mes, dia] = String(ymd).split('-');
  return `${Number(dia)} de ${MESES[Number(mes) - 1] ?? ''}`;
};

/** Etiqueta de origen del día, para que se vea de dónde sale cada fila. */
function OrigenBadge({ source }) {
  const estilos = {
    festivo: 'border-amber-200 bg-amber-50 text-amber-800',
    'festivo+excepcion': 'border-indigo-200 bg-indigo-50 text-indigo-800',
    excepcion: 'border-sky-200 bg-sky-50 text-sky-800',
  };
  const textos = {
    festivo: 'Festivo',
    'festivo+excepcion': 'Festivo ajustado',
    excepcion: 'Cierre manual',
  };
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${
        estilos[source] ?? 'border-stone-200 bg-stone-100 text-stone-600'
      }`}
    >
      {textos[source] ?? source}
    </span>
  );
}

/** Horario resultante del día, ya resuelto por el backend. */
function HorarioEfectivo({ dia }) {
  if (dia.effective_closed) {
    return <span className="text-xs font-semibold text-red-700">Cerrado</span>;
  }
  return (
    <span className="text-xs tabular-nums text-stone-700">
      {dia.effective_start} – {dia.effective_end}
      {dia.effective_reason === 'holiday_hours' ? (
        <span className="ml-1.5 text-[11px] text-stone-400">(horario de festivo)</span>
      ) : null}
    </span>
  );
}

export default function ScheduleExceptionsPage() {
  const toast = useAppToast();
  const anioActual = new Date().getFullYear();

  const [year, setYear] = useState(anioActual);
  const [dias, setDias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(FORM_VACIO);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async (anio) => {
    setLoading(true);
    try {
      const data = await scheduleExceptionService.getCalendar(anio);
      setDias(Array.isArray(data) ? data : []);
    } catch (err) {
      setDias([]);
      toast.error(getApiErrorMessage(err, 'No se pudo cargar el calendario.'));
    } finally {
      setLoading(false);
    }
    // `toast` es estable (viene memoizado del proveedor), pero se omite de las
    // dependencias para que un re-render no dispare otra carga del año.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load(year);
  }, [year, load]);

  const anios = useMemo(
    () => [anioActual - 1, anioActual, anioActual + 1, anioActual + 2],
    [anioActual]
  );

  const setCampo = (campo, valor) => {
    setForm((f) => ({ ...f, [campo]: valor }));
    setErrors((e) => ({ ...e, [campo]: '' }));
  };

  const limpiar = () => {
    setForm(FORM_VACIO);
    setErrors({});
  };

  /** Carga un día de la tabla en el formulario para ajustarlo. */
  const editar = (dia) => {
    let mode;
    if (!dia.exception_id) {
      // Festivo sin tocar: el punto de partida más útil es afinar sus horas, así
      // que se precarga el horario de festivo que ya tiene.
      mode = 'hours';
    } else if (dia.is_closed) {
      mode = 'closed';
    } else if (dia.start_time && dia.end_time) {
      mode = 'hours';
    } else {
      mode = 'normal';
    }

    setForm({
      date: dia.date,
      mode,
      startTime: dia.start_time || dia.effective_start || '',
      endTime: dia.end_time || dia.effective_end || '',
      reason: dia.reason || '',
    });
    setErrors({});
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const guardar = async (e) => {
    e.preventDefault();
    const validacion = validateScheduleExceptionForm(form);
    if (!validacion.valid) {
      setErrors(validacion.errors);
      return;
    }
    setSaving(true);
    try {
      await scheduleExceptionService.saveException({
        date: form.date,
        isClosed: form.mode === 'closed',
        // «Día normal» se expresa con ambas horas vacías y sin cierre: es la
        // forma que tiene el backend de anular un festivo.
        startTime: form.mode === 'hours' ? form.startTime : '',
        endTime: form.mode === 'hours' ? form.endTime : '',
        reason: form.reason,
      });
      toast.success('Día guardado correctamente.');
      const anioGuardado = Number(String(form.date).slice(0, 4));
      limpiar();
      // El día guardado puede pertenecer a otro año que el que se está viendo:
      // en ese caso se salta a ese año en vez de recargar el actual, para que el
      // cambio quede a la vista y no parezca que no pasó nada.
      if (anioGuardado !== year) setYear(anioGuardado);
      else await load(year);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'No se pudo guardar el día.'));
    } finally {
      setSaving(false);
    }
  };

  const confirmarQuitar = async () => {
    if (!deleteTarget?.exception_id) return;
    setDeleting(true);
    try {
      await scheduleExceptionService.deleteException(deleteTarget.exception_id);
      toast.success('Ajuste eliminado. El día vuelve a su horario automático.');
      setDeleteTarget(null);
      await load(year);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'No se pudo eliminar el ajuste.'));
    } finally {
      setDeleting(false);
    }
  };

  const modoActivo = MODOS.find((m) => m.value === form.mode);

  return (
    <div className="page-shell">
      <PageHeader
        title="Festivos y cierres"
        subtitle="Los festivos colombianos se calculan solos. Aquí se ajusta lo que el calendario no puede saber."
        actions={
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="input-premium py-2 text-sm"
            aria-label="Año del calendario"
          >
            {anios.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        }
      />

      <div className="mb-4 rounded-xl border border-stone-200/90 bg-white px-3 py-3 shadow-sm sm:px-4">
        <p className="mb-2 text-[10px] font-semibold text-gold">
          {form.date ? `Ajustar el ${fechaLarga(form.date)}` : 'Marcar un día'}
        </p>
        <form
          className="grid gap-2 sm:grid-cols-[auto_auto_auto_auto_1fr_auto] sm:items-start"
          onSubmit={guardar}
          noValidate
        >
          <div>
            <label htmlFor="exc-date" className="mb-1 block text-[11px] text-stone-500">
              Fecha
            </label>
            <input
              id="exc-date"
              type="date"
              value={form.date}
              onChange={(e) => setCampo('date', e.target.value)}
              className={`input-premium py-2 text-sm ${errors.date ? '!border-red-400' : ''}`}
              aria-invalid={errors.date ? true : undefined}
            />
            <FieldErrorMessage message={errors.date} />
          </div>

          <div>
            <label htmlFor="exc-mode" className="mb-1 block text-[11px] text-stone-500">
              Qué pasa ese día
            </label>
            <select
              id="exc-mode"
              value={form.mode}
              onChange={(e) => setCampo('mode', e.target.value)}
              className="input-premium py-2 text-sm"
            >
              {MODOS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="exc-start" className="mb-1 block text-[11px] text-stone-500">
              Abre
            </label>
            <input
              id="exc-start"
              type="time"
              value={form.startTime}
              disabled={form.mode !== 'hours'}
              onChange={(e) => setCampo('startTime', e.target.value)}
              className={`input-premium py-2 text-sm disabled:bg-stone-100 disabled:text-stone-400 ${
                errors.startTime ? '!border-red-400' : ''
              }`}
              aria-invalid={errors.startTime ? true : undefined}
            />
            <FieldErrorMessage message={errors.startTime} />
          </div>

          <div>
            <label htmlFor="exc-end" className="mb-1 block text-[11px] text-stone-500">
              Cierra
            </label>
            <input
              id="exc-end"
              type="time"
              value={form.endTime}
              disabled={form.mode !== 'hours'}
              onChange={(e) => setCampo('endTime', e.target.value)}
              className={`input-premium py-2 text-sm disabled:bg-stone-100 disabled:text-stone-400 ${
                errors.endTime ? '!border-red-400' : ''
              }`}
              aria-invalid={errors.endTime ? true : undefined}
            />
            <FieldErrorMessage message={errors.endTime} />
          </div>

          <div className="min-w-0">
            <label htmlFor="exc-reason" className="mb-1 block text-[11px] text-stone-500">
              Motivo (opcional)
            </label>
            <input
              id="exc-reason"
              value={form.reason}
              maxLength={200}
              onChange={(e) => setCampo('reason', e.target.value)}
              className={`input-premium w-full py-2 text-sm ${errors.reason ? '!border-red-400' : ''}`}
              placeholder="Ej. Inventario anual"
              aria-invalid={errors.reason ? true : undefined}
            />
            <FieldErrorMessage message={errors.reason} />
          </div>

          <div className="flex gap-1.5 sm:mt-[1.35rem]">
            <button type="submit" className="btn-admin py-2 text-sm" disabled={saving}>
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
            {form.date ? <AdminIconButton icon={X} label="Cancelar" onClick={limpiar} /> : null}
          </div>
        </form>
        {modoActivo ? <p className="mt-2 text-[11px] text-stone-500">{modoActivo.ayuda}</p> : null}
      </div>

      <DataCard compact>
        {loading ? (
          <div className="py-10 text-center text-sm text-stone-500">Cargando…</div>
        ) : dias.length === 0 ? (
          <div className="py-10 text-center text-sm text-stone-500">
            No hay festivos ni cierres para {year}.
          </div>
        ) : (
          <Table>
            <TableHead>
              <TableHeader compact>Fecha</TableHeader>
              <TableHeader compact>Día</TableHeader>
              <TableHeader compact>Motivo</TableHeader>
              <TableHeader compact>Origen</TableHeader>
              <TableHeader compact>Horario del negocio</TableHeader>
              <TableHeader compact className="text-right">
                Acciones
              </TableHeader>
            </TableHead>
            <TableBody>
              {dias.map((dia) => (
                <TableRow key={dia.date}>
                  <TableCell compact className="whitespace-nowrap text-xs font-medium tabular-nums">
                    {fechaLarga(dia.date)}
                  </TableCell>
                  <TableCell compact className="text-xs text-stone-600">
                    {DIAS[dia.day_of_week] ?? '—'}
                  </TableCell>
                  <TableCell compact className="max-w-[16rem] text-xs text-stone-700">
                    <span className="line-clamp-2">{dia.reason || dia.name}</span>
                  </TableCell>
                  <TableCell compact>
                    <OrigenBadge source={dia.source} />
                  </TableCell>
                  <TableCell compact className="whitespace-nowrap">
                    <HorarioEfectivo dia={dia} />
                  </TableCell>
                  <TableCell compact>
                    <div className="inline-flex justify-end gap-1.5">
                      <AdminIconButton
                        icon={Pencil}
                        label="Ajustar este día"
                        onClick={() => editar(dia)}
                      />
                      {dia.exception_id ? (
                        <AdminIconButton
                          icon={Trash2}
                          label="Quitar el ajuste"
                          variant="danger"
                          onClick={() => setDeleteTarget(dia)}
                        />
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DataCard>

      <AdminConfirmModal
        open={Boolean(deleteTarget)}
        variant="danger"
        title="¿Quitar el ajuste?"
        description={
          deleteTarget ? (
            <>
              El <strong className="text-stone-800">{fechaLarga(deleteTarget.date)}</strong> volverá a
              su horario automático
              {deleteTarget.source === 'festivo+excepcion'
                ? ' de festivo (11:00 – 18:00).'
                : ' del día de la semana.'}
            </>
          ) : null
        }
        confirmLabel="Sí, quitar"
        isSubmitting={deleting}
        onCancel={() => {
          if (!deleting) setDeleteTarget(null);
        }}
        onConfirm={confirmarQuitar}
      />
    </div>
  );
}
