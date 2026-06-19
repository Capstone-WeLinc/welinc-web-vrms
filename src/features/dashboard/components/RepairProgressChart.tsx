import { useMemo } from 'react';
import { RepairTicket } from '../../../types';
import { CheckCircle2, Clock, Wrench, AlertTriangle } from 'lucide-react';

interface RepairProgressChartProps {
  repairs: RepairTicket[];
}

export function RepairProgressChart({ repairs }: RepairProgressChartProps) {
  const stats = useMemo(() => {
    let pending = 0;
    let inProgress = 0;
    let forVerification = 0;
    let completed = 0;

    repairs.forEach(r => {
      if (r.status === 'PENDING') pending++;
      else if (r.status === 'IN_PROGRESS') inProgress++;
      else if (r.status === 'FOR_VERIFICATION') forVerification++;
      else if (r.status === 'COMPLETED') completed++;
    });

    const total = pending + inProgress + forVerification + completed;
    
    return {
      pending,
      inProgress,
      forVerification,
      completed,
      total: total || 1, // avoid division by zero
    };
  }, [repairs]);

  const stages = [
    { label: 'Pending', count: stats.pending, color: 'var(--warning)', icon: Clock },
    { label: 'In Progress', count: stats.inProgress, color: 'var(--info)', icon: Wrench },
    { label: 'For Verification', count: stats.forVerification, color: 'var(--danger)', icon: AlertTriangle },
    { label: 'Completed', count: stats.completed, color: 'var(--success)', icon: CheckCircle2 },
  ];

  return (
    <div className="card chart-panel" style={{ width: '100%', marginBottom: '24px' }}>
      <div className="page-header" style={{ marginBottom: '20px' }}>
        <div>
          <h3 className="subheading" style={{ margin: 0 }}>Repair Pipeline Progress</h3>
          <p className="page-subtitle" style={{ margin: 0 }}>Current state of all active and completed repair tickets.</p>
        </div>
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Progress Bar */}
        <div style={{ display: 'flex', height: '16px', borderRadius: '8px', overflow: 'hidden', background: 'var(--surface-alt)' }}>
          {stages.map(stage => {
            const width = `${(stage.count / stats.total) * 100}%`;
            return stage.count > 0 ? (
              <div 
                key={stage.label} 
                style={{ width, background: stage.color, transition: 'width 0.3s' }} 
                title={`${stage.label}: ${stage.count}`}
              />
            ) : null;
          })}
        </div>

        {/* Legend */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px' }}>
          {stages.map(stage => {
            const Icon = stage.icon;
            return (
              <div key={stage.label} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '12px', background: 'var(--surface-alt)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: '8px', background: stage.color, color: 'white' }}>
                  <Icon size={18} />
                </div>
                <div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--muted)', fontWeight: 600 }}>{stage.label}</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text)' }}>{stage.count}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
