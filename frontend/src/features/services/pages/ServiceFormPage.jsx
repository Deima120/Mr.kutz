/**
 * Formulario crear/editar servicio
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import * as serviceService from '@/features/services/services/serviceService';
import ServiceStatusToggle from '@/features/services/components/ServiceStatusToggle';
import { validateServiceForm, getApiErrorMessage, validateRequiredField, validateMoney, validatePositiveInt } from '@/shared/utils/formValidation';
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
  const { fieldError, applyValidation, clearFieldError, markTouched, buildLiveHint } =
    useFormValidation();

  const nameValidation = useMemo(
    () => validateRequiredField(formData.name, 'El nombre'),
    [formData.name]
  );
  const priceValidation = useMemo(
    () => validateMoney(formData.price, 'El precio', { required: true, min: 0 }),
    [formData.price]
  );
  const durationValidation = useMemo(
    () => validatePositiveInt(formData.durationMinutes, 'La duración', { required: true, min: 1 }),
    [formData.durationMinutes]
  );

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
    clearFieldError(name);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validation = validateServiceForm(formData);
    if (!applyValidation(validation)) {
      setError(validation.firstError);
      return;
    }
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
      setError(getApiErrorMessage(err, 'Error al guardar'));
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
      onBackClick={embedded ? handleCancel : undefined}
      modeBadge={isEdit ? 'Edición' : 'Alta'}
      fullBleed={!embedded}
      compact={embedded}
      showBackNav
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

          <AdminFormField
            label="Nombre"
            htmlFor="service-name"
            required
            error={fieldError('name')}
            live={buildLiveHint('name', formData.name, nameValidation, 'Nombre válido.')}
          >
            {({ errorId, invalid, liveBorderClass, submitBorderClass }) => (
              <input
                id="service-name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                onBlur={() => markTouched('name')}
                className={`${ADMIN_FORM_FIELD_COMPACT} ${submitBorderClass || liveBorderClass}`}
                aria-invalid={invalid || undefined}
                aria-describedby={errorId}
              />
            )}
          </AdminFormField>

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
              <CustomSelect
                id="service-category"
                name="categoryName"
                value={formData.categoryName}
                onChange={formSelectEvent('categoryName', handleChange)}
                variant="formCompact"
                options={categorySelectOptions.map((name) => ({ id: name, label: name }))}
              />
            </div>
            <AdminFormField
              label="Precio ($)"
              htmlFor="service-price"
              required
              error={fieldError('price')}
              live={buildLiveHint('price', formData.price, priceValidation, 'Precio válido.')}
            >
              {({ errorId, invalid, liveBorderClass, submitBorderClass }) => (
                <input
                  id="service-price"
                  name="price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price}
                  onChange={handleChange}
                  onBlur={() => markTouched('price')}
                  className={`${ADMIN_FORM_FIELD_COMPACT} ${submitBorderClass || liveBorderClass}`}
                  aria-invalid={invalid || undefined}
                  aria-describedby={errorId}
                />
              )}
            </AdminFormField>
            <AdminFormField
              label="Duración (min)"
              htmlFor="service-duration"
              required
              error={fieldError('durationMinutes')}
              live={buildLiveHint('durationMinutes', formData.durationMinutes, durationValidation, 'Duración válida.')}
            >
              {({ errorId, invalid, liveBorderClass, submitBorderClass }) => (
                <input
                  id="service-duration"
                  name="durationMinutes"
                  type="number"
                  min="1"
                  value={formData.durationMinutes}
                  onChange={handleChange}
                  onBlur={() => markTouched('durationMinutes')}
                  className={`${ADMIN_FORM_FIELD_COMPACT} ${submitBorderClass || liveBorderClass}`}
                  aria-invalid={invalid || undefined}
                  aria-describedby={errorId}
                />
              )}
            </AdminFormField>
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
          </AdminFormFooterActions>
      </AdminFormCard>
    </AdminFormShell>
  );
}

export default function ServiceFormPage() {
  const { id } = useParams();
  return <ServiceForm editId={id ? parseInt(id, 10) : null} />;
}
