import test from 'node:test';
import assert from 'node:assert/strict';

import { toBarberDto } from './barber.service.js';

const BARBER = {
  id: 7,
  userId: 21,
  firstName: 'Sebastian',
  lastName: 'Arenas',
  phone: '3208551041',
  documentType: 'CC',
  documentNumber: '1020304050',
  specialties: ['fade'],
  isActive: true,
  commissionPercent: 40,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-02'),
  user: { email: 'arenas@gmail.com' },
};

/** Campos que jamás deben llegar a un cliente o a otro barbero. */
const CAMPOS_PRIVADOS = [
  'phone',
  'document_type',
  'document_number',
  'commission_percent',
  'email',
  'user_id',
];

test('por defecto NO expone datos personales ni comision', () => {
  const dto = toBarberDto(BARBER);
  for (const campo of CAMPOS_PRIVADOS) {
    assert.ok(!(campo in dto), `${campo} no debe estar presente`);
  }
});

test('por defecto conserva lo necesario para agendar', () => {
  const dto = toBarberDto(BARBER);
  assert.deepEqual(dto, {
    id: 7,
    first_name: 'Sebastian',
    last_name: 'Arenas',
    specialties: ['fade'],
    is_active: true,
  });
});

test('con includePrivate (admin) devuelve la ficha completa', () => {
  const dto = toBarberDto(BARBER, { includePrivate: true });
  for (const campo of CAMPOS_PRIVADOS) {
    assert.ok(campo in dto, `${campo} debe estar presente para admin`);
  }
  assert.equal(dto.document_number, '1020304050');
  assert.equal(dto.commission_percent, 40);
  assert.equal(dto.email, 'arenas@gmail.com');
});

test('commission_percent nulo se mantiene nulo, no NaN', () => {
  const dto = toBarberDto(
    { ...BARBER, commissionPercent: null },
    { includePrivate: true }
  );
  assert.equal(dto.commission_percent, null);
});
