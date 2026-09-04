/**
 * Festivos de Colombia, calculados (no consultados).
 *
 * Colombia tiene 18 festivos al año y todos son deducibles con dos reglas, así
 * que no hace falta ni una tabla que alguien deba rellenar cada enero ni una API
 * externa de la que depender:
 *
 *  - **Ley 51 de 1983 («Ley Emiliani»)**: siete festivos se trasladan al lunes
 *    siguiente cuando no caen en lunes. Los otros seis son de fecha inamovible.
 *  - **Pascua**: seis festivos se derivan del Domingo de Resurrección. Jueves y
 *    Viernes Santo NO se trasladan (caen siempre en su día); Ascensión, Corpus
 *    Christi y Sagrado Corazón sí, pero su desplazamiento ya está incorporado en
 *    el número de días que se suma, así que siempre caen en lunes.
 *
 * Toda la aritmética usa `Date.UTC` y se lee con `getUTC*`. Trabajar con fechas
 * locales aquí haría que el resultado dependiera de dónde corre el proceso
 * (Render va en UTC y el desarrollo local en UTC-5), que es exactamente el tipo
 * de error que este módulo debe evitar.
 */

import { addDaysToYmd } from './colombiaTime.js';

/** Festivos de fecha fija: nunca se mueven, caigan en el día que caigan. */
const FIJOS = [
  { mes: 1, dia: 1, nombre: 'Año Nuevo' },
  { mes: 5, dia: 1, nombre: 'Día del Trabajo' },
  { mes: 7, dia: 20, nombre: 'Día de la Independencia' },
  { mes: 8, dia: 7, nombre: 'Batalla de Boyacá' },
  { mes: 12, dia: 8, nombre: 'Inmaculada Concepción' },
  { mes: 12, dia: 25, nombre: 'Navidad' },
];

/** Festivos que la Ley Emiliani corre al lunes siguiente si no caen en lunes. */
const EMILIANI = [
  { mes: 1, dia: 6, nombre: 'Reyes Magos' },
  { mes: 3, dia: 19, nombre: 'San José' },
  { mes: 6, dia: 29, nombre: 'San Pedro y San Pablo' },
  { mes: 8, dia: 15, nombre: 'Asunción de la Virgen' },
  { mes: 10, dia: 12, nombre: 'Día de la Raza' },
  { mes: 11, dia: 1, nombre: 'Todos los Santos' },
  { mes: 11, dia: 11, nombre: 'Independencia de Cartagena' },
];

/**
 * Festivos derivados de la Pascua, como desplazamiento en días.
 *
 * Los negativos son de Semana Santa y conservan su día. Los positivos ya
 * incorporan el traslado de la Ley Emiliani en el propio desplazamiento, por eso
 * caen siempre en lunes sin necesidad de corregirlos después.
 */
const PASCUALES = [
  { offset: -3, nombre: 'Jueves Santo', trasladado: false },
  { offset: -2, nombre: 'Viernes Santo', trasladado: false },
  { offset: 43, nombre: 'Ascensión del Señor', trasladado: true },
  { offset: 64, nombre: 'Corpus Christi', trasladado: true },
  { offset: 71, nombre: 'Sagrado Corazón de Jesús', trasladado: true },
];

const ymd = (y, m, d) =>
  `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

/** Día de la semana (0=domingo) de una fecha YYYY-MM-DD, sin tocar zona horaria. */
function weekdayOf(fecha) {
  const [y, m, d] = fecha.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** Corre la fecha al lunes siguiente; si ya es lunes, la deja igual. */
function alLunesSiguiente(fecha) {
  const dia = weekdayOf(fecha);
  if (dia === 1) return fecha;
  // Domingo (0) necesita +1; el resto, lo que falte para llegar al próximo lunes.
  return addDaysToYmd(fecha, (8 - dia) % 7);
}

/**
 * Domingo de Resurrección por el algoritmo de Meeus/Butcher (calendario
 * gregoriano). Es aritmética pura: mismo resultado en cualquier máquina.
 *
 * @param {number} year
 * @returns {string} YYYY-MM-DD
 */
export function easterSunday(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return ymd(year, mes, dia);
}

/** Caché por año: el cálculo es determinista, no hace falta repetirlo. */
const cachePorAnio = new Map();

/**
 * Los 18 festivos colombianos de un año, ordenados por fecha.
 *
 * @param {number} year
 * @returns {Array<{ date: string, name: string, kind: 'fijo'|'emiliani'|'pascua' }>}
 */
export function getColombianHolidays(year) {
  const anio = Number(year);
  if (!Number.isInteger(anio) || anio < 1900 || anio > 2200) {
    throw new Error(`Año no válido para calcular festivos: ${year}`);
  }

  if (!cachePorAnio.has(anio)) {
    const pascua = easterSunday(anio);

    const festivos = [
      ...FIJOS.map((f) => ({
        date: ymd(anio, f.mes, f.dia),
        name: f.nombre,
        kind: 'fijo',
      })),
      ...EMILIANI.map((f) => ({
        date: alLunesSiguiente(ymd(anio, f.mes, f.dia)),
        name: f.nombre,
        kind: 'emiliani',
      })),
      ...PASCUALES.map((f) => ({
        date: addDaysToYmd(pascua, f.offset),
        name: f.nombre,
        kind: 'pascua',
      })),
    ].sort((a, b) => a.date.localeCompare(b.date));

    cachePorAnio.set(anio, festivos);
  }

  // Copia: quien reciba la lista no debe poder mutar la caché.
  return cachePorAnio.get(anio).map((f) => ({ ...f }));
}

/**
 * ¿Es festivo esta fecha? Devuelve el festivo o `null`.
 *
 * @param {string} fecha YYYY-MM-DD
 * @returns {{ date: string, name: string, kind: string } | null}
 */
export function isColombianHoliday(fecha) {
  const str = String(fecha ?? '').trim();
  const match = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  return getColombianHolidays(Number(match[1])).find((f) => f.date === str) ?? null;
}
