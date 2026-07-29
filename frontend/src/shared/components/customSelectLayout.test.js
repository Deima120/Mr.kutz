import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  CUSTOM_SELECT_PANEL_MIN_WIDTH,
  getMenuPositionFromRect,
  resolveSelectVariant,
} from './customSelectLayout.js';

describe('resolveSelectVariant', () => {
  it('mapea aliases a form y deja canónicas intactas', () => {
    assert.equal(resolveSelectVariant('formCompact'), 'form');
    assert.equal(resolveSelectVariant('admin'), 'form');
    assert.equal(resolveSelectVariant('adminCompact'), 'form');
    assert.equal(resolveSelectVariant('filter'), 'filter');
    assert.equal(resolveSelectVariant('public'), 'public');
    assert.equal(resolveSelectVariant('dark'), 'dark');
    assert.equal(resolveSelectVariant('desconocida'), 'form');
  });
});

describe('getMenuPositionFromRect', () => {
  it('ensancha el panel sobre el mínimo cuando el trigger es estrecho', () => {
    const pos = getMenuPositionFromRect(
      { left: 40, top: 100, bottom: 132, width: 120, height: 32, right: 160, x: 40, y: 100, toJSON() {} },
      { viewportWidth: 800, viewportHeight: 600 }
    );
    assert.equal(pos.width, CUSTOM_SELECT_PANEL_MIN_WIDTH);
    assert.ok(pos.top !== 'auto');
  });

  it('no supera el ancho del viewport y reubica left si hace falta', () => {
    const pos = getMenuPositionFromRect(
      { left: 700, top: 100, bottom: 132, width: 100, height: 32, right: 800, x: 700, y: 100, toJSON() {} },
      { viewportWidth: 800, viewportHeight: 600, minWidth: 260, maxWidth: 448 }
    );
    assert.ok(pos.left + pos.width <= 800 - 8);
    assert.ok(pos.width >= 100);
  });

  it('abre hacia arriba cuando no hay espacio abajo', () => {
    const pos = getMenuPositionFromRect(
      { left: 40, top: 560, bottom: 592, width: 300, height: 32, right: 340, x: 40, y: 560, toJSON() {} },
      { viewportWidth: 800, viewportHeight: 600 }
    );
    assert.equal(pos.top, 'auto');
    assert.ok(typeof pos.bottom === 'number');
  });
});
