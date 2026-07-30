import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('cashRegister.controller', () => {
  it('pasa openedById/closedById desde req.user y expone los 5 handlers', () => {
    const source = readFileSync(join(__dirname, 'cashRegister.controller.js'), 'utf8');
    assert.match(source, /export const getCurrent/);
    assert.match(source, /export const open/);
    assert.match(source, /export const close/);
    assert.match(source, /export const getSummary/);
    assert.match(source, /export const getHistory/);
    assert.match(source, /openedById:\s*req\.user\?\.id/);
    assert.match(source, /closedById:\s*req\.user\?\.id/);
    assert.match(source, /openCashRegister/);
    assert.match(source, /closeCashRegister/);
    assert.match(source, /getCurrentCashRegister/);
    assert.match(source, /getCashRegisterSummary/);
    assert.match(source, /listCashRegisterHistory/);
  });
});

describe('cashRegister.service — current con summary', () => {
  it('getCurrentCashRegister agrega summary vía toLiveSummaryDto', () => {
    const source = readFileSync(
      join(__dirname, '../services/cashRegister.service.js'),
      'utf8'
    );
    assert.match(source, /toLiveSummaryDto/);
    assert.match(source, /loadPaymentsAndOtherIncomes/);
    assert.match(source, /summary,\s*\n\s*\}/);
    assert.match(source, /summary\s*=\s*toLiveSummaryDto/);
  });
});
