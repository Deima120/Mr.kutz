import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { resolveReportSectionId, REPORT_SECTIONS } from './reportsNav.js';

describe('reportsNav', () => {
  it('incluye resumen + 7 historiales/reportes', () => {
    assert.equal(REPORT_SECTIONS.length, 8);
    assert.ok(REPORT_SECTIONS.every((s) => s.id && s.label));
  });

  it('todas las secciones están ready (sin placeholder pendiente)', () => {
    assert.ok(REPORT_SECTIONS.every((s) => s.status === 'ready'));
  });

  it('resolveReportSectionId cae a summary', () => {
    assert.equal(resolveReportSectionId(''), 'summary');
    assert.equal(resolveReportSectionId('sales'), 'sales');
    assert.equal(resolveReportSectionId('nope'), 'summary');
  });
});
