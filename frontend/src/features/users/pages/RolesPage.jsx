/**
 * Roles y permisos (`/roles`).
 *
 * Aquí se responde a la pregunta que motivó el módulo: cómo darle acceso al
 * contador de la barbería sin convertirlo en administrador. Se crea un rol nuevo
 * y se le marcan solo los permisos que necesita —consultar ventas, compras y
 * gastos, por ejemplo— sin ninguna casilla de gestión.
 *
 * El catálogo de permisos es de solo lectura: lo declara el backend, porque un
 * permiso que ningún código consulte no haría nada.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Pencil, Trash2, Lock } from 'lucide-react';
import PageHeader from '@/shared/components/admin/PageHeader';
import DataCard from '@/shared/components/admin/DataCard';
import AdminIconButton from '@/shared/components/admin/AdminIconButton';
import AdminModalShell from '@/shared/components/admin/AdminModalShell';
import AdminConfirmModal from '@/shared/feedback/AdminConfirmModal';
import { FieldErrorMessage } from '@/shared/components/FormValidationFields';
import { useAppToast } from '@/shared/feedback/ToastContext';
import { useAuth } from '@/shared/contexts/AuthContext';
import { getApiErrorMessage, validateRoleForm } from '@/shared/utils/formValidation';
import * as roleService from '@/features/users/services/roleService';

const FORM_VACIO = { name: '', description: '', permissions: [] };

export default function RolesPage() {
  const toast = useAppToast();
  const { can, permissions: propios, refreshUser } = useAuth();
  const puedeGestionar = can('roles.manage');

  const [roles, setRoles] = useState([]);
  const [catalogo, setCatalogo] = useState([]);
  const [loading, setLoading] = useState(true);

  const [editando, setEditando] = useState(null); // null = cerrado, {} = nuevo
  const [form, setForm] = useState(FORM_VACIO);
  const [errors, setErrors] = useState({});
  const [guardando, setGuardando] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [eliminando, setEliminando] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [listaRoles, cat] = await Promise.all([
        roleService.getRoles(),
        roleService.getPermissionCatalog(),
      ]);
      setRoles(Array.isArray(listaRoles) ? listaRoles : []);
      setCatalogo(Array.isArray(cat) ? cat : []);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'No se pudieron cargar los roles.'));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const misPermisos = useMemo(() => new Set(propios ?? []), [propios]);

  const abrirNuevo = () => {
    setEditando({});
    setForm(FORM_VACIO);
    setErrors({});
  };

  const abrirEdicion = (rol) => {
    setEditando(rol);
    setForm({
      name: rol.name,
      description: rol.description ?? '',
      permissions: [...(rol.permissions ?? [])],
    });
    setErrors({});
  };

  const alternarPermiso = (code) => {
    setForm((f) => ({
      ...f,
      permissions: f.permissions.includes(code)
        ? f.permissions.filter((c) => c !== code)
        : [...f.permissions, code],
    }));
  };

  const esAdmin = editando?.name === 'admin';

  const guardar = async (e) => {
    e.preventDefault();
    const validacion = validateRoleForm(form);
    if (!validacion.valid) {
      setErrors(validacion.errors);
      return;
    }
    setGuardando(true);
    try {
      if (editando?.id) {
        await roleService.updateRole(editando.id, {
          name: form.name,
          description: form.description,
          // Los permisos del rol de administrador no se envían: el backend los
          // rechaza para garantizar que siempre quede un acceso de rescate.
          ...(esAdmin ? {} : { permissions: form.permissions }),
        });
      } else {
        await roleService.createRole(form);
      }
      toast.success('Rol guardado correctamente.');
      setEditando(null);
      await load();
      // Si el rol tocado es el propio, los permisos del navegador se quedarían
      // desfasados hasta el siguiente arranque.
      await refreshUser?.();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'No se pudo guardar el rol.'));
    } finally {
      setGuardando(false);
    }
  };

  const confirmarBorrado = async () => {
    setEliminando(true);
    try {
      await roleService.deleteRole(deleteTarget.id);
      toast.success('Rol eliminado.');
      setDeleteTarget(null);
      await load();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'No se pudo eliminar el rol.'));
    } finally {
      setEliminando(false);
    }
  };

  return (
    <div className="page-shell">
      <PageHeader
        title="Roles y permisos"
        subtitle="Define qué puede hacer cada tipo de usuario. Marca solo lo imprescindible."
        actions={
          <div className="flex flex-wrap gap-1.5">
            <Link to="/users" className="btn-admin-outline text-xs px-3 py-2">
              Usuarios
            </Link>
            {puedeGestionar ? (
              <button type="button" className="btn-admin text-sm py-2" onClick={abrirNuevo}>
                Nuevo rol
              </button>
            ) : null}
          </div>
        }
      />

      {loading ? (
        <DataCard compact>
          <div className="py-10 text-center text-sm text-stone-500">Cargando…</div>
        </DataCard>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {roles.map((rol) => (
            <div key={rol.id} className="rounded-xl border border-stone-200/90 bg-white p-4 shadow-sm">
              <div className="mb-2 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 font-medium text-stone-900">
                    <span className="truncate">{rol.name}</span>
                    {rol.is_system ? (
                      <Lock className="h-3.5 w-3.5 shrink-0 text-stone-400" aria-label="Rol del sistema" />
                    ) : null}
                  </p>
                  <p className="mt-0.5 text-xs text-stone-500">{rol.description || 'Sin descripción'}</p>
                </div>
                {puedeGestionar ? (
                  <div className="flex shrink-0 gap-1.5">
                    <AdminIconButton icon={Pencil} label="Editar rol" onClick={() => abrirEdicion(rol)} />
                    {/* Los roles del sistema no se borran: hay código que depende
                        de sus nombres. */}
                    {!rol.is_system ? (
                      <AdminIconButton
                        icon={Trash2}
                        label="Eliminar rol"
                        variant="danger"
                        onClick={() => setDeleteTarget(rol)}
                      />
                    ) : null}
                  </div>
                ) : null}
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-stone-600">
                  {rol.permissions.length} permiso{rol.permissions.length === 1 ? '' : 's'}
                </span>
                <span className="text-stone-500">
                  {rol.user_count} usuario{rol.user_count === 1 ? '' : 's'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <AdminModalShell
        open={editando !== null}
        size="lg"
        title={editando?.id ? `Editar rol: ${editando.name}` : 'Nuevo rol'}
        subtitle="Marca únicamente lo que este rol necesita. Se puede ajustar después."
        onClose={() => {
          if (!guardando) setEditando(null);
        }}
      >
        <form className="grid gap-3" onSubmit={guardar} noValidate>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="r-name" className="mb-1 block text-[11px] text-stone-500">
                Nombre
              </label>
              <input
                id="r-name"
                value={form.name}
                disabled={editando?.is_system}
                onChange={(e) => {
                  setForm((f) => ({ ...f, name: e.target.value }));
                  setErrors((x) => ({ ...x, name: '' }));
                }}
                className={`input-premium w-full py-2 text-sm disabled:bg-stone-100 ${errors.name ? '!border-red-400' : ''}`}
                placeholder="Ej. Contador"
              />
              <FieldErrorMessage message={errors.name} />
              {editando?.is_system ? (
                <p className="mt-1 text-[11px] text-stone-500">
                  Los roles del sistema no se pueden renombrar.
                </p>
              ) : null}
            </div>
            <div>
              <label htmlFor="r-desc" className="mb-1 block text-[11px] text-stone-500">
                Descripción
              </label>
              <input
                id="r-desc"
                value={form.description}
                maxLength={255}
                onChange={(e) => {
                  setForm((f) => ({ ...f, description: e.target.value }));
                  setErrors((x) => ({ ...x, description: '' }));
                }}
                className={`input-premium w-full py-2 text-sm ${errors.description ? '!border-red-400' : ''}`}
                placeholder="Para qué sirve este rol"
              />
              <FieldErrorMessage message={errors.description} />
            </div>
          </div>

          {esAdmin ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              Los permisos del rol de administrador no se modifican: es el que garantiza que siempre
              quede alguien capaz de reparar una configuración equivocada.
            </p>
          ) : (
            <div className="max-h-[45vh] overflow-y-auto rounded-lg border border-stone-200 p-3">
              {catalogo.map((grupo) => (
                <div key={grupo.module} className="mb-3 last:mb-0">
                  <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-gold">
                    {grupo.label}
                  </p>
                  <div className="grid gap-1 sm:grid-cols-2">
                    {grupo.permissions.map((p) => {
                      // No se puede conceder lo que uno mismo no tiene: el backend
                      // lo rechaza, así que la casilla se deshabilita y se explica.
                      const puedeConcederlo = misPermisos.has(p.code);
                      return (
                        <label
                          key={p.code}
                          className={`flex items-start gap-2 rounded px-1.5 py-1 text-xs ${
                            puedeConcederlo ? 'hover:bg-stone-50' : 'opacity-50'
                          }`}
                          title={puedeConcederlo ? p.description : 'No puedes conceder un permiso que tú no tienes'}
                        >
                          <input
                            type="checkbox"
                            className="mt-0.5"
                            checked={form.permissions.includes(p.code)}
                            disabled={!puedeConcederlo}
                            onChange={() => alternarPermiso(p.code)}
                          />
                          <span className="min-w-0">
                            <span className="block text-stone-700">{p.description}</span>
                            <span className="block text-[10px] text-stone-400">{p.code}</span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="btn-admin-outline text-sm py-2"
              onClick={() => setEditando(null)}
              disabled={guardando}
            >
              Cancelar
            </button>
            <button type="submit" className="btn-admin text-sm py-2" disabled={guardando}>
              {guardando ? 'Guardando…' : 'Guardar rol'}
            </button>
          </div>
        </form>
      </AdminModalShell>

      <AdminConfirmModal
        open={Boolean(deleteTarget)}
        variant="danger"
        title="¿Eliminar rol?"
        description={
          deleteTarget ? (
            <>
              Se eliminará el rol <strong className="text-stone-800">{deleteTarget.name}</strong>. Si
              todavía hay usuarios con él, habrá que cambiarles el rol primero.
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
    </div>
  );
}
