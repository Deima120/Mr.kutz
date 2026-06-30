import { FileSpreadsheet, FileText } from 'lucide-react';

const btnBase =
  'btn-admin-outline inline-flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors hover:text-gold hover:bg-stone-50';

/**
 * Botones de exportación Excel y PDF con diseño unificado del panel admin.
 */
export function AdminExportButtons({
  onExcel,
  onPdf,
  excelDisabled = false,
  pdfDisabled = false,
  excelLoading = false,
  size = 'sm',
  className = '',
}) {
  const sizeClass = size === 'xs' ? 'text-xs py-2 px-3' : 'text-sm py-2 px-3';

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <button
        type="button"
        onClick={onExcel}
        disabled={excelDisabled || excelLoading}
        className={`${btnBase} ${sizeClass}`}
      >
        {excelLoading ? (
          <span
            className="h-3.5 w-3.5 border-2 border-stone-300 border-t-stone-700 rounded-full animate-spin shrink-0"
            aria-hidden
          />
        ) : (
          <FileSpreadsheet className="w-4 h-4 shrink-0" aria-hidden />
        )}
        {excelLoading ? 'Excel…' : 'Excel'}
      </button>
      {onPdf ? (
        <button
          type="button"
          onClick={onPdf}
          disabled={pdfDisabled}
          className={`${btnBase} ${sizeClass}`}
        >
          <FileText className="w-4 h-4 shrink-0" aria-hidden />
          PDF
        </button>
      ) : null}
    </div>
  );
}

export default AdminExportButtons;
