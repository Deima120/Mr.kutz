/**
 * Listado de productos e inventario
 */

import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import * as productService from '../../services/productService';

export default function InventoryPage() {
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [showInactive, setShowInactive] = useState(false);
  const [showLowStockOnly, setShowLowStockOnly] = useState(
    searchParams.get('lowStock') === 'true'
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchProducts = async () => {
    setLoading(true);
    setError('');
    try {
      const params = { active: showInactive ? 'false' : undefined };
      if (showLowStockOnly) params.lowStock = 'true';
      const [data, lowData] = await Promise.all([
        productService.getProducts(params),
        productService.getLowStock(),
      ]);
      setProducts(Array.isArray(data) ? data : []);
      setLowStock(Array.isArray(lowData) ? lowData : []);
    } catch (err) {
      setError(err?.message || 'Error al cargar inventario');
      setProducts([]);
      setLowStock([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [showInactive, showLowStockOnly]);

  const handleStockUpdate = async (productId, change, type = 'adjustment') => {
    const note = prompt('Nota (opcional):');
    try {
      await productService.updateStock(productId, {
        quantityChange: change,
        movementType: type,
        notes: note || undefined,
      });
      fetchProducts();
    } catch (err) {
      setError(err?.message || 'Error al actualizar stock');
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`¿Eliminar producto "${name}"?`)) return;
    try {
      await productService.deleteProduct(id);
      fetchProducts();
    } catch (err) {
      setError(err?.message || 'Error al eliminar');
    }
  };

  const isLowStock = (p) => (p.quantity ?? 0) <= (p.min_stock ?? 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-2xl font-semibold text-gray-800">Inventario</h2>
        <Link
          to="/inventory/new"
          className="inline-flex items-center px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium"
        >
          + Nuevo producto
        </Link>
      </div>

      {lowStock.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <h3 className="font-medium text-amber-800 mb-2">
            ⚠️ {lowStock.length} producto(s) con stock bajo
          </h3>
          <ul className="text-sm text-amber-700 space-y-1">
            {lowStock.map((p) => (
              <li key={p.id}>
                {p.name}: {p.quantity} / mínimo {p.min_stock}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap gap-4 items-center">
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            className="rounded border-gray-300"
          />
          Mostrar inactivos
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
          <input
            type="checkbox"
            checked={showLowStockOnly}
            onChange={(e) => setShowLowStockOnly(e.target.checked)}
            className="rounded border-gray-300"
          />
          Solo stock bajo
        </label>
      </div>

      {error && (
        <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>
      )}

      {loading ? (
        <div className="p-12 text-center text-gray-500">Cargando...</div>
      ) : products.length === 0 ? (
        <div className="bg-white rounded-xl shadow border p-12 text-center text-gray-500">
          No hay productos registrados.
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 text-left text-sm text-gray-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Producto</th>
                  <th className="px-4 py-3 font-medium">SKU</th>
                  <th className="px-4 py-3 font-medium">Stock</th>
                  <th className="px-4 py-3 font-medium">Mínimo</th>
                  <th className="px-4 py-3 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {products.map((p) => (
                  <tr
                    key={p.id}
                    className={`hover:bg-gray-50 ${isLowStock(p) ? 'bg-amber-50/50' : ''}`}
                  >
                    <td className="px-4 py-3">
                      <Link
                        to={`/inventory/${p.id}/edit`}
                        className="font-medium text-primary-600 hover:text-primary-700"
                      >
                        {p.name}
                      </Link>
                      {!p.is_active && (
                        <span className="ml-2 text-xs text-gray-500">(inactivo)</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{p.sku || '-'}</td>
                    <td className="px-4 py-3 font-medium">
                      <span className={isLowStock(p) ? 'text-amber-600' : ''}>
                        {p.quantity ?? 0} {p.unit || 'u'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{p.min_stock ?? 0}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleStockUpdate(p.id, 1, 'purchase')}
                          className="text-sm text-green-600 hover:text-green-700"
                          title="+1 entrada"
                        >
                          +1
                        </button>
                        <button
                          onClick={() => handleStockUpdate(p.id, -1, 'sale')}
                          className="text-sm text-blue-600 hover:text-blue-700"
                          title="-1 salida"
                        >
                          -1
                        </button>
                        <button
                          onClick={() => handleDelete(p.id, p.name)}
                          className="text-sm text-red-600 hover:text-red-700"
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
