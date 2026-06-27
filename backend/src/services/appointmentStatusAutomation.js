/**
 * Transiciones automáticas según fecha/hora de la cita en Colombia (America/Bogota).
 */

import {
  buildColombiaDateTimeMs,
  getNowMs,
  resolveTimeStrings,
} from '../utils/colombiaTime.js';

export const COMPLETION_GRACE_MINUTES = 10;

const TERMINAL = new Set(['cancelled', 'no_show', 'completed']);
export const MANUAL_ADMIN_STATUSES = new Set(['scheduled', 'confirmed', 'cancelled']);

export function computeAutomaticStatus(currentStatus, startMs, endMs, nowMs = getNowMs()) {
  if (TERMINAL.has(currentStatus)) return currentStatus;
  if (startMs == null || endMs == null) return currentStatus;

  const completeAtMs = endMs + COMPLETION_GRACE_MINUTES * 60 * 1000;

  if (currentStatus === 'confirmed' || currentStatus === 'in_progress') {
    if (nowMs >= completeAtMs) return 'completed';
    if (nowMs >= startMs) return 'in_progress';
    return currentStatus;
  }

  return currentStatus;
}

export function resolveAutomaticStatus(record, now = new Date()) {
  const { start, end, date } = resolveTimeStrings(record);
  const startMs = buildColombiaDateTimeMs(date, start);
  const endMs = buildColombiaDateTimeMs(date, end);
  if (startMs == null || endMs == null) return record.status;

  return computeAutomaticStatus(record.status, startMs, endMs, getNowMs(now));
}

export function isManualAdminStatus(status) {
  return MANUAL_ADMIN_STATUSES.has(status);
}
