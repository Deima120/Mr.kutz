import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '@/shared/components/admin/PageHeader';
import DataCard from '@/shared/components/admin/DataCard';
import Table, { TableHead, TableHeader, TableBody, TableRow, TableCell } from '@/shared/components/admin/Table';
import * as categoryService from '@/features/inventory/services/productCategoryService';
import { downloadCSV, printAsPDF } from '@/shared/utils/export';

export default function ProductCategoriesPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await categoryService.getCategories({ active: 'false' });
      setRows(Array.isArray(data) ? data : data?.data ?? []);
    } catch (err) {
      setError(err?.message || 'Error al cargar categorías');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const create = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await categoryService.createCategory({ name: name.trim(), description: description.trim() || undefined });
      setName('');
      setDescription('');
      load();
    } catch (err) {
      setError(err?.message || 'Error al crear categoría');
    }
  };

  const startEdit = (r) => {
    setEditingId(r.id);
    setEditName(r.name);
    setEditDescription(r.description || '');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
    setEditDescription('');
  };

  const saveEdit = async (r) => {
    if (!editName.trim()) return;
    try {
      await categoryService.updateCategory(r.id, {
        name: editName.trim(),
        description: editDescription.trim() === '' ? null : editDescription.trim(),
      });
      cancelEdit();
      load();
    } catch (err) {
      setError(err?.message || 'Error al guardar categoría');
    }
  };

  const toggle = async (r) => {
    try {
      await categoryService.updateCategory(r.id, { isActive: !r.isActive });
      load();
    } catch (err) {
      setError(err?.message || 'Error al actualizar categoría');
    }
  };

  const remove = async (r) => {
    if (!window.confirm(`¿Eliminar categoría "${r.name}"?`)) return;
    try {
      await categoryService.deleteCategory(r.id);
      if (editingId === r.id) cancelEdit();
      load();
    } catch (err) {
      setError(err?.message || 'Error al eliminar categoría');
    }
  };

  const btnToolbar = 'btn-admin-outline text-xs py-2 px-3';

  return (
    <div className="page-shell">
      <PageHeader
        compact
        title="Categorías de productos"
        subtitle="Nombre, descripción y estado para inventario"
        actions={
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() =>
                downloadCSV(
                  'categorias-productos.csv',
                  rows.map((r) => ({
                    id: r.id,
                    nombre: r.name,
                    descripcion: r.description || '',
                    activo: r.isActive ? 'Sí' : 'No',
                  }))
                )
              }
              className={btnToolbar}
            >
              CSV
            </button>
            <button type="button" onClick={printAsPDF} className={btnToolbar}>
              PDF
            </button>
            <Link to="/inventory" className={btnToolbar}>
              Inventario
            </Link>
          </div>
        }
      />

      {error && <div className="alert-error mb-3 text-sm py-2">{error}</div>}

      <div className="mb-4 rounded-xl border border-stone-200/90 bg-white px-3 py-3 shadow-sm sm:px-4">
        <p className="mb-2 text-[10px] font-semibold text-gold">Nueva categoría</p>
        <form className="grid gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-end" onSubmit={create}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input-premium py-2 text-sm"
            placeholder="Nombre"
            required
          />
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="input-premium py-2 text-sm"
            placeholder="Descripción (opcional)"
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
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                          <input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="input-premium py-1.5 text-sm min-w-0 flex-1"
                            placeholder="Nombre"
                          />
                          <input
                            value={editDescription}
                            onChange={(e) => setEditDescription(e.target.value)}
                            className="input-premium py-1.5 text-sm min-w-0 flex-[2]"
                            placeholder="Descripción"
                          />
                        </div>
                      </TableCell>
                      <TableCell compact className="text-xs whitespace-nowrap">
                        {r.isActive ? 'Activa' : 'Inactiva'}
                      </TableCell>
                      <TableCell compact className="text-right">
                        <div className="flex flex-wrap justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => saveEdit(r)}
                            className="text-[11px] font-medium text-barber-dark hover:text-gold"
                          >
                            Guardar
                          </button>
                          <button type="button" onClick={cancelEdit} className="text-[11px] text-stone-500 hover:text-stone-700">
                            Cancelar
                          </button>
                        </div>
                      </TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell compact className="text-xs font-medium">
                        {r.name}
                      </TableCell>
                      <TableCell compact className="text-xs text-stone-600 max-w-[14rem]">
                        <span className="line-clamp-2">{r.description || '—'}</span>
                      </TableCell>
                      <TableCell compact className="text-xs">
                        {r.isActive ? (
                          <span className="inline-flex rounded border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-800">
                            Activa
                          </span>
                        ) : (
                          <span className="inline-flex rounded border border-stone-200 bg-stone-100 px-1.5 py-0.5 text-[10px] font-medium text-stone-600">
                            Inactiva
                          </span>
                        )}
                      </TableCell>
                      <TableCell compact>
                        <div className="flex flex-wrap justify-end gap-x-2 gap-y-1 text-[11px]">
                          <button type="button" onClick={() => startEdit(r)} className="font-medium text-barber-dark hover:text-gold">
                            Editar
                          </button>
                          <button type="button" onClick={() => toggle(r)} className="text-stone-600 hover:text-stone-900">
                            {r.isActive ? 'Desactivar' : 'Activar'}
                          </button>
                          <button type="button" onClick={() => remove(r)} className="text-red-600 hover:text-red-700">
                            Eliminar
                          </button>
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
    </div>
  );
}
