import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Pencil, Trash2, Check, X } from 'lucide-react';
import PageHeader from '@/shared/components/admin/PageHeader';
import DataCard from '@/shared/components/admin/DataCard';
import Table, { TableHead, TableHeader, TableBody, TableRow, TableCell } from '@/shared/components/admin/Table';
import AdminIconButton from '@/shared/components/admin/AdminIconButton';
import * as categoryService from '@/features/inventory/services/productCategoryService';
import { downloadExcelTable } from '@/shared/utils/exportExcel';
import { downloadTablePDF, pdfFileDateSuffix } from '@/shared/utils/exportPdf';
import AdminExportButtons from '@/shared/components/admin/AdminExportButtons';
import { validateCategoryForm, TEXT_CATEGORY_DESCRIPTION_MAX } from '@/shared/utils/formValidation';
import { FieldErrorMessage } from '@/shared/components/FormValidationFields';

const toCategoryCaps = (value) => String(value ?? '').trim().toUpperCase();

function CategoryStatusButton({ active, onClick, disabled = false }) {
  const base =
    'inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
  const activeClass =
    'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 hover:border-emerald-300';
  const inactiveClass =
    'border-stone-200 bg-stone-100 text-stone-600 hover:bg-stone-200 hover:border-stone-300';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={active ? 'Clic para desactivar' : 'Clic para activar'}
      className={`${base} ${active ? activeClass : inactiveClass}`}
    >
      {active ? 'Activa' : 'Inactiva'}
    </button>
  );
}

export default function ProductCategoriesPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [createNameError, setCreateNameError] = useState('');
  const [editNameError, setEditNameError] = useState('');
  const [description, setDescription] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [togglingId, setTogglingId] = useState(null);

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
    const validation = validateCategoryForm({ name, description });
    if (!validation.valid) {
      setCreateNameError(validation.errors.name || validation.firstError);
      setError(validation.firstError);
      return;
    }
    setCreateNameError('');
    try {
      await categoryService.createCategory({
        name: toCategoryCaps(name),
        description: description.trim() ? toCategoryCaps(description) : undefined,
      });
      setName('');
      setDescription('');
      load();
    } catch (err) {
      setError(err?.message || 'Error al crear categoría');
    }
  };

  const startEdit = (r) => {
    setEditingId(r.id);
    setEditName(toCategoryCaps(r.name));
    setEditDescription(r.description ? toCategoryCaps(r.description) : '');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
    setEditDescription('');
    setEditNameError('');
  };

  const saveEdit = async (r) => {
    const validation = validateCategoryForm({ name: editName, description: editDescription });
    if (!validation.valid) {
      setEditNameError(validation.errors.name || validation.firstError);
      setError(validation.firstError);
      return;
    }
    setEditNameError('');
    try {
      await categoryService.updateCategory(r.id, {
        name: toCategoryCaps(editName),
        description: editDescription.trim() === '' ? null : toCategoryCaps(editDescription),
      });
      cancelEdit();
      load();
    } catch (err) {
      setError(err?.message || 'Error al guardar categoría');
    }
  };

  const toggle = async (r) => {
    setTogglingId(r.id);
    setError('');
    try {
      await categoryService.updateCategory(r.id, { isActive: !isCategoryActive(r) });
      load();
    } catch (err) {
      setError(err?.message || 'Error al actualizar categoría');
    } finally {
      setTogglingId(null);
    }
  };

  const remove = async (r) => {
    const count = r.product_count ?? 0;
    const message =
      count > 0
        ? `¿Eliminar categoría "${r.name}"?\n\n${count} producto(s) quedarán sin categoría.`
        : `¿Eliminar categoría "${r.name}"?`;
    if (!window.confirm(message)) return;
    try {
      await categoryService.deleteCategory(r.id);
      if (editingId === r.id) cancelEdit();
      load();
    } catch (err) {
      setError(err?.message || 'Error al eliminar categoría');
    }
  };

  const isCategoryActive = (r) => (r.isActive ?? r.is_active) !== false;
  const getProductCount = (r) => r.product_count ?? 0;

  const categoryExportRows = rows.map((r) => ({
    id: r.id,
    nombre: toCategoryCaps(r.name),
    descripcion: r.description ? toCategoryCaps(r.description) : '',
    productos: getProductCount(r),
    activo: isCategoryActive(r) ? 'Sí' : 'No',
  }));

  const handleExportExcel = () => {
    if (categoryExportRows.length === 0) return;
    downloadExcelTable({
      sheetName: 'Categorías',
      title: 'Categorías de productos',
      meta: [`Total: ${categoryExportRows.length} categoría(s)`],
      columns: [
        { header: 'ID', key: 'id', align: 'center' },
        { header: 'Nombre', key: 'nombre', emphasis: true },
        { header: 'Descripción', key: 'descripcion' },
        { header: 'Productos', key: 'productos', align: 'right' },
        { header: 'Activa', key: 'activo', align: 'center' },
      ],
      rows: categoryExportRows,
      fileBase: 'categorias-mrkutz',
    });
  };

  const handleExportPDF = () => {
    if (categoryExportRows.length === 0) return;
    downloadTablePDF({
      filename: `categorias-mrkutz-${pdfFileDateSuffix()}.pdf`,
      title: 'Categorías de productos',
      meta: [`Total: ${categoryExportRows.length} categoría(s)`],
      columns: [
        { header: 'ID', key: 'id', align: 'center' },
        { header: 'Nombre', key: 'nombre' },
        { header: 'Descripción', key: 'descripcion' },
        { header: 'Productos', key: 'productos', align: 'right' },
        { header: 'Activa', key: 'activo', align: 'center' },
      ],
      rows: categoryExportRows,
    });
  };

  const btnToolbar = 'btn-admin-outline text-xs py-2 px-3';

  return (
    <div className="page-shell">
      <PageHeader
        actions={
          <div className="flex flex-wrap gap-1.5">
            <AdminExportButtons
              onExcel={handleExportExcel}
              onPdf={handleExportPDF}
              excelDisabled={categoryExportRows.length === 0}
              pdfDisabled={categoryExportRows.length === 0}
              size="xs"
            />
            <Link to="/inventory" className={btnToolbar}>
              Inventario
            </Link>
          </div>
        }
      />

      {error && <div className="alert-error mb-3 text-sm py-2">{error}</div>}

      <div className="mb-4 rounded-xl border border-stone-200/90 bg-white px-3 py-3 shadow-sm sm:px-4">
        <p className="mb-2 text-[10px] font-semibold text-gold">Nueva categoría</p>
        <form className="grid gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-end" onSubmit={create} noValidate>
          <div>
            <input
              value={name}
              onChange={(e) => {
                setName(toCategoryCaps(e.target.value));
                setCreateNameError('');
                setError('');
              }}
              className={`input-premium py-2 text-sm ${createNameError ? '!border-red-400' : ''}`}
              placeholder="Nombre"
              aria-invalid={createNameError ? true : undefined}
            />
            <FieldErrorMessage message={createNameError} />
          </div>
          <input
            value={description}
            onChange={(e) => setDescription(toCategoryCaps(e.target.value).slice(0, TEXT_CATEGORY_DESCRIPTION_MAX))}
            className="input-premium py-2 text-sm"
            placeholder="Descripción (opcional)"
            maxLength={TEXT_CATEGORY_DESCRIPTION_MAX}
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
              <TableHeader compact>Productos</TableHeader>
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
                          <div className="min-w-0 flex-1">
                            <input
                              value={editName}
                              onChange={(e) => {
                                setEditName(toCategoryCaps(e.target.value));
                                setEditNameError('');
                                setError('');
                              }}
                              className={`input-premium py-1.5 text-sm min-w-0 w-full ${editNameError ? '!border-red-400' : ''}`}
                              placeholder="Nombre"
                              aria-invalid={editNameError ? true : undefined}
                            />
                            <FieldErrorMessage message={editNameError} />
                          </div>
                          <input
                            value={editDescription}
                            onChange={(e) =>
                              setEditDescription(
                                toCategoryCaps(e.target.value).slice(0, TEXT_CATEGORY_DESCRIPTION_MAX)
                              )
                            }
                            maxLength={TEXT_CATEGORY_DESCRIPTION_MAX}
                            className="input-premium py-1.5 text-sm min-w-0 flex-[2]"
                            placeholder="Descripción"
                          />
                        </div>
                      </TableCell>
                      <TableCell compact className="text-xs tabular-nums">
                        {getProductCount(r)}
                      </TableCell>
                      <TableCell compact className="text-xs whitespace-nowrap">
                        <CategoryStatusButton
                          active={isCategoryActive(r)}
                          onClick={() => toggle(r)}
                          disabled={togglingId === r.id}
                        />
                      </TableCell>
                      <TableCell compact className="text-right">
                        <div className="inline-flex justify-end gap-1.5">
                          <AdminIconButton
                            icon={Check}
                            label="Guardar categoría"
                            onClick={() => saveEdit(r)}
                          />
                          <AdminIconButton
                            icon={X}
                            label="Cancelar edición"
                            onClick={cancelEdit}
                          />
                        </div>
                      </TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell compact className="text-xs font-medium uppercase">
                        {toCategoryCaps(r.name)}
                      </TableCell>
                      <TableCell compact className="text-xs text-stone-600 max-w-[14rem] uppercase">
                        <span className="line-clamp-2">
                          {r.description ? toCategoryCaps(r.description) : '—'}
                        </span>
                      </TableCell>
                      <TableCell compact className="text-xs tabular-nums">
                        {getProductCount(r)}
                      </TableCell>
                      <TableCell compact className="text-xs">
                        <CategoryStatusButton
                          active={isCategoryActive(r)}
                          onClick={() => toggle(r)}
                          disabled={togglingId === r.id}
                        />
                      </TableCell>
                      <TableCell compact>
                        <div className="inline-flex justify-end gap-1.5">
                          <AdminIconButton
                            icon={Pencil}
                            label="Editar categoría"
                            onClick={() => startEdit(r)}
                          />
                          <AdminIconButton
                            icon={Trash2}
                            label="Eliminar categoría"
                            variant="danger"
                            onClick={() => remove(r)}
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
    </div>
  );
}
