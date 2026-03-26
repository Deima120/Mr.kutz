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
    categoryName: 'General',
    price: '',
    durationMinutes: '',
    isActive: true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isEdit) {
      serviceService
        .getServiceById(id)
        .then((s) => {
          setFormData({
            name: s.name || '',
            description: s.description || '',
            categoryName: s.category_name || 'General',
            price: s.price?.toString() || '',
            durationMinutes: s.duration_minutes?.toString() || '',
            isActive: s.is_active !== false,
          });
        })
        .catch(() => setError('Servicio no encontrado'));
    }
  }, [id, isEdit]);

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
        kicker: 'Catálogo',
        title: 'Servicios claros, reservas fluidas',
        bullets: [
          'El precio y la duración definen huecos en la agenda automáticamente.',
          'La descripción ayuda al cliente a elegir en la landing y al agendar.',
          'Desactiva un servicio sin borrarlo si dejas de ofrecerlo por temporada.',
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
            eyebrow="Servicio"
            title={isEdit ? 'Editar servicio' : 'Nuevo servicio'}
          />

          {error && (
            <div className="alert-error text-sm py-2.5 shrink-0" role="alert">
              {error}
            </div>
          )}

          <div className="group">
            <label htmlFor="svc-name" className={ADMIN_FORM_LABEL_CLASS}>
              Nombre *
            </label>
            <input id="svc-name" name="name" value={formData.name} onChange={handleChange} className={ADMIN_FORM_FIELD_CLASS} required />
          </div>
          <div className="group">
            <label htmlFor="svc-cat" className={ADMIN_FORM_LABEL_CLASS}>
              Categoría *
            </label>
            <input
              id="svc-cat"
              name="categoryName"
              value={formData.categoryName}
              onChange={handleChange}
              className={ADMIN_FORM_FIELD_CLASS}
              required
              placeholder="Ej. Cortes, Tratamientos..."
            />
          </div>
          <div className="group">
            <label htmlFor="svc-desc" className={ADMIN_FORM_LABEL_CLASS}>
              Descripción
            </label>
            <textarea
              id="svc-desc"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              className={`${ADMIN_FORM_FIELD_CLASS} resize-none min-h-[4.5rem]`}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="group">
              <label htmlFor="svc-price" className={ADMIN_FORM_LABEL_CLASS}>
                Precio ($) *
              </label>
              <input
                id="svc-price"
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
              <label htmlFor="svc-dur" className={ADMIN_FORM_LABEL_CLASS}>
                Duración (min) *
              </label>
              <input
                id="svc-dur"
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
              <span className="text-sm font-medium text-stone-700">Activo (visible al agendar)</span>
            </label>
          )}

          <AdminFormFooterActions className="mt-auto">
            <AdminFormSecondaryButton onClick={() => navigate(-1)}>Cancelar</AdminFormSecondaryButton>
            <AdminFormPrimaryButton disabled={loading}>{loading ? 'Guardando…' : 'Guardar'}</AdminFormPrimaryButton>
          </AdminFormFooterActions>
        </div>
      </form>
    </AdminFormShell>
  );
}
