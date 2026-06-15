/**
 * Calendario semanal de citas (vista barbero, solo lectura por defecto).
 */

import { useMemo, useRef, useState } from 'react';
import { getLocalDateToday, extractAppointmentDateYmd, formatAppointmentClockTime } from '@/shared/utils/appointmentTime';
import { AGENDA_GRID_STATUS_STYLES } from '@/features/agenda/utils/agendaConstants';

const START_HOUR = 8;
const END_HOUR = 21;
const SLOT_MINUTES = 30;
const SLOT_HEIGHT = 30;
const TOTAL_SLOTS = ((END_HOUR - START_HOUR) * 60) / SLOT_MINUTES;

const DAY_NAMES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

function pad(n) {
  return String(n).padStart(2, '0');
}

function addDays(iso, days) {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function weekDays(dateFromISO) {
  return Array.from({ length: 7 }, (_, i) => addDays(dateFromISO, i));
}

function toHHMM(value) {
  return formatAppointmentClockTime(value) || '00:00';
}

function hhmmToMinutes(hhmm) {
  const [h, m] = String(hhmm).split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

function minutesToHHMM(total) {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${pad(h)}:${pad(m)}`;
}

export default function WeeklyAgendaGrid({
  dateFrom,
  appointments = [],
  loading = false,
  readOnly = true,
  onViewAppointment,
  onSelectSlot,
  onMoveAppointment,
}) {
  const days = useMemo(() => weekDays(dateFrom), [dateFrom]);
  const todayISO = getLocalDateToday();

  const byDay = useMemo(() => {
    const map = {};
    for (const d of days) map[d] = [];
    for (const a of appointments) {
      const key = extractAppointmentDateYmd(a.appointment_date);
      if (map[key]) map[key].push(a);
    }
    return map;
  }, [appointments, days]);

  const [dragging, setDragging] = useState(null);
  const [hoverSlot, setHoverSlot] = useState(null);
  const gridRef = useRef(null);

  const hours = useMemo(
    () =>
      Array.from({ length: TOTAL_SLOTS }, (_, i) => {
        const total = START_HOUR * 60 + i * SLOT_MINUTES;
        return minutesToHHMM(total);
      }),
    []
  );

  const canMove = !readOnly && Boolean(onMoveAppointment);
  const canCreate = !readOnly && Boolean(onSelectSlot);
  const canView = Boolean(onViewAppointment);

  function handleDragStart(e, a) {
    if (!canMove || ['completed', 'cancelled', 'no_show'].includes(a.status)) {
      e.preventDefault();
      return;
    }
    setDragging({
      id: a.id,
      originDate: extractAppointmentDateYmd(a.appointment_date),
      originTime: toHHMM(a.start_time),
    });
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(a.id));
  }

  function handleDragEnd() {
    setDragging(null);
    setHoverSlot(null);
  }

  function handleDragOver(e, date, time) {
    if (!dragging) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (!hoverSlot || hoverSlot.date !== date || hoverSlot.time !== time) {
      setHoverSlot({ date, time });
    }
  }

  function handleDrop(e, date, time) {
    e.preventDefault();
    const current = dragging;
    setDragging(null);
    setHoverSlot(null);
    if (!current || !onMoveAppointment) return;
    if (current.originDate === date && current.originTime === time) return;
    onMoveAppointment({ id: current.id, date, time });
  }

  const SlotCell = canCreate ? 'button' : 'div';

  return (
    <div className="panel-card overflow-hidden relative">
      <div className="h-1 w-full bg-gradient-to-r from-gold-dark via-gold to-gold-light" aria-hidden />
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 backdrop-blur-[1px]">
          <div className="inline-block h-7 w-7 border-2 border-gold border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      <div className="overflow-x-auto">
        <div
          ref={gridRef}
          className="min-w-[780px] grid"
          style={{ gridTemplateColumns: '60px repeat(7, minmax(0, 1fr))' }}
        >
          <div className="bg-stone-50 border-b border-stone-200" />
          {days.map((d) => {
            const date = new Date(`${d}T12:00:00`);
            const isToday = d === todayISO;
            return (
              <div
                key={d}
                className={`px-2 py-3 text-center border-b border-stone-200 ${
                  isToday ? 'bg-gold/10' : 'bg-stone-50'
                }`}
              >
                <p className="text-xs font-semibold text-stone-500">
                  {DAY_NAMES[(date.getDay() + 6) % 7]}
                </p>
                <p className={`font-serif text-lg font-medium ${isToday ? 'text-gold' : 'text-stone-900'}`}>
                  {date.getDate()}
                </p>
              </div>
            );
          })}

          <div className="relative border-r border-stone-200">
            {hours.map((hhmm) => (
              <div
                key={hhmm}
                className="text-[10px] text-stone-500 text-right pr-1.5 border-b border-stone-100"
                style={{ height: SLOT_HEIGHT }}
              >
                {hhmm.endsWith(':00') ? hhmm : ''}
              </div>
            ))}
          </div>

          {days.map((date) => (
            <div
              key={date}
              className="relative border-r border-stone-200 last:border-r-0"
              style={{ height: TOTAL_SLOTS * SLOT_HEIGHT }}
            >
              {hours.map((time) => {
                const isHover = hoverSlot && hoverSlot.date === date && hoverSlot.time === time;
                return (
                  <SlotCell
                    type={canCreate ? 'button' : undefined}
                    key={time}
                    onClick={canCreate ? () => onSelectSlot?.({ date, time }) : undefined}
                    onDragOver={canMove ? (e) => handleDragOver(e, date, time) : undefined}
                    onDrop={canMove ? (e) => handleDrop(e, date, time) : undefined}
                    className={`block w-full border-b border-stone-100 text-left transition-colors ${
                      isHover ? 'bg-gold/15' : canCreate ? 'hover:bg-stone-50 focus:bg-stone-50' : ''
                    }`}
                    style={{ height: SLOT_HEIGHT }}
                    aria-label={canCreate ? `Crear cita ${date} ${time}` : undefined}
                  />
                );
              })}

              {(byDay[date] || []).map((a) => {
                const startMin = hhmmToMinutes(toHHMM(a.start_time));
                const duration = Math.max(15, Number(a.duration_minutes) || 30);
                const top = ((startMin - START_HOUR * 60) / SLOT_MINUTES) * SLOT_HEIGHT;
                const height = Math.max(SLOT_HEIGHT - 2, (duration / SLOT_MINUTES) * SLOT_HEIGHT - 2);
                if (top < 0 || top >= TOTAL_SLOTS * SLOT_HEIGHT) return null;

                const tone = AGENDA_GRID_STATUS_STYLES[a.status] || AGENDA_GRID_STATUS_STYLES.scheduled;
                const terminal = ['completed', 'cancelled', 'no_show'].includes(a.status);
                const canDrag = canMove && !terminal;

                return (
                  <div
                    key={a.id}
                    draggable={canDrag}
                    onDragStart={canDrag ? (e) => handleDragStart(e, a) : undefined}
                    onDragEnd={canDrag ? handleDragEnd : undefined}
                    onClick={canView ? () => onViewAppointment(a) : undefined}
                    onKeyDown={
                      canView
                        ? (e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              onViewAppointment(a);
                            }
                          }
                        : undefined
                    }
                    role={canView ? 'button' : undefined}
                    tabIndex={canView ? 0 : undefined}
                    title={`${a.service_name} · ${a.client_first_name || ''} ${a.client_last_name || ''}`}
                    className={`absolute left-1 right-1 rounded-lg border-l-4 px-2 py-1 text-[11px] leading-tight shadow-sm ${tone} ${
                      canDrag ? 'cursor-grab hover:shadow-md' : canView ? 'cursor-pointer hover:shadow-md' : 'cursor-default'
                    }`}
                    style={{ top, height }}
                  >
                    <p className="font-semibold truncate">
                      {toHHMM(a.start_time)} · {a.service_name}
                    </p>
                    <p className="truncate opacity-80">
                      {a.client_first_name} {a.client_last_name}
                    </p>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 px-4 py-3 text-xs text-stone-500 border-t border-stone-200">
        {readOnly ? (
          <span>Haz clic en una cita para ver el detalle. Vista de solo lectura.</span>
        ) : (
          <>
            <span>Arrastra una cita para cambiar de día u hora.</span>
            <span className="hidden sm:inline">Haz clic en un hueco para crear una nueva.</span>
          </>
        )}
      </div>
    </div>
  );
}
