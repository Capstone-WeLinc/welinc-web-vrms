import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wrench } from 'lucide-react';
import { createRepair } from '../../../lib/api/repairApi';
import { getGarages, getVehicles, getAvailableMechanics, getDrivers, GarageOption, VehicleOption, MechanicOption } from '../../../lib/api/vrmsConfigApi';
import { PageHeader } from '../../../components/layout/PageHeader';
import { CreateRepairPayload, MechanicAssignment, PriorityLevel, RepairIssue } from '../../../types';
import { LegacyButton } from '../../../components/legacy/LegacyButton';
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
} from '../../../lib/repairOptions';
import { useToast } from '../../../context/toast';
import { confirm } from '../../../components/shared/confirm/confirm';
import { getApiErrorMessage } from '../../../lib/api/errors';

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
  const [showDriverSuggestions, setShowDriverSuggestions] = useState(false);

  // --- Live data from API ---
  const [garages, setGarages] = useState<GarageOption[]>([]);
  const [vehicles, setVehicles] = useState<VehicleOption[]>([]);
  const [mechanicOptions, setMechanicOptions] = useState<MechanicOption[]>([]);
  const [configLoading, setConfigLoading] = useState(true);
  const [configError, setConfigError] = useState<string | null>(null);

  const [vehiclePlate, setVehiclePlate] = useState<string>('');
  const [driverName, setDriverName] = useState('');
  const [driverSuggestions, setDriverSuggestions] = useState<string[]>(loadDriverNames);
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


  // Load live config from API
  useEffect(() => {
    let cancelled = false;

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

    // Plate number regex validation (alphanumeric and dashes, 4 to 12 chars)
    const plateRegex = /^[A-Za-z0-9\s-]{4,12}$/;
    if (!plateRegex.test(vehiclePlate)) {
      setError('Please enter a valid vehicle plate number (e.g. ABC-1234).');
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
    const payload: CreateRepairPayload = {
      vehiclePlate,
      driverName: driverName.trim(),
      issueDescription: issues[0]?.description.trim() || 'Repair ticket created',
      accountType,
      corporation: accountType === 'CORPORATE' ? corporation : undefined,
      garageLocation,
      odometerReading: Number(odometerReading),
      mechanics: assignedMechanics.map(({ name, isOutsourced, shopName }) => ({
        name,
        isOutsourced,
        shopName,
      })),
      shopName: shopName === 'OTHER' ? otherShopName.trim() : shopName,
      priority,
      issues: issues.map(({ vehicleSystem, rootCause, description }) => ({
        vehicleSystem,
        rootCause,
        description,
      })),
      repairNumber: generateRepairNumber(),
    };

    try {
      setSaving(true);
      await createRepair(payload);
      saveDriverName(driverName.trim());
      showToast('Repair ticket created successfully.', 'success');
      navigate('/repairs');
    } catch (err) {
      console.error('Failed to create repair ticket:', err);
      const serverMessage = getApiErrorMessage(err, '');
      const displayMsg = serverMessage
        ? `Unable to create repair ticket: ${serverMessage}`
        : 'Unable to create repair ticket. Please try again.';
      setError(displayMsg);
      showToast(displayMsg, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIssueError(null);

    if (!validateForm()) {
      return;
    }

    const confirmed = await confirm({
      title: 'Submit repair ticket?',
      description: 'Are you sure you want to submit this new repair ticket?',
      confirmText: 'Submit ticket',
    });
    if (confirmed) await executeSubmit();
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
      <div className="card" style={{ maxWidth: 940, margin: '0 auto' }}>
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
              <p className="small-note">Type of account to bill the repair to.</p>
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
                <p className="small-note">Select the corporate entity.</p>
              </div>
            )}

            <div className="input-group">
              <label className="label" htmlFor="vehiclePlate">
                Plate number <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <input
                id="vehiclePlate"
                className="input"
                list="vehiclePlates"
                value={vehiclePlate}
                onChange={(event) => setVehiclePlate(event.target.value.toUpperCase())}
                placeholder="ABC-1234"
              />
              <datalist id="vehiclePlates">
                {vehicles.map((v) => (
                  <option key={v.id} value={v.plateNumber}>
                    {v.model}
                  </option>
                ))}
              </datalist>
              <p className="small-note">Select a registered vehicle or type a new plate number.</p>
            </div>

            <div className="input-group">
              <label className="label" htmlFor="driverName">
                Driver name <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="driverName"
                  className="input"
                  value={driverName}
                  maxLength={100}
                  onChange={(event) => {
                    setDriverName(event.target.value);
                    setShowDriverSuggestions(true);
                  }}
                  onFocus={() => setShowDriverSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowDriverSuggestions(false), 200)}
                  placeholder="Juan Dela Cruz"
                  autoComplete="off"
                />
                {showDriverSuggestions && driverSuggestions.filter(n => n.toLowerCase().includes(driverName.toLowerCase())).length > 0 && (
                  <ul style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, width: '100%', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px', margin: 0, listStyle: 'none', zIndex: 50, maxHeight: 200, overflowY: 'auto', boxShadow: 'var(--elevation)' }}>
                    {driverSuggestions.filter(n => n.toLowerCase().includes(driverName.toLowerCase())).map(name => (
                      <li
                        key={name}
                        style={{ padding: '8px 12px', cursor: 'pointer', borderRadius: 4, fontSize: 14 }}
                        onMouseDown={() => {
                          setDriverName(name);
                          setShowDriverSuggestions(false);
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-alt)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        {name}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <p className="small-note">Select a previously entered driver or type a new name (up to 100 characters).</p>
            </div>

            <div className="input-group">
              <label className="label" htmlFor="garageLocation">
                Garage location <span style={{ color: 'var(--danger)' }}>*</span>
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
              <p className="small-note">Physical location where the vehicle is stored or repaired.</p>
            </div>

            <div className="input-group">
              <label className="label" htmlFor="odometerReading">
                Odometer reading <span style={{ color: 'var(--danger)' }}>*</span>
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
              <p className="small-note">Current odometer reading in kilometers.</p>
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
              <p className="small-note">Select priority level for this repair.</p>
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
                  Other shop name <span style={{ color: 'var(--danger)' }}>*</span>
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
            <LegacyButton type="button" variant="secondary" onClick={() => navigate('/repairs')}>
              Cancel
            </LegacyButton>
            <LegacyButton type="submit" disabled={saving}>
              {saving ? 'Submitting…' : 'Submit repair ticket'}
            </LegacyButton>
          </div>
        </form>
      </div>
      )}
    </div>
  );
}
