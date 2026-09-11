/**
 * Usuarios (`/users`): único lugar del panel para cambiar el rol —
 * **cualquier rol, incluidos `barber`/`client`** — ver el detalle y
 * restablecer la contraseña de cualquier cuenta del sistema.
 *
 * Asignar `barber`/`client` crea también la ficha que le falta (nombre,
 * documento, y en el caso de barbero sus horarios), pidiendo esos datos en
 * el momento: el backend (`user.service.js`) hace esa creación en la misma
 * transacción para no dejar cuentas huérfanas sin ficha. Si la cuenta ya
 * tiene esa ficha (p. ej. un barbero al que se le quitó y se le devuelve el
 * rol), no se pide nada.
 *
 * Lo que sigue siendo exclusivo de cada ficha: la edición de sus datos
 * propios ya creados (nombre, teléfono, documento...) y activar/inactivar a
 * un cliente (`Client.isActive`, que decide si puede agendar — un concepto
 * de la ficha, no de la cuenta). Eso sigue en Clientes/Barberos.
 */

import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { KeyRound, Trash2, ShieldCheck, Eye } from 'lucide-react';
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
import AdminConfirmModal from '@/shared/feedback/AdminConfirmModal';
import AdminModalShell from '@/shared/components/admin/AdminModalShell';
import CustomSelect from '@/shared/components/CustomSelect';
import { FieldErrorMessage } from '@/shared/components/FormValidationFields';
import { useAppToast } from '@/shared/feedback/ToastContext';
import { useAuth } from '@/shared/contexts/AuthContext';
import {
  getApiErrorMessage,
  validateUserForm,
  validateBarberForm,
  DOCUMENT_TYPE_OPTIONS,
} from '@/shared/utils/formValidation';
import { formatRoleLabel } from '@/shared/utils/roleLabels';
import * as userService from '@/features/users/services/userService';
import * as roleService from '@/features/users/services/roleService';

const FORM_VACIO = { email: '', password: '', confirmPassword: '', roleId: '' };
const PERFIL_VACIO = { firstName: '', lastName: '', phone: '', documentType: '', documentNumber: '' };

const SEARCH_DEBOUNCE_MS = 350;
const PAGE_SIZE_OPTIONS = [10, 20, 50];

const ACTIVE_FILTER_OPTIONS = [
  { id: '', label: 'Todos' },
  { id: 'true', label: 'Activos' },
  { id: 'false', label: 'Inactivos' },
];

/** Etiqueta legible del tipo de perfil, para el modal de detalle. */
const PROFILE_LABELS = { client: 'Cliente', barber: 'Barbero' };

/** ¿Este rol necesita ficha propia (cliente o barbero)? */
const FICHA_ROLES = ['client', 'barber'];

/**
 * Campos de nombre/documento/teléfono para crear la ficha que le falta a una
 * cuenta que pasa a ser cliente o barbero. Reutiliza `validateBarberForm`
 * porque exige exactamente lo mismo (nombre, apellido, documento) que ya
 * exige el alta de Barberos — `isEdit: true` para no pedir también email o
 * contraseña, que aquí van en su propio campo.
 */
function validarPerfilFicha(perfil) {
  return validateBarberForm({ ...perfil, specialties: '' }, true);
}

/** Nombre, apellido, teléfono y documento — los mismos campos en el alta y
 * en la promoción a barbero/cliente, así que se pintan una sola vez. */
function CamposDeFicha({ idPrefix, value, onChange, errors }) {
  const set = (campo) => (v) => onChange({ ...value, [campo]: v });
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div>
        <label htmlFor={`${idPrefix}-firstName`} className="mb-1 block text-[11px] text-stone-500">
          Nombre
        </label>
        <input
          id={`${idPrefix}-firstName`}
          type="text"
          value={value.firstName}
          onChange={(e) => set('firstName')(e.target.value)}
          className={`input-premium w-full py-2 text-sm ${errors.firstName ? '!border-red-400' : ''}`}
        />
        <FieldErrorMessage message={errors.firstName} />
      </div>
      <div>
        <label htmlFor={`${idPrefix}-lastName`} className="mb-1 block text-[11px] text-stone-500">
          Apellido
        </label>
        <input
          id={`${idPrefix}-lastName`}
          type="text"
          value={value.lastName}
          onChange={(e) => set('lastName')(e.target.value)}
          className={`input-premium w-full py-2 text-sm ${errors.lastName ? '!border-red-400' : ''}`}
        />
        <FieldErrorMessage message={errors.lastName} />
      </div>
      <div>
        <label htmlFor={`${idPrefix}-documentType`} className="mb-1 block text-[11px] text-stone-500">
          Tipo de documento
        </label>
        <CustomSelect
          id={`${idPrefix}-documentType`}
          name="documentType"
          value={value.documentType}
          onChange={(e) => set('documentType')(e?.target?.value ?? e)}
          variant="form"
          placeholder="Selecciona…"
          options={DOCUMENT_TYPE_OPTIONS.map((t) => ({ id: t, label: t }))}
        />
        <FieldErrorMessage message={errors.documentType} />
      </div>
      <div>
        <label htmlFor={`${idPrefix}-documentNumber`} className="mb-1 block text-[11px] text-stone-500">
          Número de documento
        </label>
        <input
          id={`${idPrefix}-documentNumber`}
          type="text"
          value={value.documentNumber}
          onChange={(e) => set('documentNumber')(e.target.value)}
          className={`input-premium w-full py-2 text-sm ${errors.documentNumber ? '!border-red-400' : ''}`}
        />
        <FieldErrorMessage message={errors.documentNumber} />
      </div>
      <div className="sm:col-span-2">
        <label htmlFor={`${idPrefix}-phone`} className="mb-1 block text-[11px] text-stone-500">
          Teléfono <span className="font-normal text-stone-400">(opcional)</span>
        </label>
        <input
          id={`${idPrefix}-phone`}
          type="text"
          value={value.phone}
          onChange={(e) => set('phone')(e.target.value)}
          className={`input-premium w-full py-2 text-sm ${errors.phone ? '!border-red-400' : ''}`}
        />
        <FieldErrorMessage message={errors.phone} />
      </div>
    </div>
  );
}

export default function UsersPage() {
  const toast = useAppToast();
  const { user: actual, can } = useAuth();
  const puedeGestionar = can('users.manage');

  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState('');

  const [crearAbierto, setCrearAbierto] = useState(false);
  const [form, setForm] = useState(FORM_VACIO);
  const [perfil, setPerfil] = useState(PERFIL_VACIO);
  const [errors, setErrors] = useState({});
  const [guardando, setGuardando] = useState(false);

  const [passTarget, setPassTarget] = useState(null);
  const [nuevaPass, setNuevaPass] = useState('');
  const [confirmNuevaPass, setConfirmNuevaPass] = useState('');
  const [passError, setPassError] = useState('');
  const [confirmPassError, setConfirmPassError] = useState('');

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [eliminando, setEliminando] = useState(false);

  const [detailTarget, setDetailTarget] = useState(null);
  const [detailData, setDetailData] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Promover a una cuenta sin ficha propia a `barber`/`client`: pide nombre y
  // documento antes de mandar el cambio de rol. `null` cuando no hay ninguna
  // promoción en curso.
  const [promoteTarget, setPromoteTarget] = useState(null);
  const [promotePerfil, setPromotePerfil] = useState(PERFIL_VACIO);
  const [promoteErrors, setPromoteErrors] = useState({});
  const [promoteBusy, setPromoteBusy] = useState(false);

  // Los roles se cargan una sola vez: son pocos, no hace falta paginarlos ni
  // recargarlos cada vez que cambia un usuario.
  useEffect(() => {
    roleService
      .getRoles()
      .then((listaRoles) => setRoles(Array.isArray(listaRoles) ? listaRoles : []))
      .catch((err) => toast.error(getApiErrorMessage(err, 'No se pudieron cargar los roles.')));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { users: filas, total: totalFilas } = await userService.getUsers({
        search: debouncedSearch || undefined,
        roleId: roleFilter || undefined,
        active: activeFilter || undefined,
        limit: pageSize,
        offset: (page - 1) * pageSize,
      });
      setUsers(Array.isArray(filas) ? filas : []);
      setTotal(totalFilas ?? 0);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'No se pudieron cargar los usuarios.'));
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, roleFilter, activeFilter, page, pageSize, toast]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search]);

  // Cualquier cambio de filtro vuelve a la página 1: si no, se puede quedar
  // viendo una página que ya no existe para el nuevo filtro.
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, roleFilter, activeFilter, pageSize]);

  useEffect(() => {
    load();
  }, [load]);

  // Si una eliminación/desactivación deja la página actual vacía (era la
  // última de la lista), retrocede en vez de mostrar una página en blanco.
  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1);
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const rolesActivos = roles.filter((r) => r.is_active);
  const rolNombrePorId = (roleId) => roles.find((r) => Number(r.id) === Number(roleId))?.name;

  /** Opciones del selector de una fila: todos los roles activos, más el
   * actual aunque esté desactivado (para no dejar el control sin opción
   * válida si el rol de esa cuenta ya no se puede asignar de nuevo). */
  const opcionesDeRol = (u) => [
    { id: String(u.role_id), label: formatRoleLabel(u.role_name) },
    ...rolesActivos
      .filter((r) => r.id !== u.role_id)
      .map((r) => ({ id: String(r.id), label: formatRoleLabel(r.name) })),
  ];

  const crear = async (e) => {
    e.preventDefault();
    const validacion = validateUserForm(form);
    const rolElegido = rolNombrePorId(form.roleId);
    const necesitaFicha = FICHA_ROLES.includes(rolElegido);
    const validacionPerfil = necesitaFicha ? validarPerfilFicha(perfil) : { valid: true, errors: {} };
    if (!validacion.valid || !validacionPerfil.valid) {
      setErrors({ ...validacion.errors, ...validacionPerfil.errors });
      return;
    }
    setGuardando(true);
    try {
      await userService.createUser({
        email: form.email.trim(),
        password: form.password,
        roleId: Number(form.roleId),
        profile: necesitaFicha ? perfil : undefined,
      });
      toast.success('Usuario creado. Pásale la contraseña para que la cambie al entrar.');
      setCrearAbierto(false);
      setForm(FORM_VACIO);
      setPerfil(PERFIL_VACIO);
      setErrors({});
      await load();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'No se pudo crear el usuario.'));
    } finally {
      setGuardando(false);
    }
  };

  /**
   * Al elegir un rol de fila: si el destino es `barber`/`client` y la cuenta
   * todavía no tiene esa ficha, abre el modal de promoción a pedir nombre y
   * documento en vez de mandar el cambio directo — sin eso, el backend lo
   * rechazaría con 400. Si ya tiene la ficha (o el destino no la necesita),
   * cambia el rol de una.
   */
  const elegirRol = (u, roleId) => {
    if (Number(roleId) === Number(u.role_id)) return;
    const rolDestino = rolNombrePorId(roleId);
    if (rolDestino === 'barber' && !u.barber_id) {
      setPromoteTarget({ user: u, roleId: Number(roleId), roleName: 'barber' });
      setPromotePerfil(PERFIL_VACIO);
      setPromoteErrors({});
      return;
    }
    if (rolDestino === 'client' && !u.client_id) {
      setPromoteTarget({ user: u, roleId: Number(roleId), roleName: 'client' });
      setPromotePerfil(PERFIL_VACIO);
      setPromoteErrors({});
      return;
    }
    cambiarRol(u, roleId);
  };

  const cambiarRol = async (u, roleId, profile) => {
    setBusy(u.id);
    try {
      await userService.changeUserRole(u.id, Number(roleId), profile);
      toast.success('Rol actualizado.');
      setPromoteTarget(null);
      await load();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'No se pudo cambiar el rol.'));
    } finally {
      setBusy(null);
    }
  };

  const confirmarPromocion = async (e) => {
    e.preventDefault();
    const validacion = validarPerfilFicha(promotePerfil);
    if (!validacion.valid) {
      setPromoteErrors(validacion.errors);
      return;
    }
    setPromoteBusy(true);
    try {
      await userService.changeUserRole(promoteTarget.user.id, promoteTarget.roleId, promotePerfil);
      toast.success(
        promoteTarget.roleName === 'barber'
          ? 'Rol actualizado: se creó también su ficha de barbero y su horario por defecto.'
          : 'Rol actualizado: se creó también su ficha de cliente.',
      );
      setPromoteTarget(null);
      await load();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'No se pudo completar la promoción.'));
    } finally {
      setPromoteBusy(false);
    }
  };

  const alternarEstado = async (u) => {
    setBusy(u.id);
    try {
      await userService.setUserActive(u.id, !u.is_active);
      toast.success(u.is_active ? 'Usuario desactivado.' : 'Usuario activado.');
      await load();
    } catch (err) {
      // El backend responde 409 si sería el último administrador activo, o si
      // es un cliente (se activa desde Clientes), con un mensaje que explica
      // qué hacer. Se muestra tal cual.
      toast.error(getApiErrorMessage(err, 'No se pudo cambiar el estado.'));
    } finally {
      setBusy(null);
    }
  };

  const restablecer = async (e) => {
    e.preventDefault();
    const validacion = validateUserForm(
      { password: nuevaPass, confirmPassword: confirmNuevaPass },
      { soloPassword: true },
    );
    if (!validacion.valid) {
      setPassError(validacion.errors.password || '');
      setConfirmPassError(validacion.errors.confirmPassword || '');
      return;
    }
    setBusy(passTarget.id);
    try {
      await userService.resetUserPassword(passTarget.id, nuevaPass);
      toast.success('Contraseña restablecida.');
      setPassTarget(null);
      setNuevaPass('');
      setConfirmNuevaPass('');
      setPassError('');
      setConfirmPassError('');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'No se pudo restablecer la contraseña.'));
    } finally {
      setBusy(null);
    }
  };

  const confirmarBorrado = async () => {
    setEliminando(true);
    try {
      await userService.deleteUser(deleteTarget.id);
      toast.success('Usuario eliminado.');
      setDeleteTarget(null);
      await load();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'No se pudo eliminar el usuario.'));
    } finally {
      setEliminando(false);
    }
  };

  const verDetalle = async (u) => {
    setDetailTarget(u);
    setDetailData(null);
    setDetailLoading(true);
    try {
      const data = await userService.getUserById(u.id);
      setDetailData(data);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'No se pudo cargar el detalle.'));
      setDetailTarget(null);
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <div className="page-shell">
        <PageHeader
        subtitle="Todas las cuentas del sistema: cambia su rol, consulta su ficha y restablece su contraseña."
        actions={
          <div className="flex flex-wrap gap-1.5">
            <Link to="/roles" className="btn-admin-outline text-xs px-3 py-2">
              Roles y permisos
            </Link>
            {puedeGestionar ? (
              <button type="button" className="btn-admin text-sm py-2" onClick={() => setCrearAbierto(true)}>
                Nuevo usuario
              </button>
            ) : null}
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="min-w-[14rem] flex-1">
          <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-stone-500">
            Buscar
          </span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por correo…"
            className="input-premium w-full py-2 text-sm"
            autoComplete="off"
            aria-label="Buscar usuarios por correo"
          />
        </div>
        <FilterSelect
          label="Rol"
          value={roleFilter}
          onChange={setRoleFilter}
          options={[{ id: '', label: 'Todos' }, ...roles.map((r) => ({ id: String(r.id), label: formatRoleLabel(r.name) }))]}
          ariaLabel="Filtrar por rol"
        />
        <FilterSelect
          label="Estado"
          value={activeFilter}
          onChange={setActiveFilter}
          options={ACTIVE_FILTER_OPTIONS}
          ariaLabel="Filtrar por estado"
        />
      </div>

      <DataCard compact>
        <AdminPagination
          idPrefix="users-admin"
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          pageSizeOptions={PAGE_SIZE_OPTIONS}
          itemLabel="usuarios"
          showSummary
          layout="bar"
          className="mb-3"
        />
        {loading ? (
          <div className="py-10 text-center text-sm text-stone-500">Cargando…</div>
        ) : users.length === 0 ? (
          <div className="py-10 text-center text-sm text-stone-500">No hay usuarios que coincidan.</div>
        ) : (
          <Table>
            <TableHead>
              <TableHeader compact>Correo</TableHeader>
              <TableHeader compact>Rol</TableHeader>
              <TableHeader compact>Estado</TableHeader>
              <TableHeader compact className="text-right">
                Acciones
              </TableHeader>
            </TableHead>
            <TableBody>
              {users.map((u) => {
                const esYo = Number(u.id) === Number(actual?.id);
                // Cliente o barbero: tiene ficha propia. Borrarlo y (si es
                // cliente) activarlo/inactivarlo siguen viviendo en su
                // módulo — el backend los rechaza aquí con un mensaje claro,
                // así que ni se ofrece el botón.
                const nombreFicha = u.client_name || u.barber_name || null;
                const tieneFicha = Boolean(u.client_id || u.barber_id);
                const esCliente = Boolean(u.client_id);
                return (
                  <TableRow key={u.id}>
                    <TableCell compact className="text-xs font-medium">
                      <span className="break-all">{u.email}</span>
                      {nombreFicha ? (
                        <span className="ml-1.5 text-[11px] text-stone-400">({nombreFicha})</span>
                      ) : null}
                      {esYo ? (
                        <span className="ml-1.5 rounded bg-stone-100 px-1.5 py-0.5 text-[10px] text-stone-600">
                          tú
                        </span>
                      ) : null}
                    </TableCell>

                    <TableCell compact>
                      {/* Nadie puede cambiarse el rol a sí mismo: evita
                          autobloquearse y autoconcederse permisos. */}
                      {puedeGestionar && !esYo ? (
                        <CustomSelect
                          id={`rol-${u.id}`}
                          name={`rol-${u.id}`}
                          value={String(u.role_id)}
                          onChange={(e) => elegirRol(u, e?.target?.value ?? e)}
                          variant="filter"
                          disabled={busy === u.id}
                          options={opcionesDeRol(u)}
                        />
                      ) : (
                        <span className="text-xs text-stone-700">{formatRoleLabel(u.role_name)}</span>
                      )}
                    </TableCell>

                    <TableCell compact>
                      {esCliente ? (
                        <span
                          className="text-[11px] text-stone-400"
                          title="El acceso de los clientes se activa desde el módulo de Clientes."
                        >
                          Ver en Clientes
                        </span>
                      ) : (
                        <AdminStatusToggle
                          active={u.is_active}
                          onClick={() => alternarEstado(u)}
                          disabled={!puedeGestionar || esYo || busy === u.id}
                          activeTitle={
                            esYo ? 'No puedes desactivar tu propia cuenta' : 'Clic para desactivar'
                          }
                          inactiveTitle={esYo ? 'Es tu propia cuenta' : 'Clic para activar'}
                        />
                      )}
                    </TableCell>

                    <TableCell compact>
                      <div className="inline-flex justify-end gap-1.5">
                        <AdminIconButton
                          icon={Eye}
                          label="Ver detalle"
                          onClick={() => verDetalle(u)}
                        />
                        {puedeGestionar ? (
                          <>
                            <AdminIconButton
                              icon={KeyRound}
                              label="Restablecer contraseña"
                              onClick={() => {
                                setPassTarget(u);
                                setNuevaPass('');
                                setConfirmNuevaPass('');
                                setPassError('');
                                setConfirmPassError('');
                              }}
                            />
                            {/* Un cliente o un barbero se elimina desde su
                                propio módulo (retira también su ficha y, si
                                es barbero, sus horarios). */}
                            {!esYo && !tieneFicha ? (
                              <AdminIconButton
                                icon={Trash2}
                                label="Eliminar usuario"
                                variant="danger"
                                onClick={() => setDeleteTarget(u)}
                              />
                            ) : null}
                          </>
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

      <AdminModalShell
        open={crearAbierto}
        title="Nuevo usuario"
        onClose={() => {
          if (!guardando) {
            setCrearAbierto(false);
            setPerfil(PERFIL_VACIO);
          }
        }}
      >
        <form className="grid gap-3" onSubmit={crear} noValidate>
          <div>
            <label htmlFor="u-email" className="mb-1 block text-[11px] text-stone-500">
              Correo
            </label>
            <input
              id="u-email"
              type="email"
              value={form.email}
              onChange={(e) => {
                setForm((f) => ({ ...f, email: e.target.value }));
                setErrors((x) => ({ ...x, email: '' }));
              }}
              className={`input-premium w-full py-2 text-sm ${errors.email ? '!border-red-400' : ''}`}
              autoComplete="off"
            />
            <FieldErrorMessage message={errors.email} />
          </div>

          <div>
            <label htmlFor="u-pass" className="mb-1 block text-[11px] text-stone-500">
              Contraseña temporal
            </label>
            <input
              id="u-pass"
              type="text"
              value={form.password}
              onChange={(e) => {
                setForm((f) => ({ ...f, password: e.target.value }));
                setErrors((x) => ({ ...x, password: '' }));
              }}
              className={`input-premium w-full py-2 text-sm ${errors.password ? '!border-red-400' : ''}`}
              autoComplete="new-password"
            />
            <FieldErrorMessage message={errors.password} />
            <p className="mt-1 text-[11px] text-stone-500">
              Se muestra en claro a propósito: tienes que poder copiarla para dársela. Pídele que la
              cambie al entrar.
            </p>
          </div>

          <div>
            <label htmlFor="u-pass-confirm" className="mb-1 block text-[11px] text-stone-500">
              Confirmar contraseña
            </label>
            <input
              id="u-pass-confirm"
              type="text"
              value={form.confirmPassword}
              onChange={(e) => {
                setForm((f) => ({ ...f, confirmPassword: e.target.value }));
                setErrors((x) => ({ ...x, confirmPassword: '' }));
              }}
              className={`input-premium w-full py-2 text-sm ${errors.confirmPassword ? '!border-red-400' : ''}`}
              autoComplete="new-password"
            />
            <FieldErrorMessage message={errors.confirmPassword} />
          </div>

          <div>
            <label htmlFor="u-rol" className="mb-1 block text-[11px] text-stone-500">
              Rol
            </label>
            <CustomSelect
              id="u-rol"
              name="roleId"
              value={form.roleId}
              onChange={(e) => {
                setForm((f) => ({ ...f, roleId: e?.target?.value ?? e }));
                setErrors((x) => ({ ...x, roleId: '' }));
              }}
              variant="form"
              placeholder="Elige un rol"
              options={rolesActivos.map((r) => ({ id: String(r.id), label: formatRoleLabel(r.name) }))}
            />
            <FieldErrorMessage message={errors.roleId} />
          </div>

          {FICHA_ROLES.includes(rolNombrePorId(form.roleId)) ? (
            <>
              <hr className="border-stone-100" />
              <p className="text-[11px] text-stone-500">
                Este rol necesita una ficha propia — los mismos datos que pide el alta de{' '}
                {rolNombrePorId(form.roleId) === 'barber' ? 'Barberos' : 'Clientes'}.
              </p>
              <CamposDeFicha idPrefix="u-nuevo" value={perfil} onChange={setPerfil} errors={errors} />
            </>
          ) : null}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              className="btn-admin-outline text-sm py-2"
              onClick={() => {
                setCrearAbierto(false);
                setPerfil(PERFIL_VACIO);
              }}
              disabled={guardando}
            >
              Cancelar
            </button>
            <button type="submit" className="btn-admin text-sm py-2" disabled={guardando}>
              {guardando ? 'Creando…' : 'Crear usuario'}
            </button>
          </div>
        </form>
      </AdminModalShell>

      <AdminModalShell
        open={Boolean(passTarget)}
        title="Restablecer contraseña"
        onClose={() => setPassTarget(null)}
      >
        <form className="grid gap-3" onSubmit={restablecer} noValidate>
          <p className="text-xs text-stone-600">
            Nueva contraseña para <strong className="text-stone-800">{passTarget?.email}</strong>.
          </p>
          <div>
            <input
              type="text"
              value={nuevaPass}
              onChange={(e) => {
                setNuevaPass(e.target.value);
                setPassError('');
              }}
              className={`input-premium w-full py-2 text-sm ${passError ? '!border-red-400' : ''}`}
              autoComplete="new-password"
            />
            <FieldErrorMessage message={passError} />
          </div>
          <div>
            <label htmlFor="u-reset-confirm" className="mb-1 block text-[11px] text-stone-500">
              Confirmar contraseña
            </label>
            <input
              id="u-reset-confirm"
              type="text"
              value={confirmNuevaPass}
              onChange={(e) => {
                setConfirmNuevaPass(e.target.value);
                setConfirmPassError('');
              }}
              className={`input-premium w-full py-2 text-sm ${confirmPassError ? '!border-red-400' : ''}`}
              autoComplete="new-password"
            />
            <FieldErrorMessage message={confirmPassError} />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-admin-outline text-sm py-2" onClick={() => setPassTarget(null)}>
              Cancelar
            </button>
            <button type="submit" className="btn-admin text-sm py-2">
              Restablecer
            </button>
          </div>
        </form>
      </AdminModalShell>

      <AdminModalShell
        open={Boolean(detailTarget)}
        title="Detalle del usuario"
        onClose={() => setDetailTarget(null)}
      >
        {detailLoading ? (
          <div className="py-6 text-center text-sm text-stone-500">Cargando…</div>
        ) : detailData ? (
          <div className="grid gap-2 text-sm">
            <div className="flex justify-between gap-3">
              <span className="text-stone-500">Correo</span>
              <span className="font-medium text-stone-800 break-all text-right">{detailData.email}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-stone-500">Rol</span>
              <span className="font-medium text-stone-800">{formatRoleLabel(detailData.role_name)}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-stone-500">Estado de la cuenta</span>
              <span className="font-medium text-stone-800">
                {detailData.is_active ? 'Activa' : 'Inactiva'}
              </span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-stone-500">Alta</span>
              <span className="font-medium text-stone-800">
                {detailData.created_at ? new Date(detailData.created_at).toLocaleDateString() : '—'}
              </span>
            </div>

            {detailData.profile ? (
              <>
                <hr className="my-1.5 border-stone-100" />
                <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-400">
                  Ficha de {PROFILE_LABELS[detailData.profile_type] ?? detailData.profile_type}
                  {detailData.client_name || detailData.barber_name
                    ? `: ${detailData.client_name || detailData.barber_name}`
                    : ''}
                </p>
                {detailData.profile.phone ? (
                  <div className="flex justify-between gap-3">
                    <span className="text-stone-500">Teléfono</span>
                    <span className="font-medium text-stone-800">{detailData.profile.phone}</span>
                  </div>
                ) : null}
                {detailData.profile.document_type || detailData.profile.document_number ? (
                  <div className="flex justify-between gap-3">
                    <span className="text-stone-500">Documento</span>
                    <span className="font-medium text-stone-800">
                      {[detailData.profile.document_type, detailData.profile.document_number]
                        .filter(Boolean)
                        .join(' ')}
                    </span>
                  </div>
                ) : null}
                {detailData.profile_type === 'barber' && detailData.profile.specialties?.length > 0 ? (
                  <div className="flex justify-between gap-3">
                    <span className="text-stone-500">Especialidades</span>
                    <span className="font-medium text-stone-800 text-right">
                      {detailData.profile.specialties.join(', ')}
                    </span>
                  </div>
                ) : null}
                {detailData.profile_type === 'barber' && detailData.profile.commission_percent != null ? (
                  <div className="flex justify-between gap-3">
                    <span className="text-stone-500">Comisión</span>
                    <span className="font-medium text-stone-800">
                      {detailData.profile.commission_percent}%
                    </span>
                  </div>
                ) : null}
                <div className="flex justify-between gap-3">
                  <span className="text-stone-500">
                    {detailData.profile_type === 'client' ? 'Puede agendar' : 'Activo en el equipo'}
                  </span>
                  <span className="font-medium text-stone-800">
                    {detailData.profile.is_active ? 'Sí' : 'No'}
                  </span>
                </div>
              </>
            ) : null}
          </div>
        ) : null}
      </AdminModalShell>

      <AdminModalShell
        open={Boolean(promoteTarget)}
        title={promoteTarget?.roleName === 'barber' ? 'Ascender a barbero' : 'Ascender a cliente'}
        onClose={() => {
          if (!promoteBusy) setPromoteTarget(null);
        }}
      >
        <form className="grid gap-3" onSubmit={confirmarPromocion} noValidate>
          <p className="text-xs text-stone-600">
            <strong className="text-stone-800">{promoteTarget?.user?.email}</strong> todavía no tiene
            ficha de {promoteTarget?.roleName === 'barber' ? 'barbero' : 'cliente'}. Complétala para
            terminar el cambio de rol
            {promoteTarget?.roleName === 'barber' ? ' (nace con el horario estándar del negocio)' : ''}.
          </p>
          <CamposDeFicha
            idPrefix="u-promover"
            value={promotePerfil}
            onChange={setPromotePerfil}
            errors={promoteErrors}
          />
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              className="btn-admin-outline text-sm py-2"
              onClick={() => setPromoteTarget(null)}
              disabled={promoteBusy}
            >
              Cancelar
            </button>
            <button type="submit" className="btn-admin text-sm py-2" disabled={promoteBusy}>
              {promoteBusy ? 'Guardando…' : 'Confirmar rol'}
            </button>
          </div>
        </form>
      </AdminModalShell>

      <AdminConfirmModal
        open={Boolean(deleteTarget)}
        variant="danger"
        title="¿Eliminar usuario?"
        description={
          deleteTarget ? (
            <>
              Se eliminará la cuenta de{' '}
              <strong className="text-stone-800">{deleteTarget.email}</strong>. Si ya registró
              movimientos en el sistema no se podrá borrar; en ese caso desactívala.
            </>
          ) : null
        }
        confirmLabel="Sí, eliminar"
        isSubmitting={eliminando}
        onCancel={() => {
          if (!eliminando) setDeleteTarget(null);
        }}
        onConfirm={confirmarBorrado}
      />

      <p className="mt-4 flex items-start gap-1.5 text-[11px] text-stone-500">
        <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
        <span>
          Desactivar una cuenta corta su acceso de inmediato. No puedes cambiar tu propio rol ni
          desactivarte, y el sistema impide quedarse sin ningún administrador activo. El acceso de
          los clientes y el borrado de clientes/barberos siguen gestionándose desde su propio módulo.
        </span>
      </p>
    </div>
  );
}
