import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wrench } from 'lucide-react';
import { createRepair } from '../../../lib/api/repairApi';
import { getGarages, getVehicles, getAvailableMechanics, getDrivers, GarageOption, VehicleOption, MechanicOption } from '../../../lib/api/vrmsConfigApi';
import { PageHeader } from '../../../components/layout/PageHeader';
import { CreateRepairPayload, MechanicAssignment, PriorityLevel, RepairIssue } from '../../../types';
import { Button } from '../../../components/ui/Button';
import { MechanicAssignmentSection } from '../components/MechanicAssignmentSection';
import { IssueLoggingSection } from '../components/IssueLoggingSection';
import {
  ACCOUNT_TYPE_OPTIONS,
  CORPORATION_OPTIONS,
  SHOP_OPTIONS,
  VEHICLE_SYSTEM_OPTIONS,
  ROOT_CAUSE_OPTIONS,
  PRIORITY_OPTIONS,
  loadDriverNames,
  saveDriverName,
} from '../../../lib/mockConfig';
import { useToast } from '../../../context/ToastContext';
import ConfirmModal from '../../../components/ConfirmModal';

function createNewIssue() {
  return {
    id: `issue-${Date.now()}-${Math.random().toString(36).slice(-4)}`,
    vehicleSystem: VEHICLE_SYSTEM_OPTIONS[0],
    rootCause: ROOT_CAUSE_OPTIONS[0],
    description: '',
  };
}

function generateRepairNumber() {
  const now = new Date();
  const date = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const suffix = Math.random().toString(36).slice(-4).toUpperCase();
  return `REP-${date}-${suffix}`;
}

export function RepairFormPage() {
  const navigate = useNavigate();
  const [accountType, setAccountType] = useState<'ONLINE' | 'CORPORATE'>('ONLINE');
  const [corporation, setCorporation] = useState<string>(CORPORATION_OPTIONS[0]);

  // --- Live data from API ---
  const [garages, setGarages] = useState<GarageOption[]>([]);
  const [vehicles, setVehicles] = useState<VehicleOption[]>([]);
  const [mechanicOptions, setMechanicOptions] = useState<MechanicOption[]>([]);
  const [configLoading, setConfigLoading] = useState(true);
  const [configError, setConfigError] = useState<string | null>(null);

  const [vehiclePlate, setVehiclePlate] = useState<string>('');
  const [driverName, setDriverName] = useState('');
  const [driverSuggestions, setDriverSuggestions] = useState<string[]>([]);
  const [garageLocation, setGarageLocation] = useState<string>('');
  const [odometerReading, setOdometerReading] = useState('');
  const [priority, setPriority] = useState<PriorityLevel>('MEDIUM');
  const [assignedMechanics, setAssignedMechanics] = useState<MechanicAssignment[]>([]);
  const [shopName, setShopName] = useState<string>(SHOP_OPTIONS[0]);
  const [otherShopName, setOtherShopName] = useState('');
  const [issues, setIssues] = useState<RepairIssue[]>(() => [createNewIssue()]);
  const [createdAt] = useState(() => new Date());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [issueError, setIssueError] = useState<string | null>(null);
  const { showToast } = useToast();

  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // Load driver suggestions from localStorage
  useEffect(() => {
    setDriverSuggestions(loadDriverNames());
  }, []);

  // Load live config from API
  useEffect(() => {
    let cancelled = false;
    setConfigLoading(true);
    setConfigError(null);

    Promise.all([getGarages(), getVehicles(), getAvailableMechanics(), getDrivers()])
      .then(([garageData, vehicleData, mechanicData, driverData]) => {
        if (cancelled) return;
        setGarages(garageData);
        setVehicles(vehicleData);
        setMechanicOptions(mechanicData);
        
        // Merge persistent drivers from db and local storage entries
        const dbDriverNames = driverData.map(d => d.name);
        const localNames = loadDriverNames();
        const combined = Array.from(new Set([...dbDriverNames, ...localNames]));
        setDriverSuggestions(combined);

        // Set defaults once data arrives
        if (vehicleData.length > 0) setVehiclePlate(vehicleData[0].plateNumber);
        if (garageData.length > 0) setGarageLocation(garageData[0].name);
      })
      .catch(() => {
        if (!cancelled) setConfigError('Failed to load form options. Please refresh and try again.');
      })
      .finally(() => {
        if (!cancelled) setConfigLoading(false);
      });

    return () => { cancelled = true; };
  }, []);

  const validateForm = () => {
    setError(null);
    setIssueError(null);

    if (!driverName.trim()) {
      setError('Driver name is required.');
      return false;
    }
    if (driverName.trim().length > 100) {
      setError('Driver name must be 100 characters or fewer.');
      return false;
    }
    if (accountType === 'CORPORATE' && !corporation) {
      setError('Select a corporation for corporate accounts.');
      return false;
    }
    if (!garageLocation) {
      setError('Garage location is required.');
      return false;
    }
    if (!odometerReading.trim()) {
      setError('Odometer reading is required.');
      return false;
    }
    if (Number.isNaN(Number(odometerReading))) {
      setError('Odometer reading must be numeric.');
      return false;
    }
    if (assignedMechanics.length === 0) {
      setError('At least one mechanic must be assigned.');
      return false;
    }
    if (shopName === 'OTHER' && !otherShopName.trim()) {
      setError('Please enter the external shop name for Other.');
      return false;
    }

    const invalidIssue = issues.find(
      (issue) =>
        !issue.vehicleSystem ||
        !issue.rootCause ||
        !issue.description.trim() ||
        issue.description.trim().length > 500,
    );

    if (invalidIssue) {
      setIssueError('All issue entries require a system, root cause, and description up to 500 characters.');
      return false;
    }

    return true;
  };

  const executeSubmit = async () => {
    const createdAtIso = createdAt.toISOString();
    const payload: CreateRepairPayload = {
      vehiclePlate,
      driverName: driverName.trim(),
      issueDescription: issues[0]?.description.trim() || 'Repair ticket created',
      status: 'PENDING',
      accountType,
      corporation: accountType === 'CORPORATE' ? corporation : undefined,
      garageLocation,
      odometerReading: Number(odometerReading),
      mechanics: assignedMechanics,
      shopName: shopName === 'OTHER' ? otherShopName.trim() : shopName,
      priority,
      issues,
      repairNumber: generateRepairNumber(),
      createdAt: createdAtIso,
      updatedAt: createdAtIso,
    };

    try {
      setSaving(true);
      await createRepair(payload);
      saveDriverName(driverName.trim());
      showToast('Repair ticket created successfully.', 'success');
      navigate('/repairs');
    } catch (err: any) {
      console.error('Failed to create repair ticket:', err);
      const serverMessage = err.response?.data?.message;
      const displayMsg = serverMessage
        ? `Unable to create repair ticket: ${Array.isArray(serverMessage) ? serverMessage.join(', ') : serverMessage}`
        : 'Unable to create repair ticket. Please try again.';
      setError(displayMsg);
      showToast(displayMsg, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIssueError(null);

    if (!validateForm()) {
      return;
    }

    setConfirmState({
      isOpen: true,
      title: 'Submit Repair Ticket?',
      message: 'Are you sure you want to submit this new repair ticket?',
      confirmText: 'Submit Ticket',
      onConfirm: executeSubmit,
    });
  };

  return (
    <div>
      <PageHeader
        title="New Repair Ticket"
        subtitle="Log a new vehicle repair ticket in the system."
        icon={Wrench}
      />
      {configLoading ? (
        <div className="card"><p>Loading form options...</p></div>
      ) : configError ? (
        <div className="card"><div className="alert">{configError}</div></div>
      ) : (
      <div className="card" style={{ maxWidth: 940 }}>
        <form onSubmit={handleSubmit}>
          <div className="field-grid">
            <div className="input-group">
              <label className="label" htmlFor="accountType">
                Account type
              </label>
              <select
                id="accountType"
                className="select"
                value={accountType}
                onChange={(event) => setAccountType(event.target.value as 'ONLINE' | 'CORPORATE')}
              >
                {ACCOUNT_TYPE_OPTIONS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            {accountType === 'CORPORATE' && (
              <div className="input-group">
                <label className="label" htmlFor="corporation">
                  Corporation
                </label>
                <select
                  id="corporation"
                  className="select"
                  value={corporation}
                  onChange={(event) => setCorporation(event.target.value)}
                >
                  {CORPORATION_OPTIONS.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="input-group">
              <label className="label" htmlFor="vehiclePlate">
                Plate number
              </label>
              <select
                id="vehiclePlate"
                className="select"
                value={vehiclePlate}
                onChange={(event) => setVehiclePlate(event.target.value)}
              >
                {vehicles.map((v) => (
                  <option key={v.id} value={v.plateNumber}>
                    {v.plateNumber} — {v.model}
                  </option>
                ))}
              </select>
            </div>

            <div className="input-group">
              <label className="label" htmlFor="driverName">
                Driver name <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                id="driverName"
                list="driverNames"
                className="input"
                value={driverName}
                maxLength={100}
                onChange={(event) => setDriverName(event.target.value)}
                placeholder="Juan Dela Cruz"
              />
              <datalist id="driverNames">
                {driverSuggestions.map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
              <p className="small-note">Select a previously entered driver or type a new name (up to 100 characters).</p>
            </div>

            <div className="input-group">
              <label className="label" htmlFor="garageLocation">
                Garage location
              </label>
              <select
                id="garageLocation"
                className="select"
                value={garageLocation}
                onChange={(event) => setGarageLocation(event.target.value)}
              >
                {garages.map((g) => (
                  <option key={g.id} value={g.name}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="input-group">
              <label className="label" htmlFor="odometerReading">
                Odometer reading <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                id="odometerReading"
                type="number"
                min="0"
                inputMode="numeric"
                className="input"
                value={odometerReading}
                onChange={(event) => setOdometerReading(event.target.value)}
                placeholder="123456"
              />
            </div>

            <div className="input-group">
              <label className="label" htmlFor="priority">
                Priority level
              </label>
              <select
                id="priority"
                className="select"
                value={priority}
                onChange={(event) => setPriority(event.target.value as PriorityLevel)}
              >
                {PRIORITY_OPTIONS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="input-group">
              <p className="label">Recorded date and time</p>
              <div className="readonly-field">{createdAt.toLocaleString()}</div>
            </div>
          </div>

          <div className="section-divider" />

          <MechanicAssignmentSection
            mechanicOptions={mechanicOptions}
            assignedMechanics={assignedMechanics}
            setAssignedMechanics={setAssignedMechanics}
            setError={setError}
          />

          <div className="section-divider" />

          <div className="field-grid">
            <div className="input-group">
              <label className="label" htmlFor="shopName">
                Repair shop
              </label>
              <select
                id="shopName"
                className="select"
                value={shopName}
                onChange={(event) => setShopName(event.target.value)}
              >
                {SHOP_OPTIONS.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
                <option value="OTHER">Other</option>
              </select>
              <p className="small-note">Select from managed shops or pick Other to enter a new name.</p>
            </div>
            {shopName === 'OTHER' && (
              <div className="input-group">
                <label className="label" htmlFor="otherShopName">
                  Other shop name <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  id="otherShopName"
                  className="input"
                  maxLength={100}
                  value={otherShopName}
                  onChange={(event) => setOtherShopName(event.target.value)}
                  placeholder="Enter new shop name"
                />
              </div>
            )}
          </div>

          <div className="section-divider" />

          <IssueLoggingSection
            issues={issues}
            setIssues={setIssues}
            createNewIssue={createNewIssue}
          />

          {issueError ? <div className="alert" style={{ marginTop: 18 }}>{issueError}</div> : null}
          {error ? <div className="alert" style={{ marginTop: 18 }}>{error}</div> : null}

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 24, justifyContent: 'flex-end' }}>
            <Button type="button" variant="secondary" onClick={() => navigate('/repairs')}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Submitting…' : 'Submit repair ticket'}
            </Button>
          </div>
        </form>
      </div>
      )}
      <ConfirmModal
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        confirmText={confirmState.confirmText}
        onConfirm={confirmState.onConfirm}
        onCancel={() => setConfirmState((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
