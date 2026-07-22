import { useState } from 'react';
import * as productService from '@/features/inventory/services/productService';
import {
  sanitizeImportRows,
  validateImportProductRow,
} from '@/features/inventory/models/productFormModel';
import AdminModalShell from '@/shared/components/admin/AdminModalShell';

const TEMPLATE_HEADERS = 'nombre,descripcion,unidad,min_stock,categoria,precio_venta';

function parseCsvLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
      continue;
    }
    current += ch;
  }
  result.push(current.trim());
  return result;
}

function normalizeHeader(header) {
  const h = header.trim().toLowerCase();
  const map = {
    nombre: 'name',
    name: 'name',
    descripcion: 'description',
    description: 'description',
    unidad: 'unit',
    unit: 'unit',
    min_stock: 'minStock',
    minstock: 'minStock',
    categoria: 'categoryName',
    category: 'categoryName',
    precio_venta: 'retailPrice',
    retail_price: 'retailPrice',
    precio_costo: 'costPrice',
    cost_price: 'costPrice',
  };
  return map[h] || h;
}

export function parseProductsCsv(text) {
  const lines = String(text || '')
    .trim()
    .split(/\r?\n/)
    .filter((l) => l.trim());
  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]).map(normalizeHeader);
  return lines.slice(1).map((line) => {
    const cells = parseCsvLine(line);
    const row = {};
    headers.forEach((key, idx) => {
      const value = cells[idx];
      if (value == null || value === '') return;
      if (key === 'minStock') row.minStock = parseInt(value, 10) || 0;
      else if (key === 'retailPrice' || key === 'costPrice') row[key] = Number(value);
      else row[key] = value;
    });
    return row;
  }).filter((r) => r.name);
}

export default function ImportProductsModal({ onClose, onSuccess }) {
  const [preview, setPreview] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setResult(null);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const rows = sanitizeImportRows(parseProductsCsv(reader.result));
        if (rows.length === 0) {
          setError('El archivo no tiene filas válidas.');
          setPreview([]);
          return;
        }
        if (rows.length > 200) {
          setError('Máximo 200 productos por importación.');
          setPreview(rows.slice(0, 200));
          return;
        }

        const invalid = rows.find((row) => !validateImportProductRow(row).valid);
        if (invalid) {
          const validation = validateImportProductRow(invalid);
          setError(`Fila «${invalid.name}»: ${validation.firstError}`);
          setPreview(rows);
          return;
        }

        setPreview(rows);
      } catch {
        setError('No se pudo leer el archivo CSV.');
        setPreview([]);
      }
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (preview.length === 0) return;
    const invalid = preview.find((row) => !validateImportProductRow(row).valid);
    if (invalid) {
      const validation = validateImportProductRow(invalid);
      setError(`Fila «${invalid.name}»: ${validation.firstError}`);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const data = await productService.importProducts(sanitizeImportRows(preview));
      setResult(data);
      onSuccess?.(data);
    } catch (err) {
      setError(err?.message || 'Error al importar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminModalShell
      open
      onClose={onClose}
      title="Importar productos (CSV)"
      subtitle={`Columnas: ${TEMPLATE_HEADERS}`}
      size="lg"
      preventClose={loading}
      footer={
        <div className="flex gap-2">
          <button type="button" onClick={onClose} className="flex-1 btn-admin-outline text-sm">
            {result ? 'Cerrar' : 'Cancelar'}
          </button>
          {!result && (
            <button
              type="button"
              disabled={loading || preview.length === 0}
              onClick={handleImport}
              className="flex-1 btn-admin text-sm disabled:opacity-50"
            >
              {loading ? 'Importando…' : `Importar ${preview.length || ''}`}
            </button>
          )}
        </div>
      }
    >
      {error && <div className="alert-error text-sm py-2 mb-3" role="alert">{error}</div>}

      {result && (
        <div className="rounded-lg bg-emerald-50 border border-emerald-100 px-3 py-2 text-sm text-emerald-800 mb-3">
          {result.created ?? 0} creado(s), {result.failed ?? 0} con error.
        </div>
      )}

      <input type="file" accept=".csv,text/csv" onChange={handleFile} className="text-sm w-full" />

      {preview.length > 0 && (
        <div className="mt-4">
          <p className="text-xs text-stone-500 mb-2">
            Vista previa ({preview.length} fila{preview.length !== 1 ? 's' : ''})
          </p>
          <ul className="text-sm space-y-1 max-h-40 overflow-y-auto border border-stone-100 rounded-lg p-2">
            {preview.slice(0, 8).map((row, i) => (
              <li key={i} className="text-stone-700">
                <strong>{row.name}</strong>
                {row.categoryName ? ` · ${row.categoryName}` : ''}
              </li>
            ))}
            {preview.length > 8 && (
              <li className="text-stone-400 text-xs">… y {preview.length - 8} más</li>
            )}
          </ul>
        </div>
      )}
    </AdminModalShell>
  );
}
