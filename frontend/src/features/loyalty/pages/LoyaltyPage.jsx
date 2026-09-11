/**
 * Fidelización (`/loyalty`, solo administrador).
 *
 * Dos pestañas para no sumar dos entradas al menú:
 * - "Hitos": configuración de las reglas (cada cuántos servicios, qué premio).
 * - "Historial": listado paginado de recompensas otorgadas a todos los clientes.
 */

import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Pencil, Plus } from 'lucide-react';
import PageHeader from '@/shared/components/admin/PageHeader';
import DataCard from '@/shared/components/admin/DataCard';
import Table, {
  TableHead,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
} from '@/shared/components/admin/Table';
import AdminIconButton from '@/shared/components/admin/AdminIconButton';
import AdminStatusToggle from '@/shared/components/admin/AdminStatusToggle';
import { AdminPagination, FilterSelect } from '@/shared/components/admin/AdminListControls';
import ClientPicker from '@/features/clients/components/ClientPicker';
import { useAppToast } from '@/shared/feedback/ToastContext';
import { getApiErrorMessage } from '@/shared/utils/formValidation';
import { formatDisplayDate } from '@/shared/utils/formatDisplayDate';
import * as loyaltyService from '@/features/loyalty/services/loyaltyService';
import LoyaltyMilestoneFormModal from '@/features/loyalty/components/LoyaltyMilestoneFormModal';

const TAB_MILESTONES = 'milestones';
const TAB_HISTORY = 'history';

const STATUS_OPTIONS = [
  { id: '', label: 'Todas' },
  { id: 'pending', label: 'Pendientes' },
  { id: 'redeemed', label: 'Canjeadas' },
];

function itemsSummary(items) {
  if (!items?.length) return '—';
  return items.map((it) => it.description).join(' · ');
}

export default function LoyaltyPage() {
  const toast = useAppToast();
  const [tab, setTab] = useState(TAB_MILESTONES);

  // --- Hitos ---
  const [rules, setRules] = useState([]);
  const [rulesLoading, setRulesLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [togglingId, setTogglingId] = useState(null);

  const loadRules = useCallback(async () => {
    setRulesLoading(true);
    try {
      const data = await loyaltyService.getMilestoneRules();
      setRules(data);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'No se pudieron cargar los hitos.'));
    } finally {
      setRulesLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (tab === TAB_MILESTONES) loadRules();
  }, [tab, loadRules]);

  const openCreate = () => {
    setEditingRule(null);
    setFormOpen(true);
  };
  const openEdit = (rule) => {
    setEditingRule(rule);
    setFormOpen(true);
  };

  const toggleActive = async (rule) => {
    setTogglingId(rule.id);
    try {
      if (rule.is_active ?? rule.isActive) {
        await loyaltyService.deactivateMilestoneRule(rule.id);
        toast.success('Hito desactivado.');
      } else {
        await loyaltyService.updateMilestoneRule(rule.id, { isActive: true });
        toast.success('Hito activado.');
      }
      await loadRules();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'No se pudo actualizar el hito.'));
    } finally {
      setTogglingId(null);
    }
  };

  // --- Historial ---
  const [history, setHistory] = useState([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [statusFilter, setStatusFilter] = useState('');
  const [clientFilter, setClientFilter] = useState('');

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const { rewards, total } = await loyaltyService.getRewardsHistory({
        limit: pageSize,
        offset: (page - 1) * pageSize,
        status: statusFilter || undefined,
        clientId: clientFilter || undefined,
      });
      setHistory(rewards);
      setHistoryTotal(total);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'No se pudo cargar el historial.'));
    } finally {
      setHistoryLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, statusFilter, clientFilter]);

  useEffect(() => {
    if (tab === TAB_HISTORY) loadHistory();
  }, [tab, loadHistory]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, clientFilter, pageSize]);

  return (
    <div className="page-shell">
        <PageHeader
        subtitle="Hitos por servicios completados y recompensas otorgadas"
        actions={
          <div className="inline-flex rounded-lg border border-stone-200 bg-stone-50 p-0.5">
            <button
              type="button"
              onClick={() => setTab(TAB_MILESTONES)}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                tab === TAB_MILESTONES
                  ? 'bg-white text-barber-dark shadow-sm'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              Hitos
            </button>
            <button
              type="button"
              onClick={() => setTab(TAB_HISTORY)}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                tab === TAB_HISTORY
                  ? 'bg-white text-barber-dark shadow-sm'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              Historial
            </button>
          </div>
        }
      />

      {tab === TAB_MILESTONES ? (
        <>
          <div className="mb-4 flex justify-end">
            <button type="button" onClick={openCreate} className="btn-admin inline-flex items-center gap-1.5 text-sm">
              <Plus className="h-4 w-4" /> Nuevo hito
            </button>
          </div>
          <DataCard compact>
            {rulesLoading ? (
              <div className="py-10 text-center text-sm text-stone-500">Cargando…</div>
            ) : rules.length === 0 ? (
              <div className="py-10 text-center text-sm text-stone-500">
                Aún no hay hitos configurados. Crea el primero con "Nuevo hito".
              </div>
            ) : (
              <Table>
                <TableHead>
                  <TableHeader compact>Cada</TableHeader>
                  <TableHeader compact>Nombre</TableHeader>
                  <TableHeader compact>Premios</TableHeader>
                  <TableHeader compact>Estado</TableHeader>
                  <TableHeader compact className="text-right">
                    Acciones
                  </TableHeader>
                </TableHead>
                <TableBody>
                  {rules.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell compact className="text-xs font-semibold tabular-nums">
                        {r.every_count ?? r.everyCount}
                      </TableCell>
                      <TableCell compact className="text-xs font-medium">
                        {r.label}
                      </TableCell>
                      <TableCell compact className="max-w-[18rem] text-xs text-stone-600">
                        <span className="line-clamp-2">
                          {(r.rewardItems || [])
                            .map((it) => it.service?.name || it.product?.name || '—')
                            .join(' · ')}
                        </span>
                      </TableCell>
                      <TableCell compact>
                        <AdminStatusToggle
                          active={r.is_active ?? r.isActive}
                          onClick={() => toggleActive(r)}
                          disabled={togglingId === r.id}
                        />
                      </TableCell>
                      <TableCell compact className="text-right">
                        <AdminIconButton icon={Pencil} label="Editar hito" onClick={() => openEdit(r)} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </DataCard>
        </>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-end gap-3">
            <div className="min-w-[14rem]">
              <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-stone-500">
                Cliente
              </span>
              <ClientPicker
                value={clientFilter}
                onChange={(id) => setClientFilter(id || '')}
                placeholder="Todos los clientes…"
              />
            </div>
            <FilterSelect
              label="Estado"
              value={statusFilter}
              onChange={setStatusFilter}
              options={STATUS_OPTIONS}
              ariaLabel="Filtrar por estado"
            />
          </div>
          <DataCard compact>
            {historyLoading ? (
              <div className="py-10 text-center text-sm text-stone-500">Cargando…</div>
            ) : history.length === 0 ? (
              <div className="py-10 text-center text-sm text-stone-500">
                No hay recompensas otorgadas con estos filtros.
              </div>
            ) : (
              <Table>
                <TableHead>
                  <TableHeader compact>Cliente</TableHeader>
                  <TableHeader compact>Hito</TableHeader>
                  <TableHeader compact>Premios</TableHeader>
                  <TableHeader compact>Otorgado</TableHeader>
                  <TableHeader compact>Estado</TableHeader>
                </TableHead>
                <TableBody>
                  {history.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell compact className="text-xs">
                        <Link to={`/clients/${r.client.id}`} className="font-medium text-gold-dark hover:underline">
                          {r.client.firstName} {r.client.lastName}
                        </Link>
                      </TableCell>
                      <TableCell compact className="text-xs">
                        {r.rule.label}
                      </TableCell>
                      <TableCell compact className="max-w-[16rem] text-xs text-stone-600">
                        <span className="line-clamp-2">{itemsSummary(r.items)}</span>
                      </TableCell>
                      <TableCell compact className="text-xs tabular-nums">
                        {formatDisplayDate(r.grantedAt, { day: 'numeric', month: 'short', year: 'numeric' })}
                      </TableCell>
                      <TableCell compact>
                        {r.redeemedAt ? (
                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                            Canjeada
                          </span>
                        ) : (
                          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                            Pendiente
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            <AdminPagination
              idPrefix="loyalty-history"
              page={page}
              pageSize={pageSize}
              total={historyTotal}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              pageSizeOptions={[10, 20, 50]}
              itemLabel="recompensas"
              showSummary
              layout="bar"
            />
          </DataCard>
        </>
      )}

      <LoyaltyMilestoneFormModal
        open={formOpen}
        rule={editingRule}
        onClose={() => setFormOpen(false)}
        onSaved={loadRules}
      />
    </div>
  );
}
