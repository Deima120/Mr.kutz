/**
 * Formulario crear/editar barbero
 * Solo admin
 */

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import * as barberService from '../../services/barberService';

export default function BarberFormPage() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phone: '',
    specialties: '',
    isActive: true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isEdit) {
      barberService
        .getBarberById(id)
        .then((b) => {
          setFormData({
            email: b.email || '',
            password: '',
            firstName: b.first_name || '',
            lastName: b.last_name || '',
            phone: b.phone || '',
            specialties: Array.isArray(b.specialties) ? b.specialties.join(', ') : '',
            isActive: b.is_active !== false,
          });
        })
        .catch(() => setError('Barbero no encontrado'));
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
      const specialties = formData.specialties
        ? formData.specialties.split(',').map((s) => s.trim()).filter(Boolean)
        : [];

      if (isEdit) {
        await barberService.updateBarber(id, {
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: formData.phone || undefined,
          specialties,
          isActive: formData.isActive,
        });
      } else {
        if (!formData.password || formData.password.length < 6) {
          setError('La contraseña debe tener al menos 6 caracteres');
          setLoading(false);
          return;
        }
        await barberService.createBarber({
          email: formData.email,
          password: formData.password,
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: formData.phone || undefined,
          specialties,
        });
      }
      navigate('/barbers', { replace: true });
    } catch (err) {
      setError(err?.message || err?.errors?.[0]?.message || 'Error al guardar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl page-shell">
      <div>
        <p className="section-label text-gold mb-1">Equipo</p>
        <h2 className="font-serif text-2xl sm:text-3xl text-stone-900 font-medium tracking-tight">
          {isEdit ? 'Editar barbero' : 'Nuevo barbero'}
        </h2>
      </div>

      <form
        onSubmit={handleSubmit}
        className="panel-card overflow-hidden"
      >
        <div className="h-1 w-full bg-gradient-to-r from-gold/80 via-gold to-gold/80" aria-hidden />
        <div className="p-6 sm:p-8 space-y-5">
        {error && (
          <div className="alert-error">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label-premium">
              Nombre *
            </label>
            <input
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              className="input-premium"
              required
            />
          </div>
          <div>
            <label className="label-premium">
              Apellido *
            </label>
            <input
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              className="input-premium"
              required
            />
          </div>
        </div>

        <div>
          <label className="label-premium">
            Email *
          </label>
          <input
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            className="input-premium"
            required
            disabled={isEdit}
          />
          {isEdit && (
            <p className="text-xs text-stone-500 mt-1">El email no se puede cambiar</p>
          )}
        </div>

        {!isEdit && (
          <div>
            <label className="label-premium">
              Contraseña *
            </label>
            <input
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              className="input-premium"
              placeholder="Mínimo 6 caracteres"
              required={!isEdit}
            />
          </div>
        )}

        <div>
          <label className="label-premium">
            Teléfono
          </label>
          <input
            name="phone"
            type="tel"
            value={formData.phone}
            onChange={handleChange}
            className="input-premium"
          />
        </div>

        <div>
          <label className="label-premium">
            Especialidades (separadas por coma)
          </label>
          <input
            name="specialties"
            value={formData.specialties}
            onChange={handleChange}
            placeholder="Ej: Corte clásico, Barba, Degradado"
            className="input-premium"
          />
        </div>

        {isEdit && (
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              name="isActive"
              type="checkbox"
              checked={formData.isActive}
              onChange={handleChange}
              className="rounded border-stone-300"
            />
            <span className="text-sm text-stone-700">Activo</span>
          </label>
        )}

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
