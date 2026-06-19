import { useEffect, useMemo, useState } from 'react';
import { updateRepairCosts, UpdateCostsPayload } from '../../../lib/api/repairApi';
import { RepairTicket } from '../../../types';
import { Button } from '../../../components/ui/Button';
import { useToast } from '../../../context/ToastContext';
import ConfirmModal from '../../../components/ConfirmModal';

interface CostEncodingPanelProps {
  repairId: string;
  repair: RepairTicket;
  onSaveSuccess: (updated: RepairTicket) => void;
  formatCurrency: (val?: number | null) => string;
}

export function CostEncodingPanel({
  repairId,
  repair,
  onSaveSuccess,
  formatCurrency,
}: CostEncodingPanelProps) {
  const hasExistingCost = repair.partsCost != null || repair.laborCost != null || (repair.repairParts && repair.repairParts.length > 0);
  const [isEditMode, setIsEditMode] = useState(!hasExistingCost);
  const [costMode, setCostMode] = useState<'lump' | 'itemized'>('lump');
  const [lumpPartsCost, setLumpPartsCost] = useState('');
  const [laborCost, setLaborCost] = useState('');
  const [itemParts, setItemParts] = useState<{ description: string; unitCost: string; quantity: string }[]>([
    { description: '', unitCost: '', quantity: '1' },
  ]);
  const [savingCosts, setSavingCosts] = useState(false);
  const [costError, setCostError] = useState<string | null>(null);
  const [costSuccess, setCostSuccess] = useState(false);
  const { showToast } = useToast();
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  useEffect(() => {
    setLaborCost(repair.laborCost != null ? String(repair.laborCost) : '');
    if (repair.isLumpSum !== undefined) {
      setCostMode(repair.isLumpSum ? 'lump' : 'itemized');
    }
    if (repair.partsCost != null && repair.isLumpSum) {
      setLumpPartsCost(String(repair.partsCost));
    }
    if (!repair.isLumpSum && repair.repairParts && repair.repairParts.length > 0) {
      setItemParts(
        repair.repairParts.map((p) => ({
          description: p.description,
          unitCost: String(p.unitCost),
          quantity: String(p.quantity),
        })),
      );
    }
  }, [repair]);

  const computedPartsCost = useMemo(() => {
    if (costMode === 'lump') return parseFloat(lumpPartsCost) || 0;
    return itemParts.reduce((sum, p) => {
      const sub = (parseFloat(p.unitCost) || 0) * (parseInt(p.quantity) || 0);
      return sum + sub;
    }, 0);
  }, [costMode, lumpPartsCost, itemParts]);

  const computedTotalCost = computedPartsCost + (parseFloat(laborCost) || 0);

  const executeSaveCosts = async () => {
    setSavingCosts(true);
    setCostError(null);
    setCostSuccess(false);
    try {
      const payload: UpdateCostsPayload = {
        isLumpSum: costMode === 'lump',
        laborCost: parseFloat(laborCost) || 0,
      };
      if (costMode === 'lump') {
        payload.partsCost = parseFloat(lumpPartsCost) || 0;
      } else {
        payload.parts = itemParts.map((p) => ({
          description: p.description,
          unitCost: parseFloat(p.unitCost) || 0,
          quantity: parseInt(p.quantity) || 1,
        }));
      }
      const updated = await updateRepairCosts(repairId, payload);
      onSaveSuccess(updated);
      showToast('Repair costs updated successfully.', 'success');
      setCostSuccess(true);
      setIsEditMode(false);
      setTimeout(() => setCostSuccess(false), 3000);
    } catch (err: any) {
      const displayMsg = err?.response?.data?.message ?? 'Unable to save costs.';
      setCostError(displayMsg);
      showToast(displayMsg, 'error');
    } finally {
      setSavingCosts(false);
    }
  };

  const handleSaveCosts = () => {
    setCostError(null);
    
    // Simple verification
    if (costMode === 'lump' && !lumpPartsCost.trim()) {
      setCostError('Parts cost is required.');
      return;
    }
    if (costMode === 'itemized') {
      const invalidPart = itemParts.find(p => !p.description.trim() || !p.unitCost.trim());
      if (invalidPart) {
        setCostError('All parts require a description and a unit cost.');
        return;
      }
    }
    if (!laborCost.trim()) {
      setCostError('Labor cost is required.');
      return;
    }

    setConfirmState({
      isOpen: true,
      title: 'Save Repair Costs?',
      message: `Are you sure you want to encode a total cost of ${formatCurrency(computedTotalCost)} for this repair?`,
      onConfirm: executeSaveCosts,
    });
  };

  const addItemPart = () =>
    setItemParts((prev) => [...prev, { description: '', unitCost: '', quantity: '1' }]);

  const removeItemPart = (idx: number) =>
    setItemParts((prev) => prev.filter((_, i) => i !== idx));

  const updateItemPart = (idx: number, field: string, val: string) =>
    setItemParts((prev) => prev.map((p, i) => (i === idx ? { ...p, [field]: val } : p)));

  return (
    <div className="issue-card" style={{ border: '1px solid #3b82f6', background: '#eff6ff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <p className="label" style={{ margin: 0, color: '#1d4ed8' }}>Cost Encoding</p>
        {hasExistingCost && !isEditMode && (
          <button
            type="button"
            onClick={() => setIsEditMode(true)}
            style={{ padding: '4px 12px', border: '1px solid #3b82f6', background: '#fff', color: '#3b82f6', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
          >
            Edit Costs
          </button>
        )}
      </div>

      {!isEditMode ? (
        <div style={{ display: 'grid', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#475569' }}>Parts Cost:</span>
            <strong>{formatCurrency(repair.partsCost)}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#475569' }}>Labor Cost:</span>
            <strong>{formatCurrency(repair.laborCost)}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 12, borderTop: '1px solid #bfdbfe' }}>
            <span style={{ color: '#1d4ed8', fontWeight: 600 }}>Total Cost:</span>
            <span style={{ color: '#1d4ed8', fontWeight: 700, fontSize: 16 }}>{formatCurrency(repair.totalCost)}</span>
          </div>
        </div>
      ) : (
        <>
          {/* Mode toggle */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <button
          type="button"
          id="cost-mode-lump"
          onClick={() => setCostMode('lump')}
          style={{
            padding: '6px 16px', borderRadius: 6, border: 'none', cursor: 'pointer',
            background: costMode === 'lump' ? '#3b82f6' : '#e2e8f0',
            color: costMode === 'lump' ? '#fff' : '#374151',
            fontWeight: 600, fontSize: 13,
          }}
        >
          Lump Sum
        </button>
        <button
          type="button"
          id="cost-mode-itemized"
          onClick={() => setCostMode('itemized')}
          style={{
            padding: '6px 16px', borderRadius: 6, border: 'none', cursor: 'pointer',
            background: costMode === 'itemized' ? '#3b82f6' : '#e2e8f0',
            color: costMode === 'itemized' ? '#fff' : '#374151',
            fontWeight: 600, fontSize: 13,
          }}
        >
          Itemized Parts
        </button>
      </div>

      {/* Lump sum mode */}
      {costMode === 'lump' && (
        <div className="input-group">
          <label className="label" htmlFor="lump-parts-cost">Parts cost (₱)</label>
          <input
            id="lump-parts-cost"
            type="number"
            min="0"
            step="0.01"
            className="input"
            value={lumpPartsCost}
            onChange={(e) => setLumpPartsCost(e.target.value)}
            placeholder="0.00"
          />
        </div>
      )}

      {/* Itemized mode */}
      {costMode === 'itemized' && (
        <div style={{ display: 'grid', gap: 12 }}>
          {itemParts.map((p, idx) => (
            <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 120px 80px auto', gap: 8, alignItems: 'end' }}>
              <div className="input-group" style={{ margin: 0 }}>
                {idx === 0 && <label className="label" htmlFor={`part-desc-${idx}`}>Description</label>}
                <input
                  id={`part-desc-${idx}`}
                  className="input"
                  value={p.description}
                  onChange={(e) => updateItemPart(idx, 'description', e.target.value)}
                  placeholder="Part name / description"
                />
              </div>
              <div className="input-group" style={{ margin: 0 }}>
                {idx === 0 && <label className="label">Unit Cost (₱)</label>}
                <input
                  className="input"
                  type="number"
                  min="0"
                  step="0.01"
                  value={p.unitCost}
                  onChange={(e) => updateItemPart(idx, 'unitCost', e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className="input-group" style={{ margin: 0 }}>
                {idx === 0 && <label className="label">Qty</label>}
                <input
                  className="input"
                  type="number"
                  min="1"
                  value={p.quantity}
                  onChange={(e) => updateItemPart(idx, 'quantity', e.target.value)}
                />
              </div>
              <button
                type="button"
                onClick={() => removeItemPart(idx)}
                disabled={itemParts.length === 1}
                style={{ padding: '8px 10px', border: 'none', background: '#fee2e2', color: '#dc2626', borderRadius: 6, cursor: 'pointer', marginTop: idx === 0 ? 22 : 0 }}
                title="Remove part"
              >
                ✕
              </button>
            </div>
          ))}
          <button
            type="button"
            id="add-part-btn"
            onClick={addItemPart}
            style={{ padding: '8px 16px', border: '1px dashed #3b82f6', background: 'transparent', color: '#3b82f6', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}
          >
            + Add another part
          </button>
        </div>
      )}

      {/* Labor cost */}
      <div className="input-group" style={{ marginTop: 16 }}>
        <label className="label" htmlFor="labor-cost">Labor cost (₱)</label>
        <input
          id="labor-cost"
          type="number"
          min="0"
          step="0.01"
          className="input"
          value={laborCost}
          onChange={(e) => setLaborCost(e.target.value)}
          placeholder="0.00"
        />
      </div>

      {/* Total preview */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 24, padding: '12px 0', borderTop: '1px solid #bfdbfe', marginTop: 12 }}>
        <span style={{ color: '#475569' }}>Parts: <strong>{formatCurrency(computedPartsCost)}</strong></span>
        <span style={{ color: '#475569' }}>Labor: <strong>{formatCurrency(parseFloat(laborCost) || 0)}</strong></span>
        <span style={{ color: '#1d4ed8', fontWeight: 700, fontSize: 15 }}>
          Total: {formatCurrency(computedTotalCost)}
        </span>
      </div>

      {costError && <div className="alert" style={{ marginTop: 8 }}>{costError}</div>}
      {costSuccess && <div style={{ color: '#16a34a', fontWeight: 600, fontSize: 13, marginTop: 8 }}>✓ Costs saved successfully.</div>}

      <div style={{ marginTop: 12, display: 'flex', gap: 12 }}>
        <Button id="save-costs-btn" onClick={handleSaveCosts} disabled={savingCosts}>
          {savingCosts ? 'Saving…' : 'Save costs'}
        </Button>
        {hasExistingCost && (
          <Button variant="secondary" onClick={() => {
            setIsEditMode(false);
            setCostError(null);
          }}>
            Cancel
          </Button>
        )}
      </div>
      <ConfirmModal
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        onConfirm={confirmState.onConfirm}
        onCancel={() => setConfirmState((prev) => ({ ...prev, isOpen: false }))}
      />
        </>
      )}
    </div>
  );
}
