import { useState, useMemo } from 'react';
import { 
  FileDown, 
  FileSpreadsheet, 
  FileText, 
  TrendingUp, 
  PhilippinePeso, 
  Wrench,
  Layers
} from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { useDashboardMetrics } from '../hooks/useDashboardMetrics';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

export function ReportsPage() {
  const { repairs, loading, error } = useDashboardMetrics();
  const [timeframe, setTimeframe] = useState<'1m' | '3m' | '1y' | 'all'>('1m');

  const filteredRepairs = useMemo(() => {
    const now = new Date();
    return repairs.filter((r) => {
      const createdDate = new Date(r.createdAt);
      if (timeframe === '1m') {
        return createdDate.getMonth() === now.getMonth() && createdDate.getFullYear() === now.getFullYear();
      } else if (timeframe === '3m') {
        const limitDate = new Date();
        limitDate.setDate(now.getDate() - 90);
        return createdDate >= limitDate;
      } else if (timeframe === '1y') {
        const limitDate = new Date();
        limitDate.setDate(now.getDate() - 365);
        return createdDate >= limitDate;
      }
      return true; // all-time
    });
  }, [repairs, timeframe]);

  const metrics = useMemo(() => {
    const totalCount = filteredRepairs.length;
    const totalCost = filteredRepairs.reduce((sum, r) => sum + (r.totalCost ?? 0), 0);
    const costedRepairs = filteredRepairs.filter((r) => r.totalCost && r.totalCost > 0);
    const averageCost = costedRepairs.length
      ? Math.round(costedRepairs.reduce((sum, r) => sum + (r.totalCost ?? 0), 0) / costedRepairs.length)
      : 0;

    return {
      totalCount,
      totalCost,
      averageCost,
    };
  }, [filteredRepairs]);

  const categoryStats = useMemo(() => {
    const counts: Record<string, number> = {
      Engine: 0,
      Brakes: 0,
      Transmission: 0,
      Suspension: 0,
      Electrical: 0,
      Cooling: 0,
    };
    let total = 0;
    filteredRepairs.forEach((r) => {
      r.issues?.forEach((issue) => {
        const match = issue.description.match(/^\[(Engine|Brakes|Transmission|Suspension|Electrical|Cooling)\]/i);
        if (match) {
          const cat = match[1];
          counts[cat]++;
          total++;
        }
      });
    });
    return { counts, total: total || 1 };
  }, [filteredRepairs]);

  const handleExportExcel = () => {
    const data = filteredRepairs.map(r => ({
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
    XLSX.writeFile(workbook, `vrms_repairs_report_${timeframe}_${new Date().getTime()}.xlsx`);
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("WeLinc VRMS Repairs Report", 14, 18);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Timeframe: ${timeframe === '1m' ? 'This Month' : timeframe === '3m' ? 'Last 3 Months' : timeframe === '1y' ? 'Last 1 Year' : 'All Time'} | Generated: ${new Date().toLocaleString()}`, 14, 25);
    
    autoTable(doc, {
      head: [['Repair #', 'Vehicle', 'Driver', 'Garage', 'Status', 'Total Cost', 'Date Logged']],
      body: filteredRepairs.map(r => [
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
    
    doc.save(`vrms_repairs_report_${timeframe}_${new Date().getTime()}.pdf`);
  };

  const categoryColors: Record<string, string> = {
    Engine: '#a855f7',
    Brakes: '#f97316',
    Transmission: '#3b82f6',
    Suspension: '#14b8a6',
    Electrical: '#eab308',
    Cooling: '#0ea5e9',
  };

  return (
    <div>
      <PageHeader
        title="Reports & Exports"
        subtitle="Analyze repair volumes, category distributions, costs, and download full spreadsheets."
        icon={FileDown}
      />

      {loading ? (
        <div className="card"><p>Loading metrics and reports...</p></div>
      ) : error ? (
        <div className="card"><div className="alert">{error}</div></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Controls & Metrics */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h3 className="subheading" style={{ margin: 0 }}>Report Filter</h3>
                <p className="page-subtitle" style={{ margin: 0 }}>Select target timeframe to filter exports and analytics.</p>
              </div>
              <div>
                <select
                  className="select"
                  style={{ padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', background: 'var(--surface-alt)', border: '1px solid var(--border)', fontWeight: 600 }}
                  value={timeframe}
                  onChange={(e) => setTimeframe(e.target.value as any)}
                >
                  <option value="1m">This Calendar Month</option>
                  <option value="3m">Last 3 Months</option>
                  <option value="1y">Last 1 Year</option>
                  <option value="all">All Time (Total)</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', borderRadius: '12px', background: 'var(--surface-alt)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '44px', height: '44px', borderRadius: '10px', background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6' }}>
                  <PhilippinePeso size={22} />
                </div>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--muted)', fontWeight: 600 }}>Total Cost</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text)' }}>₱{metrics.totalCost.toLocaleString()}</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', borderRadius: '12px', background: 'var(--surface-alt)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '44px', height: '44px', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
                  <TrendingUp size={22} />
                </div>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--muted)', fontWeight: 600 }}>Average Cost</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text)' }}>₱{metrics.averageCost.toLocaleString()}</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', borderRadius: '12px', background: 'var(--surface-alt)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '44px', height: '44px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
                  <Wrench size={22} />
                </div>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--muted)', fontWeight: 600 }}>Repair Volume</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text)' }}>{metrics.totalCount} ticket{metrics.totalCount === 1 ? '' : 's'}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Export Actions and Category Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
            {/* Export Actions */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <h3 className="subheading" style={{ margin: 0 }}>Document Downloads</h3>
                <p className="page-subtitle" style={{ margin: 0 }}>Export tabular data into standard file formats.</p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <button
                  type="button"
                  className="button secondary"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '12px', padding: '16px', borderRadius: '10px', height: 'auto', border: '1px solid var(--border)' }}
                  onClick={handleExportExcel}
                >
                  <div style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: 8, borderRadius: 8 }}>
                    <FileSpreadsheet size={22} />
                  </div>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontWeight: 700, color: 'var(--text)' }}>Export Excel File (.xlsx)</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Ideal for data analysis and spreadsheet processing.</div>
                  </div>
                </button>

                <button
                  type="button"
                  className="button secondary"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '12px', padding: '16px', borderRadius: '10px', height: 'auto', border: '1px solid var(--border)' }}
                  onClick={handleExportPDF}
                >
                  <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: 8, borderRadius: 8 }}>
                    <FileText size={22} />
                  </div>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontWeight: 700, color: 'var(--text)' }}>Export PDF Report (.pdf)</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Best for presentation, archiving, and official printing.</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Category Stats */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <h3 className="subheading" style={{ margin: 0 }}>Repair Categories Distribution</h3>
                <p className="page-subtitle" style={{ margin: 0 }}>Breakdown of repair issues by mechanical system.</p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {Object.entries(categoryStats.counts).map(([category, count]) => {
                  const pct = Math.round((count / categoryStats.total) * 100);
                  const color = categoryColors[category];
                  return (
                    <div key={category}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>
                        <span>{category}</span>
                        <span style={{ color: 'var(--muted)' }}>{count} ({pct}%)</span>
                      </div>
                      <div style={{ height: '8px', borderRadius: '4px', background: 'var(--surface-alt)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', background: color, width: `${pct}%`, borderRadius: '4px' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
