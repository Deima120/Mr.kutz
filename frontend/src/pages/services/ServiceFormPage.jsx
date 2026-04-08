/**
 * Formulario crear/editar servicio
 */

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import * as serviceService from '../../services/serviceService';
import AdminFormShell, {
  AdminFormCardHeader,
  ADMIN_FORM_FIELD_CLASS,
  ADMIN_FORM_LABEL_CLASS,
  AdminFormFooterActions,
  AdminFormPrimaryButton,
  AdminFormSecondaryButton,
} from '../../components/admin/AdminFormShell';

export default function ServiceFormPage() {
  const { id } = useParams();
  const isEdit = !!id;
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
    if (isEdit) {
      serviceService
        .getServiceById(id)
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
  }, [id, isEdit]);

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
      };
      if (isEdit) payload.isActive = formData.isActive;

      if (isEdit) {
        await serviceService.updateService(id, payload);
        navigate('/services', { replace: true });
      } else {
        await serviceService.createService(payload);
        navigate('/services', { replace: true });
      }
    } catch (err) {
      const msg = err?.errors?.[0]?.message || err?.message || 'Error al guardar';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminFormShell
      backTo="/services"
      backLabel="Servicios"
      modeBadge={isEdit ? 'Edición' : 'Alta'}
      aside={{
        kicker: 'Carta',
        title: 'Servicios claros para la agenda',
        bullets: [
          'El precio y la duración definen huecos en la agenda y el ticket.',
          'La categoría agrupa la carta y ayuda a filtrar en el listado.',
          'Desactiva un servicio si ya no se ofrece sin borrar el historial.',
        ],
        statusLabel: 'Estado',
        statusValue: isEdit ? 'Modo edición' : 'Alta nueva',
      }}
    >
      <form
        onSubmit={handleSubmit}
        className="relative h-full min-h-0 flex flex-col rounded-[1.28rem] bg-white/88 backdrop-blur-xl border border-white shadow-[inset_0_1px_0_rgba(255,255,255,0.92)] overflow-hidden"
      >
        <div
          className="h-[3px] w-full shrink-0 bg-gradient-to-r from-gold-dark/80 via-gold to-gold-light/80"
          aria-hidden
        />
        <div className="px-5 py-4 sm:px-7 sm:py-5 flex flex-col min-h-0 gap-4 flex-1">
          <AdminFormCardHeader
            eyebrow="Servicio"
            title={isEdit ? 'Editar servicio' : 'Nuevo servicio'}
          />

          {error && (
            <div className="alert-error shrink-0 text-sm py-2.5" role="alert">
              {error}
            </div>
          )}

          <div className="group shrink-0">
            <label htmlFor="service-name" className={ADMIN_FORM_LABEL_CLASS}>
              Nombre <span className="text-red-600 normal-case">*</span>
            </label>
            <input
              id="service-name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className={ADMIN_FORM_FIELD_CLASS}
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
              className={`${ADMIN_FORM_FIELD_CLASS} resize-none min-h-[3.5rem]`}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4 shrink-0">
            <div className="group sm:col-span-2 xl:col-span-1">
              <label htmlFor="service-category" className={ADMIN_FORM_LABEL_CLASS}>
                Categoría
              </label>
              <select
                id="service-category"
                name="categoryName"
                value={formData.categoryName}
                onChange={handleChange}
                className={ADMIN_FORM_FIELD_CLASS}
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
                className={ADMIN_FORM_FIELD_CLASS}
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
                className={ADMIN_FORM_FIELD_CLASS}
                required
              />
            </div>
          </div>

          {isEdit && (
            <label className="flex items-center gap-2 cursor-pointer shrink-0">
              <input
                name="isActive"
                type="checkbox"
                checked={formData.isActive}
                onChange={handleChange}
                className="rounded border-stone-300 text-gold focus:ring-gold/40"
              />
              <span className="text-sm text-stone-700">Activo (visible al agendar)</span>
            </label>
          )}

          <AdminFormFooterActions>
            <AdminFormPrimaryButton disabled={loading}>
              {loading ? (
                <>
                  <span className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Guardando…
                </>
              ) : (
                'Guardar servicio'
              )}
            </AdminFormPrimaryButton>
            <AdminFormSecondaryButton onClick={() => navigate(-1)}>Cancelar</AdminFormSecondaryButton>
          </AdminFormFooterActions>
        </div>
      </form>
    </AdminFormShell>
  );
}
