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
        <div className="py-16 text-center text-gray-500">Cargando configuración...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Configuración"
        subtitle="Datos y apariencia de la barbería"
      />

      {error && (
        <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm border border-red-100">{error}</div>
      )}

      <form onSubmit={handleSubmit}>
        <DataCard title="Datos del negocio">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de la barbería</label>
              <input
                name="business_name"
                value={formData.business_name}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Mr. Kutz"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">URL del logo (opcional)</label>
              <input
                name="logo_url"
                value={formData.logo_url}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="https://..."
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email de contacto</label>
                <input
                  type="email"
                  name="contact_email"
                  value={formData.contact_email}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                <input
                  name="contact_phone"
                  value={formData.contact_phone}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
              <input
                name="address"
                value={formData.address}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Horarios (texto libre)</label>
              <textarea
                name="opening_hours"
                value={formData.opening_hours}
                onChange={handleChange}
                rows={3}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                placeholder="Lun–Vie: 9:00–20:00&#10;Sáb: 9:00–14:00"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium disabled:opacity-50"
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
