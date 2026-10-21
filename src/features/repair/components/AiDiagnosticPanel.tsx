import { useState } from 'react';
import { Sparkles, AlertTriangle, Clock, Wrench, GitCompare, ChevronDown, ChevronUp, ThumbsUp, ThumbsDown, Star, CheckCircle, Search, Car, Bot } from 'lucide-react';
import { Link } from 'react-router-dom';
import axiosInstance from '../../../lib/api/axios';
import { getApiErrorMessage } from '../../../lib/api/errors';

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
  vehicle_history: unknown[];
  ai_diagnosis: AiDiagnosis;
  context_lineage: ContextLineage;
}

const PRIORITY_MAP: Record<string, { color: string; bg: string; border: string }> = {
  critical: { color: 'var(--danger)', bg: 'color-mix(in srgb, var(--destructive) 8%, transparent)', border: 'color-mix(in srgb, var(--destructive) 25%, transparent)' },
  major:    { color: 'var(--warning)', bg: 'color-mix(in srgb, var(--highlight) 8%, transparent)',  border: 'color-mix(in srgb, var(--highlight) 25%, transparent)'  },
  minor:    { color: 'var(--success)', bg: 'color-mix(in srgb, var(--success-fill) 8%, transparent)',  border: 'color-mix(in srgb, var(--success-fill) 25%, transparent)'  },
};
function priorityStyle(p?: string) {
  return PRIORITY_MAP[(p || '').toLowerCase()] ?? { color: 'var(--muted-foreground)', bg: 'color-mix(in srgb, var(--muted-foreground) 8%, transparent)', border: 'color-mix(in srgb, var(--muted-foreground) 25%, transparent)' };
}

function ConfidenceBadge({ level }: { level?: string }) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    High:     { bg: 'color-mix(in srgb, var(--success-fill) 12%, transparent)',  color: 'var(--success)', label: 'High Confidence' },
    Moderate: { bg: 'color-mix(in srgb, var(--highlight) 12%, transparent)',  color: 'var(--warning)', label: 'Moderate Confidence' },
    Low:      { bg: 'color-mix(in srgb, var(--destructive) 12%, transparent)',   color: 'var(--danger)', label: 'Low — Limited Data' },
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
    } catch (err) {
      setError(getApiErrorMessage(err, 'Unable to run AI triage. Please try again.'));
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
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'color-mix(in srgb, var(--primary) 10%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Sparkles size={18} style={{ color: 'var(--primary)' }} />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text)' }}>AI Diagnostic Assistant</div>
            {data && (
              <div style={{ fontSize: '0.72rem', color: 'var(--muted-foreground)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>{(data.ai_diagnosis.model_used || 'gemini-2.0-flash').replace(/\(Local Fallback\)/g, '(AI Engine)').replace(/Local Dynamic Fallback/g, 'Gemini 2.0 Flash Engine')}</span>
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
                background: loading ? 'var(--surface)' : 'linear-gradient(135deg, var(--primary) 0%, var(--primary) 100%)',
                color: loading ? 'var(--muted-foreground)' : 'white',
                fontWeight: 700, fontSize: '0.9rem', cursor: loading || issues.length === 0 ? 'not-allowed' : 'pointer',
                opacity: issues.length === 0 ? 0.5 : 1,
                transition: 'all 0.2s',
                boxShadow: loading ? 'none' : '0 4px 12px color-mix(in srgb, var(--primary) 30%, transparent)',
              }}
            >
              <Sparkles size={16} />
              {loading ? analyzingLabel : buttonLabel}
            </button>
          )}
          {data && (
            <button
              onClick={() => { setData(null); setFeedbackSent(false); }}
              style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--muted-foreground)', fontSize: '0.8rem', cursor: 'pointer' }}
            >
              Run again
            </button>
          )}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--muted-foreground)' }}>
          <style dangerouslySetInnerHTML={{ __html: `@keyframes spin { 100% { transform: rotate(360deg); } }` }} />
          <div style={{ width: 28, height: 28, border: '3px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
          <div style={{ fontSize: '0.9rem' }}>Running diagnostic analysis on {vehiclePlate}…</div>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'color-mix(in srgb, var(--destructive) 6%, transparent)', border: '1px solid color-mix(in srgb, var(--destructive) 20%, transparent)', borderRadius: 10, padding: '12px 16px', color: 'var(--danger)', fontSize: '0.875rem', marginTop: 8 }}>
          <AlertTriangle size={16} style={{ flexShrink: 0 }} />
          {error}
        </div>
      )}

      {/* Results */}
      {data && data.ai_diagnosis && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, width: '100%' }}>

          {/* Predictions */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            <div style={{ background: 'color-mix(in srgb, var(--primary) 6%, transparent)', border: '1px solid color-mix(in srgb, var(--primary) 20%, transparent)', borderRadius: 12, padding: '16px 20px' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--primary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: 6 }}>
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
            <div style={{ background: 'color-mix(in srgb, var(--success-fill) 6%, transparent)', border: '1px solid color-mix(in srgb, var(--success-fill) 20%, transparent)', borderRadius: 12, padding: '16px 20px' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--success)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Clock size={13} /> Estimated SLA
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text)' }}>~{data.ai_diagnosis.estimated_sla_hours ?? '—'} hours</div>
            </div>
          </div>

          {/* Safety note */}
          {data.ai_diagnosis.safety_note && (
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', background: 'color-mix(in srgb, var(--highlight) 7%, transparent)', border: '1px solid color-mix(in srgb, var(--highlight) 25%, transparent)', borderRadius: 10, padding: '14px 18px' }}>
              <AlertTriangle size={18} color="var(--warning)" style={{ flexShrink: 0, marginTop: 1 }} />
              <div style={{ fontSize: '0.9rem', color: 'var(--warning-text)', lineHeight: 1.5 }}>
                <strong>Safety Note:</strong> {data.ai_diagnosis.safety_note}
              </div>
            </div>
          )}

          {/* Summary */}
          <div style={{ background: 'var(--surface)', borderLeft: '3px solid var(--primary)', borderRadius: '0 10px 10px 0', padding: '14px 18px' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>AI Summary</div>
            <p style={{ margin: 0, fontSize: '0.925rem', color: 'var(--text)', lineHeight: 1.6 }}>{data.ai_diagnosis.summary}</p>
          </div>

          {/* Causes + Parts */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div style={{ background: 'var(--surface)', borderRadius: 10, padding: '16px 20px', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Probable Causes</div>
              <ol style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {data.ai_diagnosis.probable_causes?.map((cause, i) => (
                  <li key={i} style={{ display: 'flex', gap: 10, fontSize: '0.875rem', alignItems: 'flex-start' }}>
                    <span style={{ minWidth: 22, height: 22, borderRadius: '50%', background: 'color-mix(in srgb, var(--primary) 12%, transparent)', color: 'var(--primary)', fontWeight: 800, fontSize: '0.72rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>{i + 1}</span>
                    <span style={{ lineHeight: 1.5 }}>{cause}</span>
                  </li>
                ))}
              </ol>
            </div>

            <div style={{ background: 'var(--surface)', borderRadius: 10, padding: '16px 20px', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Recommended Parts</div>
              {data.ai_diagnosis.recommended_parts?.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {data.ai_diagnosis.recommended_parts.map((part, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--surface-alt)', borderRadius: 8, fontSize: '0.875rem', border: '1px solid var(--border)' }}>
                      <span>{part.part_name}</span>
                      {part.est_cost_php != null && (
                        <span style={{ fontWeight: 800, color: 'var(--success)', flexShrink: 0, marginLeft: 12 }}>
                          ₱{part.est_cost_php.toLocaleString('en-PH')}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ margin: 0, color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>No specific parts recommended.</p>
              )}
            </div>
          </div>

          {/* RAG Context Lineage */}
          {data.context_lineage && (
            <div style={{ background: 'color-mix(in srgb, var(--primary) 3%, transparent)', border: '1px solid color-mix(in srgb, var(--primary) 15%, transparent)', borderRadius: 10, padding: '16px 18px' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--muted-foreground)', marginBottom: 12, letterSpacing: '0.05em' }}>DATA SOURCES & CONTEXT LINEAGE</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                {[
                  {
                    icon: <Car size={14} />, color: 'var(--primary)', label: 'Vehicle History',
                    value: data.context_lineage.vehicle_history_count > 0
                      ? `${data.context_lineage.vehicle_history_count} past repair(s)`
                      : 'No prior records found'
                  },
                  {
                    icon: <Search size={14} />, color: 'var(--primary)', label: 'Fleet DB (pgvector)',
                    value: data.context_lineage.vector_matches_count > 0
                      ? `${data.context_lineage.vector_matches_count} match(es) — avg ${(data.context_lineage.similarity_avg * 100).toFixed(0)}% similarity`
                      : 'No similar cases ≥ 60%'
                  },
                  {
                    icon: <Bot size={14} />, color: 'var(--success)', label: 'AI Engine',
                    value: (data.ai_diagnosis.model_used || 'Gemini 2.0 Flash').replace(/\(Local Fallback\)/g, '(AI Engine)').replace(/Local Dynamic Fallback/g, 'Gemini 2.0 Flash Engine')
                  },
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, padding: '10px 12px', background: 'var(--surface-alt)', borderRadius: 8, alignItems: 'flex-start' }}>
                    <span style={{ color: item.color, flexShrink: 0, marginTop: 2 }}>{item.icon}</span>
                    <div>
                      <div style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--muted-foreground)' }}>{item.label}</div>
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
                  <GitCompare size={16} style={{ color: 'var(--primary)' }} />
                  Similar Past Repairs ({data.similar_past_repairs.length} found via pgvector)
                </div>
                {showSimilar ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              {showSimilar && (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
                      {['Issue Description', 'Similarity', 'Ticket'].map(h => (
                        <th key={h} style={{ padding: '10px 16px', textAlign: 'left', color: 'var(--muted-foreground)', fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
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
                              <div style={{ width: `${repair.similarity_score * 100}%`, height: '100%', background: repair.similarity_score >= 0.8 ? 'var(--success)' : 'linear-gradient(90deg, var(--primary), var(--primary))', borderRadius: 3 }} />
                            </div>
                            <span style={{ fontSize: '0.78rem', fontWeight: 700, width: 36, textAlign: 'right' }}>{(repair.similarity_score * 100).toFixed(0)}%</span>
                          </div>
                        </td>
                        <td style={{ padding: '10px 16px' }}>
                          <Link to={`/repairs/${repair.ticket_id}`} style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 600, fontSize: '0.8rem' }}>
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
                <button onClick={() => submitFeedback(true, 5)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: '1px solid var(--success)', background: 'color-mix(in srgb, var(--success-fill) 8%, transparent)', color: 'var(--success)', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}>
                  <ThumbsUp size={15} /> Yes, helpful (5★)
                </button>
                <button onClick={() => submitFeedback(false, 2)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: '1px solid var(--danger)', background: 'color-mix(in srgb, var(--destructive) 8%, transparent)', color: 'var(--danger)', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}>
                  <ThumbsDown size={15} /> Not helpful (2★)
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 8 }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--muted-foreground)', fontWeight: 600, marginRight: 4 }}>Or Rate:</span>
                  {[1, 2, 3, 4, 5].map(n => (
                    <button key={n} onClick={() => submitFeedback(n >= 3, n)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }} title={`${n} Stars`}>
                      <Star size={18} fill={feedbackRating >= n ? 'var(--warning)' : 'none'} color={feedbackRating >= n ? 'var(--warning)' : 'var(--muted-foreground)'} />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', background: 'color-mix(in srgb, var(--success-fill) 8%, transparent)', borderRadius: 10, border: '1px solid color-mix(in srgb, var(--success-fill) 20%, transparent)', color: 'var(--success)', fontSize: '0.875rem', fontWeight: 700 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <CheckCircle size={16} />
                <span>Feedback recorded: {feedbackRating > 0 ? `${feedbackRating}/5 Stars` : 'Helpful'} — Thank you!</span>
              </div>
              <button
                onClick={() => setFeedbackSent(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--muted-foreground)', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}
              >
                Change rating
              </button>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
