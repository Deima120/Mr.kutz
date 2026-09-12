/**
 * Fidelización (`/loyalty`) — ramificada por rol, mismo patrón que
 * `AppointmentsPage.jsx`: el cliente ve `ClientLoyaltyPage` (su avance y sus
 * premios); admin/staff con `loyalty.view`/`loyalty.manage` ven esta pantalla
 * completa, con dos pestañas para no sumar dos entradas al menú:
 * - "Hitos": configuración de las reglas (cada cuántos servicios, opciones de premio).
 * - "Historial": listado paginado de recompensas otorgadas a todos los clientes.
 */

import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Info, Pencil, Plus, Trash2 } from 'lucide-react';
import PageHeader from '@/shared/components/admin/PageHeader';
import DataCard from '@/shared/components/admin/DataCard';
import StatsCard from '@/shared/components/admin/StatsCard';
import Table, {
  TableHead,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  TablePrimaryCell,
} from '@/shared/components/admin/Table';
import AdminIconButton from '@/shared/components/admin/AdminIconButton';
import AdminStatusToggle from '@/shared/components/admin/AdminStatusToggle';
import AdminConfirmModal from '@/shared/feedback/AdminConfirmModal';
import { AdminPagination, FilterSelect } from '@/shared/components/admin/AdminListControls';
import ClientPicker from '@/features/clients/components/ClientPicker';
import { useAppToast } from '@/shared/feedback/ToastContext';
import { useAuth } from '@/shared/contexts/AuthContext';
import { getApiErrorMessage } from '@/shared/utils/formValidation';
import { formatDisplayDate } from '@/shared/utils/formatDisplayDate';
import * as loyaltyService from '@/features/loyalty/services/loyaltyService';
import LoyaltyMilestoneFormModal from '@/features/loyalty/components/LoyaltyMilestoneFormModal';
import ClientLoyaltyPage from '@/features/loyalty/pages/ClientLoyaltyPage';

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

/**
 * Las opciones de premio de un hito, una por línea y con viñeta dorada: son
 * alternativas excluyentes (el cliente elige una), y apiladas se leen como
 * tales — en una sola línea separada por puntos parecían un único premio
 * compuesto.
 */
function RewardOptionsCell({ rule }) {
  const options = rule.options || [];
  if (!options.length) return <span className="text-stone-400">Sin premios configurados</span>;

  return (
    <ul className="space-y-1">
      {options.map((option, i) => {
        const desc = (option.items || [])
          .map((it) => it.service?.name || it.product?.name || '—')
          .join(' + ');
        return (
          <li key={option.id ?? i} className="flex items-start gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" aria-hidden />
            <span className="min-w-0">
              {options.length > 1 && (
                <span className="text-xs font-semibold text-stone-500">Opción {i + 1}: </span>
              )}
              <span className="text-sm text-stone-700">{desc || '—'}</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Enrutador por rol — un cliente nunca debe montar `AdminLoyaltyPage` (sus
 * hooks piden `GET /loyalty/milestones`/`GET /loyalty/rewards`, que un
 * cliente no tiene permiso para llamar y le mostrarían un toast de error de
 * entrada). Se decide el componente ANTES de montar nada, no con un `return`
 * a mitad de un componente con hooks condicionales.
 */
export default function LoyaltyPage() {
  const { user } = useAuth();
  return user?.role === 'client' ? <ClientLoyaltyPage /> : <AdminLoyaltyPage />;
}

function AdminLoyaltyPage() {
  const toast = useAppToast();
  const [tab, setTab] = useState(TAB_MILESTONES);

  // --- Hitos ---
  const [rules, setRules] = useState([]);
  const [rulesLoading, setRulesLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [togglingId, setTogglingId] = useState(null);
  const [ruleToDelete, setRuleToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [stats, setStats] = useState(null);

  /**
   * Los indicadores se recargan junto con los hitos: activar, desactivar,
   * crear o borrar un hito cambia «Hitos activos», y el alcance por hito sale
   * del mismo sitio. Un fallo aquí no molesta con un toast — la pantalla sigue
   * siendo útil sin la cabecera de cifras, y el listado ya avisa si la API
   * está caída.
   */
  const loadStats = useCallback(async () => {
    try {
      setStats(await loyaltyService.getLoyaltyStats());
    } catch {
      setStats(null);
    }
  }, []);

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
    if (tab === TAB_MILESTONES) {
      loadRules();
      loadStats();
    }
  }, [tab, loadRules, loadStats]);

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
      await loadStats();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'No se pudo actualizar el hito.'));
    } finally {
      setTogglingId(null);
    }
  };

  /**
   * Borrar es la limpieza de un hito de prueba o creado por error, no la baja
   * habitual (esa es desactivarlo, y así lo dice el modal). El botón solo
   * aparece cuando el alcance del hito es 0; aun así el backend vuelve a
   * comprobarlo y responde 409, cuyo mensaje se muestra tal cual.
   */
  const confirmDelete = async () => {
    if (!ruleToDelete) return;
    setDeleting(true);
    try {
      await loyaltyService.deleteMilestoneRule(ruleToDelete.id);
      toast.success('Hito eliminado.');
      setRuleToDelete(null);
      await loadRules();
      await loadStats();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'No se pudo eliminar el hito.'));
    } finally {
      setDeleting(false);
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
            {/* El botón de crear vive junto a las pestañas, no en una fila
                propia: la convención del panel es filtros/navegación a la
                izquierda y la acción principal a la derecha, en la misma
                línea (ver Ventas y Gastos). */}
            {tab === TAB_MILESTONES && (
              <button
                type="button"
                onClick={openCreate}
                className="btn-admin ml-2 inline-flex items-center gap-1.5 text-sm"
              >
                <Plus className="h-4 w-4" /> Nuevo hito
              </button>
            )}
          </div>
        }
      />

      {tab === TAB_MILESTONES ? (
        <>
          {/* Indicadores del programa. Todas las cifras vienen de
              GET /loyalty/stats; si esa llamada falla, la fila no se pinta en
              vez de mostrar ceros que se leerían como un dato real. */}
          {stats && (
            <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <StatsCard
                label="Clientes en programa"
                value={stats.clientsInProgram ?? 0}
                sublabel={
                  stats.newThisMonth > 0
                    ? `+${stats.newThisMonth} este mes`
                    : 'Con al menos un servicio completado'
                }
              />
              <StatsCard
                label="Hitos activos"
                value={stats.activeRules ?? 0}
                sublabel={`de ${stats.totalRules ?? 0} configurados`}
              />
              <StatsCard
                label="Premios entregados"
                value={stats.rewardsRedeemed ?? 0}
                sublabel={
                  stats.rewardsPending > 0
                    ? `${stats.rewardsPending} pendientes por entregar`
                    : 'Sin premios pendientes'
                }
              />
              <StatsCard
                label="Tasa de retorno"
                value={stats.returnRate == null ? '—' : `${stats.returnRate} %`}
                sublabel="Clientes que volvieron dos veces o más"
              />
            </div>
          )}
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
                  <TableHeader compact>Alcance</TableHeader>
                  <TableHeader compact>Estado</TableHeader>
                  <TableHeader compact className="text-right">
                    Acciones
                  </TableHeader>
                </TableHead>
                <TableBody>
                  {rules.map((r) => {
                    const everyCount = r.every_count ?? r.everyCount;
                    // `reachByRule` llega indexado por id de hito; sin la
                    // llamada de estadísticas no se afirma un alcance de 0,
                    // que sería un dato falso: se muestra un guion.
                    const reach = stats ? stats.reachByRule?.[r.id] ?? 0 : null;
                    return (
                      <TableRow key={r.id}>
                        <TableCell compact className="text-sm font-semibold tabular-nums text-stone-900">
                          {everyCount}
                        </TableCell>
                        <TableCell compact className="max-w-[16rem]">
                          <TablePrimaryCell
                            secondary={`Cada ${everyCount} servicio${everyCount === 1 ? '' : 's'} completado${
                              everyCount === 1 ? '' : 's'
                            }`}
                          >
                            {r.label}
                          </TablePrimaryCell>
                        </TableCell>
                        <TableCell compact className="max-w-[20rem]">
                          <RewardOptionsCell rule={r} />
                        </TableCell>
                        <TableCell compact>
                          {reach == null ? (
                            <span className="text-sm text-stone-400">—</span>
                          ) : (
                            <span className="text-sm font-semibold tabular-nums text-stone-900">
                              {reach}
                              <span className="ml-1 text-xs font-medium text-stone-500">
                                cliente{reach === 1 ? '' : 's'}
                              </span>
                            </span>
                          )}
                        </TableCell>
                        <TableCell compact>
                          <AdminStatusToggle
                            active={r.is_active ?? r.isActive}
                            onClick={() => toggleActive(r)}
                            disabled={togglingId === r.id}
                          />
                        </TableCell>
                        <TableCell compact>
                          <div className="flex items-center justify-end gap-2">
                            <AdminIconButton icon={Pencil} label="Editar hito" onClick={() => openEdit(r)} />
                            {/* Solo para hitos que todavía no otorgaron nada:
                                con historial la baja correcta es desactivar. */}
                            {stats && !reach ? (
                              <AdminIconButton
                                icon={Trash2}
                                variant="danger"
                                label="Eliminar hito"
                                onClick={() => setRuleToDelete(r)}
                              />
                            ) : null}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </DataCard>

          {/* Aviso permanente de contexto, no una alerta: explica de dónde
              salen las recompensas sin que nadie tenga que preguntarlo. */}
          <p className="mt-3 flex items-start gap-2 text-xs text-stone-500">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold-dark" aria-hidden />
            <span>
              Los hitos se otorgan solos cuando el cliente alcanza la cantidad de servicios
              completados configurada, y el premio se descuenta automáticamente en su siguiente
              cobro desde el módulo de Ventas.
            </span>
          </p>
        </>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-end gap-3">
            <div className="min-w-[14rem]">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.1em] text-stone-500">
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
                      <TableCell compact>
                        <Link
                          to={`/clients/${r.client.id}`}
                          className="text-sm font-semibold text-gold-dark hover:underline"
                        >
                          {r.client.firstName} {r.client.lastName}
                        </Link>
                      </TableCell>
                      <TableCell compact>{r.rule.label}</TableCell>
                      <TableCell compact className="max-w-[16rem] text-stone-600">
                        <span className="line-clamp-2">{itemsSummary(r.items)}</span>
                      </TableCell>
                      <TableCell compact className="tabular-nums">
                        {formatDisplayDate(r.grantedAt, { day: 'numeric', month: 'short', year: 'numeric' })}
                      </TableCell>
                      <TableCell compact>
                        {r.redeemedAt ? (
                          <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                            Canjeada
                          </span>
                        ) : (
                          <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
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
        onSaved={() => {
          loadRules();
          loadStats();
        }}
      />

      <AdminConfirmModal
        open={Boolean(ruleToDelete)}
        variant="danger"
        title="Eliminar hito"
        description={
          ruleToDelete
            ? `Se eliminará «${ruleToDelete.label}» y sus opciones de premio. Solo es posible porque todavía no lo ha alcanzado ningún cliente; si ya tuviera recompensas otorgadas habría que desactivarlo para conservar el historial.`
            : ''
        }
        confirmLabel="Eliminar"
        isSubmitting={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setRuleToDelete(null)}
      />
    </div>
  );
}
