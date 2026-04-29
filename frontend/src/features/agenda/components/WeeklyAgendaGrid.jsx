/**
 * WeeklyAgendaGrid
 *
 * Calendario semanal tipo "Google Calendar" para un barbero.
 *
 * Props:
 *  - dateFrom / dateTo: "YYYY-MM-DD" (lunes y domingo de la semana mostrada)
 *  - appointments: lista en formato snake_case devuelta por GET /api/appointments
 *  - onSelectAppointment(id): click en una cita
 *  - onSelectSlot({ date, time }): click en un hueco vacío (opcional)
 *  - onMoveAppointment({ id, date, time }): al soltar una cita arrastrada
 *  - loading: boolean
 *
 * Drag & drop: HTML5 nativo (sin dependencias extra). No disponible en touch.
 */

import { useMemo, useRef, useState } from 'react';

const START_HOUR = 8;
const END_HOUR = 21;
const SLOT_MINUTES = 30;
const SLOT_HEIGHT = 30;
const TOTAL_SLOTS = ((END_HOUR - START_HOUR) * 60) / SLOT_MINUTES;

const DAY_NAMES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

const STATUS_STYLES = {
  scheduled: 'bg-amber-50 border-amber-400 text-amber-900',
  confirmed: 'bg-blue-50 border-blue-400 text-blue-900',
  in_progress: 'bg-indigo-50 border-indigo-400 text-indigo-900',
  completed: 'bg-emerald-50 border-emerald-400 text-emerald-900',
  cancelled: 'bg-stone-100 border-stone-300 text-stone-500 line-through',
  no_show: 'bg-stone-100 border-stone-300 text-stone-500 line-through',
};

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

/** Devuelve "HH:MM" a partir de string ISO o fecha o "HH:MM:SS". */
function toHHMM(value) {
  if (!value) return '00:00';
  if (typeof value === 'string') {
    const iso = value.match(/T(\d{1,2}):(\d{2})/);
    if (iso) return `${pad(iso[1])}:${iso[2]}`;
    const plain = value.match(/^(\d{1,2}):(\d{2})/);
    if (plain) return `${pad(plain[1])}:${plain[2]}`;
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return `${pad(value.getUTCHours())}:${pad(value.getUTCMinutes())}`;
  }
  return '00:00';
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

function isTerminal(status) {
  return status === 'completed' || status === 'cancelled' || status === 'no_show';
}

export default function WeeklyAgendaGrid({
  dateFrom,
  appointments = [],
  onSelectAppointment,
  onSelectSlot,
  onMoveAppointment,
  loading = false,
}) {
  const days = useMemo(() => weekDays(dateFrom), [dateFrom]);
  const todayISO = new Date().toISOString().slice(0, 10);

  /** agrupa por día ISO */
  const byDay = useMemo(() => {
    const map = {};
    for (const d of days) map[d] = [];
    for (const a of appointments) {
      const key = String(a.appointment_date || '').slice(0, 10);
      if (map[key]) map[key].push(a);
    }
    return map;
  }, [appointments, days]);

  const [dragging, setDragging] = useState(null);
  const [hoverSlot, setHoverSlot] = useState(null);
  const gridRef = useRef(null);

  const hours = useMemo(() => {
    return Array.from({ length: TOTAL_SLOTS }, (_, i) => {
      const total = START_HOUR * 60 + i * SLOT_MINUTES;
      return minutesToHHMM(total);
    });
  }, []);

  function handleDragStart(e, a) {
    if (isTerminal(a.status)) {
      e.preventDefault();
      return;
    }
    setDragging({
      id: a.id,
      duration: Number(a.duration_minutes || 30),
      originDate: String(a.appointment_date || '').slice(0, 10),
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

  function handleSlotClick(date, time) {
    if (onSelectSlot) onSelectSlot({ date, time });
  }

  return (
    <div className="panel-card overflow-hidden">
      <div className="h-1 w-full bg-gradient-to-r from-gold-dark via-gold to-gold-light" aria-hidden />
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
                <p
                  className={`font-serif text-lg font-medium ${
                    isToday ? 'text-gold' : 'text-stone-900'
                  }`}
                >
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
                const isHover =
                  hoverSlot && hoverSlot.date === date && hoverSlot.time === time;
                return (
                  <button
                    type="button"
                    key={time}
                    onClick={() => handleSlotClick(date, time)}
                    onDragOver={(e) => handleDragOver(e, date, time)}
                    onDrop={(e) => handleDrop(e, date, time)}
                    className={`block w-full border-b border-stone-100 text-left transition-colors ${
                      isHover
                        ? 'bg-gold/15'
                        : 'hover:bg-stone-50 focus:bg-stone-50'
                    }`}
                    style={{ height: SLOT_HEIGHT }}
                    aria-label={`Crear cita ${date} ${time}`}
                  />
                );
              })}

              {(byDay[date] || []).map((a) => {
                const startMin = hhmmToMinutes(toHHMM(a.start_time));
                const duration = Math.max(
                  15,
                  Number(a.duration_minutes) || 30
                );
                const top =
                  ((startMin - START_HOUR * 60) / SLOT_MINUTES) * SLOT_HEIGHT;
                const height = Math.max(
                  SLOT_HEIGHT - 2,
                  (duration / SLOT_MINUTES) * SLOT_HEIGHT - 2
                );
                if (top < 0 || top >= TOTAL_SLOTS * SLOT_HEIGHT) return null;

                const tone = STATUS_STYLES[a.status] || STATUS_STYLES.scheduled;
                const canDrag = !isTerminal(a.status);

                return (
                  <div
                    key={a.id}
                    draggable={canDrag}
                    onDragStart={(e) => handleDragStart(e, a)}
                    onDragEnd={handleDragEnd}
                    onClick={() => onSelectAppointment?.(a.id)}
                    role="button"
                    tabIndex={0}
                    title={`${a.service_name} · ${a.client_first_name || ''} ${a.client_last_name || ''}`}
                    className={`absolute left-1 right-1 rounded-lg border-l-4 px-2 py-1 text-[11px] leading-tight shadow-sm ${tone} ${
                      canDrag ? 'cursor-grab hover:shadow' : 'cursor-pointer'
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
        <span>Arrastra una cita para cambiar de día u hora.</span>
        <span className="hidden sm:inline">Haz clic en un hueco para crear una nueva.</span>
        {loading && <span className="text-gold">Sincronizando…</span>}
      </div>
    </div>
  );
}
