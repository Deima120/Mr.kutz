/**
 * Formulario crear/editar servicio
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import * as serviceService from '@/features/services/services/serviceService';
import ServiceStatusToggle from '@/features/services/components/ServiceStatusToggle';
import { validateServiceForm, getApiErrorMessage, validateRequiredField, validateMoney, validatePositiveInt, TEXT_NAME_MAX, TEXT_DESCRIPTION_MAX } from '@/shared/utils/formValidation';
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
import { formatMoney } from '@/shared/utils/money';

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
    comboComponentIds: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [categories, setCategories] = useState([]);
  const [allServices, setAllServices] = useState([]);
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
    // Para el selector "¿qué servicios incluye?" de un combo — todos los
    // servicios activos, sin paginar (mismo catálogo pequeño que ya usa
    // AppointmentForm.jsx).
    serviceService
      .getServices({ active: 'true' })
      .then((rows) => setAllServices(Array.isArray(rows) ? rows : []))
      .catch(() => setAllServices([]));
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
            comboComponentIds: (s.combo_components || []).map((c) => c.id),
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

  const isComboCategory = formData.categoryName?.trim().toLowerCase() === 'combos';
  // Solo servicios individuales (no otros combos, para no anidar combos) y
  // nunca el propio servicio en edición.
  const comboComponentOptions = allServices.filter(
    (s) =>
      s.id !== editId &&
      String(s.category_name || '').trim().toLowerCase() !== 'combos'
  );

  const toggleComboComponent = (serviceId) => {
    setFormData((prev) => {
      const has = prev.comboComponentIds.includes(serviceId);
      return {
        ...prev,
        comboComponentIds: has
          ? prev.comboComponentIds.filter((id) => id !== serviceId)
          : [...prev.comboComponentIds, serviceId],
      };
    });
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    let next = type === 'checkbox' ? checked : value;
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
        // Solo se manda (y solo tiene efecto en el backend) cuando la
        // categoría es "Combos"; en cualquier otra categoría se manda vacío
        // para no dejar una composición vieja colgando si cambia de categoría.
        comboComponentIds: isComboCategory ? formData.comboComponentIds : [],
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
              value={formData.price ? formatMoney(formData.price) : ''}
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
                maxLength={TEXT_NAME_MAX}
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
              maxLength={TEXT_DESCRIPTION_MAX}
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
                variant="form"
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

          {isComboCategory && (
            <div className="group shrink-0">
              <label className={ADMIN_FORM_LABEL_CLASS}>¿Qué servicios incluye este combo?</label>
              <p className="text-xs text-stone-500 mb-2">
                Se usa para bloquear un servicio o este combo en una cita cuando el cliente ya lo
                va a recibir gratis por un premio de fidelización.
              </p>
              {comboComponentOptions.length === 0 ? (
                <p className="text-sm text-stone-500">No hay otros servicios disponibles.</p>
              ) : (
                <ul className="rounded-xl border border-stone-200/90 bg-white divide-y divide-stone-100 max-h-44 overflow-y-auto">
                  {comboComponentOptions.map((s) => {
                    const checked = formData.comboComponentIds.includes(s.id);
                    return (
                      <li key={s.id}>
                        <label className="flex items-center gap-3 px-3 py-2.5 text-sm cursor-pointer hover:bg-stone-50 transition-colors">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleComboComponent(s.id)}
                            className="h-4 w-4 rounded border-stone-300 text-gold-dark focus:ring-gold-dark"
                          />
                          <span className="min-w-0 flex-1">
                            <span className="font-medium text-stone-900 block truncate">{s.name}</span>
                            {s.category_name && (
                              <span className="text-xs text-stone-400 truncate block">{s.category_name}</span>
                            )}
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}

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
