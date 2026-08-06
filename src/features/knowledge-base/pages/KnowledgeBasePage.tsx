import { useState, useEffect, useCallback, useRef } from 'react';
import {
  BookOpen, Search, Wrench, Filter, Plus, Pencil, Trash2,
  X, Clock, Tag, ChevronRight, AlertTriangle, CheckCircle,
  Zap, Shield, Layers, Settings, RefreshCw, Save, Eye,
} from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';

const API_BASE = (import.meta.env as any).VITE_API_BASE_URL || 'http://localhost:3000';
const STORAGE_KEY = 'welinc_kb_articles';

const CATEGORIES = ['All', 'Engine', 'Electrical', 'Brakes', 'Transmission', 'Suspension', 'Cooling', 'Steering', 'General'];

const CAT_COLORS: Record<string, string> = {
  Engine: '#f59e0b', Electrical: '#8b5cf6', Brakes: '#ef4444',
  Transmission: '#3b82f6', Suspension: '#10b981', Cooling: '#06b6d4',
  Steering: '#ec4899', General: '#6b7280',
};

interface KbArticle {
  id: string;
  category: string;
  title: string;
  summary: string;
  steps: string[];
  parts: string[];
  estimated_hours: number;
  tags: string[];
  createdAt?: string;
  updatedAt?: string;
}

const EMPTY_ARTICLE: Omit<KbArticle, 'id'> = {
  category: 'General',
  title: '',
  summary: '',
  steps: [''],
  parts: [''],
  estimated_hours: 1,
  tags: [],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getCatColor(cat: string) { return CAT_COLORS[cat] || '#6b7280'; }
function getCatIcon(cat?: string) {
  const c = (cat || '').toLowerCase();
  if (c.includes('electrical')) return <Zap size={15} />;
  if (c.includes('engine')) return <Settings size={15} />;
  if (c.includes('brake')) return <Shield size={15} />;
  if (c.includes('trans')) return <Layers size={15} />;
  return <Wrench size={15} />;
}
function uid() { return `art-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`; }
function now() { return new Date().toISOString(); }

// ─── Textarea auto-grow ───────────────────────────────────────────────────────
function AutoTextarea({ value, onChange, placeholder, rows = 2 }: { value: string; onChange: (v: string) => void; placeholder?: string; rows?: number }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (ref.current) { ref.current.style.height = 'auto'; ref.current.style.height = ref.current.scrollHeight + 'px'; }
  }, [value]);
  return (
    <textarea
      ref={ref}
      rows={rows}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: '0.875rem', resize: 'none', lineHeight: 1.5, boxSizing: 'border-box', fontFamily: 'inherit', outline: 'none', transition: 'border-color 0.15s' }}
      onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
      onBlur={e => (e.target.style.borderColor = 'var(--border)')}
    />
  );
}

// ─── Article Card ─────────────────────────────────────────────────────────────
function ArticleCard({ article, onView, onEdit, onDelete }: {
  article: KbArticle; onView: () => void; onEdit: () => void; onDelete: () => void;
}) {
  const col = getCatColor(article.category);
  return (
    <div
      className="premium-card"
      style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 0, padding: 0, overflow: 'hidden', cursor: 'default', transition: 'transform 0.15s, box-shadow 0.15s' }}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 32px rgba(0,0,0,0.18)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = ''; (e.currentTarget as HTMLDivElement).style.boxShadow = ''; }}
    >
      {/* Top accent bar */}
      <div style={{ height: 4, background: col, flexShrink: 0 }} />

      <div style={{ padding: '20px 20px 16px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Category + time */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: `${col}15`, color: col, padding: '4px 10px', borderRadius: 999, fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.04em' }}>
            {getCatIcon(article.category)}
            {article.category.toUpperCase()}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--muted)', fontSize: '0.75rem' }}>
            <Clock size={12} />
            ~{article.estimated_hours}h
          </span>
        </div>

        {/* Title */}
        <h3 style={{ margin: '0 0 8px', fontSize: '1rem', fontWeight: 800, color: 'var(--text)', lineHeight: 1.35, minHeight: 44, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {article.title}
        </h3>

        {/* Summary */}
        <p style={{ margin: '0 0 14px', fontSize: '0.85rem', color: 'var(--muted)', lineHeight: 1.55, minHeight: 40, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {article.summary}
        </p>

        {/* Tags */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 16, minHeight: 28, alignContent: 'flex-start' }}>
          {article.tags.slice(0, 4).map(tag => (
            <span key={tag} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'var(--surface-alt)', border: '1px solid var(--border)', padding: '2px 8px', borderRadius: 999, fontSize: '0.7rem', color: 'var(--muted)' }}>
              <Tag size={10} />#{tag}
            </span>
          ))}
          {article.tags.length > 4 && (
            <span style={{ fontSize: '0.7rem', color: 'var(--muted)', display: 'flex', alignItems: 'center' }}>+{article.tags.length - 4}</span>
          )}
        </div>

        {/* Steps preview */}
        <div style={{ background: 'var(--surface-alt)', borderRadius: 8, padding: '10px 12px', marginTop: 'auto', fontSize: '0.8rem', color: 'var(--muted)' }}>
          <span style={{ fontWeight: 700, color: 'var(--text)', marginRight: 6 }}>{article.steps.length} steps</span>
          · {article.parts.length} parts listed
        </div>
      </div>

      {/* Actions footer */}
      <div style={{ display: 'flex', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
        <button
          onClick={onView}
          style={{ flex: 2, padding: '12px', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: '0.82rem', fontWeight: 700, color: 'var(--accent)', transition: 'background 0.12s' }}
          onMouseEnter={e => (e.currentTarget.style.background = `${col}10`)}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          <Eye size={14} /> Read Article <ChevronRight size={14} />
        </button>
        <div style={{ width: 1, background: 'var(--border)' }} />
        <button
          onClick={onEdit}
          style={{ flex: 1, padding: '12px', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, fontSize: '0.8rem', color: 'var(--muted)', transition: 'background 0.12s' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-alt)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          <Pencil size={13} /> Edit
        </button>
        <div style={{ width: 1, background: 'var(--border)' }} />
        <button
          onClick={onDelete}
          style={{ flex: 1, padding: '12px', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, fontSize: '0.8rem', color: '#ef4444', transition: 'background 0.12s' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.07)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          <Trash2 size={13} /> Delete
        </button>
      </div>
    </div>
  );
}

// ─── View Modal (full article reader) ────────────────────────────────────────
function ViewModal({ article, onClose, onEdit }: { article: KbArticle; onClose: () => void; onEdit: () => void }) {
  const col = getCatColor(article.category);
  return (
    <ModalOverlay onClose={onClose}>
      <div style={{ width: '100%', maxWidth: 740, maxHeight: '90vh', display: 'flex', flexDirection: 'column', borderRadius: 16, overflow: 'hidden', background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 20px 50px rgba(0,0,0,0.3)', color: 'var(--text)' }}>
        {/* Header */}
        <div style={{ background: `linear-gradient(135deg, ${col}22 0%, var(--surface) 100%)`, borderBottom: '1px solid var(--border)', padding: '28px 32px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
            <div style={{ flex: 1 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: `${col}18`, color: col, padding: '4px 12px', borderRadius: 999, fontSize: '0.72rem', fontWeight: 800, marginBottom: 12 }}>
                {getCatIcon(article.category)}{article.category.toUpperCase()}
              </span>
              <h2 style={{ margin: '0 0 10px', fontSize: '1.4rem', fontWeight: 900, lineHeight: 1.2, color: 'var(--text)' }}>{article.title}</h2>
              <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.9rem', lineHeight: 1.55 }}>{article.summary}</p>
            </div>
            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
              <button onClick={onEdit} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface-alt)', color: 'var(--text)', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}>
                <Pencil size={13} /> Edit
              </button>
              <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface-alt)', color: 'var(--muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={16} />
              </button>
            </div>
          </div>
          {/* Meta row */}
          <div style={{ display: 'flex', gap: 20, marginTop: 16, flexWrap: 'wrap' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.82rem', color: 'var(--muted)' }}>
              <Clock size={13} /> Est. {article.estimated_hours} hour{article.estimated_hours !== 1 ? 's' : ''}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.82rem', color: 'var(--muted)' }}>
              <Wrench size={13} /> {article.parts.length} parts
            </span>
            {article.updatedAt && (
              <span style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>
                Last updated {new Date(article.updatedAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            )}
          </div>
        </div>

        {/* Body */}
        <div style={{ overflowY: 'auto', padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: 28, flex: 1, background: 'var(--surface)' }}>
          {/* Steps */}
          <div>
            <div style={{ fontSize: '0.72rem', fontWeight: 800, color: col, letterSpacing: '0.06em', marginBottom: 14 }}>DIAGNOSTIC STEPS</div>
            <ol style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {article.steps.filter(s => s.trim()).map((step, i) => (
                <li key={i} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                  <span style={{ width: 28, height: 28, borderRadius: 8, background: `${col}18`, color: col, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.78rem', fontWeight: 800, flexShrink: 0 }}>{i + 1}</span>
                  <span style={{ fontSize: '0.9rem', lineHeight: 1.6, paddingTop: 4, color: 'var(--text)' }}>{step}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* Parts */}
          {article.parts.filter(p => p.trim()).length > 0 && (
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--muted)', letterSpacing: '0.06em', marginBottom: 14 }}>COMMONLY NEEDED PARTS</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
                {article.parts.filter(p => p.trim()).map((part, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'var(--surface-alt)', borderRadius: 8, border: '1px solid var(--border)', fontSize: '0.875rem', color: 'var(--text)' }}>
                    <Wrench size={14} style={{ color: col, flexShrink: 0 }} />
                    {part}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tags */}
          {article.tags.length > 0 && (
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--muted)', letterSpacing: '0.06em', marginBottom: 10 }}>TAGS</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {article.tags.map(tag => (
                  <span key={tag} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'var(--surface-alt)', border: '1px solid var(--border)', padding: '4px 10px', borderRadius: 999, fontSize: '0.78rem', color: 'var(--muted)' }}>
                    <Tag size={11} />#{tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </ModalOverlay>
  );
}

// ─── Editor Modal (add / edit) ────────────────────────────────────────────────
function EditorModal({ article, onSave, onClose }: {
  article: Partial<KbArticle> | null; onSave: (data: KbArticle) => void; onClose: () => void;
}) {
  const isNew = !article?.id;
  const [form, setForm] = useState<Omit<KbArticle, 'id'>>({
    ...EMPTY_ARTICLE,
    ...(article ? { category: article.category || 'General', title: article.title || '', summary: article.summary || '', steps: article.steps?.length ? article.steps : [''], parts: article.parts?.length ? article.parts : [''], estimated_hours: article.estimated_hours || 1, tags: article.tags || [] } : {}),
  });
  const [tagInput, setTagInput] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.title.trim()) e.title = 'Title is required';
    if (!form.summary.trim()) e.summary = 'Summary is required';
    if (!form.steps.some(s => s.trim())) e.steps = 'At least one step is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    onSave({
      id: article?.id || uid(),
      ...form,
      steps: form.steps.filter(s => s.trim()),
      parts: form.parts.filter(p => p.trim()),
      createdAt: article?.createdAt || now(),
      updatedAt: now(),
    });
  };

  const updateList = (key: 'steps' | 'parts', idx: number, val: string) => {
    const arr = [...form[key]];
    arr[idx] = val;
    setForm(f => ({ ...f, [key]: arr }));
  };

  const addListItem = (key: 'steps' | 'parts') => setForm(f => ({ ...f, [key]: [...f[key], ''] }));
  const removeListItem = (key: 'steps' | 'parts', idx: number) => {
    if (form[key].length <= 1) return;
    setForm(f => ({ ...f, [key]: f[key].filter((_, i) => i !== idx) }));
  };

  const addTag = () => {
    const t = tagInput.trim().toLowerCase().replace(/\s+/g, '-');
    if (t && !form.tags.includes(t)) setForm(f => ({ ...f, tags: [...f.tags, t] }));
    setTagInput('');
  };
  const removeTag = (tag: string) => setForm(f => ({ ...f, tags: f.tags.filter(t => t !== tag) }));

  const inputStyle: React.CSSProperties = { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface-alt)', color: 'var(--text)', fontSize: '0.875rem', boxSizing: 'border-box', fontFamily: 'inherit', outline: 'none' };
  const labelStyle: React.CSSProperties = { display: 'block', fontSize: '0.75rem', fontWeight: 800, color: 'var(--muted)', marginBottom: 6, letterSpacing: '0.04em', textTransform: 'uppercase' };

  return (
    <ModalOverlay onClose={onClose}>
      <div style={{ width: '100%', maxWidth: 680, maxHeight: '92vh', display: 'flex', flexDirection: 'column', borderRadius: 16, overflow: 'hidden', background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 20px 50px rgba(0,0,0,0.3)', color: 'var(--text)' }}>
        {/* Header */}
        <div style={{ padding: '22px 28px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, background: 'var(--surface)' }}>
          <div>
            <div style={{ fontWeight: 900, fontSize: '1.1rem', color: 'var(--text)' }}>{isNew ? 'New Article' : 'Edit Article'}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: 2 }}>Repair guide or standard operating procedure</div>
          </div>
          <button onClick={onClose} style={{ width: 34, height: 34, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface-alt)', color: 'var(--muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div style={{ overflowY: 'auto', padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 20, flex: 1, background: 'var(--surface)' }}>
          {/* Title + Category row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 14 }}>
            <div>
              <label style={labelStyle}>Title *</label>
              <input
                style={{ ...inputStyle, ...(errors.title ? { borderColor: '#ef4444' } : {}) }}
                value={form.title}
                onChange={e => { setForm(f => ({ ...f, title: e.target.value })); if (errors.title) setErrors(er => ({ ...er, title: '' })); }}
                placeholder="e.g. Brake Pad Inspection SOP"
                onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
                onBlur={e => (e.target.style.borderColor = errors.title ? '#ef4444' : 'var(--border)')}
              />
              {errors.title && <div style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: 4 }}>{errors.title}</div>}
            </div>
            <div>
              <label style={labelStyle}>Category</label>
              <select
                value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                style={{ ...inputStyle, paddingRight: 28, cursor: 'pointer', width: 160 }}
              >
                {CATEGORIES.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* Summary */}
          <div>
            <label style={labelStyle}>Summary *</label>
            <AutoTextarea
              value={form.summary}
              onChange={v => { setForm(f => ({ ...f, summary: v })); if (errors.summary) setErrors(er => ({ ...er, summary: '' })); }}
              placeholder="Brief description of what this article covers…"
              rows={3}
            />
            {errors.summary && <div style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: 4 }}>{errors.summary}</div>}
          </div>

          {/* Est. hours */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <label style={{ ...labelStyle, marginBottom: 0, whiteSpace: 'nowrap' }}>Est. Hours</label>
            <input
              type="number" min={0.5} step={0.5}
              value={form.estimated_hours}
              onChange={e => setForm(f => ({ ...f, estimated_hours: parseFloat(e.target.value) || 1 }))}
              style={{ ...inputStyle, width: 100 }}
              onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
              onBlur={e => (e.target.style.borderColor = 'var(--border)')}
            />
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '0 -28px', padding: '0 28px' }} />

          {/* Steps */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <label style={{ ...labelStyle, marginBottom: 0 }}>Diagnostic Steps *</label>
              <button onClick={() => addListItem('steps')} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface-alt)', color: 'var(--accent)', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>
                <Plus size={12} /> Add Step
              </button>
            </div>
            {errors.steps && <div style={{ color: '#ef4444', fontSize: '0.75rem', marginBottom: 8 }}>{errors.steps}</div>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {form.steps.map((step, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <span style={{ width: 26, height: 26, borderRadius: 6, background: 'var(--surface-alt)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: 800, color: 'var(--muted)', flexShrink: 0, marginTop: 8 }}>{i + 1}</span>
                  <div style={{ flex: 1 }}>
                    <AutoTextarea value={step} onChange={v => updateList('steps', i, v)} placeholder={`Step ${i + 1}…`} rows={1} />
                  </div>
                  <button onClick={() => removeListItem('steps', i)} style={{ marginTop: 8, width: 28, height: 28, borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--muted)', cursor: form.steps.length <= 1 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, opacity: form.steps.length <= 1 ? 0.4 : 1 }}>
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Parts */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <label style={{ ...labelStyle, marginBottom: 0 }}>Commonly Needed Parts</label>
              <button onClick={() => addListItem('parts')} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface-alt)', color: 'var(--accent)', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>
                <Plus size={12} /> Add Part
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {form.parts.map((part, i) => (
                <div key={i} style={{ display: 'flex', gap: 8 }}>
                  <input
                    style={inputStyle}
                    value={part}
                    onChange={e => updateList('parts', i, e.target.value)}
                    placeholder={`Part name…`}
                    onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
                    onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                  />
                  <button onClick={() => removeListItem('parts', i)} style={{ width: 36, height: 36, borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--muted)', cursor: form.parts.length <= 1 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, opacity: form.parts.length <= 1 ? 0.4 : 1 }}>
                    <X size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div>
            <label style={labelStyle}>Tags</label>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <input
                style={{ ...inputStyle, flex: 1 }}
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                placeholder="Type a tag and press Enter…"
                onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
                onBlur={e => (e.target.style.borderColor = 'var(--border)')}
              />
              <button onClick={addTag} style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface-alt)', color: 'var(--accent)', fontWeight: 700, cursor: 'pointer', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                Add Tag
              </button>
            </div>
            {form.tags.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {form.tags.map(tag => (
                  <span key={tag} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'var(--surface-alt)', border: '1px solid var(--border)', padding: '4px 10px', borderRadius: 999, fontSize: '0.75rem', color: 'var(--text)' }}>
                    #{tag}
                    <button onClick={() => removeTag(tag)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--muted)', display: 'flex' }}>
                      <X size={11} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '18px 28px', borderTop: '1px solid var(--border)', display: 'flex', gap: 10, justifyContent: 'flex-end', flexShrink: 0, background: 'var(--surface)' }}>
          <button onClick={onClose} style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--muted)', fontWeight: 600, cursor: 'pointer', fontSize: '0.875rem' }}>
            Cancel
          </button>
          <button
            onClick={handleSave}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 24px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '0.875rem' }}
          >
            <Save size={15} /> {isNew ? 'Create Article' : 'Save Changes'}
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
}

// ─── Delete Confirm Modal ─────────────────────────────────────────────────────
function DeleteModal({ article, onConfirm, onClose }: { article: KbArticle; onConfirm: () => void; onClose: () => void }) {
  return (
    <ModalOverlay onClose={onClose}>
      <div style={{ width: '100%', maxWidth: 420, borderRadius: 16, background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 20px 50px rgba(0,0,0,0.3)', color: 'var(--text)', overflow: 'hidden' }}>
        <div style={{ padding: '28px 28px 20px', textAlign: 'center' }}>
          <div style={{ width: 56, height: 56, borderRadius: 14, background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <Trash2 size={24} color="#ef4444" />
          </div>
          <div style={{ fontWeight: 900, fontSize: '1.1rem', marginBottom: 8, color: 'var(--text)' }}>Delete Article?</div>
          <div style={{ color: 'var(--muted)', fontSize: '0.875rem', lineHeight: 1.5 }}>
            "<strong style={{ color: 'var(--text)' }}>{article.title}</strong>" will be permanently removed from the knowledge base.
          </div>
        </div>
        <div style={{ padding: '0 28px 24px', display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--muted)', fontWeight: 600, cursor: 'pointer' }}>
            Cancel
          </button>
          <button onClick={onConfirm} style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: '#ef4444', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
            Delete
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
}

// ─── Modal Overlay wrapper ────────────────────────────────────────────────────
function ModalOverlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, animation: 'fadeIn 0.12s ease' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      {children}
    </div>
  );
}

// ─── Toast notification ───────────────────────────────────────────────────────
function Toast({ message, type, onDismiss }: { message: string; type: 'success' | 'error'; onDismiss: () => void }) {
  useEffect(() => { const t = setTimeout(onDismiss, 3000); return () => clearTimeout(t); }, [onDismiss]);
  return (
    <div style={{ position: 'fixed', bottom: 28, right: 28, zIndex: 2000, display: 'flex', alignItems: 'center', gap: 10, padding: '12px 20px', borderRadius: 10, background: type === 'success' ? 'rgba(16,185,129,0.95)' : 'rgba(239,68,68,0.95)', color: '#fff', fontWeight: 700, fontSize: '0.875rem', boxShadow: '0 8px 32px rgba(0,0,0,0.3)', backdropFilter: 'blur(8px)', animation: 'slideUp 0.2s ease' }}>
      {type === 'success' ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
      {message}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export function KnowledgeBasePage() {
  const [articles, setArticles] = useState<KbArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortBy, setSortBy] = useState<'alpha' | 'category' | 'hours'>('alpha');

  // Modals
  const [viewArticle, setViewArticle] = useState<KbArticle | null>(null);
  const [editArticle, setEditArticle] = useState<Partial<KbArticle> | null | 'new'>(null);
  const [deleteArticle, setDeleteArticle] = useState<KbArticle | null>(null);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
  };

  // Load articles from localStorage (seeded from API)
  const loadArticles = useCallback(async () => {
    setLoading(true);
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setArticles(JSON.parse(stored));
      } else {
        const res = await fetch(`${API_BASE}/ai/knowledge/articles`);
        if (res.ok) {
          const data = await res.json();
          const seeded: KbArticle[] = (data.articles || []).map((a: KbArticle) => ({
            ...a,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }));
          localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
          setArticles(seeded);
        }
      }
    } catch {
      // Try localStorage as fallback
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setArticles(JSON.parse(stored));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadArticles(); }, [loadArticles]);

  const persist = (updated: KbArticle[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setArticles(updated);
  };

  const handleSave = (data: KbArticle) => {
    const existing = articles.find(a => a.id === data.id);
    const updated = existing
      ? articles.map(a => a.id === data.id ? data : a)
      : [...articles, data];
    persist(updated);
    setEditArticle(null);
    showToast(existing ? 'Article updated successfully' : 'Article created successfully');
  };

  const handleDelete = (article: KbArticle) => {
    persist(articles.filter(a => a.id !== article.id));
    setDeleteArticle(null);
    if (viewArticle?.id === article.id) setViewArticle(null);
    showToast('Article deleted', 'error');
  };

  const handleRefresh = async () => {
    localStorage.removeItem(STORAGE_KEY);
    await loadArticles();
    showToast('Articles refreshed from server');
  };

  // Filtering + sorting
  const filtered = articles
    .filter(a => category === 'All' || a.category === category)
    .filter(a => {
      if (!search.trim()) return true;
      const s = search.toLowerCase();
      return a.title.toLowerCase().includes(s) || a.summary.toLowerCase().includes(s) || a.tags.some(t => t.includes(s)) || a.category.toLowerCase().includes(s);
    })
    .sort((a, b) => {
      if (sortBy === 'category') return a.category.localeCompare(b.category);
      if (sortBy === 'hours') return a.estimated_hours - b.estimated_hours;
      return a.title.localeCompare(b.title);
    });

  // Stats
  const catCounts = CATEGORIES.filter(c => c !== 'All').reduce((acc, c) => {
    acc[c] = articles.filter(a => a.category === c).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="dashboard-page animate-fade-in">
      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <PageHeader
          title="Knowledge Base"
          subtitle="Mechanic Resource Center — Standard Operating Procedures (SOPs), diagnostic guides, and repair steps."
          icon={BookOpen}
        />
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <button
            onClick={handleRefresh}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--muted)', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}
          >
            <RefreshCw size={13} /> Sync
          </button>
          <button
            onClick={() => setEditArticle('new')}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: '0.875rem', fontWeight: 700, cursor: 'pointer' }}
          >
            <Plus size={16} /> New Article
          </button>
        </div>
      </div>

      {/* ── Search + Filter Bar ── */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, alignItems: 'center' }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', pointerEvents: 'none' }} />
          <input
            className="input"
            style={{ paddingLeft: 42, paddingRight: search ? 36 : 14, height: 42 }}
            placeholder="Search articles, symptoms, tags…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', display: 'flex', padding: 2 }}>
              <X size={14} />
            </button>
          )}
        </div>

        {/* Category select (compact) */}
        <div style={{ position: 'relative' }}>
          <Filter size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', pointerEvents: 'none' }} />
          <select
            value={category}
            onChange={e => setCategory(e.target.value)}
            style={{ height: 42, padding: '0 36px 0 34px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: category === 'All' ? 'var(--muted)' : 'var(--text)', fontSize: '0.875rem', fontWeight: category === 'All' ? 400 : 700, cursor: 'pointer', appearance: 'none', WebkitAppearance: 'none', outline: 'none', fontFamily: 'inherit' }}
          >
            {CATEGORIES.map(c => <option key={c} value={c}>{c === 'All' ? 'All Categories' : c}</option>)}
          </select>
          <ChevronRight size={13} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%) rotate(90deg)', color: 'var(--muted)', pointerEvents: 'none' }} />
        </div>

        {/* Sort */}
        <div style={{ position: 'relative' }}>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as any)}
            style={{ height: 42, padding: '0 32px 0 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--muted)', fontSize: '0.82rem', cursor: 'pointer', appearance: 'none', WebkitAppearance: 'none', outline: 'none', fontFamily: 'inherit' }}
          >
            <option value="alpha">A → Z</option>
            <option value="category">By Category</option>
            <option value="hours">By Est. Hours</option>
          </select>
          <ChevronRight size={13} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%) rotate(90deg)', color: 'var(--muted)', pointerEvents: 'none' }} />
        </div>

        {/* Results count */}
        <div style={{ fontSize: '0.82rem', color: 'var(--muted)', whiteSpace: 'nowrap', paddingLeft: 4 }}>
          {filtered.length} of {articles.length}
        </div>
      </div>

      {/* ── Category pills (quick filter) ── */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 24 }}>
        {CATEGORIES.map(cat => {
          const count = cat === 'All' ? articles.length : catCounts[cat] || 0;
          const col = getCatColor(cat);
          const active = category === cat;
          return (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '5px 12px 5px 10px', borderRadius: 999,
                border: active ? 'none' : '1px solid var(--border)',
                background: active ? col : 'var(--surface)',
                color: active ? '#fff' : 'var(--muted)',
                fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {cat !== 'All' && getCatIcon(cat)}
              {cat}
              <span style={{ background: active ? 'rgba(255,255,255,0.25)' : 'var(--surface-alt)', color: active ? '#fff' : 'var(--muted)', borderRadius: 999, padding: '0px 6px', fontSize: '0.68rem', fontWeight: 800 }}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Article Grid ── */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="premium-card" style={{ height: 220, background: 'var(--surface)', animation: 'pulse 1.5s ease-in-out infinite' }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 40px', background: 'var(--surface)', borderRadius: 16, textAlign: 'center', gap: 12 }}>
          <BookOpen size={44} style={{ color: 'var(--muted)', opacity: 0.5 }} />
          <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text)' }}>
            {search || category !== 'All' ? 'No articles match your search' : 'No articles yet'}
          </div>
          <div style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>
            {search || category !== 'All' ? 'Try adjusting your filters or search query.' : 'Create your first article to get started.'}
          </div>
          {!search && category === 'All' && (
            <button onClick={() => setEditArticle('new')} style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
              <Plus size={15} /> Create Article
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {filtered.map(art => (
            <ArticleCard
              key={art.id}
              article={art}
              onView={() => setViewArticle(art)}
              onEdit={() => setEditArticle(art)}
              onDelete={() => setDeleteArticle(art)}
            />
          ))}
        </div>
      )}

      {/* ── Modals ── */}
      {viewArticle && (
        <ViewModal
          article={viewArticle}
          onClose={() => setViewArticle(null)}
          onEdit={() => { setEditArticle(viewArticle); setViewArticle(null); }}
        />
      )}

      {editArticle !== null && (
        <EditorModal
          article={editArticle === 'new' ? null : editArticle}
          onSave={handleSave}
          onClose={() => setEditArticle(null)}
        />
      )}

      {deleteArticle && (
        <DeleteModal
          article={deleteArticle}
          onConfirm={() => handleDelete(deleteArticle)}
          onClose={() => setDeleteArticle(null)}
        />
      )}

      {/* ── Toast ── */}
      {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}
    </div>
  );
}
