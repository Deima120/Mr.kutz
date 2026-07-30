import AppInlineAlert from '@/shared/feedback/AppInlineAlert';

/** Placeholder honesto: sin datos inventados. */
export default function ReportsPendingPanel({ title, reason }) {
  return (
    <div className="space-y-3">
      <AppInlineAlert variant="info" title={title || 'Sección en preparación'}>
        <p className="text-sm">
          {reason ||
            'Esta sección aún no tiene modelo de datos. Se habilitará en una etapa posterior, sin datos de ejemplo.'}
        </p>
      </AppInlineAlert>
    </div>
  );
}
