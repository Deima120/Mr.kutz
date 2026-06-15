/**
 * Formulario crear/editar producto
 */

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import * as productService from '@/features/inventory/services/productService';
import * as productCategoryService from '@/features/inventory/services/productCategoryService';
import AdminFormShell, {
  AdminFormCard,
  AdminFormCardHeader,
  ADMIN_FORM_LABEL_CLASS,
  ADMIN_FORM_FIELD_COMPACT,
  ADMIN_FORM_ERROR_CLASS,
  ADMIN_FORM_GRID_CLASS,
  AdminFormFooterActions,
  AdminFormPrimaryButton,
  AdminFormSecondaryButton,
  AdminFormPreviewField,
  AdminFormPreviewPanel,
  AdminFormLoadingButton,
} from '@/shared/components/admin/AdminFormShell';

export function ProductForm({
  embedded = false,
  editId = null,
  onSuccess,
  onCancel,
}) {
  const isEdit = Boolean(editId);
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    unit: 'unit',
    minStock: 0,
    categoryId: '',
    isActive: true,
    retailPrice: '',
  });
  const [productSku, setProductSku] = useState('');
  const [productMeta, setProductMeta] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isEdit && editId) {
      productService
        .getProductById(editId)
        .then((res) => {
          const p = res?.data ?? res;
          setProductSku(p.sku || '');
          setFormData({
            name: p.name || '',
            description: p.description || '',
            unit: p.unit || 'unit',
            minStock: p.min_stock ?? 0,
            categoryId: p.category_id ?? '',
            isActive: p.is_active !== false,
            retailPrice:
              p.retail_price != null && p.retail_price !== '' ? String(p.retail_price) : '',
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
  }, [editId, isEdit]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name === 'retailPrice') {
      setFormData((prev) => ({ ...prev, retailPrice: value }));
      setError('');
      return;
    }
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
        unit: formData.unit || 'unit',
        minStock: formData.minStock,
        categoryId: formData.categoryId ? Number(formData.categoryId) : null,
        retailPrice:
          formData.retailPrice === '' || formData.retailPrice == null
            ? null
            : Number(formData.retailPrice),
      };
      if (isEdit) payload.isActive = formData.isActive;

      if (isEdit) {
        await productService.updateProduct(editId, payload);
      } else {
        await productService.createProduct(payload);
      }
      if (embedded) {
        onSuccess?.({ created: !isEdit, updated: isEdit });
      } else {
        navigate('/inventory', { replace: true });
      }
    } catch (err) {
      setError(err?.message || 'Error al guardar');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (embedded) onCancel?.();
    else navigate(-1);
  };

  const categoryName =
    categories.find((c) => String(c.id) === String(formData.categoryId))?.name || '';

  return (
    <AdminFormShell
      backTo="/inventory"
      backLabel="Inventario"
      onBackClick={embedded ? handleCancel : undefined}
      modeBadge={isEdit ? 'Edición' : 'Alta'}
      fullBleed={!embedded}
      compact={embedded}
      showBackNav={!embedded}
      aside={{
        kicker: 'Vista previa',
        title: isEdit ? 'Producto en edición' : 'Nuevo producto',
        subtitle: formData.name || 'Completa los datos',
        bullets: [],
        statusLabel: 'Estado',
        statusValue: isEdit ? 'Modo edición' : 'Registro nuevo',
        children: (
          <AdminFormPreviewPanel>
            <AdminFormPreviewField label="Nombre" value={formData.name} />
            <AdminFormPreviewField label="SKU" value={isEdit ? productSku : 'Automático'} />
            <AdminFormPreviewField label="Categoría" value={categoryName} />
            <AdminFormPreviewField
              label="Precio venta"
              value={formData.retailPrice ? `$${Number(formData.retailPrice).toFixed(2)}` : ''}
            />
            <AdminFormPreviewField
              label="Stock mínimo"
              value={formData.minStock != null ? String(formData.minStock) : ''}
            />
            {isEdit && productMeta ? (
              <AdminFormPreviewField
                label="Stock actual"
                value={`${productMeta.quantity} ${formData.unit === 'unit' ? 'u' : formData.unit}`}
              />
            ) : null}
          </AdminFormPreviewPanel>
        ),
      }}
    >
      <AdminFormCard onSubmit={handleSubmit}>
          <AdminFormCardHeader
            eyebrow="Producto"
            title={isEdit ? 'Editar producto' : 'Nuevo producto'}
          />

          {error && <div className={ADMIN_FORM_ERROR_CLASS} role="alert">{error}</div>}

          <div className="group shrink-0">
            <label className={ADMIN_FORM_LABEL_CLASS}>Nombre *</label>
            <input name="name" value={formData.name} onChange={handleChange} className={ADMIN_FORM_FIELD_COMPACT} required />
          </div>

          <div className="group shrink-0">
            <label className={ADMIN_FORM_LABEL_CLASS}>Descripción</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={2}
              className={`${ADMIN_FORM_FIELD_COMPACT} resize-none min-h-[3.25rem] max-h-24 leading-snug`}
            />
          </div>

          <div className={`${ADMIN_FORM_GRID_CLASS} sm:grid-cols-2 xl:grid-cols-3`}>
            {isEdit ? (
              <div className="group">
                <label className={ADMIN_FORM_LABEL_CLASS}>SKU</label>
                <input
                  readOnly
                  value={productSku}
                  className={`${ADMIN_FORM_FIELD_COMPACT} bg-stone-50 text-stone-600`}
                />
              </div>
            ) : (
              <div className="group sm:col-span-2 xl:col-span-1">
                <label className={ADMIN_FORM_LABEL_CLASS}>SKU</label>
                <p className="text-sm text-stone-500 py-2">Se asignará automáticamente al guardar.</p>
              </div>
            )}
            <div className="group">
              <label className={ADMIN_FORM_LABEL_CLASS}>Unidad</label>
              <select name="unit" value={formData.unit} onChange={handleChange} className={ADMIN_FORM_FIELD_COMPACT}>
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
              <select name="categoryId" value={formData.categoryId} onChange={handleChange} className={ADMIN_FORM_FIELD_COMPACT}>
                <option value="">Sin categoría</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className={`${ADMIN_FORM_GRID_CLASS} max-w-xl`}>
            <div className="group">
              <label className={ADMIN_FORM_LABEL_CLASS}>Precio de venta ($)</label>
              <input
                name="retailPrice"
                type="number"
                step="0.01"
                min="0"
                value={formData.retailPrice}
                onChange={handleChange}
                placeholder="Opcional"
                className={ADMIN_FORM_FIELD_COMPACT}
              />
            </div>
            <div className="group">
              <label className={ADMIN_FORM_LABEL_CLASS}>Stock mínimo (alerta)</label>
              <input name="minStock" type="number" min="0" value={formData.minStock} onChange={handleChange} className={ADMIN_FORM_FIELD_COMPACT} />
            </div>
          </div>

          {isEdit && productMeta && (
            <>
              <div className="rounded-xl bg-stone-50/90 border border-stone-200/90 p-3 text-sm shrink-0">
                <p className="text-stone-600">
                  Stock actual: <strong>{productMeta.quantity}</strong>{' '}
                  {formData.unit === 'unit' ? 'unidades' : formData.unit}
                </p>
                {productMeta.stockUpdatedAt && (
                  <p className="text-stone-500 text-xs mt-1">
                    Última actualización: {new Date(productMeta.stockUpdatedAt).toLocaleString('es-ES')}
                  </p>
                )}
                <p className="text-stone-500 text-xs mt-2 inline-flex flex-wrap items-center gap-1">
                  <span>Para ajustar cantidad usa inventario</span>
                  <ArrowRight className="w-3 h-3 shrink-0 text-stone-400" strokeWidth={2} aria-hidden />
                  <span>Ajustar.</span>
                </p>
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

          <AdminFormFooterActions className="mt-1">
            <AdminFormPrimaryButton disabled={loading}>
              <AdminFormLoadingButton loading={loading} loadingLabel="Guardando…">
                Guardar producto
              </AdminFormLoadingButton>
            </AdminFormPrimaryButton>
            <AdminFormSecondaryButton onClick={handleCancel}>Cancelar</AdminFormSecondaryButton>
          </AdminFormFooterActions>
      </AdminFormCard>
    </AdminFormShell>
  );
}

export default function ProductFormPage() {
  const { id } = useParams();
  return <ProductForm editId={id ? parseInt(id, 10) : null} />;
}
