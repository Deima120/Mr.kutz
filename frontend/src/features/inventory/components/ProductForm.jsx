/**
 * Formulario de producto compartido (página, embedded, modal).
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import * as productService from '@/features/inventory/services/productService';
import * as productCategoryService from '@/features/inventory/services/productCategoryService';
import {
  createEmptyProductForm,
  mapProductToForm,
  getProductMetaFromApi,
  buildProductPayload,
  validateProductFormData,
} from '@/features/inventory/models/productFormModel';
import {
  getApiErrorMessage,
  validateRequiredField,
  validateMoney,
  validateNonNegativeInt,
  TEXT_NAME_MAX,
  TEXT_DESCRIPTION_MAX,
} from '@/shared/utils/formValidation';
import { useFormValidation } from '@/shared/hooks/useFormValidation';
import { AdminFormField } from '@/shared/components/FormValidationFields';
import CustomSelect, { formSelectEvent } from '@/shared/components/CustomSelect';
import AdminFormShell, {
  AdminFormCard,
  AdminFormCardHeader,
  ADMIN_FORM_LABEL_CLASS,
  ADMIN_FORM_FIELD_COMPACT,
  ADMIN_FORM_ERROR_CLASS,
  ADMIN_FORM_GRID_CLASS,
  AdminFormFooterActions,
  AdminFormPrimaryButton,
  AdminFormPreviewField,
  AdminFormPreviewPanel,
  AdminFormLoadingButton,
} from '@/shared/components/admin/AdminFormShell';

/**
 * @param {'page'|'embedded'|'modal'} variant
 * @param {string} [initialName] Prefill al crear (p. ej. desde ProductPicker)
 */
export function ProductForm({
  embedded = false,
  variant: variantProp,
  editId = null,
  initialName = '',
  onSuccess,
  onCancel,
}) {
  const isEdit = Boolean(editId);
  const variant = variantProp || (embedded ? 'embedded' : 'page');
  const isModal = variant === 'modal';
  const navigate = useNavigate();
  const [formData, setFormData] = useState(() =>
    createEmptyProductForm(initialName ? { name: String(initialName).slice(0, TEXT_NAME_MAX) } : {})
  );
  const [productSku, setProductSku] = useState('');
  const [productMeta, setProductMeta] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { fieldError, applyValidation, clearFieldError, markTouched, buildLiveHint } = useFormValidation();

  const nameValidation = useMemo(
    () => validateRequiredField(formData.name, 'El nombre'),
    [formData.name]
  );
  const retailValidation = useMemo(
    () => validateMoney(formData.retailPrice, 'El precio de venta', { required: false, min: 0.01 }),
    [formData.retailPrice]
  );
  const minStockValidation = useMemo(
    () =>
      validateNonNegativeInt(
        formData.minStock != null ? String(formData.minStock) : '',
        'El stock mínimo',
        { required: false }
      ),
    [formData.minStock]
  );

  useEffect(() => {
    if (isEdit && editId) {
      productService
        .getProductById(editId)
        .then((res) => {
          const p = res?.data ?? res;
          setProductSku(p.sku || '');
          setFormData(mapProductToForm(p));
          setProductMeta(getProductMetaFromApi(p));
        })
        .catch(() => setError('Producto no encontrado'));
    } else if (initialName) {
      setFormData((prev) => ({
        ...prev,
        name: String(initialName).slice(0, TEXT_NAME_MAX),
      }));
    }
    productCategoryService
      .getCategories()
      .then((rows) => setCategories(Array.isArray(rows) ? rows : (rows?.data ?? [])))
      .catch(() => setCategories([]));
  }, [editId, isEdit, initialName]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name === 'retailPrice') {
      setFormData((prev) => ({ ...prev, [name]: value }));
      setError('');
      clearFieldError(name);
      return;
    }
    let next = type === 'checkbox' ? checked : type === 'number' ? parseInt(value, 10) || 0 : value;
    if (name === 'name') next = String(value).slice(0, TEXT_NAME_MAX);
    else if (name === 'description') next = String(value).slice(0, TEXT_DESCRIPTION_MAX);
    setFormData((prev) => ({
      ...prev,
      [name]: next,
    }));
    setError('');
    clearFieldError(name);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    const validation = validateProductFormData(formData);
    if (!applyValidation(validation)) {
      setError(validation.firstError);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const payload = buildProductPayload(formData, { isEdit });
      let product;
      if (isEdit) {
        product = await productService.updateProduct(editId, payload);
        onSuccess?.({ created: false, updated: true, product: product?.data ?? product });
      } else {
        product = await productService.createProduct(payload);
        const created = product?.data ?? product;
        onSuccess?.({ created: true, updated: false, product: created });
      }
      if (variant === 'page') {
        navigate('/inventory', { replace: true });
      }
    } catch (err) {
      setError(getApiErrorMessage(err, 'Error al guardar'));
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (variant === 'page') navigate(-1);
    else onCancel?.();
  };

  const categoryName =
    categories.find((c) => String(c.id) === String(formData.categoryId))?.name || '';

  const fields = (
    <>
      {error && <div className={ADMIN_FORM_ERROR_CLASS} role="alert">{error}</div>}

      <AdminFormField
        label="Nombre"
        htmlFor={`product-name-${variant}`}
        required
        error={fieldError('name')}
        live={buildLiveHint('name', formData.name, nameValidation, 'Nombre válido.')}
      >
        {({ errorId, invalid, liveBorderClass, submitBorderClass }) => (
          <input
            id={`product-name-${variant}`}
            name="name"
            value={formData.name}
            onChange={handleChange}
            onBlur={() => markTouched('name')}
            className={`${ADMIN_FORM_FIELD_COMPACT} ${submitBorderClass || liveBorderClass}`}
            maxLength={TEXT_NAME_MAX}
            aria-invalid={invalid || undefined}
            aria-describedby={errorId}
            autoFocus={isModal && !isEdit}
          />
        )}
      </AdminFormField>

      <div className="group shrink-0">
        <label className={ADMIN_FORM_LABEL_CLASS}>Descripción</label>
        <textarea
          name="description"
          value={formData.description}
          onChange={handleChange}
          rows={2}
          maxLength={TEXT_DESCRIPTION_MAX}
          className={`${ADMIN_FORM_FIELD_COMPACT} resize-none min-h-[3.25rem] max-h-24 leading-snug`}
        />
      </div>

      <div className={`${ADMIN_FORM_GRID_CLASS} sm:grid-cols-2 ${isModal ? '' : 'xl:grid-cols-3'}`}>
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
          <div className={`group ${isModal ? '' : 'sm:col-span-2 xl:col-span-1'}`}>
            <label className={ADMIN_FORM_LABEL_CLASS}>SKU</label>
            <p className="text-sm text-stone-500 py-2">Se asignará automáticamente al guardar.</p>
          </div>
        )}
        <div className="group">
          <label className={ADMIN_FORM_LABEL_CLASS}>Unidad</label>
          <input
            readOnly
            tabIndex={-1}
            value={formData.unit || 'unit'}
            className={`${ADMIN_FORM_FIELD_COMPACT} bg-stone-50 text-stone-600 cursor-default`}
            aria-readonly="true"
          />
        </div>
        <div className={`group ${isModal ? 'sm:col-span-2' : 'sm:col-span-2 xl:col-span-1'}`}>
          <label className={ADMIN_FORM_LABEL_CLASS}>Categoría</label>
          <CustomSelect
            name="categoryId"
            value={formData.categoryId}
            onChange={formSelectEvent('categoryId', handleChange)}
            placeholder="Sin categoría"
            variant="formCompact"
            options={[
              { id: '', label: 'Sin categoría' },
              ...categories.map((c) => ({ id: String(c.id), label: c.name })),
            ]}
          />
        </div>
      </div>

      <div className={`${ADMIN_FORM_GRID_CLASS} ${isModal ? '' : 'max-w-xl'}`}>
        {!isModal && (
          <AdminFormField label="Costo promedio ($)" htmlFor="product-cost">
            <input
              id="product-cost"
              readOnly
              tabIndex={-1}
              value={formData.costPrice || 'Pendiente de recepción'}
              className={`${ADMIN_FORM_FIELD_COMPACT} bg-stone-50 text-stone-600 cursor-default`}
              aria-readonly="true"
            />
          </AdminFormField>
        )}
        <AdminFormField
          label="Precio de venta ($)"
          htmlFor={`product-retail-${variant}`}
          error={fieldError('retailPrice')}
          live={buildLiveHint('retailPrice', formData.retailPrice, retailValidation, 'Precio válido.')}
        >
          {({ errorId, invalid, liveBorderClass, submitBorderClass }) => (
            <input
              id={`product-retail-${variant}`}
              name="retailPrice"
              type="number"
              step="0.01"
              min="0.01"
              value={formData.retailPrice}
              onChange={handleChange}
              onBlur={() => markTouched('retailPrice')}
              placeholder="Opcional"
              className={`${ADMIN_FORM_FIELD_COMPACT} ${submitBorderClass || liveBorderClass}`}
              aria-invalid={invalid || undefined}
              aria-describedby={errorId}
            />
          )}
        </AdminFormField>
        <AdminFormField
          label="Stock mínimo (alerta)"
          htmlFor={`product-min-stock-${variant}`}
          error={fieldError('minStock')}
          live={buildLiveHint('minStock', formData.minStock, minStockValidation, 'Valor válido.')}
        >
          {({ errorId, invalid, liveBorderClass, submitBorderClass }) => (
            <input
              id={`product-min-stock-${variant}`}
              name="minStock"
              type="number"
              min="0"
              value={formData.minStock}
              onChange={handleChange}
              onBlur={() => markTouched('minStock')}
              className={`${ADMIN_FORM_FIELD_COMPACT} ${submitBorderClass || liveBorderClass}`}
              aria-invalid={invalid || undefined}
              aria-describedby={errorId}
            />
          )}
        </AdminFormField>
      </div>

      {isEdit && productMeta && !isModal && (
        <>
          <div className="rounded-xl bg-stone-50/90 border border-stone-200/90 p-3 text-sm shrink-0">
            <p className="text-stone-600">
              Stock actual: <strong>{productMeta.quantity}</strong> unidades
            </p>
            {productMeta.stockUpdatedAt && (
              <p className="text-stone-500 text-xs mt-1">
                Última actualización: {new Date(productMeta.stockUpdatedAt).toLocaleString('es-ES')}
              </p>
            )}
            <p className="text-stone-500 text-xs mt-2 inline-flex flex-wrap items-center gap-1">
              <span>El stock entra por Compras</span>
              <ArrowRight className="w-3 h-3 shrink-0 text-stone-400" strokeWidth={2} aria-hidden />
              <span>Recibir mercancía.</span>
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
        {isModal ? (
          <button
            type="button"
            onClick={handleCancel}
            disabled={loading}
            className="btn-admin-outline text-sm py-2 px-3"
          >
            Cancelar
          </button>
        ) : null}
        <AdminFormPrimaryButton disabled={loading}>
          <AdminFormLoadingButton loading={loading} loadingLabel="Guardando…">
            Guardar producto
          </AdminFormLoadingButton>
        </AdminFormPrimaryButton>
      </AdminFormFooterActions>
    </>
  );

  if (isModal) {
    return (
      <form onSubmit={handleSubmit} noValidate className="space-y-3">
        <header className="shrink-0">
          <p className="text-[10px] font-semibold tracking-[0.28em] text-gold mb-1">Producto</p>
          <h2 className="font-serif text-xl text-stone-900 font-medium tracking-tight">
            {isEdit ? 'Editar producto' : 'Nuevo producto'}
          </h2>
        </header>
        {fields}
      </form>
    );
  }

  return (
    <AdminFormShell
      backTo="/inventory"
      onBackClick={variant !== 'page' ? handleCancel : undefined}
      modeBadge={isEdit ? 'Edición' : 'Alta'}
      fullBleed={variant === 'page'}
      compact={variant !== 'page'}
      showBackNav
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
              label="Precio costo"
              value={formData.costPrice ? `$${Number(formData.costPrice).toFixed(2)}` : ''}
            />
            <AdminFormPreviewField
              label="Precio venta"
              value={formData.retailPrice ? `$${Number(formData.retailPrice).toFixed(2)}` : ''}
            />
            {formData.retailPrice && formData.costPrice ? (
              <AdminFormPreviewField
                label="Margen unitario"
                value={`$${(Number(formData.retailPrice) - Number(formData.costPrice)).toFixed(2)}`}
              />
            ) : null}
            <AdminFormPreviewField
              label="Stock mínimo"
              value={formData.minStock != null ? String(formData.minStock) : ''}
            />
            {isEdit && productMeta ? (
              <AdminFormPreviewField label="Stock actual" value={`${productMeta.quantity} u`} />
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
        {fields}
      </AdminFormCard>
    </AdminFormShell>
  );
}
