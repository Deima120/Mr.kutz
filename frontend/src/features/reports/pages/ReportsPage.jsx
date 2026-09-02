/**
 * Módulo Reportes — shell con 7 secciones + resumen.
 */

import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import PageHeader from '@/shared/components/admin/PageHeader';
import ReportsSectionNav from '@/features/reports/components/ReportsSectionNav';
import ReportsPendingPanel from '@/features/reports/components/ReportsPendingPanel';
import ReportsSummaryPanel from '@/features/reports/components/ReportsSummaryPanel';
import SalesHistoryReport from '@/features/reports/components/SalesHistoryReport';
import CashHistoryReport from '@/features/reports/components/CashHistoryReport';
import InventoryReport from '@/features/reports/components/InventoryReport';
import ExpensesReport from '@/features/reports/components/ExpensesReport';
import OtherIncomesReport from '@/features/reports/components/OtherIncomesReport';
import CommissionsReport from '@/features/reports/components/CommissionsReport';
import PortfolioReport from '@/features/reports/components/PortfolioReport';
import { REPORT_SECTIONS, resolveReportSectionId } from '@/features/reports/reportsNav';

export default function ReportsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const sectionId = resolveReportSectionId(searchParams.get('section'));

  const section = useMemo(
    () => REPORT_SECTIONS.find((s) => s.id === sectionId) || REPORT_SECTIONS[0],
    [sectionId]
  );

  const setSection = (id) => {
    const next = new URLSearchParams(searchParams);
    if (id === 'summary') next.delete('section');
    else next.set('section', id);
    setSearchParams(next, { replace: true });
  };

  let body = null;
  if (section.status === 'pending') {
    body = <ReportsPendingPanel title={section.label} reason={section.pendingReason} />;
  } else if (section.id === 'summary') body = <ReportsSummaryPanel />;
  else if (section.id === 'sales') body = <SalesHistoryReport />;
  else if (section.id === 'cash') body = <CashHistoryReport />;
  else if (section.id === 'inventory') body = <InventoryReport />;
  else if (section.id === 'expenses') body = <ExpensesReport />;
  else if (section.id === 'other-incomes') body = <OtherIncomesReport />;
  else if (section.id === 'commissions') body = <CommissionsReport />;
  else if (section.id === 'portfolio') body = <PortfolioReport />;

  return (
    <div className="page-shell space-y-4">
      <PageHeader title="Reportes" subtitle={section.description} />
      <ReportsSectionNav activeId={section.id} onChange={setSection} />
      {body}
    </div>
  );
}
