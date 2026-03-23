/**
 * Formulario crear/editar producto
 */

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import * as productService from '../../services/productService';
import * as productCategoryService from '../../services/productCategoryService';

export default function ProductFormPage() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    sku: '',
    unit: 'unit',
    minStock: 0,
    categoryId: '',
    isActive: true,
  });
  const [productMeta, setProductMeta] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isEdit) {
      productService
        .getProductById(id)
        .then((res) => {
          const p = res?.data ?? res;
          setFormData({
            name: p.name || '',
            description: p.description || '',
            sku: p.sku || '',
            unit: p.unit || 'unit',
            minStock: p.min_stock ?? 0,
            categoryId: p.category_id ?? '',
            isActive: p.is_active !== false,
          });
          setProductMeta({
            quantity: p.quantity ?? 0,
            stockUpdatedAt: p.stock_updated_at,
          });
        })
        .catch(() => setError('Producto no encontrado'));
    }
    productCategoryService
      .getCategories()
      .then((rows) => setCategories(Array.isArray(rows) ? rows : (rows?.data ?? [])))
      .catch(() => setCategories([]));
  }, [id, isEdit]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : type === 'number' ? parseInt(value, 10) || 0 : value,
    }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const payload = {
        name: formData.name,
        description: formData.description || undefined,
        sku: formData.sku || undefined,
        unit: formData.unit || 'unit',
        minStock: formData.minStock,
        categoryId: formData.categoryId ? Number(formData.categoryId) : null,
      };
      if (isEdit) payload.isActive = formData.isActive;

      if (isEdit) {
        await productService.updateProduct(id, payload);
      } else {
        await productService.createProduct(payload);
      }
      navigate('/inventory', { replace: true });
    } catch (err) {
      setError(err?.message || 'Error al guardar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl page-shell">
      <div>
        <p className="section-label text-gold mb-1">Inventario</p>
        <h2 className="font-serif text-2xl sm:text-3xl text-stone-900 font-medium tracking-tight">
          {isEdit ? 'Editar producto' : 'Nuevo producto'}
        </h2>
      </div>

      <form
        onSubmit={handleSubmit}
        className="panel-card overflow-hidden"
      >
        <div className="h-1 w-full bg-gradient-to-r from-gold/80 via-gold to-gold/80" aria-hidden />
        <div className="p-6 sm:p-8 space-y-5">
        {error && (
          <div className="alert-error">{error}</div>
        )}

        <div>
          <label className="label-premium">Nombre *</label>
          <input
            name="name"
            value={formData.name}
            onChange={handleChange}
            className="input-premium"
            required
          />
        </div>

        <div>
          <label className="label-premium">Descripción</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={2}
            className="input-premium resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label-premium">SKU</label>
            <input
              name="sku"
              value={formData.sku}
              onChange={handleChange}
              placeholder="Código único"
              className="input-premium"
            />
          </div>
          <div>
            <label className="label-premium">Unidad</label>
            <select
              name="unit"
              value={formData.unit}
              onChange={handleChange}
              className="input-premium"
            >
              <option value="unit">Unidad</option>
              <option value="ml">ml</option>
              <option value="g">g</option>
              <option value="kg">kg</option>
              <option value="L">L</option>
              <option value="pz">pz</option>
            </select>
          </div>
        </div>

        <div>
          <label className="label-premium">Categoría</label>
          <select
            name="categoryId"
            value={formData.categoryId}
            onChange={handleChange}
            className="input-premium"
          >
            <option value="">Sin categoría</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label-premium">
            Stock mínimo (alerta)
          </label>
          <input
            name="minStock"
            type="number"
            min="0"
            value={formData.minStock}
            onChange={handleChange}
            className="input-premium"
          />
        </div>

        {isEdit && productMeta && (
          <>
            <div className="rounded-lg bg-stone-50 border border-stone-200 p-3 text-sm">
              <p className="text-stone-600">
                Stock actual: <strong>{productMeta.quantity}</strong> {formData.unit === 'unit' ? 'unidades' : formData.unit}
                {productMeta.stockUpdatedAt && (
                  <span className="text-stone-500 block mt-1">
                    Última actualización: {new Date(productMeta.stockUpdatedAt).toLocaleString('es-ES')}
                  </span>
                )}
              </p>
              <p className="text-stone-500 text-xs mt-1">
                Para cambiar el stock usa la página de inventario y el botón &quot;Ajustar&quot;.
              </p>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                name="isActive"
                type="checkbox"
                checked={formData.isActive}
                onChange={handleChange}
                className="rounded border-stone-300"
              />
              <span className="text-sm text-stone-700">Activo</span>
            </label>
          </>
        )}

        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="btn-admin disabled:opacity-50"
          >
            {loading ? 'Guardando...' : 'Guardar'}
          </button>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="btn-admin-outline"
          >
            Cancelar
          </button>
        </div>
        </div>
      </form>
    </div>
  );
}
