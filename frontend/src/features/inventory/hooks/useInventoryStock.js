/**
 * Acciones de stock: ajuste, +1, historial y anulación de movimientos.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as productService from '@/features/inventory/services/productService';

export function useInventoryStock({ page, fetchProducts, setError, onSuccessMessage }) {
  const navigate = useNavigate();

  const [adjustModal, setAdjustModal] = useState(null);
  const [adjustQty, setAdjustQty] = useState(1);
  const [adjustSaving, setAdjustSaving] = useState(false);

  const [historyModal, setHistoryModal] = useState(null);
  const [movements, setMovements] = useState([]);
  const [movementsLoading, setMovementsLoading] = useState(false);
  const [movementsError, setMovementsError] = useState('');

  const [quickUpdating, setQuickUpdating] = useState(null);
  const [voidMovement, setVoidMovement] = useState(null);
  const [isVoiding, setIsVoiding] = useState(false);

  const handleQuickStock = async (product, delta) => {
    if (delta <= 0) return;
    setQuickUpdating(product.id);
    setError('');
    try {
      await productService.updateStock(product.id, {
        quantityChange: delta,
        movementType: 'adjustment',
        notes: 'Entrada rápida desde inventario',
      });
      await fetchProducts(page, true);
    } catch (err) {
      setError(err?.message || 'Error al actualizar');
      fetchProducts(page, true);
    } finally {
      setQuickUpdating(null);
    }
  };

  const handleOpenAdjust = (product) => {
    setAdjustModal(product);
    setAdjustQty(1);
  };

  const handleSaveAdjust = async (isEntrada) => {
    if (!adjustModal) return;
    const qty = isEntrada ? Math.abs(adjustQty) : -Math.abs(adjustQty);
    if (!isEntrada && Math.abs(qty) > (adjustModal.quantity ?? 0)) {
      setError('El stock no puede ser negativo.');
      return;
    }
    setAdjustSaving(true);
    setError('');
    try {
      await productService.updateStock(adjustModal.id, {
        quantityChange: qty,
        movementType: 'adjustment',
        notes: qty > 0 ? 'Ajuste de entrada' : 'Ajuste de salida',
      });
      setAdjustModal(null);
      fetchProducts(page);
    } catch (err) {
      setError(err?.message || 'Error al actualizar stock');
    } finally {
      setAdjustSaving(false);
    }
  };

  const handleOpenHistory = async (product) => {
    setHistoryModal(product);
    setMovements([]);
    setMovementsError('');
    setMovementsLoading(true);
    try {
      const result = await productService.getProductMovements(product.id, { limit: 50, offset: 0 });
      setMovements(result.data);
    } catch (err) {
      setMovements([]);
      setMovementsError(err?.message || 'No se pudo cargar el historial.');
    } finally {
      setMovementsLoading(false);
    }
  };

  const reloadMovements = async (productId) => {
    const result = await productService.getProductMovements(productId, { limit: 50, offset: 0 });
    setMovements(result.data);
  };

  const confirmVoidMovement = async (voidReason) => {
    if (!voidMovement || !historyModal) return;
    setIsVoiding(true);
    setMovementsError('');
    try {
      await productService.voidMovement(voidMovement.id, { voidReason });
      setVoidMovement(null);
      onSuccessMessage?.('Ajuste anulado correctamente.');
      await reloadMovements(historyModal.id);
      fetchProducts(page, true);
    } catch (err) {
      setMovementsError(err?.message || 'Error al anular el ajuste');
    } finally {
      setIsVoiding(false);
    }
  };

  const goToSell = (product) => {
    navigate(`/payments/new?productId=${product.id}`);
  };

  return {
    adjustModal,
    adjustQty,
    setAdjustQty,
    adjustSaving,
    historyModal,
    movements,
    movementsLoading,
    movementsError,
    quickUpdating,
    voidMovement,
    setVoidMovement,
    isVoiding,
    handleQuickStock,
    handleOpenAdjust,
    handleSaveAdjust,
    handleOpenHistory,
    confirmVoidMovement,
    goToSell,
    closeAdjust: () => setAdjustModal(null),
    closeHistory: () => {
      setHistoryModal(null);
      setMovementsError('');
      setVoidMovement(null);
    },
  };
}
