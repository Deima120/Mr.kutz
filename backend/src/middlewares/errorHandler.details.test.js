import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { errorHandler } from '../middlewares/errorHandler.js';

function mockRes() {
  const out = { statusCode: null, body: null };
  return {
    out,
    status(code) {
      out.statusCode = code;
      return this;
    },
    json(payload) {
      out.body = payload;
      return this;
    },
  };
}

describe('errorHandler — details de caja', () => {
  it('incluye reason y details en 4xx (p. ej. unpaid / caja vieja)', () => {
    const err = new Error('No se puede cerrar: hay 1 cita(s) completada(s) sin cobro.');
    err.statusCode = 409;
    err.reason = 'UNPAID_COMPLETED_APPOINTMENTS';
    err.details = {
      unpaidAppointments: [{ id: 9, clientName: 'Luis Pérez' }],
    };

    const req = { method: 'POST', originalUrl: '/api/cash-registers/close' };
    const res = mockRes();
    const prevError = console.error;
    console.error = () => {};
    try {
      errorHandler(err, req, res, () => {});
    } finally {
      console.error = prevError;
    }

    assert.equal(res.out.statusCode, 409);
    assert.equal(res.out.body.success, false);
    assert.equal(res.out.body.reason, 'UNPAID_COMPLETED_APPOINTMENTS');
    assert.equal(res.out.body.details.unpaidAppointments[0].clientName, 'Luis Pérez');
  });
});
