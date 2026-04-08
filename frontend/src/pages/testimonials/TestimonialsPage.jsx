/**
 * Listado de testimonios (admin)
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import * as testimonialService from '../../services/testimonialService';

export default function TestimonialsPage() {
  const [list, setList] = useState([]);
  const [showInactive, setShowInactive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchList = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await testimonialService.getTestimonials({
        active: showInactive ? 'false' : undefined,
      });
      setList(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err?.message || 'Error al cargar testimonios');
      setList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, [showInactive]);

  const handleDelete = async (id, name) => {
    if (!window.confirm(`¿Eliminar testimonio de "${name}"?`)) return;
    try {
      await testimonialService.deleteTestimonial(id);
      fetchList();
    } catch (err) {
      setError(err?.message || 'Error al eliminar');
    }
  };

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-2xl border border-stone-200 shadow-card overflow-hidden">
        <div className="h-1 w-full bg-gradient-to-r from-gold/80 via-gold to-gold/80" aria-hidden />
        <div className="p-6 sm:p-8">
          <p className="section-label text-gold mb-2">Satisfacción del cliente</p>
          <h2 className="font-serif text-xl sm:text-2xl text-stone-900 font-medium tracking-tight mb-1">
            Valoraciones de citas completadas
          </h2>
          <p className="text-stone-500 text-sm mb-6 max-w-2xl">
            Misma fuente que la app móvil: estrellas y comentarios opcionales tras cada cita. Los testimonios
            de la landing más abajo son contenido editorial independiente (textos curados para la web pública).
          </p>
          <AppointmentRatingsPanel
            summary={ratingSummary}
            loading={ratingLoading}
            error={ratingError}
            filtersSlot={
              <div className="flex flex-wrap items-end gap-4 mb-2">
                <div>
                  <label className="block text-xs font-semibold text-stone-600 mb-1">Periodo</label>
                  <select
                    value={ratingPeriod}
                    onChange={(e) => setRatingPeriod(e.target.value)}
                    className="px-4 py-2.5 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-gold/40 focus:border-gold"
                  >
                    <option value="30">Últimos 30 días</option>
                    <option value="all">Todos</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-600 mb-1">Barbero</label>
                  <select
                    value={ratingBarberId}
                    onChange={(e) => setRatingBarberId(e.target.value)}
                    className="px-4 py-2.5 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-gold/40 focus:border-gold min-w-[200px]"
                  >
                    <option value="">Todos los barberos</option>
                    {barbers.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.first_name} {b.last_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            }
          />
        </div>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="section-label text-gold">Contenido</p>
          <h1 className="font-serif text-2xl sm:text-3xl text-stone-900 font-medium tracking-tight mb-1">
            Testimonios
          </h1>
          <p className="text-stone-500">Los que se muestran en la landing (solo activos).</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-stone-600 cursor-pointer">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="rounded border-stone-300 text-gold focus:ring-gold/40"
            />
            Mostrar inactivos
          </label>
          <Link
            to="/testimonials/new"
            className="btn-admin"
          >
            + Nuevo testimonio
          </Link>
        </div>
      </div>

      {error && (
        <div className="alert-error" role="alert">
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-16 text-center text-stone-500">Cargando...</div>
      ) : list.length === 0 ? (
        <div className="empty-state">
          <p className="text-stone-500 mb-4">No hay testimonios.</p>
          <Link
            to="/testimonials/new"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gold/10 text-barber-dark font-semibold rounded-xl hover:bg-gold/20 transition-colors"
          >
            + Crear primer testimonio
            <span aria-hidden>→</span>
          </Link>
        </div>
      ) : (
        <ul className="space-y-4">
          {list.map((t) => (
            <li key={t.id}>
              <article className="bg-white rounded-2xl border border-stone-200 shadow-card overflow-hidden">
                <div className="p-5 sm:p-6 flex flex-wrap items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-semibold border ${t.is_active ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-stone-100 text-stone-600 border-stone-200'}`}>
                        {t.is_active ? 'Activo' : 'Inactivo'}
                      </span>
                      {t.sort_order != null && t.sort_order > 0 && (
                        <span className="text-stone-400 text-xs">Orden: {t.sort_order}</span>
                      )}
                    </div>
                    <p className="text-stone-700 italic line-clamp-2">"{t.content}"</p>
                    <p className="mt-2 font-semibold text-stone-900">{t.author_name}</p>
                    {t.author_role && <p className="text-stone-500 text-sm">{t.author_role}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/testimonials/${t.id}/edit`}
                      className="text-sm font-semibold text-barber-dark hover:text-gold transition-colors"
                    >
                      Editar
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleDelete(t.id, t.author_name)}
                      className="text-sm text-red-600 hover:text-red-700 font-medium"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              </article>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
