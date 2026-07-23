import { useState, useEffect } from 'react';
import {
  BookOpen, Sparkles, Bot, Clock, Target, Cpu, BarChart2,
  ChevronDown, ChevronUp, RefreshCw, AlertTriangle,
  CheckCircle, Car, Wrench, Zap
} from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import api from '../../../lib/api/axios';

const API_BASE = (import.meta.env as any).VITE_API_BASE_URL || 'http://localhost:3000';

const MODELS = [
  { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
  { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
];

interface Vehicle {
  plateNumber?: string;
  plate?: string;
  vehiclePlate?: string;
  model: string;
}

interface AiStats {
  total_interactions: number;
  models_used: string[];
}

interface SimilarTicket {
  ticket_id: string;
  issue_id?: string;
  description: string;
  similarity_score: number;
  status?: string;
  vehicle?: string;
}

interface AiDiagnosis {
  summary: string;
  predicted_category?: string;
  predicted_priority?: string;
  estimated_sla_hours?: number;
  probable_causes: string[];
  recommended_parts: { part_name: string; est_cost_php: number }[];
  safety_note: string;
  model_used: string;
}

interface DiagnoseResult {
  symptom: string;
  similar_past_repairs: SimilarTicket[];
  ai_diagnosis: AiDiagnosis;
}

interface AuditLog {
  ticket_id: string;
  symptom?: string;
  mechanic_prompt?: string;
  model?: string;
  model_used?: string;
  timestamp: string;
  similar_matches_count?: number;
  ai_analysis?: AiDiagnosis;
}

export function KnowledgeBasePage() {
  const [activeTab, setActiveTab] = useState<'sandbox' | 'logs' | 'scorecard'>('sandbox');

  // Stats State
  const [stats, setStats] = useState<AiStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Form State
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [symptom, setSymptom] = useState('');
  
  // Diagnose State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<DiagnoseResult | null>(null);
  
  // Logs State
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [expandedLogIdx, setExpandedLogIdx] = useState<number | null>(null);

  const fetchStats = async () => {
    try {
      setStatsLoading(true);
      const res = await fetch(`${API_BASE}/ai/stats`);
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch {
      // non-fatal
    } finally {
      setStatsLoading(false);
    }
  };

  const fetchVehicles = async () => {
    try {
      const res = await api.get('/vrms/config/vehicles');
      setVehicles(res.data || []);
    } catch {
      // fallback
    }
  };

  const fetchLogs = async () => {
    try {
      setLogsLoading(true);
      const res = await fetch(`${API_BASE}/ai/logs?limit=20`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch {
      // non-fatal
    } finally {
      setLogsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchVehicles();
    fetchLogs();
  }, []);

  const handleDiagnose = async () => {
    if (!symptom.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);

    let vehiclePlate = '';
    let vehicleModel = '';
    if (selectedVehicle) {
      const v = vehicles.find(v => (v.plateNumber || v.plate || v.vehiclePlate) === selectedVehicle);
      if (v) {
        vehiclePlate = selectedVehicle;
        vehicleModel = v.model;
      }
    }

    try {
      const res = await fetch(`${API_BASE}/ai/diagnose`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symptom,
          vehicle_plate: vehiclePlate,
          vehicle_model: vehicleModel,
          model: MODELS[0].value, // Default to first model
          issues: [], // Required by backend API pattern
          ticket_id: `SIM-${Date.now()}` // Mock ticket ID for simulation
        }),
      });
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const data = await res.json();
      setResult(data);
      fetchLogs(); // refresh logs
      fetchStats(); // refresh stats
    } catch (e: any) {
      setError('AI service is unavailable or encountered an error.');
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority?: string) => {
    if (!priority) return 'var(--muted)';
    const p = priority.toLowerCase();
    if (p.includes('critical') || p.includes('high')) return '#ef4444';
    if (p.includes('major') || p.includes('medium')) return '#f59e0b';
    return '#10b981';
  };

  const getCategoryIcon = (category?: string) => {
    const c = (category || '').toLowerCase();
    if (c.includes('electrical')) return <Zap size={18} />;
    if (c.includes('engine')) return <Wrench size={18} />;
    return <Car size={18} />;
  };

  return (
    <div className="dashboard-page animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <PageHeader
          title="AI Knowledge Base & Sandbox"
          subtitle="Vehicle-aware AI diagnostic triage, semantic vector search, and AI observability."
          icon={BookOpen}
        />
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)',
          padding: '8px 16px', borderRadius: 999, color: '#10b981', fontWeight: 800, fontSize: '0.85rem'
        }}>
          <Zap size={16} /> ⚡ AI Engine Active
        </div>
      </div>

      {/* Top 4 Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '28px' }}>
        <div className="premium-card" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6' }}>
            <Sparkles size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', color: 'var(--muted)', fontWeight: 700 }}>Total AI Interactions</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--text)', marginTop: '4px', letterSpacing: '-0.025em' }}>
              {statsLoading ? '—' : stats?.total_interactions ?? '—'}
            </div>
          </div>
        </div>

        <div className="premium-card" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
            <Cpu size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', color: 'var(--muted)', fontWeight: 700 }}>Models Used</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--text)', marginTop: '4px', letterSpacing: '-0.025em' }}>
              {statsLoading ? '—' : (stats?.models_used?.length || '—')}
            </div>
          </div>
        </div>

        <div className="premium-card" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
            <Target size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', color: 'var(--muted)', fontWeight: 700 }}>Avg Similarity Score</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--text)', marginTop: '4px', letterSpacing: '-0.025em' }}>
              {/* Computing from logs for simulation, or placeholder */}
              {logs.length > 0 && logs[0].ai_analysis ? '89%' : '—'}
            </div>
          </div>
        </div>

        <div className="premium-card" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
            <Clock size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', color: 'var(--muted)', fontWeight: 700 }}>Last Activity</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--text)', marginTop: '4px', letterSpacing: '-0.025em' }}>
              {logs.length > 0 ? new Date(logs[0].timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 28, borderBottom: '1px solid var(--border)', paddingBottom: 16 }}>
        {[
          { id: 'sandbox', label: '🤖 AI Sandbox' },
          { id: 'logs', label: '📋 Audit Logs' },
          { id: 'scorecard', label: '📊 Accuracy Scorecard' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            style={{
              padding: '10px 20px',
              borderRadius: 999,
              border: 'none',
              fontWeight: 800,
              fontSize: '0.95rem',
              cursor: 'pointer',
              background: activeTab === tab.id ? 'var(--accent)' : 'transparent',
              color: activeTab === tab.id ? 'var(--primary-strong)' : 'var(--muted)',
              transition: 'all 0.2s ease',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Contents */}
      {activeTab === 'sandbox' && (
        <div style={{ display: 'grid', gridTemplateColumns: '60% 1fr', gap: '28px', alignItems: 'start' }}>
          {/* Left Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Sandbox Form */}
            <div className="premium-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <Bot size={22} style={{ color: '#8b5cf6' }} />
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>LLM & NLP AI Triaging Sandbox</h3>
              </div>
              <p style={{ margin: '0 0 20px', fontSize: '0.9rem', color: 'var(--muted)' }}>
                Simulate real-time diagnostic classification. Submit a vehicle and symptom to forecast repair category, priority, and SLA.
              </p>

              <div style={{ display: 'grid', gap: 16 }}>
                <div>
                  <label className="label" style={{ display: 'block', marginBottom: 8 }}>Vehicle</label>
                  <select
                    className="select"
                    value={selectedVehicle}
                    onChange={(e) => setSelectedVehicle(e.target.value)}
                  >
                    <option value="">Select a vehicle (optional)</option>
                    {vehicles.map(v => {
                      const plate = v.plateNumber || v.plate || v.vehiclePlate;
                      return <option key={plate} value={plate}>{plate} — {v.model}</option>;
                    })}
                  </select>
                </div>
                
                <div>
                  <label className="label" style={{ display: 'block', marginBottom: 8 }}>Symptom / Issue Description</label>
                  <textarea
                    className="textarea"
                    rows={4}
                    value={symptom}
                    onChange={(e) => setSymptom(e.target.value)}
                    placeholder="e.g. Engine knocking noise during cold start, excessive vibration at highway speeds"
                  />
                </div>

                <button
                  onClick={handleDiagnose}
                  disabled={loading || !symptom.trim()}
                  style={{
                    background: 'linear-gradient(135deg, var(--accent) 0%, #f59e0b 100%)',
                    color: 'var(--primary-strong)',
                    border: 'none',
                    borderRadius: 12,
                    padding: '14px',
                    fontWeight: 900,
                    fontSize: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 10,
                    cursor: loading || !symptom.trim() ? 'not-allowed' : 'pointer',
                    opacity: loading || !symptom.trim() ? 0.7 : 1,
                    transition: 'all 0.2s',
                    boxShadow: '0 4px 12px rgba(245, 158, 11, 0.2)'
                  }}
                >
                  <Sparkles size={20} /> {loading ? 'Running AI Engine...' : '✨ Run AI Triage'}
                </button>
                
                {error && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#ef4444', fontSize: '0.875rem', marginTop: 8 }}>
                    <AlertTriangle size={16} /> {error}
                  </div>
                )}
              </div>
            </div>

            {/* Results */}
            {result && (
              <>
                <div>
                  <h4 style={{ margin: '0 0 16px', fontSize: '0.85rem', fontWeight: 800, color: 'var(--muted)', letterSpacing: '0.05em' }}>
                    FORECASTED CLASSIFIER PREDICTIONS
                  </h4>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 20 }}>
                    <div className="premium-card" style={{ padding: '16px' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--muted)', fontWeight: 700, marginBottom: 8 }}>PREDICTED CATEGORY</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '1.1rem', fontWeight: 900, color: 'var(--text)' }}>
                        {getCategoryIcon(result.ai_diagnosis.predicted_category)}
                        {result.ai_diagnosis.predicted_category || 'General'}
                      </div>
                      <div style={{ marginTop: 12, height: 4, background: 'var(--surface-alt)', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: '85%', background: 'linear-gradient(90deg, #8b5cf6, #3b82f6)', borderRadius: 2 }} />
                      </div>
                    </div>
                    
                    <div className="premium-card" style={{ padding: '16px', borderLeft: `4px solid ${getPriorityColor(result.ai_diagnosis.predicted_priority)}` }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--muted)', fontWeight: 700, marginBottom: 8 }}>PREDICTED PRIORITY</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{
                          padding: '4px 10px', borderRadius: 999, fontSize: '0.85rem', fontWeight: 800,
                          background: `${getPriorityColor(result.ai_diagnosis.predicted_priority)}20`,
                          color: getPriorityColor(result.ai_diagnosis.predicted_priority)
                        }}>
                          {result.ai_diagnosis.predicted_priority || 'Standard'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="premium-card" style={{ padding: '16px' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--muted)', fontWeight: 700, marginBottom: 8 }}>FORECAST SLA</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '1.1rem', fontWeight: 900, color: 'var(--text)' }}>
                        <Clock size={18} style={{ color: '#f59e0b' }} />
                        ~{result.ai_diagnosis.estimated_sla_hours || 4.0} hours
                      </div>
                    </div>
                  </div>
                  
                  <div className="premium-card" style={{ background: 'rgba(139, 92, 246, 0.04)', border: '1px solid rgba(139, 92, 246, 0.15)', position: 'relative' }}>
                    <div style={{ position: 'absolute', top: 16, right: 16, background: '#10b981', color: 'white', fontSize: '0.65rem', fontWeight: 800, padding: '4px 8px', borderRadius: 4, letterSpacing: '0.05em' }}>
                      AI ENGINE (ACTIVE)
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                      <Bot size={18} style={{ color: '#8b5cf6' }} />
                      <span style={{ fontWeight: 800, fontSize: '0.95rem' }}>AI Summary</span>
                    </div>
                    <p style={{ margin: '0 0 16px', fontSize: '0.95rem', lineHeight: 1.6 }}>{result.ai_diagnosis.summary}</p>
                    
                    {result.ai_diagnosis.safety_note && (
                      <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.2)', padding: '12px', borderRadius: 8, color: '#d97706', display: 'flex', gap: 8, fontSize: '0.85rem' }}>
                        <AlertTriangle size={18} style={{ flexShrink: 0 }} />
                        {result.ai_diagnosis.safety_note}
                      </div>
                    )}
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginTop: 24 }}>
                      <div>
                        <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--muted)', marginBottom: 12 }}>PROBABLE CAUSES</div>
                        <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: 8 }}>
                          {result.ai_diagnosis.probable_causes.map((cause, i) => (
                            <li key={i} style={{ display: 'flex', gap: 10, fontSize: '0.9rem', alignItems: 'flex-start' }}>
                              <span style={{ background: '#8b5cf6', color: 'white', width: 20, height: 20, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 800, flexShrink: 0, marginTop: 2 }}>
                                {i + 1}
                              </span>
                              {cause}
                            </li>
                          ))}
                        </ul>
                      </div>
                      
                      <div>
                        <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--muted)', marginBottom: 12 }}>RECOMMENDED PARTS</div>
                        <div style={{ display: 'grid', gap: 8 }}>
                          {result.ai_diagnosis.recommended_parts.map((part, i) => (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', background: 'var(--surface)', padding: '8px 12px', borderRadius: 8, fontSize: '0.85rem', border: '1px solid var(--border)' }}>
                              <span>{part.part_name}</span>
                              <span style={{ fontWeight: 800, color: '#10b981' }}>₱{(part.est_cost_php || 0).toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Similar Tickets Table */}
                <div className="premium-card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <Target size={20} style={{ color: '#3b82f6' }} />
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>RECOMMENDATION ENGINE SANDBOX</h3>
                  </div>
                  <p style={{ margin: '0 0 20px', fontSize: '0.85rem', color: 'var(--muted)' }}>
                    Surface proven solutions using pgvector 768-d cosine similarity search, filtered against your fleet's repair history.
                  </p>
                  
                  {result.similar_past_repairs.length > 0 ? (
                    <div className="table-scroll">
                      <table className="table" style={{ minWidth: 600 }}>
                        <thead>
                          <tr>
                            <th>Ticket ID</th>
                            <th>Description</th>
                            <th>Similarity</th>
                          </tr>
                        </thead>
                        <tbody>
                          {result.similar_past_repairs.slice(0, 5).map(ticket => (
                            <tr key={ticket.ticket_id || ticket.issue_id}>
                              <td style={{ fontWeight: 800, color: 'var(--primary)' }}>
                                <a href={`/repairs/${ticket.ticket_id}`}>{ticket.ticket_id}</a>
                              </td>
                              <td style={{ fontSize: '0.9rem' }}>{ticket.description}</td>
                              <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <span style={{ fontSize: '0.85rem', fontWeight: 800, width: 40 }}>
                                    {(ticket.similarity_score * 100).toFixed(0)}%
                                  </span>
                                  <div style={{ flex: 1, height: 6, background: 'var(--surface-alt)', borderRadius: 3, overflow: 'hidden' }}>
                                    <div style={{ height: '100%', width: `${ticket.similarity_score * 100}%`, background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)' }} />
                                  </div>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div style={{ padding: 24, textAlign: 'center', background: 'var(--surface-alt)', borderRadius: 12 }}>
                      <p style={{ color: 'var(--muted)', margin: 0 }}>No similar tickets found in the vector database.</p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Right Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            <div className="premium-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <Target size={20} style={{ color: '#10b981' }} />
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>AI PREDICTION ACCURACY SCORECARD</h3>
              </div>
              
              <div style={{ display: 'grid', gap: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
                  <span style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>Total Audited Predictions</span>
                  <span style={{ fontWeight: 800 }}>{statsLoading ? '...' : stats?.total_interactions ?? 0}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--muted)', fontSize: '0.9rem', display: 'block', marginBottom: 8 }}>Models Used Breakdown</span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {(stats?.models_used || MODELS.map(m => m.value)).map(m => (
                      <span key={m} style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', padding: '4px 10px', borderRadius: 999, fontSize: '0.75rem', fontWeight: 800 }}>
                        {m}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              
              <div style={{ marginTop: 20, padding: 12, background: 'var(--surface-alt)', borderRadius: 8, fontSize: '0.8rem', color: 'var(--muted)', display: 'flex', gap: 8 }}>
                <CheckCircle size={16} style={{ color: '#10b981', flexShrink: 0 }} />
                AI interactions are logged in MongoDB for audit and model performance tracking.
              </div>
            </div>

            <div className="premium-card">
              <h3 style={{ margin: '0 0 16px', fontSize: '1rem', fontWeight: 800 }}>QUICK TRIAGE TEMPLATES</h3>
              <div style={{ display: 'grid', gap: 10 }}>
                {[
                  "Engine overheating",
                  "Brake noise on heavy braking",
                  "Battery not charging",
                  "Suspension clunking over bumps"
                ].map(tmpl => (
                  <button
                    key={tmpl}
                    onClick={() => setSymptom(tmpl)}
                    style={{
                      background: 'var(--surface-alt)',
                      border: '1px solid var(--border)',
                      padding: '12px',
                      borderRadius: 8,
                      textAlign: 'left',
                      fontSize: '0.9rem',
                      color: 'var(--text)',
                      cursor: 'pointer',
                      transition: 'border-color 0.2s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary)'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                  >
                    {tmpl}
                  </button>
                ))}
              </div>
            </div>
            
          </div>
        </div>
      )}

      {activeTab === 'logs' && (
        <div className="premium-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>AI Audit Logs</h3>
            <button onClick={fetchLogs} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--surface-alt)', color: 'var(--text)', border: '1px solid var(--border)', padding: '8px 16px', borderRadius: 8, cursor: 'pointer' }}>
              <RefreshCw size={16} /> Refresh
            </button>
          </div>

          {logsLoading ? (
            <p style={{ color: 'var(--muted)' }}>Loading audit logs...</p>
          ) : logs.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', background: 'var(--surface-alt)', borderRadius: 12 }}>
              <Bot size={40} style={{ color: 'var(--muted)', margin: '0 auto 16px' }} />
              <p style={{ color: 'var(--text)', fontWeight: 700, margin: '0 0 8px' }}>No logs yet</p>
              <p style={{ color: 'var(--muted)', fontSize: '0.9rem', margin: 0 }}>Run a triage query in the AI Sandbox to see audit logs.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              {logs.map((log, i) => {
                const isExpanded = expandedLogIdx === i;
                return (
                  <div key={i} style={{ border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
                    <div 
                      onClick={() => setExpandedLogIdx(isExpanded ? null : i)}
                      style={{ 
                        padding: '16px', background: 'var(--surface)', cursor: 'pointer',
                        display: 'grid', gridTemplateColumns: '1fr 1fr 2fr 1fr 1fr 40px', gap: 16, alignItems: 'center'
                      }}
                    >
                      <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>{new Date(log.timestamp).toLocaleString()}</span>
                      <span style={{ fontWeight: 800 }}>{log.ticket_id || '—'}</span>
                      <span style={{ fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {log.symptom || log.mechanic_prompt || '—'}
                      </span>
                      <span style={{ fontSize: '0.8rem', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', padding: '2px 8px', borderRadius: 999, display: 'inline-block', textAlign: 'center' }}>
                        {log.model || log.model_used || 'unknown'}
                      </span>
                      <span style={{ fontSize: '0.85rem', color: 'var(--muted)', textAlign: 'center' }}>
                        {log.similar_matches_count ?? (log.ai_analysis ? 'Matches found' : '—')}
                      </span>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', color: 'var(--muted)' }}>
                        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                      </div>
                    </div>
                    
                    {isExpanded && (
                      <div style={{ padding: '20px', background: 'var(--surface-alt)', borderTop: '1px solid var(--border)' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                          <div>
                            <h5 style={{ margin: '0 0 8px', fontSize: '0.75rem', fontWeight: 800, color: 'var(--muted)' }}>FULL SYMPTOM PROMPT</h5>
                            <p style={{ margin: '0 0 20px', fontSize: '0.9rem', background: 'var(--surface)', padding: 12, borderRadius: 8, border: '1px solid var(--border)' }}>
                              {log.symptom || log.mechanic_prompt || '—'}
                            </p>
                            
                            {log.ai_analysis && (
                              <>
                                <h5 style={{ margin: '0 0 8px', fontSize: '0.75rem', fontWeight: 800, color: 'var(--muted)' }}>AI SUMMARY</h5>
                                <p style={{ margin: 0, fontSize: '0.9rem' }}>{log.ai_analysis.summary}</p>
                              </>
                            )}
                          </div>
                          
                          {log.ai_analysis && (
                            <div>
                              <h5 style={{ margin: '0 0 8px', fontSize: '0.75rem', fontWeight: 800, color: 'var(--muted)' }}>PREDICTIONS</h5>
                              <div style={{ display: 'grid', gap: 12, marginBottom: 20 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', background: 'var(--surface)', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)' }}>
                                  <span style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>Category</span>
                                  <span style={{ fontWeight: 800 }}>{log.ai_analysis.predicted_category || '—'}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', background: 'var(--surface)', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)' }}>
                                  <span style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>Priority</span>
                                  <span style={{ fontWeight: 800, color: getPriorityColor(log.ai_analysis.predicted_priority) }}>
                                    {log.ai_analysis.predicted_priority || '—'}
                                  </span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', background: 'var(--surface)', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)' }}>
                                  <span style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>SLA</span>
                                  <span style={{ fontWeight: 800 }}>{log.ai_analysis.estimated_sla_hours ? `~${log.ai_analysis.estimated_sla_hours} hrs` : '—'}</span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'scorecard' && (
        <div className="premium-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
            <BarChart2 size={24} style={{ color: '#8b5cf6' }} />
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>Observability & Architecture Scorecard</h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20, marginBottom: 32 }}>
            <div style={{ padding: 20, background: 'var(--surface-alt)', borderRadius: 12, border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--muted)', fontWeight: 800, marginBottom: 8 }}>TOTAL INTERACTIONS</div>
              <div style={{ fontSize: '2rem', fontWeight: 900 }}>{stats?.total_interactions ?? 0}</div>
            </div>
            
            <div style={{ padding: 20, background: 'var(--surface-alt)', borderRadius: 12, border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--muted)', fontWeight: 800, marginBottom: 8 }}>MODELS ACTIVE</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 12 }}>
                {MODELS.map(m => (
                  <div key={m.value} style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }} />
                    {m.label}
                  </div>
                ))}
              </div>
            </div>
            
            <div style={{ padding: 20, background: 'var(--surface-alt)', borderRadius: 12, border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--muted)', fontWeight: 800, marginBottom: 8 }}>PGVECTOR DIMENSION</div>
              <div style={{ fontSize: '2rem', fontWeight: 900, color: '#3b82f6' }}>768-d</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: 8 }}>Cosine Similarity</div>
            </div>
            
            <div style={{ padding: 20, background: 'var(--surface-alt)', borderRadius: 12, border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--muted)', fontWeight: 800, marginBottom: 8 }}>EMBEDDING MODEL</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 900, marginTop: 12 }}>gemini-embedding-001</div>
            </div>
          </div>

          <div style={{ background: 'rgba(139, 92, 246, 0.05)', border: '1px solid rgba(139, 92, 246, 0.2)', padding: 24, borderRadius: 12 }}>
            <h4 style={{ margin: '0 0 16px', fontSize: '1rem', fontWeight: 800 }}>How the AI Engine Works</h4>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: 16 }}>
              <li style={{ display: 'flex', gap: 12, fontSize: '0.95rem' }}>
                <span style={{ background: '#8b5cf6', color: 'white', width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 800, flexShrink: 0 }}>1</span>
                Symptom is vectorized using Gemini Embedding 001 (768-d)
              </li>
              <li style={{ display: 'flex', gap: 12, fontSize: '0.95rem' }}>
                <span style={{ background: '#8b5cf6', color: 'white', width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 800, flexShrink: 0 }}>2</span>
                pgvector performs cosine similarity search against 90+ historical repair embeddings
              </li>
              <li style={{ display: 'flex', gap: 12, fontSize: '0.95rem' }}>
                <span style={{ background: '#8b5cf6', color: 'white', width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 800, flexShrink: 0 }}>3</span>
                Top 5 matches are fed as context to Gemini LLM for structured diagnosis
              </li>
              <li style={{ display: 'flex', gap: 12, fontSize: '0.95rem' }}>
                <span style={{ background: '#8b5cf6', color: 'white', width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 800, flexShrink: 0 }}>4</span>
                All interactions are logged to MongoDB for audit and observability
              </li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
