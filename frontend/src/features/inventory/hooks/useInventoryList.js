/**
 * Listado paginado de inventario: filtros, fetch y paginación.
 */

import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import * as productService from '@/features/inventory/services/productService';
import * as productCategoryService from '@/features/inventory/services/productCategoryService';

export const INVENTORY_PAGE_SIZE_OPTIONS = [10, 20, 50];

export function useInventoryList() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  const [products, setProducts] = useState([]);
  const [listTotal, setListTotal] = useState(0);
  const [summary, setSummary] = useState({ totalUnits: 0, lowStockCount: 0, inventoryValue: 0 });
  const [categories, setCategories] = useState([]);

  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('');

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formView, setFormView] = useState(null);

  const isCreating = formView === 'create';
  const editingId = typeof formView === 'number' ? formView : null;
  const isFormOpen = isCreating || editingId != null;
  const totalPages = Math.max(1, Math.ceil(listTotal / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);

  useEffect(() => {
    const editMatch = location.pathname.match(/^\/inventory\/(\d+)\/edit$/);
    if (editMatch) {
      setFormView(parseInt(editMatch[1], 10));
      navigate('/inventory', { replace: true });
      return;
    }
    if (location.pathname === '/inventory/new') {
      setFormView('create');
      navigate('/inventory', { replace: true });
    }
  }, [location.pathname, navigate]);

  useEffect(() => {
    if (searchParams.get('lowStock') === 'true') {
      setShowLowStockOnly(true);
      const next = new URLSearchParams(searchParams);
      next.delete('lowStock');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    productCategoryService
      .getCategories()
      .then((rows) => setCategories(Array.isArray(rows) ? rows : (rows?.data ?? [])))
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    setPage(1);
  }, [showInactive, showLowStockOnly, searchDebounced, categoryFilter, pageSize]);

  const fetchProducts = useCallback(
    async (targetPage = page, silent = false) => {
      if (!silent) setLoading(true);
      setError('');
      try {
        const params = {
          limit: pageSize,
          offset: (targetPage - 1) * pageSize,
          active: showInactive ? 'false' : undefined,
        };
        if (showLowStockOnly) params.lowStock = 'true';
        if (searchDebounced.trim()) params.search = searchDebounced.trim();
        if (categoryFilter) params.categoryId = categoryFilter;

        const listResult = await productService.getProducts(params);

        setProducts(listResult.data ?? []);
        setListTotal(listResult.total ?? 0);
        setSummary(listResult.summary ?? { totalUnits: 0, lowStockCount: 0 });
      } catch (err) {
        setError(err?.message || 'Error al cargar inventario');
        if (!silent) {
          setProducts([]);
          setListTotal(0);
        }
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [page, pageSize, showInactive, showLowStockOnly, searchDebounced, categoryFilter]
  );

  useEffect(() => {
    if (!isFormOpen) fetchProducts(page);
  }, [fetchProducts, isFormOpen, page]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  return {
    products,
    listTotal,
    summary,
    categories,
    search,
    setSearch,
    searchDebounced,
    showInactive,
    setShowInactive,
    showLowStockOnly,
    setShowLowStockOnly,
    categoryFilter,
    setCategoryFilter,
    page,
    setPage,
    pageSize,
    setPageSize,
    safePage,
    loading,
    error,
    setError,
    formView,
    setFormView,
    isCreating,
    editingId,
    isFormOpen,
    fetchProducts,
  };
}
