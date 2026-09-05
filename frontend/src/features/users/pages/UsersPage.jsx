/**
 * Usuarios del personal (`/users`).
 *
 * Gestiona a quien trabaja en la barbería: administradores, barberos y los roles
 * que se hayan creado. **Los clientes no salen aquí**: el backend los excluye de
 * la lista y rechaza cambiarles el rol, porque un cliente es un cliente y no se
 * promueve a administrador. Para ellos está la pantalla de Clientes, que sigue
 * funcionando exactamente igual que siempre.
 */

import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { KeyRound, Trash2, ShieldCheck } from 'lucide-react';
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
import AdminConfirmModal from '@/shared/feedback/AdminConfirmModal';
import AdminModalShell from '@/shared/components/admin/AdminModalShell';
import CustomSelect from '@/shared/components/CustomSelect';
import { FieldErrorMessage } from '@/shared/components/FormValidationFields';
import { useAppToast } from '@/shared/feedback/ToastContext';
import { useAuth } from '@/shared/contexts/AuthContext';
import { getApiErrorMessage, validateUserForm } from '@/shared/utils/formValidation';
import * as userService from '@/features/users/services/userService';
import * as roleService from '@/features/users/services/roleService';

const FORM_VACIO = { email: '', password: '', roleId: '' };

export default function UsersPage() {
  const toast = useAppToast();
  const { user: actual, can } = useAuth();
  const puedeGestionar = can('users.manage');

  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);

  const [crearAbierto, setCrearAbierto] = useState(false);
  const [form, setForm] = useState(FORM_VACIO);
  const [errors, setErrors] = useState({});
  const [guardando, setGuardando] = useState(false);

  const [passTarget, setPassTarget] = useState(null);
  const [nuevaPass, setNuevaPass] = useState('');
  const [passError, setPassError] = useState('');

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [eliminando, setEliminando] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [{ users: filas }, listaRoles] = await Promise.all([
        userService.getUsers({ active: '' }),
        roleService.getRoles(),
      ]);
      setUsers(Array.isArray(filas) ? filas : []);
      // El rol de cliente no se ofrece: no se asigna desde este módulo.
      setRoles((Array.isArray(listaRoles) ? listaRoles : []).filter((r) => r.name !== 'client'));
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'No se pudieron cargar los usuarios.'));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const rolesActivos = roles.filter((r) => r.is_active);

  const crear = async (e) => {
    e.preventDefault();
    const validacion = validateUserForm(form);
    if (!validacion.valid) {
      setErrors(validacion.errors);
      return;
    }
    setGuardando(true);
    try {
      await userService.createUser({
        email: form.email.trim(),
        password: form.password,
        roleId: Number(form.roleId),
      });
      toast.success('Usuario creado. Pásale la contraseña para que la cambie al entrar.');
      setCrearAbierto(false);
      setForm(FORM_VACIO);
      setErrors({});
      await load();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'No se pudo crear el usuario.'));
    } finally {
      setGuardando(false);
    }
  };

  const cambiarRol = async (u, roleId) => {
    if (Number(roleId) === Number(u.role_id)) return;
    setBusy(u.id);
    try {
      await userService.changeUserRole(u.id, Number(roleId));
      toast.success('Rol actualizado.');
      await load();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'No se pudo cambiar el rol.'));
    } finally {
      setBusy(null);
    }
  };

  const alternarEstado = async (u) => {
    setBusy(u.id);
    try {
      await userService.setUserActive(u.id, !u.is_active);
      toast.success(u.is_active ? 'Usuario desactivado.' : 'Usuario activado.');
      await load();
    } catch (err) {
      // El backend responde 409 si sería el último administrador activo, con un
      // mensaje que explica qué hacer. Se muestra tal cual.
      toast.error(getApiErrorMessage(err, 'No se pudo cambiar el estado.'));
    } finally {
      setBusy(null);
    }
  };

  const restablecer = async (e) => {
    e.preventDefault();
    const validacion = validateUserForm({ password: nuevaPass }, { soloPassword: true });
    if (!validacion.valid) {
      setPassError(validacion.errors.password);
      return;
    }
    setBusy(passTarget.id);
    try {
      await userService.resetUserPassword(passTarget.id, nuevaPass);
      toast.success('Contraseña restablecida.');
      setPassTarget(null);
      setNuevaPass('');
      setPassError('');
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

  return (
    <div className="page-shell">
      <PageHeader
        title="Usuarios"
        subtitle="Personal con acceso al sistema. Los clientes se gestionan desde su propia pantalla."
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

      <DataCard compact>
        {loading ? (
          <div className="py-10 text-center text-sm text-stone-500">Cargando…</div>
        ) : users.length === 0 ? (
          <div className="py-10 text-center text-sm text-stone-500">No hay usuarios del personal.</div>
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
                return (
                  <TableRow key={u.id}>
                    <TableCell compact className="text-xs font-medium">
                      <span className="break-all">{u.email}</span>
                      {u.barber_name ? (
                        <span className="ml-1.5 text-[11px] text-stone-400">({u.barber_name})</span>
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
                          onChange={(e) => cambiarRol(u, e?.target?.value ?? e)}
                          variant="filter"
                          disabled={busy === u.id}
                          options={rolesActivos.map((r) => ({ id: String(r.id), label: r.name }))}
                        />
                      ) : (
                        <span className="text-xs text-stone-700">{u.role_name}</span>
                      )}
                    </TableCell>

                    <TableCell compact>
                      <AdminStatusToggle
                        active={u.is_active}
                        onClick={() => alternarEstado(u)}
                        disabled={!puedeGestionar || esYo || busy === u.id}
                        activeTitle={
                          esYo ? 'No puedes desactivar tu propia cuenta' : 'Clic para desactivar'
                        }
                        inactiveTitle={esYo ? 'Es tu propia cuenta' : 'Clic para activar'}
                      />
                    </TableCell>

                    <TableCell compact>
                      <div className="inline-flex justify-end gap-1.5">
                        {puedeGestionar ? (
                          <>
                            <AdminIconButton
                              icon={KeyRound}
                              label="Restablecer contraseña"
                              onClick={() => {
                                setPassTarget(u);
                                setNuevaPass('');
                                setPassError('');
                              }}
                            />
                            {/* Un barbero se elimina desde su propio módulo, para
                                que se retiren también sus horarios. */}
                            {!esYo && !u.barber_id ? (
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
          if (!guardando) setCrearAbierto(false);
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
              options={rolesActivos.map((r) => ({ id: String(r.id), label: r.name }))}
            />
            <FieldErrorMessage message={errors.roleId} />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              className="btn-admin-outline text-sm py-2"
              onClick={() => setCrearAbierto(false)}
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
          desactivarte, y el sistema impide quedarse sin ningún administrador activo.
        </span>
      </p>
    </div>
  );
}
