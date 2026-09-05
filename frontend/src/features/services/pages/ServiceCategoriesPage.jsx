/**
 * Categorías de servicio (`/services/categories`).
 *
 * Réplica del patrón que ya existía en Inventario para las categorías de
 * producto: formulario de alta arriba, tabla con edición en la propia fila, y
 * borrado tras confirmación.
 *
 * Hasta ahora estas categorías (Cortes, Barba, Combos, Cejas…) solo se podían
 * elegir de un desplegable, nunca crear ni renombrar: nacían de rebote cuando el
 * alta de un servicio mencionaba un nombre que no existía.
 */

import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Pencil, Trash2, Check, X } from 'lucide-react';
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
import { FieldErrorMessage } from '@/shared/components/FormValidationFields';
import { useAppToast } from '@/shared/feedback/ToastContext';
import { getApiErrorMessage } from '@/shared/utils/formValidation';
import * as categoryService from '@/features/services/services/serviceCategoryService';

const DESCRIPCION_MAX = 255;

export default function ServiceCategoriesPage() {
  const toast = useAppToast();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [createError, setCreateError] = useState('');

  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editError, setEditError] = useState('');

  const [togglingId, setTogglingId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // `active: 'false'` trae también las inactivas: hacen falta para reactivarlas.
      const data = await categoryService.getCategories({ active: 'false' });
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'No se pudieron cargar las categorías.'));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const crear = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setCreateError('Indica el nombre de la categoría.');
      return;
    }
    try {
      await categoryService.createCategory({
        name: name.trim(),
        description: description.trim() || undefined,
      });
      setName('');
      setDescription('');
      setCreateError('');
      toast.success('Categoría creada.');
      await load();
    } catch (err) {
      // El backend responde 409 si el nombre ya existe, sin distinguir mayúsculas.
      toast.error(getApiErrorMessage(err, 'No se pudo crear la categoría.'));
    }
  };

  const empezarEdicion = (r) => {
    setEditingId(r.id);
    setEditName(r.name);
    setEditDescription(r.description ?? '');
    setEditError('');
  };

  const cancelarEdicion = () => {
    setEditingId(null);
    setEditName('');
    setEditDescription('');
    setEditError('');
  };

  const guardarEdicion = async (r) => {
    if (!editName.trim()) {
      setEditError('Indica el nombre de la categoría.');
      return;
    }
    try {
      await categoryService.updateCategory(r.id, {
        name: editName.trim(),
        description: editDescription.trim() === '' ? null : editDescription.trim(),
      });
      cancelarEdicion();
      toast.success('Categoría actualizada.');
      await load();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'No se pudo guardar la categoría.'));
    }
  };

  const alternar = async (r) => {
    setTogglingId(r.id);
    try {
      await categoryService.updateCategory(r.id, { isActive: !r.is_active });
      toast.success(r.is_active ? 'Categoría desactivada.' : 'Categoría activada.');
      await load();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'No se pudo actualizar la categoría.'));
    } finally {
      setTogglingId(null);
    }
  };

  const confirmarBorrado = async () => {
    setDeleting(true);
    try {
      await categoryService.deleteCategory(deleteTarget.id);
      if (editingId === deleteTarget.id) cancelarEdicion();
      setDeleteTarget(null);
      toast.success('Categoría eliminada.');
      await load();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'No se pudo eliminar la categoría.'));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="page-shell">
      <PageHeader
        title="Categorías de servicio"
        subtitle="Agrupan los servicios del catálogo: Cortes, Barba, Combos…"
        actions={
          <Link to="/services" className="btn-admin-outline text-xs px-3 py-2">
            Servicios
          </Link>
        }
      />

      <div className="mb-4 rounded-xl border border-stone-200/90 bg-white px-3 py-3 shadow-sm sm:px-4">
        <p className="mb-2 text-[10px] font-semibold text-gold">Nueva categoría</p>
        <form className="grid gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-start" onSubmit={crear} noValidate>
          <div>
            <input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setCreateError('');
              }}
              className={`input-premium w-full py-2 text-sm ${createError ? '!border-red-400' : ''}`}
              placeholder="Nombre"
              aria-label="Nombre de la categoría"
              aria-invalid={createError ? true : undefined}
            />
            <FieldErrorMessage message={createError} />
          </div>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value.slice(0, DESCRIPCION_MAX))}
            className="input-premium w-full py-2 text-sm"
            placeholder="Descripción (opcional)"
            aria-label="Descripción de la categoría"
            maxLength={DESCRIPCION_MAX}
          />
          <button type="submit" className="btn-admin text-sm py-2">
            Crear
          </button>
        </form>
      </div>

      <DataCard compact>
        {loading ? (
          <div className="py-10 text-center text-sm text-stone-500">Cargando…</div>
        ) : rows.length === 0 ? (
          <div className="py-10 text-center text-sm text-stone-500">No hay categorías.</div>
        ) : (
          <Table>
            <TableHead>
              <TableHeader compact>Nombre</TableHeader>
              <TableHeader compact>Descripción</TableHeader>
              <TableHeader compact>Servicios</TableHeader>
              <TableHeader compact>Estado</TableHeader>
              <TableHeader compact className="text-right">
                Acciones
              </TableHeader>
            </TableHead>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  {editingId === r.id ? (
                    <>
                      <TableCell compact colSpan={2} className="align-top">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
                          <div className="min-w-0 flex-1">
                            <input
                              value={editName}
                              onChange={(e) => {
                                setEditName(e.target.value);
                                setEditError('');
                              }}
                              className={`input-premium w-full min-w-0 py-1.5 text-sm ${editError ? '!border-red-400' : ''}`}
                              placeholder="Nombre"
                              aria-label="Nombre"
                            />
                            <FieldErrorMessage message={editError} />
                          </div>
                          <input
                            value={editDescription}
                            onChange={(e) => setEditDescription(e.target.value.slice(0, DESCRIPCION_MAX))}
                            maxLength={DESCRIPCION_MAX}
                            className="input-premium min-w-0 flex-[2] py-1.5 text-sm"
                            placeholder="Descripción"
                            aria-label="Descripción"
                          />
                        </div>
                      </TableCell>
                      <TableCell compact className="text-xs tabular-nums">
                        {r.service_count}
                      </TableCell>
                      <TableCell compact>
                        <AdminStatusToggle
                          active={r.is_active}
                          onClick={() => alternar(r)}
                          disabled={togglingId === r.id}
                        />
                      </TableCell>
                      <TableCell compact className="text-right">
                        <div className="inline-flex justify-end gap-1.5">
                          <AdminIconButton
                            icon={Check}
                            label="Guardar categoría"
                            onClick={() => guardarEdicion(r)}
                          />
                          <AdminIconButton icon={X} label="Cancelar edición" onClick={cancelarEdicion} />
                        </div>
                      </TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell compact className="text-xs font-medium">
                        {r.name}
                      </TableCell>
                      <TableCell compact className="max-w-[14rem] text-xs text-stone-600">
                        <span className="line-clamp-2">{r.description || '—'}</span>
                      </TableCell>
                      <TableCell compact className="text-xs tabular-nums">
                        {r.service_count}
                      </TableCell>
                      <TableCell compact>
                        <AdminStatusToggle
                          active={r.is_active}
                          onClick={() => alternar(r)}
                          disabled={togglingId === r.id}
                        />
                      </TableCell>
                      <TableCell compact>
                        <div className="inline-flex justify-end gap-1.5">
                          <AdminIconButton
                            icon={Pencil}
                            label="Editar categoría"
                            onClick={() => empezarEdicion(r)}
                          />
                          <AdminIconButton
                            icon={Trash2}
                            label="Eliminar categoría"
                            variant="danger"
                            onClick={() => setDeleteTarget(r)}
                          />
                        </div>
                      </TableCell>
                    </>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DataCard>

      <AdminConfirmModal
        open={Boolean(deleteTarget)}
        variant="danger"
        title="¿Eliminar categoría?"
        description={
          deleteTarget ? (
            <>
              ¿Eliminar «<strong className="text-stone-800">{deleteTarget.name}</strong>»?
              {deleteTarget.service_count > 0 ? (
                <>
                  {' '}
                  {deleteTarget.service_count} servicio(s) quedarán sin categoría —{' '}
                  <strong className="text-stone-800">no se eliminan</strong>.
                </>
              ) : null}{' '}
              Esta acción no se puede deshacer.
            </>
          ) : null
        }
        confirmLabel="Sí, eliminar"
        isSubmitting={deleting}
        onCancel={() => {
          if (!deleting) setDeleteTarget(null);
        }}
        onConfirm={confirmarBorrado}
      />
    </div>
  );
}
