/**
 * Formulario crear/editar producto
 */

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import * as productService from '../../services/productService';
import * as productCategoryService from '../../services/productCategoryService';
import AdminFormShell, {
  AdminFormCardHeader,
  ADMIN_FORM_FIELD_CLASS,
  ADMIN_FORM_LABEL_CLASS,
  AdminFormFooterActions,
  AdminFormPrimaryButton,
  AdminFormSecondaryButton,
} from '../../components/admin/AdminFormShell';

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
    <AdminFormShell
      backTo="/inventory"
      backLabel="Inventario"
      modeBadge={isEdit ? 'Edición' : 'Alta'}
      aside={{
        kicker: 'Stock',
        title: 'Inventario ordenado',
        bullets: [
          'SKU y categoría facilitan informes y compras.',
          'El stock mínimo dispara alertas en el listado principal.',
          'Los movimientos de cantidad se hacen desde inventario con «Ajustar».',
        ],
        statusLabel: 'Estado',
        statusValue: isEdit ? 'Modo edición' : 'Alta nueva',
      }}
    >
      <form
        onSubmit={handleSubmit}
        className="relative h-full min-h-0 flex flex-col rounded-[1.28rem] bg-white/88 backdrop-blur-xl border border-white shadow-[inset_0_1px_0_rgba(255,255,255,0.92)] overflow-hidden"
      >
        <div className="h-[3px] w-full shrink-0 bg-gradient-to-r from-gold-dark/80 via-gold to-gold-light/80" aria-hidden />
        <div className="px-5 py-4 sm:px-7 sm:py-5 flex flex-col gap-4 flex-1 min-h-0 overflow-y-auto">
          <AdminFormCardHeader
            eyebrow="Producto"
            title={isEdit ? 'Editar producto' : 'Nuevo producto'}
          />

          {error && <div className="alert-error text-sm py-2.5 shrink-0">{error}</div>}

          <div className="group">
            <label className={ADMIN_FORM_LABEL_CLASS}>Nombre *</label>
            <input name="name" value={formData.name} onChange={handleChange} className={ADMIN_FORM_FIELD_CLASS} required />
          </div>

          <div className="group">
            <label className={ADMIN_FORM_LABEL_CLASS}>Descripción</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={2}
              className={`${ADMIN_FORM_FIELD_CLASS} resize-none min-h-[3.5rem]`}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
            <div className="group">
              <label className={ADMIN_FORM_LABEL_CLASS}>SKU</label>
              <input name="sku" value={formData.sku} onChange={handleChange} placeholder="Código único" className={ADMIN_FORM_FIELD_CLASS} />
            </div>
            <div className="group">
              <label className={ADMIN_FORM_LABEL_CLASS}>Unidad</label>
              <select name="unit" value={formData.unit} onChange={handleChange} className={ADMIN_FORM_FIELD_CLASS}>
                <option value="unit">Unidad</option>
                <option value="ml">ml</option>
                <option value="g">g</option>
                <option value="kg">kg</option>
                <option value="L">L</option>
                <option value="pz">pz</option>
              </select>
            </div>
            <div className="group sm:col-span-2 xl:col-span-1">
              <label className={ADMIN_FORM_LABEL_CLASS}>Categoría</label>
              <select name="categoryId" value={formData.categoryId} onChange={handleChange} className={ADMIN_FORM_FIELD_CLASS}>
                <option value="">Sin categoría</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="group max-w-xs">
            <label className={ADMIN_FORM_LABEL_CLASS}>Stock mínimo (alerta)</label>
            <input name="minStock" type="number" min="0" value={formData.minStock} onChange={handleChange} className={ADMIN_FORM_FIELD_CLASS} />
          </div>

          {isEdit && productMeta && (
            <>
              <div className="rounded-xl bg-stone-50/90 border border-stone-200/90 p-4 text-sm shadow-inner">
                <p className="text-stone-600">
                  Stock actual: <strong>{productMeta.quantity}</strong>{' '}
                  {formData.unit === 'unit' ? 'unidades' : formData.unit}
                </p>
                {productMeta.stockUpdatedAt && (
                  <p className="text-stone-500 text-xs mt-1">
                    Última actualización: {new Date(productMeta.stockUpdatedAt).toLocaleString('es-ES')}
                  </p>
                )}
                <p className="text-stone-500 text-xs mt-2">Para ajustar cantidad usa inventario → Ajustar.</p>
              </div>
              <label className="flex items-center gap-2 cursor-pointer shrink-0">
                <input
                  name="isActive"
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={handleChange}
                  className="rounded border-stone-300 text-gold focus:ring-gold/40"
                />
                <span className="text-sm text-stone-700">Activo</span>
              </label>
            </>
          )}

          <AdminFormFooterActions className="mt-auto">
            <AdminFormPrimaryButton disabled={loading}>{loading ? 'Guardando…' : 'Guardar'}</AdminFormPrimaryButton>
            <AdminFormSecondaryButton onClick={() => navigate(-1)}>Cancelar</AdminFormSecondaryButton>
          </AdminFormFooterActions>
        </div>
      </form>
    </AdminFormShell>
  );
}
