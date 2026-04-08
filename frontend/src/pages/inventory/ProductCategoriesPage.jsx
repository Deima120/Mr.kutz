import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../../components/admin/PageHeader';
import DataCard from '../../components/admin/DataCard';
import Table, { TableHead, TableHeader, TableBody, TableRow, TableCell } from '../../components/admin/Table';
import * as categoryService from '../../services/productCategoryService';
import { downloadCSV, printAsPDF } from '../../utils/export';

export default function ProductCategoriesPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await categoryService.getCategories({ active: 'false' });
      setRows(Array.isArray(data) ? data : (data?.data ?? []));
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

  const toggle = async (r) => {
    try {
      await categoryService.updateCategory(r.id, { isActive: !r.isActive, name: r.name, description: r.description });
      load();
    } catch (err) {
      setError(err?.message || 'Error al actualizar categoría');
    }
  };

  const remove = async (r) => {
    if (!window.confirm(`¿Eliminar categoría "${r.name}"?`)) return;
    try {
      await categoryService.deleteCategory(r.id);
      load();
    } catch (err) {
      setError(err?.message || 'Error al eliminar categoría');
    }
  };

  return (
    <div className="page-shell">
      <PageHeader
        title="Categorías de productos"
        subtitle="Gestión formal de categorías para inventario"
        actions={
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => downloadCSV('categorias-productos.csv', rows.map((r) => ({
                id: r.id,
                nombre: r.name,
                descripcion: r.description || '',
                activo: r.isActive ? 'Sí' : 'No',
              })))}
              className="btn-admin-outline"
            >
              Exportar CSV
            </button>
            <button type="button" onClick={printAsPDF} className="btn-admin-outline">
              Exportar PDF
            </button>
            <Link to="/inventory" className="btn-admin-outline">
              Volver a inventario
            </Link>
          </div>
        }
      />

      {error && <div className="alert-error">{error}</div>}

      <div className="relative rounded-[1.35rem] p-[1.5px] bg-gradient-to-br from-gold/55 via-stone-100/60 to-gold/30 shadow-[0_16px_44px_rgba(0,0,0,0.1)] mb-6">
        <div className="rounded-[1.28rem] bg-white/90 backdrop-blur-md border border-white/90 p-4 sm:p-5">
          <p className="text-[10px] font-semibold tracking-[0.2em] text-gold mb-3">Nueva categoría</p>
          <form className="grid md:grid-cols-3 gap-3" onSubmit={create}>
            <input value={name} onChange={(e) => setName(e.target.value)} className="input-premium" placeholder="Nombre" required />
            <input value={description} onChange={(e) => setDescription(e.target.value)} className="input-premium" placeholder="Descripción" />
            <button type="submit" className="btn-admin">+ Crear categoría</button>
          </form>
        </div>
      </div>

      <DataCard>
        {loading ? (
          <div className="py-12 text-center text-stone-500">Cargando...</div>
        ) : rows.length === 0 ? (
          <div className="py-12 text-center text-stone-500">No hay categorías.</div>
        ) : (
          <Table>
            <TableHead>
              <TableHeader>Nombre</TableHeader>
              <TableHeader>Descripción</TableHeader>
              <TableHeader>Estado</TableHeader>
              <TableHeader>Acciones</TableHeader>
            </TableHead>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{r.name}</TableCell>
                  <TableCell>{r.description || '-'}</TableCell>
                  <TableCell>{r.isActive ? 'Activa' : 'Inactiva'}</TableCell>
                  <TableCell>
                    <div className="flex gap-3">
                      <button type="button" onClick={() => toggle(r)} className="text-sm text-barber-dark hover:text-gold">
                        {r.isActive ? 'Desactivar' : 'Activar'}
                      </button>
                      <button type="button" onClick={() => remove(r)} className="text-sm text-red-600 hover:text-red-700">
                        Eliminar
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DataCard>
    </div>
  );
}
