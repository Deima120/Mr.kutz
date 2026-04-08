/**
 * Configuración de la barbería
 */

import { useState, useEffect } from 'react';
import * as settingsService from '../../services/settingsService';
import AdminFormShell, {
  AdminFormCardHeader,
  ADMIN_FORM_FIELD_CLASS,
  ADMIN_FORM_LABEL_CLASS,
  AdminFormFooterActions,
  AdminFormPrimaryButton,
} from '../../components/admin/AdminFormShell';

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
        <div className="py-16 text-center text-stone-500">Cargando configuración…</div>
      </div>
    );
  }

  return (
    <AdminFormShell
      backTo="/dashboard"
      backLabel="Panel"
      modeBadge="Sistema"
      showAside={false}
    >
      <form
        onSubmit={handleSubmit}
        className="relative h-full min-h-0 flex flex-col rounded-[1.28rem] bg-white/88 backdrop-blur-xl border border-white shadow-[inset_0_1px_0_rgba(255,255,255,0.92)] overflow-hidden max-w-4xl w-full mx-auto lg:mx-0"
      >
        <div className="h-[3px] w-full shrink-0 bg-gradient-to-r from-gold-dark/80 via-gold to-gold-light/80" aria-hidden />
        <div className="px-5 py-4 sm:px-7 sm:py-5 flex flex-col gap-4 flex-1 min-h-0 overflow-y-auto">
          <AdminFormCardHeader eyebrow="Negocio" title="Configuración" />

          <p className="text-sm text-stone-600 -mt-2">
            Datos públicos y de contacto que verán clientes y el equipo.
          </p>

          {error && (
            <div className="alert-error text-sm py-2.5 shrink-0" role="alert">
              {error}
            </div>
          )}

          <div className="group">
            <label className={ADMIN_FORM_LABEL_CLASS}>Nombre de la barbería</label>
            <input
              name="business_name"
              value={formData.business_name}
              onChange={handleChange}
              className={ADMIN_FORM_FIELD_CLASS}
              placeholder="Mr. Kutz"
            />
          </div>
          <div className="group">
            <label className={ADMIN_FORM_LABEL_CLASS}>URL del logo (opcional)</label>
            <input
              name="logo_url"
              value={formData.logo_url}
              onChange={handleChange}
              className={ADMIN_FORM_FIELD_CLASS}
              placeholder="https://…"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="group">
              <label className={ADMIN_FORM_LABEL_CLASS}>Correo de contacto</label>
              <input
                type="email"
                name="contact_email"
                value={formData.contact_email}
                onChange={handleChange}
                className={ADMIN_FORM_FIELD_CLASS}
              />
            </div>
            <div className="group">
              <label className={ADMIN_FORM_LABEL_CLASS}>Teléfono</label>
              <input
                name="contact_phone"
                value={formData.contact_phone}
                onChange={handleChange}
                className={ADMIN_FORM_FIELD_CLASS}
              />
            </div>
          </div>
          <div className="group">
            <label className={ADMIN_FORM_LABEL_CLASS}>Dirección</label>
            <input name="address" value={formData.address} onChange={handleChange} className={ADMIN_FORM_FIELD_CLASS} />
          </div>
          <div className="group">
            <label className={ADMIN_FORM_LABEL_CLASS}>Horarios (texto libre)</label>
            <textarea
              name="opening_hours"
              value={formData.opening_hours}
              onChange={handleChange}
              rows={3}
              className={`${ADMIN_FORM_FIELD_CLASS} resize-none min-h-[4.5rem]`}
              placeholder={'Lun–Vie: 9:00–20:00\nSáb: 9:00–14:00'}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="group">
              <label className={ADMIN_FORM_LABEL_CLASS}>Color primario (hex)</label>
              <input
                name="primary_color"
                value={formData.primary_color}
                onChange={handleChange}
                className={ADMIN_FORM_FIELD_CLASS}
              />
            </div>
            <div className="group">
              <label className={ADMIN_FORM_LABEL_CLASS}>Color secundario (hex)</label>
              <input
                name="secondary_color"
                value={formData.secondary_color}
                onChange={handleChange}
                className={ADMIN_FORM_FIELD_CLASS}
              />
            </div>
          </div>

          <AdminFormFooterActions>
            <AdminFormPrimaryButton disabled={saving} className="w-full sm:w-auto">
              {saving ? 'Guardando…' : 'Guardar configuración'}
            </AdminFormPrimaryButton>
          </AdminFormFooterActions>
        </div>
      </form>
    </AdminFormShell>
  );
}
