/**
 * Dónde mostrar el banner completo de caja vs el FAB compacto.
 *
 * Banner completo: Ventas (/payments*), Reportes → Caja, Reportes → Otros ingresos.
 * Resto de admin: FAB.
 */

import { resolveReportSectionId } from '../../reports/reportsNav.js';

/**
 * @param {string} [pathname]
 * @param {string} [search] query string con o sin "?"
 * @returns {boolean}
 */
export function shouldShowFullCashBanner(pathname = '', search = '') {
  const path = String(pathname || '');
  if (path === '/payments' || path.startsWith('/payments/')) {
    return true;
  }

  if (path === '/reports' || path.startsWith('/reports/')) {
    const raw = String(search || '');
    const withoutHash = raw.includes('#') ? raw.slice(0, raw.indexOf('#')) : raw;
    const query = withoutHash.startsWith('?') ? withoutHash.slice(1) : withoutHash;
    const params = new URLSearchParams(query);
    const section = resolveReportSectionId(params.get('section'));
    return section === 'cash' || section === 'other-incomes';
  }

  return false;
}
