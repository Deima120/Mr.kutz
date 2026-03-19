/**
 * Formulario para crear o editar cliente
 */

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import * as clientService from '../../services/clientService';

export default function ClientFormPage() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isEdit) {
      clientService
        .getClientById(id)
        .then((client) => {
          setFormData({
            firstName: client.first_name || '',
            lastName: client.last_name || '',
            email: client.email || '',
            phone: client.phone || '',
            notes: client.notes || '',
          });
        })
        .catch(() => setError('Cliente no encontrado'));
    }
  }, [id, isEdit]);

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isEdit) {
        await clientService.updateClient(id, formData);
        navigate(`/clients/${id}`, { replace: true });
      } else {
        const client = await clientService.createClient(formData);
        navigate(`/clients/${client.id}`, { replace: true });
      }
    } catch (err) {
      const msg = err?.errors?.[0]?.message || err?.message || 'Error al guardar';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl">
      <p className="section-label text-gold mb-1">Clientes</p>
      <h1 className="font-serif text-2xl sm:text-3xl text-stone-900 font-medium tracking-tight mb-6">
        {isEdit ? 'Editar cliente' : 'Nuevo cliente'}
      </h1>

      <form onSubmit={handleSubmit} className="landing-card overflow-hidden">
        <div className="h-1 w-full bg-gradient-to-r from-gold/80 via-gold to-gold/80" aria-hidden />
        <div className="p-6 sm:p-8 space-y-5">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm" role="alert">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="firstName" className="block text-sm font-semibold text-stone-700 mb-1.5">Nombre *</label>
              <input
                id="firstName"
                name="firstName"
                type="text"
                value={formData.firstName}
                onChange={handleChange}
                className="input-premium py-2.5"
                required
              />
            </div>
            <div>
              <label htmlFor="lastName" className="block text-sm font-semibold text-stone-700 mb-1.5">Apellido *</label>
              <input
                id="lastName"
                name="lastName"
                type="text"
                value={formData.lastName}
                onChange={handleChange}
                className="input-premium py-2.5"
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-stone-700 mb-1.5">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              className="input-premium py-2.5"
            />
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-semibold text-stone-700 mb-1.5">Teléfono</label>
            <input
              id="phone"
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={handleChange}
              className="input-premium py-2.5"
            />
          </div>

          <div>
            <label htmlFor="notes" className="block text-sm font-semibold text-stone-700 mb-1.5">Notas</label>
            <textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={3}
              className="input-premium py-2.5 resize-none"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="btn-admin disabled:opacity-50"
            >
              {loading ? 'Guardando...' : 'Guardar'}
            </button>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="btn-admin-outline"
            >
              Cancelar
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
