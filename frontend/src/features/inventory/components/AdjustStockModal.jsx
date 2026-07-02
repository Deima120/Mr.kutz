import { formatProductUnit } from '@/features/inventory/utils/productFormatters';

export default function AdjustStockModal({
  product,
  adjustQty,
  onQtyChange,
  onAdd,
  onSubtract,
  onClose,
  isSaving,
}) {
  if (!product) return null;

  const currentQty = product.quantity ?? 0;
  const subtractQty = Math.abs(adjustQty);
  const canSubtract = subtractQty <= currentQty;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-sm"
      onClick={() => !isSaving && onClose()}
    >
      <div
        className="bg-white rounded-2xl border border-stone-200 shadow-2xl max-w-sm w-full p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-serif text-lg font-semibold text-stone-900">{product.name}</h3>
        <p className="text-sm text-stone-500">
          Stock actual: <strong className="text-gold">{currentQty}</strong> {formatProductUnit(product.unit, currentQty)}
        </p>
        <div>
          <label className="block text-[11px] font-semibold text-stone-600 mb-1">Cantidad</label>
          <input
            type="number"
            min="1"
            value={adjustQty}
            onChange={(e) => onQtyChange(Math.max(1, parseInt(e.target.value, 10) || 1))}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onAdd();
            }}
            className="input-premium text-center text-lg"
            autoFocus
          />
        </div>
        {!canSubtract && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
            No puedes restar más de {currentQty} unidad{currentQty !== 1 ? 'es' : ''}.
          </p>
        )}
        <div className="flex gap-2">
          <button
            type="button"
            disabled={isSaving}
            onClick={onAdd}
            className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold disabled:opacity-50 transition-colors text-sm"
          >
            Sumar
          </button>
          <button
            type="button"
            disabled={isSaving || !canSubtract}
            onClick={onSubtract}
            className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold disabled:opacity-50 transition-colors text-sm"
          >
            Restar
          </button>
        </div>
        <button
          type="button"
          disabled={isSaving}
          onClick={onClose}
          className="w-full py-2 text-stone-500 hover:text-stone-700 text-sm font-medium"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
