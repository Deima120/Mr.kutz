/**
 * Contexto de configuración pública (nombre, logo, horarios, contacto)
 * No requiere autenticación - usa GET /api/settings/public
 */

import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

const SettingsContext = createContext({ businessName: 'Mr. Kutz', loading: true });

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState({ business_name: 'Mr. Kutz', loading: true });

  useEffect(() => {
    axios
      .get(`${API_BASE}/settings/public`)
      .then((res) => {
        const data = res?.data?.data ?? res?.data ?? {};
        setSettings({ ...data, loading: false });
      })
      .catch(() => setSettings((s) => ({ ...s, loading: false })));
  }, []);

  return (
    <SettingsContext.Provider value={settings}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  return {
    businessName: ctx?.business_name ?? 'Mr. Kutz',
    logoUrl: ctx?.logo_url,
    openingHours: ctx?.opening_hours,
    contactEmail: ctx?.contact_email,
    contactPhone: ctx?.contact_phone,
    address: ctx?.address,
    loading: ctx?.loading ?? false,
  };
}
