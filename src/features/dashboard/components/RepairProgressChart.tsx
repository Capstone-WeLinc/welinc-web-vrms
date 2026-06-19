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
    <div className="premium-card chart-panel" style={{ width: '100%' }}>
      <div style={{ marginBottom: '20px' }}>
        <h3 className="subheading" style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>Repair Pipeline Progress</h3>
        <p className="page-subtitle" style={{ margin: '4px 0 0', fontSize: '0.875rem' }}>Current state of all active and completed repair tickets.</p>
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Progress Bar */}
        <div className="progress-bar-glow-container" style={{ display: 'flex', height: '20px', borderRadius: '10px', overflow: 'hidden', background: 'var(--surface-alt)' }}>
          {stages.map(stage => {
            const width = `${(stage.count / stats.total) * 100}%`;
            return stage.count > 0 ? (
              <div 
                key={stage.label} 
                style={{ 
                  width, 
                  background: stage.color, 
                  transition: 'width 0.3s'
                }} 
                title={`${stage.label}: ${stage.count}`}
              />
            ) : null;
          })}
        </div>

        {/* Legend */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          {stages.map(stage => {
            const Icon = stage.icon;
            const softColorMap: Record<string, string> = {
              'var(--warning)': 'rgba(232, 184, 0, 0.12)',
              'var(--info)': 'rgba(26, 31, 110, 0.08)',
              'var(--danger)': 'rgba(192, 57, 43, 0.1)',
              'var(--success)': 'rgba(16, 185, 129, 0.12)',
            };
            const iconColorMap: Record<string, string> = {
              'var(--warning)': 'var(--warning)',
              'var(--info)': 'var(--primary)',
              'var(--danger)': 'var(--danger)',
              'var(--success)': 'var(--success)',
            };
            const softBg = softColorMap[stage.color] || 'rgba(0,0,0,0.05)';
            const iconColor = iconColorMap[stage.color] || 'white';
            return (
              <div key={stage.label} className="pipeline-stage-card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '42px', height: '42px', borderRadius: '12px', background: softBg, color: iconColor }}>
                  <Icon size={20} />
                </div>
                <div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--muted)', fontWeight: 700 }}>{stage.label}</div>
                  <div style={{ fontSize: '1.35rem', fontWeight: 900, color: 'var(--text)', marginTop: '2px', lineHeight: 1 }}>{stage.count}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
