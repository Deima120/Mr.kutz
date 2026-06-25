/**
 * Formulario crear/editar servicio
 */

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import * as serviceService from '@/features/services/services/serviceService';
import ServiceStatusToggle from '@/features/services/components/ServiceStatusToggle';
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

export function ServiceForm({
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
    categoryName: 'Cortes',
    price: '',
    durationMinutes: '',
    isActive: true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    serviceService
      .getServiceCategories()
      .then((rows) => setCategories(Array.isArray(rows) ? rows : []))
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    if (isEdit && editId) {
      serviceService
        .getServiceById(editId)
        .then((s) => {
          setFormData({
            name: s.name || '',
            description: s.description || '',
            categoryName: (() => {
              const c = s.category_name || 'Cortes';
              const n = String(c).trim().toLowerCase();
              if (n === 'general' || n === 'barbas') return n === 'barbas' ? 'Barba' : 'Cortes';
              return c;
            })(),
            price: s.price?.toString() || '',
            durationMinutes: s.duration_minutes?.toString() || '',
            isActive: s.is_active !== false,
          });
        })
        .catch(() => setError('Servicio no encontrado'));
    }
  }, [editId, isEdit]);

  const namesFromApi = categories
    .map((c) => c.name)
    .filter(Boolean)
    .filter((n) => {
      const x = String(n).trim().toLowerCase();
      return x !== 'general' && x !== 'barbas';
    });
  const categorySelectOptions = (() => {
    const base =
      namesFromApi.length > 0
        ? [...namesFromApi].sort((a, b) => a.localeCompare(b, 'es'))
        : ['Cortes'];
    const current = formData.categoryName?.trim();
    if (current && !base.some((n) => n.toLowerCase() === current.toLowerCase())) {
      return [...base, current].sort((a, b) => a.localeCompare(b, 'es'));
    }
    return base;
  })();

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
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
        categoryName: formData.categoryName,
        description: formData.description || undefined,
        price: parseFloat(formData.price),
        durationMinutes: parseInt(formData.durationMinutes, 10),
        isActive: formData.isActive,
      };

      if (isEdit) {
        await serviceService.updateService(editId, payload);
      } else {
        await serviceService.createService(payload);
      }
      if (embedded) {
        onSuccess?.({ created: !isEdit, updated: isEdit });
      } else {
        navigate('/services', { replace: true });
      }
    } catch (err) {
      const msg = err?.errors?.[0]?.message || err?.message || 'Error al guardar';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (embedded) onCancel?.();
    else navigate(-1);
  };

  return (
    <AdminFormShell
      backTo="/services"
      backLabel="Servicios"
      onBackClick={embedded ? handleCancel : undefined}
      modeBadge={isEdit ? 'Edición' : 'Alta'}
      fullBleed={!embedded}
      compact={embedded}
      showBackNav={!embedded}
      aside={{
        kicker: 'Vista previa',
        title: isEdit ? 'Servicio en edición' : 'Nuevo servicio',
        subtitle: formData.name || 'Completa los datos',
        bullets: [],
        statusLabel: 'Estado',
        statusValue: formData.isActive ? 'Activo' : 'Inactivo',
        children: (
          <AdminFormPreviewPanel>
            <AdminFormPreviewField label="Nombre" value={formData.name} />
            <AdminFormPreviewField label="Categoría" value={formData.categoryName} />
            <AdminFormPreviewField
              label="Estado"
              value={formData.isActive ? 'Activo (visible al agendar)' : 'Inactivo (oculto al agendar)'}
            />
            <AdminFormPreviewField
              label="Precio"
              value={formData.price ? `$${parseFloat(formData.price).toFixed(2)}` : ''}
            />
            <AdminFormPreviewField
              label="Duración"
              value={formData.durationMinutes ? `${formData.durationMinutes} min` : ''}
            />
            {formData.description ? (
              <AdminFormPreviewField label="Descripción" value={formData.description} multiline />
            ) : null}
          </AdminFormPreviewPanel>
        ),
      }}
    >
      <AdminFormCard onSubmit={handleSubmit}>
          <AdminFormCardHeader
            eyebrow="Servicio"
            title={isEdit ? 'Editar servicio' : 'Nuevo servicio'}
          />

          {error && <div className={ADMIN_FORM_ERROR_CLASS} role="alert">{error}</div>}

          <div className="group shrink-0">
            <label htmlFor="service-name" className={ADMIN_FORM_LABEL_CLASS}>
              Nombre <span className="text-red-600 normal-case">*</span>
            </label>
            <input
              id="service-name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className={ADMIN_FORM_FIELD_COMPACT}
              required
            />
          </div>

          <div className="group shrink-0">
            <label htmlFor="service-description" className={ADMIN_FORM_LABEL_CLASS}>
              Descripción
            </label>
            <textarea
              id="service-description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={2}
              className={`${ADMIN_FORM_FIELD_COMPACT} resize-none min-h-[3.25rem] max-h-24 leading-snug`}
            />
          </div>

          <div className={`${ADMIN_FORM_GRID_CLASS} sm:grid-cols-2 xl:grid-cols-3`}>
            <div className="group sm:col-span-2 xl:col-span-1">
              <label htmlFor="service-category" className={ADMIN_FORM_LABEL_CLASS}>
                Categoría
              </label>
              <select
                id="service-category"
                name="categoryName"
                value={formData.categoryName}
                onChange={handleChange}
                className={ADMIN_FORM_FIELD_COMPACT}
              >
                {categorySelectOptions.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
            <div className="group">
              <label htmlFor="service-price" className={ADMIN_FORM_LABEL_CLASS}>
                Precio ($) <span className="text-red-600 normal-case">*</span>
              </label>
              <input
                id="service-price"
                name="price"
                type="number"
                step="0.01"
                min="0"
                value={formData.price}
                onChange={handleChange}
                className={ADMIN_FORM_FIELD_COMPACT}
                required
              />
            </div>
            <div className="group">
              <label htmlFor="service-duration" className={ADMIN_FORM_LABEL_CLASS}>
                Duración (min) <span className="text-red-600 normal-case">*</span>
              </label>
              <input
                id="service-duration"
                name="durationMinutes"
                type="number"
                min="1"
                value={formData.durationMinutes}
                onChange={handleChange}
                className={ADMIN_FORM_FIELD_COMPACT}
                required
              />
            </div>
          </div>

          <div className="shrink-0 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-stone-200/90 bg-stone-50/80 px-3.5 py-3">
            <div>
              <p className="text-[11px] font-bold tracking-wider text-stone-500 mb-1">Disponibilidad</p>
              <p className="text-sm text-stone-700">
                {formData.isActive
                  ? 'Visible al agendar citas (web y panel)'
                  : 'Oculto al agendar; puedes reactivarlo cuando quieras'}
              </p>
            </div>
            <ServiceStatusToggle
              active={formData.isActive}
              onClick={() =>
                setFormData((prev) => ({ ...prev, isActive: !prev.isActive }))
              }
            />
          </div>

          <AdminFormFooterActions className="mt-1">
            <AdminFormPrimaryButton disabled={loading}>
              <AdminFormLoadingButton loading={loading} loadingLabel="Guardando…">
                Guardar servicio
              </AdminFormLoadingButton>
            </AdminFormPrimaryButton>
            <AdminFormSecondaryButton onClick={handleCancel}>Cancelar</AdminFormSecondaryButton>
          </AdminFormFooterActions>
      </AdminFormCard>
    </AdminFormShell>
  );
}

export default function ServiceFormPage() {
  const { id } = useParams();
  return <ServiceForm editId={id ? parseInt(id, 10) : null} />;
}
