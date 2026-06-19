import { useState, useMemo } from 'react';
import { 
  LayoutDashboard,
  PhilippinePeso,
  TrendingUp,
  FileSpreadsheet,
  FileText,
} from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { useDashboardMetrics } from '../hooks/useDashboardMetrics';
import { RepairProgressChart } from './RepairProgressChart';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

export function AdminDashboard() {
  const {
    repairs,
    loading,
    error,
  } = useDashboardMetrics();

  const [costTimeframe, setCostTimeframe] = useState<'1m' | '3m' | '1y' | 'all'>('1m');

  const filteredRepairsForCost = useMemo(() => {
    const now = new Date();
    return repairs.filter((r) => {
      const createdDate = new Date(r.createdAt);
      if (costTimeframe === '1m') {
        return createdDate.getMonth() === now.getMonth() && createdDate.getFullYear() === now.getFullYear();
      } else if (costTimeframe === '3m') {
        const limitDate = new Date();
        limitDate.setDate(now.getDate() - 90);
        return createdDate >= limitDate;
      } else if (costTimeframe === '1y') {
        const limitDate = new Date();
        limitDate.setDate(now.getDate() - 365);
        return createdDate >= limitDate;
      }
      return true; // all-time
    });
  }, [repairs, costTimeframe]);

  const filteredTotalCost = useMemo(() => {
    return filteredRepairsForCost.reduce((sum, r) => sum + (r.totalCost ?? 0), 0);
  }, [filteredRepairsForCost]);

  const filteredAverageCost = useMemo(() => {
    const costed = filteredRepairsForCost.filter((r) => r.totalCost && r.totalCost > 0);
    if (!costed.length) return 0;
    return Math.round(costed.reduce((sum, r) => sum + (r.totalCost ?? 0), 0) / costed.length);
  }, [filteredRepairsForCost]);

  const handleExportExcel = () => {
    const data = filteredRepairsForCost.map(r => ({
      'Repair Number': r.repairNumber,
      'Vehicle Plate': r.vehiclePlate,
      'Driver Name': r.driverName,
      'Garage Location': r.garageLocation,
      'Odometer Reading': r.odometerReading,
      'Status': r.status,
      'Parts Cost': r.partsCost || 0,
      'Labor Cost': r.laborCost || 0,
      'Total Cost': r.totalCost || 0,
      'Date Logged': new Date(r.createdAt).toLocaleDateString(),
      'Completion Date': r.completedAt ? new Date(r.completedAt).toLocaleDateString() : 'N/A'
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Repairs Report");
    XLSX.writeFile(workbook, `vrms_repairs_report_${costTimeframe}_${new Date().getTime()}.xlsx`);
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("WeLinc VRMS Repairs Report", 14, 18);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Timeframe: ${costTimeframe === '1m' ? 'This Month' : costTimeframe === '3m' ? 'Last 3 Months' : costTimeframe === '1y' ? 'Last 1 Year' : 'All Time'} | Generated: ${new Date().toLocaleString()}`, 14, 25);
    
    autoTable(doc, {
      head: [['Repair #', 'Vehicle', 'Driver', 'Garage', 'Status', 'Total Cost', 'Date Logged']],
      body: filteredRepairsForCost.map(r => [
        r.repairNumber || '',
        r.vehiclePlate || '',
        r.driverName || '',
        r.garageLocation || '',
        r.status || '',
        r.totalCost ? `PHP ${r.totalCost.toLocaleString()}` : 'PHP 0',
        new Date(r.createdAt).toLocaleDateString()
      ]),
      startY: 30,
    });
    
    doc.save(`vrms_repairs_report_${costTimeframe}_${new Date().getTime()}.pdf`);
  };

  return (
    <div className="dashboard-page animate-fade-in">
      <PageHeader
        title="Vehicle Repair Management"
        subtitle="Monitor ticket flow, status changes, and repair costs with live data."
        icon={LayoutDashboard}
      />

      {loading ? (
        <div className="premium-card"><p>Loading dashboard metrics...</p></div>
      ) : error ? (
        <div className="premium-card"><div className="alert">{error}</div></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
          {/* Repair Pipeline Progress */}
          <RepairProgressChart repairs={repairs} />

          {/* Spend Analytics and Exports Side-by-Side */}
          <div style={{ display: 'flex', gap: '28px', flexWrap: 'wrap' }}>
            {/* Spend Analytics */}
            <div className="premium-card" style={{ flex: '1.4 1 500px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h3 className="subheading" style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>Repair Spend Analytics</h3>
                  <p className="page-subtitle" style={{ margin: '4px 0 0', fontSize: '0.875rem' }}>Review financial metrics and average cost distribution.</p>
                </div>
                <div className="timeframe-pill-container">
                  <button
                    type="button"
                    className={`timeframe-pill ${costTimeframe === '1m' ? 'active' : ''}`}
                    onClick={() => setCostTimeframe('1m')}
                  >
                    1M
                  </button>
                  <button
                    type="button"
                    className={`timeframe-pill ${costTimeframe === '3m' ? 'active' : ''}`}
                    onClick={() => setCostTimeframe('3m')}
                  >
                    3M
                  </button>
                  <button
                    type="button"
                    className={`timeframe-pill ${costTimeframe === '1y' ? 'active' : ''}`}
                    onClick={() => setCostTimeframe('1y')}
                  >
                    1Y
                  </button>
                  <button
                    type="button"
                    className={`timeframe-pill ${costTimeframe === 'all' ? 'active' : ''}`}
                    onClick={() => setCostTimeframe('all')}
                  >
                    ALL
                  </button>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginTop: '12px' }}>
                <div className="spend-metric-card total-cost">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6' }}>
                    <PhilippinePeso size={24} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--muted)', fontWeight: 700 }}>Total Repair Cost</div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--text)', marginTop: '4px', letterSpacing: '-0.025em' }}>₱{filteredTotalCost.toLocaleString()}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '4px' }}>Spend for selected timeframe.</div>
                  </div>
                </div>

                <div className="spend-metric-card avg-cost">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
                    <TrendingUp size={24} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--muted)', fontWeight: 700 }}>Average Cost</div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--text)', marginTop: '4px', letterSpacing: '-0.025em' }}>₱{filteredAverageCost.toLocaleString()}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '4px' }}>Average per repair ticket.</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Document Downloads (renamed to Exports) */}
            <div className="premium-card" style={{ flex: '1 1 350px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <h3 className="subheading" style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>Exports</h3>
                <p className="page-subtitle" style={{ margin: '4px 0 0', fontSize: '0.875rem' }}>Export tabular data into standard file formats.</p>
              </div>

              <div className="download-grid-container" style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: 0 }}>
                <button
                  type="button"
                  className="download-card excel"
                  onClick={handleExportExcel}
                  style={{ padding: '12px 16px' }}
                >
                  <div style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: 8, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <FileSpreadsheet size={20} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, color: 'var(--text)', fontSize: '0.9rem' }}>Export Excel File (.xlsx)</div>
                  </div>
                </button>

                <button
                  type="button"
                  className="download-card pdf"
                  onClick={handleExportPDF}
                  style={{ padding: '12px 16px' }}
                >
                  <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: 8, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <FileText size={20} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, color: 'var(--text)', fontSize: '0.9rem' }}>Export PDF Report (.pdf)</div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
