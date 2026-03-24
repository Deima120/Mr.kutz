/**
 * Crear / editar testimonio
 */

import { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import * as testimonialService from '../../services/testimonialService';
import AdminFormShell, {
  AdminFormCardHeader,
  ADMIN_FORM_FIELD_CLASS,
  ADMIN_FORM_LABEL_CLASS,
  AdminFormFooterActions,
  AdminFormPrimaryButton,
  AdminFormSecondaryButton,
} from '../../components/admin/AdminFormShell';

export default function TestimonialFormPage() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    authorName: '',
    authorRole: 'Cliente',
    content: '',
    isActive: true,
    sortOrder: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isEdit) {
      testimonialService
        .getTestimonialById(id)
        .then((t) => {
          setFormData({
            authorName: t.author_name || '',
            authorRole: t.author_role || 'Cliente',
            content: t.content || '',
            isActive: t.is_active !== false,
            sortOrder: t.sort_order ?? 0,
          });
        })
        .catch(() => setError('Testimonio no encontrado'));
    }
  }, [id, isEdit]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : name === 'sortOrder' ? (value === '' ? 0 : parseInt(value, 10)) : value,
    }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const payload = {
        authorName: formData.authorName.trim(),
        authorRole: formData.authorRole.trim() || undefined,
        content: formData.content.trim(),
        isActive: formData.isActive,
        sortOrder: formData.sortOrder,
      };
      if (isEdit) {
        await testimonialService.updateTestimonial(id, payload);
      } else {
        await testimonialService.createTestimonial(payload);
      }
      navigate('/testimonials', { replace: true });
    } catch (err) {
      setError(err?.message || err?.errors?.[0]?.message || 'Error al guardar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminFormShell
      backTo="/testimonials"
      backLabel="Testimonios"
      modeBadge={isEdit ? 'Edición' : 'Alta'}
      aside={{
        kicker: 'Marca',
        title: 'Prueba social que vende',
        bullets: [
          'Los testimonios activos rotan en la landing con el orden que definas.',
          'El rol corto (ej. «Cliente») da contexto sin saturar.',
          'Números de orden menores aparecen antes en el carrusel.',
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
            eyebrow="Testimonio"
            title={isEdit ? 'Editar testimonio' : 'Nuevo testimonio'}
          />

          {error && (
            <div className="alert-error text-sm py-2.5 shrink-0" role="alert">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="group">
              <label htmlFor="authorName" className={ADMIN_FORM_LABEL_CLASS}>
                Nombre del autor *
              </label>
              <input
                id="authorName"
                name="authorName"
                value={formData.authorName}
                onChange={handleChange}
                className={ADMIN_FORM_FIELD_CLASS}
                required
                placeholder="Ej. Juan Pérez"
              />
            </div>
            <div className="group">
              <label htmlFor="authorRole" className={ADMIN_FORM_LABEL_CLASS}>
                Rol / etiqueta
              </label>
              <input
                id="authorRole"
                name="authorRole"
                value={formData.authorRole}
                onChange={handleChange}
                className={ADMIN_FORM_FIELD_CLASS}
                placeholder="Ej. Cliente"
              />
            </div>
          </div>

          <div className="group flex-1 min-h-0 flex flex-col">
            <label htmlFor="content" className={ADMIN_FORM_LABEL_CLASS}>
              Texto del testimonio *
            </label>
            <textarea
              id="content"
              name="content"
              value={formData.content}
              onChange={handleChange}
              className={`${ADMIN_FORM_FIELD_CLASS} resize-none flex-1 min-h-[8rem]`}
              required
              placeholder="Lo que dijo el cliente…"
            />
          </div>

          <div className="group max-w-xs">
            <label htmlFor="sortOrder" className={ADMIN_FORM_LABEL_CLASS}>
              Orden (0 = primero)
            </label>
            <input
              id="sortOrder"
              name="sortOrder"
              type="number"
              min={0}
              value={formData.sortOrder}
              onChange={handleChange}
              className={ADMIN_FORM_FIELD_CLASS}
            />
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
              <span className="text-sm font-medium text-stone-700">Activo (visible en la landing)</span>
            </label>
          )}

          <AdminFormFooterActions className="mt-auto">
            <Link
              to="/testimonials"
              className="inline-flex items-center justify-center rounded-xl px-5 py-2.5 text-sm font-semibold text-stone-600 bg-white border border-stone-200 shadow-sm hover:bg-stone-50 transition-all"
            >
              Cancelar
            </Link>
            <AdminFormPrimaryButton disabled={loading}>{loading ? 'Guardando…' : 'Guardar'}</AdminFormPrimaryButton>
          </AdminFormFooterActions>
        </div>
      </form>
    </AdminFormShell>
  );
}
