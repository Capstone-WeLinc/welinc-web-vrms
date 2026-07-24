import { useState } from 'react';
import { Sparkles, AlertTriangle, Clock, Wrench, GitCompare, ChevronDown, ChevronUp, ThumbsUp, ThumbsDown, Star, CheckCircle, Search, Car, Bot } from 'lucide-react';
import { Link } from 'react-router-dom';
import axiosInstance from '../../../lib/api/axios';

interface AiDiagnosticPanelProps {
  vehiclePlate: string;
  vehicleModel: string;
  issues: Array<{ description: string }>;
  ticketId: string;
  ticketStatus?: string;
}

interface RecommendedPart { part_name: string; est_cost_php?: number | null; }
interface SimilarRepair { issue_id: string; ticket_id: string; description: string; similarity_score: number; }
interface AiDiagnosis {
  summary: string;
  predicted_category: string;
  predicted_priority: string;
  estimated_sla_hours: number;
  probable_causes: string[];
  recommended_parts: RecommendedPart[];
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
interface DiagnosticResponse {
  symptom: string;
  similar_past_repairs: SimilarRepair[];
  vehicle_history: any[];
  ai_diagnosis: AiDiagnosis;
  context_lineage: ContextLineage;
}

const PRIORITY_MAP: Record<string, { color: string; bg: string; border: string }> = {
  critical: { color: '#dc2626', bg: 'rgba(220,38,38,0.08)', border: 'rgba(220,38,38,0.25)' },
  major:    { color: '#d97706', bg: 'rgba(217,119,6,0.08)',  border: 'rgba(217,119,6,0.25)'  },
  minor:    { color: '#16a34a', bg: 'rgba(22,163,74,0.08)',  border: 'rgba(22,163,74,0.25)'  },
};
function priorityStyle(p?: string) {
  return PRIORITY_MAP[(p || '').toLowerCase()] ?? { color: '#64748b', bg: 'rgba(100,116,139,0.08)', border: 'rgba(100,116,139,0.25)' };
}

function ConfidenceBadge({ level }: { level?: string }) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    High:     { bg: 'rgba(16,185,129,0.12)',  color: '#10b981', label: 'High Confidence' },
    Moderate: { bg: 'rgba(245,158,11,0.12)',  color: '#f59e0b', label: 'Moderate Confidence' },
    Low:      { bg: 'rgba(239,68,68,0.12)',   color: '#ef4444', label: 'Low — Limited Data' },
  };
  const cfg = map[level || 'Low'] || map.Low;
  return (
    <span style={{ background: cfg.bg, color: cfg.color, padding: '3px 10px', borderRadius: 999, fontSize: '0.72rem', fontWeight: 800 }}>
      {cfg.label}
    </span>
  );
}

const isTerminalStatus = (status?: string) =>
  ['COMPLETED', 'CANCELLED'].includes((status || '').toUpperCase());

export function AiDiagnosticPanel({ vehiclePlate, vehicleModel, issues, ticketId, ticketStatus }: AiDiagnosticPanelProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DiagnosticResponse | null>(null);
  const [showSimilar, setShowSimilar] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState(0);

  const isTerminal = isTerminalStatus(ticketStatus);
  const buttonLabel = isTerminal ? 'Run AI Post-Mortem' : 'Run AI Triage';
  const analyzingLabel = isTerminal ? 'Running post-mortem analysis…' : 'Analyzing…';

  const handleRunTriage = async () => {
    setLoading(true);
    setError(null);
    setData(null);
    setFeedbackSent(false);
    setFeedbackRating(0);
    try {
      const symptom = issues.map(i => i.description).join('. ');
      if (!symptom) throw new Error('No issues reported to analyze.');
      const response = await axiosInstance.post('/ai/diagnose', {
        symptom,
        ticket_id: ticketId,
        vehicle_plate: vehiclePlate,
        vehicle_model: vehicleModel,
        issues: issues.map(i => i.description),
      });
      setData(response.data);
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Unable to run AI triage. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const submitFeedback = async (helpful: boolean, rating: number) => {
    if (feedbackSent) return;
    setFeedbackRating(rating);
    setFeedbackSent(true);
    try {
      await axiosInstance.post('/ai/feedback', {
        ticket_id: ticketId,
        helpful,
        rating,
        comment: '',
      });
    } catch { /* non-fatal */ }
  };

  const ps = data ? priorityStyle(data.ai_diagnosis.predicted_priority) : null;

  return (
    <div className="premium-card" style={{ marginTop: 24, width: '100%', boxSizing: 'border-box' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: data ? 24 : 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(139,92,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Sparkles size={18} style={{ color: '#8b5cf6' }} />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text)' }}>AI Diagnostic Assistant</div>
            {data && (
              <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>{data.ai_diagnosis.model_used}</span>
                {vehiclePlate && <span>· {vehiclePlate}{vehicleModel ? ` — ${vehicleModel}` : ''}</span>}
                {data.context_lineage && <ConfidenceBadge level={data.context_lineage.confidence} />}
              </div>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {!data && (
            <button
              onClick={handleRunTriage}
              disabled={loading || issues.length === 0}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 20px', borderRadius: 10, border: 'none',
                background: loading ? 'var(--surface)' : 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
                color: loading ? 'var(--muted)' : 'white',
                fontWeight: 700, fontSize: '0.9rem', cursor: loading || issues.length === 0 ? 'not-allowed' : 'pointer',
                opacity: issues.length === 0 ? 0.5 : 1,
                transition: 'all 0.2s',
                boxShadow: loading ? 'none' : '0 4px 12px rgba(139,92,246,0.3)',
              }}
            >
              <Sparkles size={16} />
              {loading ? analyzingLabel : buttonLabel}
            </button>
          )}
          {data && (
            <button
              onClick={() => { setData(null); setFeedbackSent(false); }}
              style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--muted)', fontSize: '0.8rem', cursor: 'pointer' }}
            >
              Run again
            </button>
          )}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--muted)' }}>
          <style dangerouslySetInnerHTML={{ __html: `@keyframes spin { 100% { transform: rotate(360deg); } }` }} />
          <div style={{ width: 28, height: 28, border: '3px solid var(--border)', borderTopColor: '#8b5cf6', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
          <div style={{ fontSize: '0.9rem' }}>Running diagnostic analysis on {vehiclePlate}…</div>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '12px 16px', color: '#dc2626', fontSize: '0.875rem', marginTop: 8 }}>
          <AlertTriangle size={16} style={{ flexShrink: 0 }} />
          {error}
        </div>
      )}

      {/* Results */}
      {data && data.ai_diagnosis && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, width: '100%' }}>

          {/* Predictions */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            <div style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 12, padding: '16px 20px' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#3b82f6', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Wrench size={13} /> Predicted Category
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text)' }}>{data.ai_diagnosis.predicted_category || '—'}</div>
            </div>
            <div style={{ background: ps!.bg, border: `1px solid ${ps!.border}`, borderRadius: 12, padding: '16px 20px' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: ps!.color, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: 6 }}>
                <AlertTriangle size={13} /> Predicted Priority
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: ps!.color }}>{data.ai_diagnosis.predicted_priority || '—'}</div>
            </div>
            <div style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 12, padding: '16px 20px' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#10b981', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Clock size={13} /> Estimated SLA
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text)' }}>~{data.ai_diagnosis.estimated_sla_hours ?? '—'} hours</div>
            </div>
          </div>

          {/* Safety note */}
          {data.ai_diagnosis.safety_note && (
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 10, padding: '14px 18px' }}>
              <AlertTriangle size={18} color="#d97706" style={{ flexShrink: 0, marginTop: 1 }} />
              <div style={{ fontSize: '0.9rem', color: '#92400e', lineHeight: 1.5 }}>
                <strong>Safety Note:</strong> {data.ai_diagnosis.safety_note}
              </div>
            </div>
          )}

          {/* Summary */}
          <div style={{ background: 'var(--surface)', borderLeft: '3px solid #8b5cf6', borderRadius: '0 10px 10px 0', padding: '14px 18px' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#8b5cf6', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>AI Summary</div>
            <p style={{ margin: 0, fontSize: '0.925rem', color: 'var(--text)', lineHeight: 1.6 }}>{data.ai_diagnosis.summary}</p>
          </div>

          {/* Causes + Parts */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div style={{ background: 'var(--surface)', borderRadius: 10, padding: '16px 20px', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Probable Causes</div>
              <ol style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {data.ai_diagnosis.probable_causes?.map((cause, i) => (
                  <li key={i} style={{ display: 'flex', gap: 10, fontSize: '0.875rem', alignItems: 'flex-start' }}>
                    <span style={{ minWidth: 22, height: 22, borderRadius: '50%', background: 'rgba(139,92,246,0.12)', color: '#8b5cf6', fontWeight: 800, fontSize: '0.72rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>{i + 1}</span>
                    <span style={{ lineHeight: 1.5 }}>{cause}</span>
                  </li>
                ))}
              </ol>
            </div>

            <div style={{ background: 'var(--surface)', borderRadius: 10, padding: '16px 20px', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Recommended Parts</div>
              {data.ai_diagnosis.recommended_parts?.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {data.ai_diagnosis.recommended_parts.map((part, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--surface-alt)', borderRadius: 8, fontSize: '0.875rem', border: '1px solid var(--border)' }}>
                      <span>{part.part_name}</span>
                      {part.est_cost_php != null && (
                        <span style={{ fontWeight: 800, color: '#10b981', flexShrink: 0, marginLeft: 12 }}>
                          ₱{part.est_cost_php.toLocaleString('en-PH')}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.875rem' }}>No specific parts recommended.</p>
              )}
            </div>
          </div>

          {/* RAG Context Lineage */}
          {data.context_lineage && (
            <div style={{ background: 'rgba(59,130,246,0.03)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: 10, padding: '16px 18px' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--muted)', marginBottom: 12, letterSpacing: '0.05em' }}>DATA SOURCES & CONTEXT LINEAGE</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                {[
                  {
                    icon: <Car size={14} />, color: '#3b82f6', label: 'Vehicle History',
                    value: data.context_lineage.vehicle_history_count > 0
                      ? `${data.context_lineage.vehicle_history_count} past repair(s)`
                      : 'No prior records found'
                  },
                  {
                    icon: <Search size={14} />, color: '#8b5cf6', label: 'Fleet DB (pgvector)',
                    value: data.context_lineage.vector_matches_count > 0
                      ? `${data.context_lineage.vector_matches_count} match(es) — avg ${(data.context_lineage.similarity_avg * 100).toFixed(0)}% similarity`
                      : 'No similar cases ≥ 60%'
                  },
                  {
                    icon: <Bot size={14} />, color: '#10b981', label: 'AI Engine',
                    value: data.context_lineage.used_live_llm ? 'Gemini LLM (live)' : 'Local Dynamic Fallback'
                  },
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, padding: '10px 12px', background: 'var(--surface-alt)', borderRadius: 8, alignItems: 'flex-start' }}>
                    <span style={{ color: item.color, flexShrink: 0, marginTop: 2 }}>{item.icon}</span>
                    <div>
                      <div style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--muted)' }}>{item.label}</div>
                      <div style={{ fontSize: '0.8rem', marginTop: 2, lineHeight: 1.4 }}>{item.value}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Similar repairs */}
          {data.similar_past_repairs?.length > 0 && (
            <div style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
              <button
                onClick={() => setShowSimilar(v => !v)}
                style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', background: 'var(--surface)', border: 'none', cursor: 'pointer', color: 'var(--text)' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: '0.875rem' }}>
                  <GitCompare size={16} style={{ color: '#3b82f6' }} />
                  Similar Past Repairs ({data.similar_past_repairs.length} found via pgvector)
                </div>
                {showSimilar ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              {showSimilar && (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
                      {['Issue Description', 'Similarity', 'Ticket'].map(h => (
                        <th key={h} style={{ padding: '10px 16px', textAlign: 'left', color: 'var(--muted)', fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.similar_past_repairs.map((repair, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '10px 16px', lineHeight: 1.4 }}>{repair.description}</td>
                        <td style={{ padding: '10px 16px', width: 160 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ flex: 1, height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                              <div style={{ width: `${repair.similarity_score * 100}%`, height: '100%', background: repair.similarity_score >= 0.8 ? '#10b981' : 'linear-gradient(90deg, #3b82f6, #8b5cf6)', borderRadius: 3 }} />
                            </div>
                            <span style={{ fontSize: '0.78rem', fontWeight: 700, width: 36, textAlign: 'right' }}>{(repair.similarity_score * 100).toFixed(0)}%</span>
                          </div>
                        </td>
                        <td style={{ padding: '10px 16px' }}>
                          <Link to={`/repairs/${repair.ticket_id}`} style={{ color: '#8b5cf6', textDecoration: 'none', fontWeight: 600, fontSize: '0.8rem' }}>
                            View #{repair.ticket_id.substring(0, 8)}
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Mechanic Feedback */}
          {!feedbackSent ? (
            <div style={{ background: 'var(--surface-alt)', border: '1px dashed var(--border)', borderRadius: 10, padding: '14px 18px' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: 10 }}>Was this AI diagnosis helpful?</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <button onClick={() => submitFeedback(true, 5)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: '1px solid #10b981', background: 'rgba(16,185,129,0.08)', color: '#10b981', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}>
                  <ThumbsUp size={15} /> Yes, helpful
                </button>
                <button onClick={() => submitFeedback(false, 2)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: '1px solid #ef4444', background: 'rgba(239,68,68,0.08)', color: '#ef4444', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}>
                  <ThumbsDown size={15} /> Not helpful
                </button>
                <div style={{ display: 'flex', gap: 2 }}>
                  {[1, 2, 3, 4, 5].map(n => (
                    <button key={n} onClick={() => submitFeedback(n >= 3, n)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
                      <Star size={18} fill={feedbackRating >= n ? '#f59e0b' : 'none'} color={feedbackRating >= n ? '#f59e0b' : 'var(--muted)'} />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'rgba(16,185,129,0.08)', borderRadius: 8, border: '1px solid rgba(16,185,129,0.2)', color: '#10b981', fontSize: '0.875rem', fontWeight: 700 }}>
              <CheckCircle size={15} /> Feedback recorded — thank you!
            </div>
          )}

        </div>
      )}
    </div>
  );
}
