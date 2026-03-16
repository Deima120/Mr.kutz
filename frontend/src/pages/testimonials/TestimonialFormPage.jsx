/**
 * Crear / editar testimonio
 */

import { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import * as testimonialService from '../../services/testimonialService';

const inputClass = 'w-full px-4 py-3 border border-stone-300 rounded-xl text-stone-900 placeholder-stone-400 focus:ring-2 focus:ring-gold/40 focus:border-gold outline-none';
const labelClass = 'block text-sm font-semibold text-stone-700 mb-1.5';

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
    <div className="space-y-8">
      <div>
        <Link to="/testimonials" className="inline-flex items-center gap-1.5 text-stone-500 hover:text-stone-700 text-sm font-medium mb-4">
          <span aria-hidden>←</span> Volver a testimonios
        </Link>
        <p className="section-label text-gold">Testimonios</p>
        <h1 className="font-serif text-2xl sm:text-3xl text-stone-900 font-medium tracking-tight">
          {isEdit ? 'Editar testimonio' : 'Nuevo testimonio'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-stone-200 shadow-card overflow-hidden max-w-xl">
        <div className="h-1 w-full bg-gradient-to-r from-gold/80 via-gold to-gold/80" aria-hidden />
        <div className="p-6 sm:p-8 space-y-5">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm" role="alert">
              {error}
            </div>
          )}
          <div>
            <label htmlFor="authorName" className={labelClass}>Nombre del autor *</label>
            <input id="authorName" name="authorName" value={formData.authorName} onChange={handleChange} className={inputClass} required placeholder="Ej. Juan Pérez" />
          </div>
          <div>
            <label htmlFor="authorRole" className={labelClass}>Rol / etiqueta</label>
            <input id="authorRole" name="authorRole" value={formData.authorRole} onChange={handleChange} className={inputClass} placeholder="Ej. Cliente" />
          </div>
          <div>
            <label htmlFor="content" className={labelClass}>Texto del testimonio *</label>
            <textarea id="content" name="content" value={formData.content} onChange={handleChange} rows={4} className={inputClass + ' resize-none'} required placeholder="Lo que dijo el cliente..." />
          </div>
          <div>
            <label htmlFor="sortOrder" className={labelClass}>Orden (0 = primero)</label>
            <input id="sortOrder" name="sortOrder" type="number" min={0} value={formData.sortOrder} onChange={handleChange} className={inputClass} />
          </div>
          {isEdit && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input name="isActive" type="checkbox" checked={formData.isActive} onChange={handleChange} className="rounded border-stone-300 text-gold focus:ring-gold/40" />
              <span className="text-sm font-medium text-stone-700">Activo (visible en la landing)</span>
            </label>
          )}
          <div className="flex gap-3 pt-2">
            <Link to="/testimonials" className="px-6 py-3 border border-stone-300 text-stone-700 font-semibold rounded-xl hover:bg-stone-50 transition-colors">
              Cancelar
            </Link>
            <button type="submit" disabled={loading} className="px-6 py-3 bg-barber-dark text-white font-semibold rounded-xl hover:bg-barber-charcoal focus:ring-2 focus:ring-gold focus:ring-offset-2 disabled:opacity-50">
              {loading ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
