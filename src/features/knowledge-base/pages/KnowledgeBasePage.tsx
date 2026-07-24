import { useState, useEffect, useCallback } from 'react';
import {
  BookOpen, Search, Zap, Bot, Clock, ChevronDown, ChevronUp,
  RefreshCw, AlertTriangle, CheckCircle, Car, Wrench, Filter,
  ThumbsUp, ThumbsDown, Star, BarChart2, FileText, List, Cpu,
  Layers, Shield, Settings
} from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import api from '../../../lib/api/axios';

const API_BASE = (import.meta.env as any).VITE_API_BASE_URL || 'http://localhost:3000';

const CATEGORIES = ['All', 'Engine', 'Electrical', 'Brakes', 'Transmission', 'Suspension', 'Cooling', 'Steering', 'General'];

interface Vehicle {
  plateNumber?: string;
  plate?: string;
  vehiclePlate?: string;
  model: string;
}

interface KbArticle {
  id: string;
  category: string;
  title: string;
  summary: string;
  steps: string[];
  parts: string[];
  estimated_hours: number;
  tags: string[];
}

interface SimilarTicket {
  ticket_id: string;
  issue_id?: string;
  description: string;
  similarity_score: number;
}

interface AiDiagnosis {
  summary: string;
  predicted_category?: string;
  predicted_priority?: string;
  estimated_sla_hours?: number;
  probable_causes: string[];
  recommended_parts: { part_name: string; est_cost_php?: number | null }[];
  safety_note: string;
  model_used: string;
}

interface ContextLineage {
  vehicle_plate?: string | null;
  vehicle_history_count: number;
  vector_matches_count: number;
  similarity_avg: number;
  model_used: string;
  used_live_llm: boolean;
  confidence: 'High' | 'Moderate' | 'Low';
}

interface DiagnoseResult {
  symptom: string;
  similar_past_repairs: SimilarTicket[];
  vehicle_history: any[];
  ai_diagnosis: AiDiagnosis;
  context_lineage: ContextLineage;
}

interface AiStats {
  total_interactions: number;
  models_used: Record<string, number> | string[];
  satisfaction?: {
    avg_rating: number;
    helpful_count: number;
    total_feedback: number;
    satisfaction_rate: number;
  };
}

interface AuditLog {
  ticket_id: string;
  mechanic_prompt?: string;
  timestamp: string;
  context_lineage?: ContextLineage;
  ai_analysis?: AiDiagnosis;
  feedback?: { helpful: boolean; rating: number; comment: string };
}

type Tab = 'articles' | 'history' | 'ai' | 'logs';

const catColor: Record<string, string> = {
  Engine: '#f59e0b', Electrical: '#8b5cf6', Brakes: '#ef4444',
  Transmission: '#3b82f6', Suspension: '#10b981', Cooling: '#06b6d4',
  Steering: '#ec4899', General: '#6b7280', Cooling2: '#14b8a6'
};

function getCatColor(cat: string) { return catColor[cat] || '#6b7280'; }

function getCatIcon(cat?: string, size = 18) {
  const c = (cat || '').toLowerCase();
  if (c.includes('electrical')) return <Zap size={size} />;
  if (c.includes('engine')) return <Settings size={size} />;
  if (c.includes('brake')) return <Shield size={size} />;
  if (c.includes('trans')) return <Layers size={size} />;
  return <Wrench size={size} />;
}

function ConfidenceBadge({ level }: { level?: string }) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    High: { bg: 'rgba(16,185,129,0.12)', color: '#10b981', label: 'High Confidence' },
    Moderate: { bg: 'rgba(245,158,11,0.12)', color: '#f59e0b', label: 'Moderate Confidence' },
    Low: { bg: 'rgba(239,68,68,0.12)', color: '#ef4444', label: 'Low — Limited Data' },
  };
  const cfg = map[level || 'Low'] || map.Low;
  return (
    <span style={{ background: cfg.bg, color: cfg.color, padding: '4px 12px', borderRadius: 999, fontSize: '0.78rem', fontWeight: 800 }}>
      {cfg.label}
    </span>
  );
}

export function KnowledgeBasePage() {
  const [activeTab, setActiveTab] = useState<Tab>('articles');

  // Articles
  const [articles, setArticles] = useState<KbArticle[]>([]);
  const [artCategory, setArtCategory] = useState('All');
  const [artSearch, setArtSearch] = useState('');
  const [artLoading, setArtLoading] = useState(true);
  const [expandedArt, setExpandedArt] = useState<string | null>(null);

  // Vehicle History Registry
  const [historyTickets, setHistoryTickets] = useState<any[]>([]);
  const [histCategory, setHistCategory] = useState('All');
  const [histSearch, setHistSearch] = useState('');
  const [histLoading, setHistLoading] = useState(false);

  // AI Sandbox
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [symptom, setSymptom] = useState('');
  const [diagLoading, setDiagLoading] = useState(false);
  const [diagError, setDiagError] = useState('');
  const [diagResult, setDiagResult] = useState<DiagnoseResult | null>(null);
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState(0);

  // Stats & Logs
  const [stats, setStats] = useState<AiStats | null>(null);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [expandedLog, setExpandedLog] = useState<number | null>(null);

  const fetchArticles = useCallback(async () => {
    setArtLoading(true);
    try {
      const params = new URLSearchParams();
      if (artCategory !== 'All') params.set('category', artCategory);
      if (artSearch) params.set('search', artSearch);
      const res = await fetch(`${API_BASE}/ai/knowledge/articles?${params}`);
      if (res.ok) setArticles((await res.json()).articles || []);
    } catch { /* non-fatal */ } finally { setArtLoading(false); }
  }, [artCategory, artSearch]);

  const fetchHistory = useCallback(async () => {
    setHistLoading(true);
    try {
      const params: any = { status: 'COMPLETED', limit: 50 };
      if (histSearch) params.search = histSearch;
      const res = await api.get('/vrms/repairs', { params });
      setHistoryTickets(res.data?.tickets || res.data?.data || []);
    } catch { setHistoryTickets([]); } finally { setHistLoading(false); }
  }, [histSearch]);

  const fetchVehicles = async () => {
    try {
      const res = await api.get('/vrms/config/vehicles');
      setVehicles(res.data || []);
    } catch { /* fallback */ }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_BASE}/ai/stats`);
      if (res.ok) setStats(await res.json());
    } catch { /* non-fatal */ }
  };

  const fetchLogs = async () => {
    setLogsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/ai/logs?limit=20`);
      if (res.ok) setLogs((await res.json()).logs || []);
    } catch { /* non-fatal */ } finally { setLogsLoading(false); }
  };

  useEffect(() => { fetchArticles(); }, [fetchArticles]);
  useEffect(() => { if (activeTab === 'history') fetchHistory(); }, [activeTab, fetchHistory]);
  useEffect(() => { if (activeTab === 'ai') fetchVehicles(); }, [activeTab]);
  useEffect(() => { if (activeTab === 'logs') { fetchStats(); fetchLogs(); } }, [activeTab]);

  const handleDiagnose = async () => {
    if (!symptom.trim()) return;
    setDiagLoading(true);
    setDiagError('');
    setDiagResult(null);
    setFeedbackSent(false);
    setFeedbackRating(0);
    const v = vehicles.find(v => (v.plateNumber || v.plate || v.vehiclePlate) === selectedVehicle);
    try {
      const res = await fetch(`${API_BASE}/ai/diagnose`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symptom, vehicle_plate: selectedVehicle, vehicle_model: v?.model || '',
          model: 'gemini-2.0-flash', issues: [], ticket_id: `SIM-${Date.now()}`
        }),
      });
      if (!res.ok) throw new Error();
      setDiagResult(await res.json());
    } catch { setDiagError('AI service unavailable. Please try again shortly.'); }
    finally { setDiagLoading(false); }
  };

  const submitFeedback = async (helpful: boolean, rating: number) => {
    if (!diagResult || feedbackSent) return;
    setFeedbackRating(rating);
    setFeedbackSent(true);
    try {
      await fetch(`${API_BASE}/ai/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticket_id: `SIM-${Date.now()}`, helpful, rating }),
      });
    } catch { /* non-fatal */ }
  };

  const priorityColor = (p?: string) => {
    if (!p) return '#6b7280';
    const lp = p.toLowerCase();
    if (lp.includes('critical')) return '#ef4444';
    if (lp.includes('major')) return '#f59e0b';
    return '#10b981';
  };

  const filteredHistory = historyTickets.filter(t => {
    if (histCategory !== 'All') {
      const cat = (t.issues?.[0]?.description || '').toLowerCase();
      if (!cat.includes(histCategory.toLowerCase())) return false;
    }
    return true;
  });

  const tabs = [
    { id: 'articles' as Tab, label: 'Repair Articles & SOPs', icon: <FileText size={16} /> },
    { id: 'history' as Tab, label: 'Vehicle Issue Registry', icon: <Car size={16} /> },
    { id: 'ai' as Tab, label: 'AI Diagnostic Assistant', icon: <Bot size={16} /> },
    { id: 'logs' as Tab, label: 'System Logs & Stats', icon: <BarChart2 size={16} /> },
  ];

  return (
    <div className="dashboard-page animate-fade-in">
      <PageHeader
        title="Knowledge Base"
        subtitle="Automotive repair library, SOPs, issue registry, and AI diagnostic assistant."
        icon={BookOpen}
      />

      {/* Global Search */}
      <div style={{ position: 'relative', marginBottom: 28 }}>
        <Search size={18} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
        <input
          className="input"
          style={{ paddingLeft: 48, fontSize: '1rem', height: 48 }}
          placeholder="Search repair guides, symptoms, categories…"
          value={artSearch}
          onChange={e => { setArtSearch(e.target.value); setActiveTab('articles'); }}
        />
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 28, borderBottom: '1px solid var(--border)', paddingBottom: 0, overflowX: 'auto' }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '12px 20px',
              borderRadius: '10px 10px 0 0',
              border: 'none',
              fontWeight: 700,
              fontSize: '0.9rem',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 8,
              background: activeTab === tab.id ? 'var(--surface)' : 'transparent',
              color: activeTab === tab.id ? 'var(--accent)' : 'var(--muted)',
              borderBottom: activeTab === tab.id ? '2px solid var(--accent)' : '2px solid transparent',
              transition: 'all 0.2s',
              whiteSpace: 'nowrap',
            }}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* ─── TAB 1: ARTICLES ─────────────────────────────────────────────────── */}
      {activeTab === 'articles' && (
        <div>
          {/* Category filter pills */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setArtCategory(cat)}
                style={{
                  padding: '6px 16px', borderRadius: 999, border: 'none',
                  fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer',
                  background: artCategory === cat ? getCatColor(cat) : 'var(--surface-alt)',
                  color: artCategory === cat ? 'white' : 'var(--muted)',
                  transition: 'all 0.2s',
                }}
              >
                {cat}
              </button>
            ))}
          </div>

          {artLoading ? (
            <p style={{ color: 'var(--muted)', padding: 24 }}>Loading repair articles…</p>
          ) : articles.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center', background: 'var(--surface)', borderRadius: 16 }}>
              <BookOpen size={40} style={{ color: 'var(--muted)', marginBottom: 16 }} />
              <p style={{ color: 'var(--muted)' }}>No articles found. Try a different search or category.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 16 }}>
              {articles.map(art => {
                const isOpen = expandedArt === art.id;
                const col = getCatColor(art.category);
                return (
                  <div key={art.id} className="premium-card" style={{ borderLeft: `4px solid ${col}`, padding: 0, overflow: 'hidden' }}>
                    <div
                      onClick={() => setExpandedArt(isOpen ? null : art.id)}
                      style={{ padding: '20px 24px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                          <span style={{ background: `${col}18`, color: col, padding: '2px 10px', borderRadius: 999, fontSize: '0.72rem', fontWeight: 800 }}>
                            {art.category.toUpperCase()}
                          </span>
                          <span style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>Est. {art.estimated_hours}h</span>
                        </div>
                        <h3 style={{ margin: '0 0 6px', fontSize: '1.05rem', fontWeight: 800 }}>{art.title}</h3>
                        <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--muted)', lineHeight: 1.5 }}>{art.summary}</p>
                      </div>
                      <div style={{ color: 'var(--muted)', flexShrink: 0, marginTop: 4 }}>
                        {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                      </div>
                    </div>

                    {isOpen && (
                      <div style={{ padding: '0 24px 24px', borderTop: '1px solid var(--border)' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginTop: 20 }}>
                          <div>
                            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--muted)', marginBottom: 12, letterSpacing: '0.05em' }}>
                              DIAGNOSTIC STEPS
                            </div>
                            <ol style={{ margin: 0, paddingLeft: 20, display: 'grid', gap: 8 }}>
                              {art.steps.map((step, i) => (
                                <li key={i} style={{ fontSize: '0.9rem', lineHeight: 1.5 }}>{step}</li>
                              ))}
                            </ol>
                          </div>
                          <div>
                            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--muted)', marginBottom: 12, letterSpacing: '0.05em' }}>
                              COMMONLY NEEDED PARTS
                            </div>
                            <div style={{ display: 'grid', gap: 8 }}>
                              {art.parts.map((part, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'var(--surface-alt)', borderRadius: 8, fontSize: '0.875rem' }}>
                                  <Wrench size={14} style={{ color: col, flexShrink: 0 }} />
                                  {part}
                                </div>
                              ))}
                            </div>
                            <div style={{ marginTop: 16, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                              {art.tags.map(tag => (
                                <span key={tag} style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: '2px 8px', borderRadius: 999, fontSize: '0.72rem', color: 'var(--muted)' }}>
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          </div>
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

      {/* ─── TAB 2: VEHICLE HISTORY REGISTRY ─────────────────────────────────── */}
      {activeTab === 'history' && (
        <div>
          <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
              <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
              <input
                className="input"
                style={{ paddingLeft: 38 }}
                placeholder="Search vehicle plate, repair number…"
                value={histSearch}
                onChange={e => setHistSearch(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {['All', 'Electrical', 'Engine', 'Brakes', 'Transmission'].map(cat => (
                <button
                  key={cat}
                  onClick={() => setHistCategory(cat)}
                  style={{
                    padding: '8px 16px', borderRadius: 999, border: 'none',
                    fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer',
                    background: histCategory === cat ? 'var(--accent)' : 'var(--surface-alt)',
                    color: histCategory === cat ? 'var(--primary-strong)' : 'var(--muted)',
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
            <button onClick={fetchHistory} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              <RefreshCw size={14} /> Refresh
            </button>
          </div>

          {histLoading ? (
            <p style={{ color: 'var(--muted)', padding: 24 }}>Loading vehicle issue registry…</p>
          ) : filteredHistory.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center', background: 'var(--surface)', borderRadius: 16 }}>
              <Car size={40} style={{ color: 'var(--muted)', marginBottom: 16 }} />
              <p style={{ color: 'var(--muted)', margin: 0 }}>No completed repair records found.</p>
              <p style={{ color: 'var(--muted)', fontSize: '0.875rem', margin: '8px 0 0' }}>Completed tickets will appear here as your fleet history builds up.</p>
            </div>
          ) : (
            <div className="table-scroll">
              <table className="table">
                <thead>
                  <tr>
                    <th>Repair No.</th>
                    <th>Vehicle</th>
                    <th>Issues Logged</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHistory.slice(0, 30).map((t: any) => (
                    <tr key={t.id || t.repairNumber}>
                      <td style={{ fontWeight: 800, color: 'var(--primary)' }}>
                        <a href={`/repairs/${t.id}`}>{t.repairNumber || t.id}</a>
                      </td>
                      <td>
                        <div style={{ fontWeight: 700 }}>{t.vehiclePlate || t.vehicle?.plateNumber || '—'}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>{t.vehicleModel || t.vehicle?.model || ''}</div>
                      </td>
                      <td style={{ fontSize: '0.875rem', maxWidth: 320 }}>
                        {(t.issues || []).slice(0, 2).map((iss: any, i: number) => (
                          <div key={i} style={{ marginBottom: 2 }}>• {typeof iss === 'string' ? iss : iss.description}</div>
                        ))}
                        {(t.issues?.length || 0) > 2 && <div style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>+{t.issues.length - 2} more</div>}
                      </td>
                      <td>
                        <span style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981', padding: '3px 10px', borderRadius: 999, fontSize: '0.78rem', fontWeight: 800 }}>
                          {t.repairStatus || t.status || 'COMPLETED'}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
                        {t.updatedAt || t.completedAt ? new Date(t.updatedAt || t.completedAt).toLocaleDateString() : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 3: AI DIAGNOSTIC ASSISTANT ──────────────────────────────────── */}
      {activeTab === 'ai' && (
        <div style={{ display: 'grid', gridTemplateColumns: '55% 1fr', gap: 28, alignItems: 'start' }}>
          {/* Left: Input + Results */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Form */}
            <div className="premium-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <Bot size={22} style={{ color: '#8b5cf6' }} />
                <h3 style={{ margin: 0, fontWeight: 800, fontSize: '1.15rem' }}>AI Diagnostic Assistant</h3>
              </div>
              <p style={{ margin: '0 0 20px', color: 'var(--muted)', fontSize: '0.9rem' }}>
                Describe a vehicle symptom to receive an AI-powered diagnosis grounded in your fleet's historical repair data.
              </p>

              <div style={{ display: 'grid', gap: 14 }}>
                <div>
                  <label className="label" style={{ display: 'block', marginBottom: 8 }}>Vehicle (Optional)</label>
                  <select className="select" value={selectedVehicle} onChange={e => setSelectedVehicle(e.target.value)}>
                    <option value="">Select a vehicle for vehicle-specific context</option>
                    {vehicles.map(v => {
                      const plate = v.plateNumber || v.plate || v.vehiclePlate;
                      return <option key={plate} value={plate}>{plate} — {v.model}</option>;
                    })}
                  </select>
                </div>
                <div>
                  <label className="label" style={{ display: 'block', marginBottom: 8 }}>Symptom / Issue Description</label>
                  <textarea
                    className="textarea" rows={4} value={symptom} onChange={e => setSymptom(e.target.value)}
                    placeholder="e.g. Headlights are flickering intermittently at highway speed…"
                  />
                </div>

                {/* Quick templates */}
                <div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--muted)', marginBottom: 8 }}>QUICK TEMPLATES</div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {['Engine overheating', 'Headlights flickering', 'Brake squeal on stopping', 'Hard gear shifting', 'Suspension clunking'].map(t => (
                      <button key={t} onClick={() => setSymptom(t)} style={{ padding: '5px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface-alt)', color: 'var(--muted)', fontSize: '0.8rem', cursor: 'pointer' }}>
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleDiagnose}
                  disabled={diagLoading || !symptom.trim()}
                  style={{
                    background: diagLoading || !symptom.trim() ? 'var(--surface-alt)' : 'linear-gradient(135deg, #8b5cf6, #3b82f6)',
                    color: diagLoading || !symptom.trim() ? 'var(--muted)' : 'white',
                    border: 'none', borderRadius: 12, padding: '14px',
                    fontWeight: 900, fontSize: '1rem', cursor: diagLoading || !symptom.trim() ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                    transition: 'all 0.2s'
                  }}
                >
                  <Zap size={18} /> {diagLoading ? 'Analyzing…' : 'Run AI Diagnostic'}
                </button>

                {diagError && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#ef4444', fontSize: '0.875rem' }}>
                    <AlertTriangle size={16} /> {diagError}
                  </div>
                )}
              </div>
            </div>

            {/* Results */}
            {diagResult && (
              <>
                {/* Predictions row */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
                  <div className="premium-card" style={{ padding: 16 }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--muted)', fontWeight: 800, marginBottom: 8 }}>PREDICTED CATEGORY</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 900, fontSize: '1rem', color: getCatColor(diagResult.ai_diagnosis.predicted_category || '') }}>
                      {getCatIcon(diagResult.ai_diagnosis.predicted_category)}
                      {diagResult.ai_diagnosis.predicted_category || 'General'}
                    </div>
                  </div>
                  <div className="premium-card" style={{ padding: 16, borderLeft: `4px solid ${priorityColor(diagResult.ai_diagnosis.predicted_priority)}` }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--muted)', fontWeight: 800, marginBottom: 8 }}>PREDICTED PRIORITY</div>
                    <span style={{ background: `${priorityColor(diagResult.ai_diagnosis.predicted_priority)}18`, color: priorityColor(diagResult.ai_diagnosis.predicted_priority), padding: '4px 12px', borderRadius: 999, fontWeight: 800, fontSize: '0.9rem' }}>
                      {diagResult.ai_diagnosis.predicted_priority || 'Standard'}
                    </span>
                  </div>
                  <div className="premium-card" style={{ padding: 16 }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--muted)', fontWeight: 800, marginBottom: 8 }}>FORECAST SLA</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 900, fontSize: '1rem' }}>
                      <Clock size={16} style={{ color: '#f59e0b' }} />
                      ~{diagResult.ai_diagnosis.estimated_sla_hours || '?'} hrs
                    </div>
                  </div>
                </div>

                {/* Summary + Safety */}
                <div className="premium-card" style={{ background: 'rgba(139,92,246,0.04)', border: '1px solid rgba(139,92,246,0.15)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Bot size={18} style={{ color: '#8b5cf6' }} />
                      <span style={{ fontWeight: 800, fontSize: '0.95rem' }}>AI Summary</span>
                    </div>
                    <ConfidenceBadge level={diagResult.context_lineage?.confidence} />
                  </div>
                  <p style={{ margin: '0 0 16px', fontSize: '0.95rem', lineHeight: 1.6 }}>{diagResult.ai_diagnosis.summary}</p>

                  {diagResult.ai_diagnosis.safety_note && (
                    <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', padding: 12, borderRadius: 8, color: '#d97706', display: 'flex', gap: 8, fontSize: '0.875rem' }}>
                      <AlertTriangle size={16} style={{ flexShrink: 0 }} />
                      {diagResult.ai_diagnosis.safety_note}
                    </div>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop: 20 }}>
                    <div>
                      <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--muted)', marginBottom: 10 }}>PROBABLE CAUSES</div>
                      <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: 8 }}>
                        {diagResult.ai_diagnosis.probable_causes.map((cause, i) => (
                          <li key={i} style={{ display: 'flex', gap: 10, fontSize: '0.875rem', alignItems: 'flex-start' }}>
                            <span style={{ background: '#8b5cf6', color: 'white', width: 20, height: 20, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 800, flexShrink: 0, marginTop: 1 }}>{i + 1}</span>
                            {cause}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--muted)', marginBottom: 10 }}>RECOMMENDED PARTS</div>
                      <div style={{ display: 'grid', gap: 6 }}>
                        {diagResult.ai_diagnosis.recommended_parts.map((p, i) => (
                          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', background: 'var(--surface)', padding: '8px 12px', borderRadius: 8, fontSize: '0.85rem', border: '1px solid var(--border)' }}>
                            <span>{p.part_name}</span>
                            {p.est_cost_php != null && (
                              <span style={{ fontWeight: 800, color: '#10b981' }}>₱{p.est_cost_php.toLocaleString()}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Similar Tickets */}
                {diagResult.similar_past_repairs.length > 0 && (
                  <div className="premium-card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                      <List size={18} style={{ color: '#3b82f6' }} />
                      <h4 style={{ margin: 0, fontWeight: 800 }}>Similar Past Repairs ({diagResult.similar_past_repairs.length} found via pgvector)</h4>
                    </div>
                    <div style={{ display: 'grid', gap: 8 }}>
                      {diagResult.similar_past_repairs.map((t, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--surface-alt)', borderRadius: 8, gap: 12 }}>
                          <div style={{ flex: 1, fontSize: '0.875rem' }}>{t.description}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                            <div style={{ width: 60, height: 6, background: 'var(--surface)', borderRadius: 3, overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${t.similarity_score * 100}%`, background: t.similarity_score >= 0.8 ? '#10b981' : '#3b82f6', borderRadius: 3 }} />
                            </div>
                            <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--muted)', width: 36 }}>{(t.similarity_score * 100).toFixed(0)}%</span>
                            <a href={`/repairs/${t.ticket_id}`} style={{ fontSize: '0.78rem', color: 'var(--primary)', fontWeight: 700 }}>View</a>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Mechanic Feedback */}
                {!feedbackSent ? (
                  <div className="premium-card" style={{ background: 'var(--surface-alt)', border: '1px dashed var(--border)' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: 12 }}>Was this AI diagnosis helpful?</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <button onClick={() => submitFeedback(true, 5)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, border: '1px solid #10b981', background: 'rgba(16,185,129,0.08)', color: '#10b981', fontWeight: 700, cursor: 'pointer', fontSize: '0.875rem' }}>
                        <ThumbsUp size={16} /> Yes, helpful
                      </button>
                      <button onClick={() => submitFeedback(false, 2)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, border: '1px solid #ef4444', background: 'rgba(239,68,68,0.08)', color: '#ef4444', fontWeight: 700, cursor: 'pointer', fontSize: '0.875rem' }}>
                        <ThumbsDown size={16} /> Not helpful
                      </button>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {[1, 2, 3, 4, 5].map(n => (
                          <button key={n} onClick={() => submitFeedback(n >= 3, n)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
                            <Star size={18} fill={feedbackRating >= n ? '#f59e0b' : 'none'} color={feedbackRating >= n ? '#f59e0b' : 'var(--muted)'} />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', background: 'rgba(16,185,129,0.08)', borderRadius: 10, border: '1px solid rgba(16,185,129,0.2)', color: '#10b981', fontSize: '0.875rem', fontWeight: 700 }}>
                    <CheckCircle size={16} /> Feedback recorded — thank you!
                  </div>
                )}
              </>
            )}
          </div>

          {/* Right: RAG Lineage + Context */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {diagResult?.context_lineage && (
              <div className="premium-card" style={{ background: 'rgba(59,130,246,0.03)', border: '1px solid rgba(59,130,246,0.15)' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--muted)', marginBottom: 14, letterSpacing: '0.05em' }}>DATA SOURCES & CONTEXT LINEAGE</div>
                <div style={{ display: 'grid', gap: 10 }}>
                  {[
                    {
                      icon: <Car size={16} />, color: '#3b82f6', label: 'Vehicle History',
                      value: diagResult.context_lineage.vehicle_history_count > 0
                        ? `${diagResult.context_lineage.vehicle_history_count} past repair(s) for ${diagResult.context_lineage.vehicle_plate}`
                        : 'No vehicle selected or no prior records'
                    },
                    {
                      icon: <Search size={16} />, color: '#8b5cf6', label: 'pgvector Similarity Search',
                      value: diagResult.context_lineage.vector_matches_count > 0
                        ? `${diagResult.context_lineage.vector_matches_count} fleet match(es) ≥ 60% similarity (avg ${(diagResult.context_lineage.similarity_avg * 100).toFixed(0)}%)`
                        : 'No sufficiently similar repairs found in fleet DB'
                    },
                    {
                      icon: <Bot size={16} />, color: '#10b981', label: 'AI Engine',
                      value: diagResult.context_lineage.used_live_llm
                        ? `Gemini LLM (${diagResult.context_lineage.model_used})`
                        : `Local Dynamic Fallback — Gemini unavailable`
                    },
                  ].map((item, i) => (
                    <div key={i} style={{ display: 'flex', gap: 12, padding: '10px 12px', background: 'var(--surface-alt)', borderRadius: 8, alignItems: 'flex-start' }}>
                      <span style={{ color: item.color, flexShrink: 0, marginTop: 1 }}>{item.icon}</span>
                      <div>
                        <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--muted)' }}>{item.label}</div>
                        <div style={{ fontSize: '0.85rem', marginTop: 2 }}>{item.value}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Vehicle history used */}
            {diagResult?.vehicle_history && diagResult.vehicle_history.length > 0 && (
              <div className="premium-card">
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--muted)', marginBottom: 12 }}>THIS VEHICLE'S PAST REPAIRS</div>
                <div style={{ display: 'grid', gap: 8 }}>
                  {diagResult.vehicle_history.map((h: any, i: number) => (
                    <div key={i} style={{ padding: '8px 12px', background: 'var(--surface-alt)', borderRadius: 8, fontSize: '0.85rem' }}>
                      <div style={{ fontWeight: 700 }}>{h.repair_number}</div>
                      <div style={{ color: 'var(--muted)', marginTop: 2 }}>{h.description}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="premium-card">
              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--muted)', marginBottom: 12 }}>HOW IT WORKS</div>
              <div style={{ display: 'grid', gap: 10 }}>
                {[
                  { n: 1, text: 'Symptom is vectorized using Gemini Embedding 001 (768-d)' },
                  { n: 2, text: 'pgvector searches fleet history for similar repairs (≥60% similarity)' },
                  { n: 3, text: "Vehicle's own repair history is retrieved for specific context" },
                  { n: 4, text: 'Gemini LLM generates structured diagnosis from all context' },
                ].map(s => (
                  <div key={s.n} style={{ display: 'flex', gap: 10, fontSize: '0.85rem', alignItems: 'flex-start' }}>
                    <span style={{ background: '#8b5cf6', color: 'white', width: 20, height: 20, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 800, flexShrink: 0 }}>{s.n}</span>
                    <span style={{ lineHeight: 1.5 }}>{s.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 4: SYSTEM LOGS & STATS ───────────────────────────────────────── */}
      {activeTab === 'logs' && (
        <div style={{ display: 'grid', gap: 24 }}>
          {/* Stats cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            {[
              { icon: <Zap size={22} />, color: '#8b5cf6', label: 'Total AI Runs', value: stats?.total_interactions ?? '—' },
              { icon: <Star size={22} />, color: '#f59e0b', label: 'Avg Mechanic Rating', value: stats?.satisfaction?.avg_rating ? `${stats.satisfaction.avg_rating}/5` : '—' },
              { icon: <ThumbsUp size={22} />, color: '#10b981', label: 'Satisfaction Rate', value: stats?.satisfaction?.satisfaction_rate ? `${stats.satisfaction.satisfaction_rate}%` : '—' },
              { icon: <Cpu size={22} />, color: '#3b82f6', label: 'Models Used', value: stats?.models_used ? Object.keys(stats.models_used).length : '—' },
            ].map((card, i) => (
              <div key={i} className="premium-card" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 20 }}>
                <div style={{ width: 44, height: 44, borderRadius: 10, background: `${card.color}18`, color: card.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {card.icon}
                </div>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--muted)', fontWeight: 700 }}>{card.label}</div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 900 }}>{card.value}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Logs table */}
          <div className="premium-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontWeight: 800 }}>AI Audit Logs</h3>
              <button onClick={fetchLogs} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', fontSize: '0.875rem', color: 'var(--muted)' }}>
                <RefreshCw size={14} /> Refresh
              </button>
            </div>

            {logsLoading ? (
              <p style={{ color: 'var(--muted)' }}>Loading…</p>
            ) : logs.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', background: 'var(--surface-alt)', borderRadius: 12 }}>
                <Bot size={36} style={{ color: 'var(--muted)', marginBottom: 12 }} />
                <p style={{ color: 'var(--muted)', margin: 0 }}>No AI logs yet. Run a diagnostic to create the first log.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 10 }}>
                {logs.map((log, i) => {
                  const isExp = expandedLog === i;
                  return (
                    <div key={i} style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
                      <div onClick={() => setExpandedLog(isExp ? null : i)} style={{ padding: '14px 18px', background: 'var(--surface)', cursor: 'pointer', display: 'grid', gridTemplateColumns: '160px 1fr auto auto 36px', gap: 12, alignItems: 'center' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>{new Date(log.timestamp).toLocaleString()}</span>
                        <span style={{ fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {log.mechanic_prompt || '—'}
                        </span>
                        <span style={{ fontSize: '0.78rem', background: 'rgba(139,92,246,0.1)', color: '#8b5cf6', padding: '2px 8px', borderRadius: 999, fontWeight: 700, whiteSpace: 'nowrap' }}>
                          {log.context_lineage?.model_used?.split(' ')[0] || 'AI'}
                        </span>
                        {log.feedback && (
                          <span style={{ fontSize: '0.78rem', color: log.feedback.helpful ? '#10b981' : '#ef4444', fontWeight: 700 }}>
                            {log.feedback.helpful ? '👍' : '👎'} {log.feedback.rating}/5
                          </span>
                        )}
                        <div style={{ color: 'var(--muted)', textAlign: 'right' }}>
                          {isExp ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </div>
                      </div>
                      {isExp && (
                        <div style={{ padding: '16px 18px', background: 'var(--surface-alt)', borderTop: '1px solid var(--border)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                          <div>
                            <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--muted)', marginBottom: 8 }}>SYMPTOM</div>
                            <p style={{ margin: '0 0 16px', fontSize: '0.875rem', background: 'var(--surface)', padding: 10, borderRadius: 8, border: '1px solid var(--border)' }}>
                              {log.mechanic_prompt || '—'}
                            </p>
                            {log.ai_analysis && (
                              <>
                                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--muted)', marginBottom: 8 }}>AI SUMMARY</div>
                                <p style={{ margin: 0, fontSize: '0.875rem' }}>{log.ai_analysis.summary}</p>
                              </>
                            )}
                          </div>
                          <div>
                            {log.ai_analysis && (
                              <>
                                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--muted)', marginBottom: 8 }}>PREDICTIONS</div>
                                {[
                                  { label: 'Category', value: log.ai_analysis.predicted_category },
                                  { label: 'Priority', value: log.ai_analysis.predicted_priority },
                                  { label: 'SLA', value: log.ai_analysis.estimated_sla_hours ? `~${log.ai_analysis.estimated_sla_hours}h` : '—' },
                                ].map((row, j) => (
                                  <div key={j} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--surface)', borderRadius: 6, border: '1px solid var(--border)', marginBottom: 6 }}>
                                    <span style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>{row.label}</span>
                                    <span style={{ fontWeight: 800, fontSize: '0.85rem' }}>{row.value || '—'}</span>
                                  </div>
                                ))}
                              </>
                            )}
                            {log.context_lineage && (
                              <>
                                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--muted)', margin: '12px 0 8px' }}>DATA LINEAGE</div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--muted)', display: 'grid', gap: 4 }}>
                                  <div>Confidence: <strong>{log.context_lineage.confidence}</strong></div>
                                  <div>Vector Matches: <strong>{log.context_lineage.vector_matches_count}</strong></div>
                                  <div>Vehicle History: <strong>{log.context_lineage.vehicle_history_count} record(s)</strong></div>
                                </div>
                              </>
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
        </div>
      )}
    </div>
  );
}
