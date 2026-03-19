/**
 * Configuración de la barbería
 */

import { useState, useEffect } from 'react';
import * as settingsService from '../../services/settingsService';
import PageHeader from '../../components/admin/PageHeader';
import DataCard from '../../components/admin/DataCard';

export default function SettingsPage() {
  const [formData, setFormData] = useState({
    business_name: '',
    logo_url: '',
    primary_color: '#171717',
    secondary_color: '#ffffff',
    contact_email: '',
    contact_phone: '',
    address: '',
    opening_hours: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    settingsService
      .getSettings()
      .then((res) => {
        const s = res?.data ?? res;
        if (s) {
          setFormData({
            business_name: s.business_name || '',
            logo_url: s.logo_url || '',
            primary_color: s.primary_color || '#171717',
            secondary_color: s.secondary_color || '#ffffff',
            contact_email: s.contact_email || '',
            contact_phone: s.contact_phone || '',
            address: s.address || '',
            opening_hours: s.opening_hours || '',
          });
        }
      })
      .catch((err) => setError(err?.message || 'Error al cargar configuración'))
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await settingsService.updateSettings(formData);
    } catch (err) {
      setError(err?.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="py-16 text-center text-stone-500">Cargando configuración...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Configuración"
        label="Negocio"
        subtitle="Datos y apariencia de la barbería"
      />

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm" role="alert">{error}</div>
      )}

      <form onSubmit={handleSubmit}>
        <DataCard title="Datos del negocio">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-stone-700 mb-1">Nombre de la barbería</label>
              <input
                name="business_name"
                value={formData.business_name}
                onChange={handleChange}
                className="input-premium py-2.5"
                placeholder="Mr. Kutz"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-stone-700 mb-1">URL del logo (opcional)</label>
              <input
                name="logo_url"
                value={formData.logo_url}
                onChange={handleChange}
                className="input-premium py-2.5"
                placeholder="https://..."
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-1">Email de contacto</label>
                <input
                  type="email"
                  name="contact_email"
                  value={formData.contact_email}
                  onChange={handleChange}
                  className="input-premium py-2.5"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-1">Teléfono</label>
                <input
                  name="contact_phone"
                  value={formData.contact_phone}
                  onChange={handleChange}
                  className="input-premium py-2.5"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-stone-700 mb-1">Dirección</label>
              <input
                name="address"
                value={formData.address}
                onChange={handleChange}
                className="input-premium py-2.5"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-stone-700 mb-1">Horarios (texto libre)</label>
              <textarea
                name="opening_hours"
                value={formData.opening_hours}
                onChange={handleChange}
                rows={3}
                className="input-premium py-2.5 resize-none"
                placeholder="Lun–Vie: 9:00–20:00&#10;Sáb: 9:00–14:00"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="btn-admin disabled:opacity-50"
              >
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </DataCard>
      </form>
    </div>
  );
}
