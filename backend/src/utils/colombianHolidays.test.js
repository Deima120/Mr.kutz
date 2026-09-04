import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  easterSunday,
  getColombianHolidays,
  isColombianHoliday,
} from './colombianHolidays.js';

/** Día de la semana sin depender de la zona horaria de la máquina. */
const diaSemana = (ymd) => {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
};

describe('easterSunday', () => {
  // Fechas publicadas del Domingo de Resurrección. Si el algoritmo se teclea
  // mal, estos vectores lo delatan de inmediato.
  it('coincide con las fechas conocidas de Pascua', () => {
    assert.equal(easterSunday(2024), '2024-03-31');
    assert.equal(easterSunday(2025), '2025-04-20');
    assert.equal(easterSunday(2026), '2026-04-05');
    assert.equal(easterSunday(2027), '2027-03-28');
    assert.equal(easterSunday(2030), '2030-04-21');
  });

  it('siempre cae en domingo', () => {
    for (let y = 2024; y <= 2035; y += 1) {
      assert.equal(diaSemana(easterSunday(y)), 0, `Pascua de ${y} no cayó en domingo`);
    }
  });
});

describe('getColombianHolidays — cantidad y forma', () => {
  it('devuelve 18 festivos por año', () => {
    for (let y = 2024; y <= 2030; y += 1) {
      assert.equal(getColombianHolidays(y).length, 18, `${y} no tiene 18 festivos`);
    }
  });

  it('vienen ordenados por fecha y sin repetidos', () => {
    const fechas = getColombianHolidays(2026).map((f) => f.date);
    assert.deepEqual(fechas, [...fechas].sort(), 'no están ordenadas');
    assert.equal(new Set(fechas).size, fechas.length, 'hay fechas repetidas');
  });

  it('no deja mutar la caché entre llamadas', () => {
    const primera = getColombianHolidays(2026);
    primera[0].name = 'ALTERADO';
    assert.notEqual(getColombianHolidays(2026)[0].name, 'ALTERADO');
  });

  it('rechaza un año no válido', () => {
    assert.throws(() => getColombianHolidays('abc'));
    assert.throws(() => getColombianHolidays(1500));
  });
});

describe('getColombianHolidays — año 2026 completo', () => {
  // Caso de oro: las 18 fechas de 2026, verificadas una a una.
  const ESPERADO_2026 = [
    '2026-01-01', // Año Nuevo (jueves, fijo)
    '2026-01-12', // Reyes: el 6 cae martes -> lunes 12
    '2026-03-23', // San José: el 19 cae jueves -> lunes 23
    '2026-04-02', // Jueves Santo
    '2026-04-03', // Viernes Santo
    '2026-05-01', // Trabajo (viernes, fijo)
    '2026-05-18', // Ascensión
    '2026-06-08', // Corpus Christi
    '2026-06-15', // Sagrado Corazón
    '2026-06-29', // San Pedro: ya cae lunes
    '2026-07-20', // Independencia (fijo)
    '2026-08-07', // Boyacá (viernes, fijo)
    '2026-08-17', // Asunción: el 15 cae sábado -> lunes 17
    '2026-10-12', // Raza: ya cae lunes
    '2026-11-02', // Todos los Santos: el 1 cae domingo -> lunes 2
    '2026-11-16', // Cartagena: el 11 cae miércoles -> lunes 16
    '2026-12-08', // Inmaculada (martes, fijo)
    '2026-12-25', // Navidad (viernes, fijo)
  ];

  it('devuelve exactamente las fechas esperadas', () => {
    assert.deepEqual(getColombianHolidays(2026).map((f) => f.date), ESPERADO_2026);
  });
});

describe('Ley Emiliani', () => {
  it('corre al lunes siguiente los festivos trasladables', () => {
    const f2026 = getColombianHolidays(2026);
    const reyes = f2026.find((f) => f.name === 'Reyes Magos');
    assert.equal(reyes.date, '2026-01-12');
    assert.equal(diaSemana(reyes.date), 1);
  });

  it('deja igual el festivo trasladable que ya cae en lunes', () => {
    // El 29 de junio de 2026 es lunes: no debe moverse.
    const sanPedro = getColombianHolidays(2026).find((f) => f.name === 'San Pedro y San Pablo');
    assert.equal(sanPedro.date, '2026-06-29');
  });

  it('todos los festivos trasladables caen siempre en lunes', () => {
    for (let y = 2024; y <= 2032; y += 1) {
      for (const f of getColombianHolidays(y).filter((x) => x.kind === 'emiliani')) {
        assert.equal(diaSemana(f.date), 1, `${f.name} de ${y} (${f.date}) no cayó en lunes`);
      }
    }
  });
});

describe('festivos de fecha fija', () => {
  it('no se mueven aunque caigan en fin de semana', () => {
    // El 1 de mayo de 2027 cae sábado y debe seguir siendo el 1.
    const trabajo = getColombianHolidays(2027).find((f) => f.name === 'Día del Trabajo');
    assert.equal(trabajo.date, '2027-05-01');
    assert.equal(diaSemana('2027-05-01'), 6);
  });

  it('Navidad y Año Nuevo caen siempre en su fecha', () => {
    for (let y = 2024; y <= 2032; y += 1) {
      const fechas = getColombianHolidays(y).map((f) => f.date);
      assert.ok(fechas.includes(`${y}-12-25`));
      assert.ok(fechas.includes(`${y}-01-01`));
    }
  });
});

describe('Semana Santa', () => {
  it('Jueves y Viernes Santo NO se trasladan al lunes', () => {
    const f2026 = getColombianHolidays(2026);
    const jueves = f2026.find((f) => f.name === 'Jueves Santo');
    const viernes = f2026.find((f) => f.name === 'Viernes Santo');
    assert.equal(diaSemana(jueves.date), 4);
    assert.equal(diaSemana(viernes.date), 5);
  });

  it('se calculan respecto de la Pascua del año', () => {
    for (let y = 2024; y <= 2030; y += 1) {
      const jueves = getColombianHolidays(y).find((f) => f.name === 'Jueves Santo');
      assert.equal(diaSemana(jueves.date), 4, `Jueves Santo de ${y} no cayó en jueves`);
    }
  });
});

describe('isColombianHoliday', () => {
  it('reconoce un festivo', () => {
    assert.equal(isColombianHoliday('2026-12-25').name, 'Navidad');
    assert.equal(isColombianHoliday('2026-11-16').name, 'Independencia de Cartagena');
  });

  it('devuelve null en un día normal', () => {
    assert.equal(isColombianHoliday('2026-11-17'), null);
    assert.equal(isColombianHoliday('2026-03-10'), null);
  });

  it('devuelve null con entradas inválidas', () => {
    assert.equal(isColombianHoliday(''), null);
    assert.equal(isColombianHoliday(null), null);
    assert.equal(isColombianHoliday('25/12/2026'), null);
  });
});
