/**
 * Estado de caja compartido (banner + PaymentForm) para admin.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as cashRegisterService from '@/features/cash-registers/services/cashRegisterService';
import CashRegisterBanner from '@/features/cash-registers/components/CashRegisterBanner';
import OpenCashRegisterModal from '@/features/cash-registers/components/OpenCashRegisterModal';
import CloseCashRegisterModal from '@/features/cash-registers/components/CloseCashRegisterModal';
import { startCashRegisterPolling } from '@/features/cash-registers/utils/cashRegisterPolling';
import { useAppToast } from '@/shared/feedback/ToastContext';

const CashRegisterContext = createContext(null);

export function CashRegisterProvider({ children }) {
  const toast = useAppToast();
  const [loading, setLoading] = useState(true);
  const [register, setRegister] = useState(null);
  const [summary, setSummary] = useState(null);
  const [canCharge, setCanCharge] = useState(false);
  const [todayYmd, setTodayYmd] = useState('');
  const [openModalOpen, setOpenModalOpen] = useState(false);
  const [closeModalOpen, setCloseModalOpen] = useState(false);

  const refresh = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const data = await cashRegisterService.getCurrent();
      setRegister(data?.register ?? null);
      setSummary(data?.summary ?? null);
      setCanCharge(Boolean(data?.canCharge));
      setTodayYmd(data?.todayYmd || '');
      return data;
    } catch {
      setRegister(null);
      setSummary(null);
      setCanCharge(false);
      return null;
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    return startCashRegisterPolling({ refresh });
  }, [refresh]);

  const requestOpen = useCallback(() => setOpenModalOpen(true), []);
  const requestClose = useCallback(() => setCloseModalOpen(true), []);

  const value = useMemo(
    () => ({
      loading,
      register,
      summary,
      canCharge,
      todayYmd,
      refresh,
      requestOpen,
      requestClose,
    }),
    [loading, register, summary, canCharge, todayYmd, refresh, requestOpen, requestClose]
  );

  return (
    <CashRegisterContext.Provider value={value}>
      <CashRegisterBanner
        register={register}
        summary={summary}
        canCharge={canCharge}
        loading={loading}
        onOpenClick={requestOpen}
        onCloseClick={requestClose}
      />
      {children}
      <OpenCashRegisterModal
        open={openModalOpen}
        onClose={() => setOpenModalOpen(false)}
        onOpened={async () => {
          toast.success('Caja abierta.');
          await refresh();
        }}
      />
      <CloseCashRegisterModal
        open={closeModalOpen}
        register={register}
        onClose={() => setCloseModalOpen(false)}
        onClosed={async () => {
          toast.success('Caja cerrada.');
          await refresh();
        }}
      />
    </CashRegisterContext.Provider>
  );
}

export function useCashRegister() {
  const ctx = useContext(CashRegisterContext);
  if (!ctx) {
    throw new Error('useCashRegister debe usarse dentro de CashRegisterProvider');
  }
  return ctx;
}

/** null fuera del provider (p. ej. barbero). */
export function useCashRegisterOptional() {
  return useContext(CashRegisterContext);
}
