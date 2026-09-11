import { FileSpreadsheet, FileText } from 'lucide-react';

/**
 * Botones de exportación Excel y PDF, unificados para TODO el panel.
 *
 * Cada formato lleva su color propio en el icono (verde para Excel, rojo para
 * PDF) sobre un botón blanco con borde: se reconocen de un vistazo sin que dos
 * botones de colores fuertes compitan con la acción principal de la pantalla.
 * El color va en el icono y en el borde al pasar el ratón, nunca en el fondo.
 *
 * Cualquier pantalla que exporte debe usar este componente en vez de armar sus
 * propios botones, para que el panel entero se vea igual.
 */
const btnBase =
  'inline-flex items-center gap-2 rounded-lg border bg-white font-semibold shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-stone-200';

const EXCEL_CLASS = 'border-stone-200 text-stone-700 hover:border-emerald-300 hover:bg-emerald-50/60';
const PDF_CLASS = 'border-stone-200 text-stone-700 hover:border-red-300 hover:bg-red-50/60';

export function AdminExportButtons({
  onExcel,
  onPdf,
  excelDisabled = false,
  pdfDisabled = false,
  excelLoading = false,
  size = 'sm',
  className = '',
}) {
  const sizeClass = size === 'xs' ? 'text-xs py-2 px-3' : 'text-sm py-2 px-3.5';

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <button
        type="button"
        onClick={onExcel}
        disabled={excelDisabled || excelLoading}
        className={`${btnBase} ${EXCEL_CLASS} ${sizeClass}`}
      >
        {excelLoading ? (
          <span
            className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-600"
            aria-hidden
          />
        ) : (
          <FileSpreadsheet className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
        )}
        {excelLoading ? 'Excel…' : 'Excel'}
      </button>
      {onPdf ? (
        <button
          type="button"
          onClick={onPdf}
          disabled={pdfDisabled}
          className={`${btnBase} ${PDF_CLASS} ${sizeClass}`}
        >
          <FileText className="h-4 w-4 shrink-0 text-red-600" aria-hidden />
          PDF
        </button>
      ) : null}
    </div>
  );
}

export default AdminExportButtons;
