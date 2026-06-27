/**
 * Job periódico: actualiza estados de citas en BD (confirmada → en progreso → completada).
 * Corre dentro del proceso API y también puede invocarse como script o vía HTTP (Render Cron).
 */

import { syncAutomaticAppointmentStatuses } from '../services/appointment.service.js';

const DEFAULT_INTERVAL_MS = 60_000;

let timer = null;
let running = false;

export function getAppointmentStatusCronIntervalMs() {
  const raw = String(process.env.APPOINTMENT_STATUS_CRON_MS ?? '').trim();
  if (raw === '0' || raw.toLowerCase() === 'false') return 0;
  const parsed = parseInt(raw, 10);
  if (Number.isFinite(parsed) && parsed >= 0) return parsed;
  return DEFAULT_INTERVAL_MS;
}

export async function runAppointmentStatusSync() {
  if (running) {
    return { skipped: true, reason: 'already_running' };
  }
  running = true;
  try {
    const result = await syncAutomaticAppointmentStatuses();
    if (result.updated > 0) {
      console.log(
        `[appointmentStatusJob] ${result.updated} cita(s) actualizada(s) (${result.checked} revisadas)`
      );
    }
    return { skipped: false, ...result };
  } catch (err) {
    console.error('[appointmentStatusJob] Error:', err?.message || err);
    throw err;
  } finally {
    running = false;
  }
}

export function startAppointmentStatusCron() {
  const intervalMs = getAppointmentStatusCronIntervalMs();
  if (intervalMs <= 0) {
    console.log('[appointmentStatusJob] Cron en proceso desactivado (APPOINTMENT_STATUS_CRON_MS=0)');
    return null;
  }
  if (timer) return timer;

  const tick = () => {
    runAppointmentStatusSync().catch(() => {});
  };

  tick();
  timer = setInterval(tick, intervalMs);
  if (typeof timer.unref === 'function') timer.unref();

  console.log(`[appointmentStatusJob] Cron en proceso cada ${intervalMs / 1000}s`);
  return timer;
}

export function stopAppointmentStatusCron() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}
