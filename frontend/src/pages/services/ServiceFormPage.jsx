/**
 * Formulario crear/editar servicio
 */

import { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import * as serviceService from '../../services/serviceService';

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

  const inputClass = 'w-full px-4 py-3 border border-stone-300 rounded-xl text-stone-900 placeholder-stone-400 focus:ring-2 focus:ring-gold/40 focus:border-gold outline-none';
  const labelClass = 'block text-sm font-semibold text-stone-700 mb-1.5';

  return (
    <div className="space-y-8">
      <div>
        <Link to="/services" className="inline-flex items-center gap-1.5 text-stone-500 hover:text-stone-700 text-sm font-medium mb-4">
          <span aria-hidden>←</span> Volver a servicios
        </Link>
        <p className="section-label text-gold">Servicios</p>
        <h1 className="font-serif text-2xl sm:text-3xl text-stone-900 font-medium tracking-tight">
          {isEdit ? 'Editar servicio' : 'Nuevo servicio'}
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
            <label className={labelClass}>Nombre *</label>
            <input name="name" value={formData.name} onChange={handleChange} className={inputClass} required />
          </div>
          <div>
            <label className={labelClass}>Descripción</label>
            <textarea name="description" value={formData.description} onChange={handleChange} rows={2} className={inputClass + ' resize-none'} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Precio ($) *</label>
              <input name="price" type="number" step="0.01" min="0" value={formData.price} onChange={handleChange} className={inputClass} required />
            </div>
            <div>
              <label className={labelClass}>Duración (min) *</label>
              <input name="durationMinutes" type="number" min="1" value={formData.durationMinutes} onChange={handleChange} className={inputClass} required />
            </div>
          </div>
          {isEdit && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input name="isActive" type="checkbox" checked={formData.isActive} onChange={handleChange} className="rounded border-stone-300 text-gold focus:ring-gold/40" />
              <span className="text-sm font-medium text-stone-700">Activo (visible al agendar)</span>
            </label>
          )}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => navigate(-1)} className="px-6 py-3 border border-stone-300 text-stone-700 font-semibold rounded-xl hover:bg-stone-50 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="px-6 py-3 bg-barber-dark text-white font-semibold rounded-xl hover:bg-barber-charcoal focus:ring-2 focus:ring-gold focus:ring-offset-2 disabled:opacity-50">
              {loading ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
