import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createRepair } from '../lib/api/repairApi';
import { CreateRepairPayload, RepairStatus } from '../types';
import { Button } from '../components/ui/Button';

export function RepairFormPage() {
  const navigate = useNavigate();
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [driverName, setDriverName] = useState('');
  const [issueDescription, setIssueDescription] = useState('');
  const [status, setStatus] = useState<RepairStatus>('PENDING');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const payload: CreateRepairPayload = {
      vehiclePlate,
      driverName,
      issueDescription,
      status,
    };

    try {
      setSaving(true);
      await createRepair(payload);
      navigate('/repairs');
    } catch (err) {
      setError('Could not create repair ticket.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h2 className="page-title">New Repair Ticket</h2>
      <div className="card" style={{ maxWidth: 700 }}>
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label className="label" htmlFor="vehiclePlate">
              Vehicle Plate
            </label>
            <input
              id="vehiclePlate"
              className="input"
              value={vehiclePlate}
              onChange={(event) => setVehiclePlate(event.target.value)}
              placeholder="ABX-1234"
            />
          </div>

          <div className="input-group">
            <label className="label" htmlFor="driverName">
              Driver Name
            </label>
            <input
              id="driverName"
              className="input"
              value={driverName}
              onChange={(event) => setDriverName(event.target.value)}
              placeholder="Juan Dela Cruz"
            />
          </div>

          <div className="input-group">
            <label className="label" htmlFor="issueDescription">
              Issue Description
            </label>
            <textarea
              id="issueDescription"
              className="textarea"
              rows={4}
              value={issueDescription}
              onChange={(event) => setIssueDescription(event.target.value)}
              placeholder="Describe the reported issue"
            />
          </div>

          <div className="input-group">
            <label className="label" htmlFor="status">
              Initial Status
            </label>
            <select
              id="status"
              className="select"
              value={status}
              onChange={(event) => setStatus(event.target.value as RepairStatus)}
            >
              <option value="PENDING">Pending</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="FOR_VERIFICATION">For Verification</option>
            </select>
          </div>

          {error ? <div className="alert" style={{ marginBottom: 16 }}>{error}</div> : null}

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Button type="submit" disabled={saving || !vehiclePlate || !driverName || !issueDescription}>
              {saving ? 'Saving…' : 'Create Repair Ticket'}
            </Button>
            <Button type="button" variant="secondary" onClick={() => navigate('/repairs')}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
