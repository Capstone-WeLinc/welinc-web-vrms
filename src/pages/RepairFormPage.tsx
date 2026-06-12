import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createRepair } from '../lib/api/repairApi';
import { getGarages, getVehicles, getAvailableMechanics, GarageOption, VehicleOption, MechanicOption } from '../lib/api/vrmsConfigApi';
import { CreateRepairPayload, MechanicAssignment, PriorityLevel } from '../types';
import { Button } from '../components/ui/Button';
import {
  ACCOUNT_TYPE_OPTIONS,
  CORPORATION_OPTIONS,
  ROOT_CAUSE_OPTIONS,
  SHOP_OPTIONS,
  VEHICLE_SYSTEM_OPTIONS,
  PRIORITY_OPTIONS,
  loadDriverNames,
  saveDriverName,
} from '../lib/mockConfig';

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
  const time = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
  const suffix = Math.random().toString(36).slice(-4).toUpperCase();
  return `RL-${date}-${time}-${suffix}`;
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
  const [mechanicSelection, setMechanicSelection] = useState('');
  const [assignedMechanics, setAssignedMechanics] = useState<MechanicAssignment[]>([]);
  const [outsourcedMechanicName, setOutsourcedMechanicName] = useState('');
  const [shopName, setShopName] = useState<string>(SHOP_OPTIONS[0]);
  const [otherShopName, setOtherShopName] = useState('');
  const [issues, setIssues] = useState(() => [createNewIssue()]);
  const [createdAt] = useState(() => new Date());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [issueError, setIssueError] = useState<string | null>(null);

  // Load driver suggestions from localStorage
  useEffect(() => {
    setDriverSuggestions(loadDriverNames());
  }, []);

  // Load live config from API
  useEffect(() => {
    let cancelled = false;
    setConfigLoading(true);
    setConfigError(null);

    Promise.all([getGarages(), getVehicles(), getAvailableMechanics()])
      .then(([garageData, vehicleData, mechanicData]) => {
        if (cancelled) return;
        setGarages(garageData);
        setVehicles(vehicleData);
        setMechanicOptions(mechanicData);
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

  const assignedMechanicIds = useMemo(() => new Set(assignedMechanics.map((mechanic) => mechanic.id)), [assignedMechanics]);

  const handleAddMechanic = () => {
    setError(null);

    if (mechanicSelection === '') {
      setError('Select a mechanic or choose Other.');
      return;
    }

    if (mechanicSelection === 'OTHER') {
      const name = outsourcedMechanicName.trim();
      if (!name) {
        setError('Enter the outsourced mechanic or shop name.');
        return;
      }
      setAssignedMechanics((current) => [
        ...current,
        { id: `other-${Date.now()}`, name, isOutsourced: true, shopName: name },
      ]);
      setOutsourcedMechanicName('');
      setMechanicSelection('');
      return;
    }

    const mechanic = mechanicOptions.find((item) => item.id === mechanicSelection);
    if (!mechanic) {
      setError('Select a valid mechanic.');
      return;
    }

    if (assignedMechanicIds.has(mechanic.id)) {
      setError('Mechanic is already assigned.');
      return;
    }

    setAssignedMechanics((current) => [...current, { id: mechanic.id, name: mechanic.name }]);
    setMechanicSelection('');
  };

  const handleRemoveMechanic = (id: string) => {
    setAssignedMechanics((current) => current.filter((mechanic) => mechanic.id !== id));
  };

  const handleUpdateIssue = (issueId: string, field: 'vehicleSystem' | 'rootCause' | 'description', value: string) => {
    setIssues((current) =>
      current.map((issue) => (issue.id === issueId ? { ...issue, [field]: value } : issue)),
    );
  };

  const handleAddIssue = () => {
    if (issues.length >= 10) {
      return;
    }
    setIssues((current) => [...current, createNewIssue()]);
  };

  const handleRemoveIssue = (issueId: string) => {
    if (issues.length <= 1) {
      return;
    }
    setIssues((current) => current.filter((issue) => issue.id !== issueId));
  };

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

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIssueError(null);

    if (!validateForm()) {
      return;
    }

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
      navigate('/repairs');
    } catch (err: any) {
      console.error('Failed to create repair ticket:', err);
      const serverMessage = err.response?.data?.message;
      setError(
        serverMessage
          ? `Unable to create repair ticket: ${Array.isArray(serverMessage) ? serverMessage.join(', ') : serverMessage}`
          : 'Unable to create repair ticket. Please try again.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h2 className="page-title">New Repair Ticket</h2>
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
                Driver name
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
                Odometer reading
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

          <div>
            <h3 className="section-title">Mechanic assignment</h3>
            <div className="field-grid">
              <div className="input-group">
                <label className="label" htmlFor="mechanicSelection">
                  Select mechanic
                </label>
                <select
                  id="mechanicSelection"
                  className="select"
                  value={mechanicSelection}
                  onChange={(event) => setMechanicSelection(event.target.value)}
                >
                  <option value="">Choose a mechanic</option>
                  {mechanicOptions.map((mechanic) => (
                    <option
                      key={mechanic.id}
                      value={mechanic.id}
                      disabled={!mechanic.isAvailable || assignedMechanicIds.has(mechanic.id)}
                    >
                      {mechanic.name}
                      {!mechanic.isAvailable ? ' (assigned)' : ''}
                    </option>
                  ))}
                  <option value="OTHER">Other (Outsourced)</option>
                </select>
              </div>

              {mechanicSelection === 'OTHER' && (
                <div className="input-group">
                  <label className="label" htmlFor="outsourcedMechanicName">
                    Outsourced mechanic / shop
                  </label>
                  <input
                    id="outsourcedMechanicName"
                    className="input"
                    value={outsourcedMechanicName}
                    maxLength={100}
                    onChange={(event) => setOutsourcedMechanicName(event.target.value)}
                    placeholder="Enter shop name or independent mechanic"
                  />
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <Button type="button" onClick={handleAddMechanic} disabled={!mechanicSelection || (mechanicSelection === 'OTHER' && !outsourcedMechanicName.trim())}>
                Add mechanic
              </Button>
            </div>
            <div className="mechanic-list">
              {assignedMechanics.map((mechanic) => (
                <div key={mechanic.id} className="tag-pill">
                  {mechanic.name}
                  {mechanic.isOutsourced ? ' (outsourced)' : ''}
                  <button
                    type="button"
                    style={{ marginLeft: 10, border: 'none', background: 'transparent', color: '#1d4ed8', cursor: 'pointer' }}
                    onClick={() => handleRemoveMechanic(mechanic.id)}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>

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
                  Other shop name
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

          <div>
            <h3 className="section-title">Repair issue logging</h3>
            {issues.map((issue, index) => (
              <div key={issue.id} className="issue-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                  <h4>Issue {index + 1}</h4>
                  {issues.length > 1 && (
                    <button
                      type="button"
                      className="button secondary small"
                      onClick={() => handleRemoveIssue(issue.id)}
                    >
                      Remove
                    </button>
                  )}
                </div>
                <div className="field-grid" style={{ marginTop: 16 }}>
                  <div className="input-group">
                    <label className="label" htmlFor={`vehicleSystem-${issue.id}`}>
                      Vehicle system
                    </label>
                    <select
                      id={`vehicleSystem-${issue.id}`}
                      className="select"
                      value={issue.vehicleSystem}
                      onChange={(event) => handleUpdateIssue(issue.id, 'vehicleSystem', event.target.value)}
                    >
                      {VEHICLE_SYSTEM_OPTIONS.map((system) => (
                        <option key={system} value={system}>
                          {system}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="input-group">
                    <label className="label" htmlFor={`rootCause-${issue.id}`}>
                      Root cause
                    </label>
                    <select
                      id={`rootCause-${issue.id}`}
                      className="select"
                      value={issue.rootCause}
                      onChange={(event) => handleUpdateIssue(issue.id, 'rootCause', event.target.value)}
                    >
                      {ROOT_CAUSE_OPTIONS.map((cause) => (
                        <option key={cause} value={cause}>
                          {cause}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="input-group" style={{ marginTop: 16 }}>
                  <label className="label" htmlFor={`issueDescription-${issue.id}`}>
                    Repair description
                  </label>
                  <textarea
                    id={`issueDescription-${issue.id}`}
                    className="textarea"
                    rows={4}
                    maxLength={500}
                    value={issue.description}
                    onChange={(event) => handleUpdateIssue(issue.id, 'description', event.target.value)}
                    placeholder="Enter a detailed issue description"
                  />
                  <p className="small-note">Maximum 500 characters per issue.</p>
                </div>
              </div>
            ))}
            <div style={{ marginTop: 14, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <Button type="button" onClick={handleAddIssue} disabled={issues.length >= 10}>
                Add another issue
              </Button>
              <p className="small-note">You can add up to 10 issue entries in one ticket.</p>
            </div>
          </div>

          {issueError ? <div className="alert" style={{ marginTop: 18 }}>{issueError}</div> : null}
          {error ? <div className="alert" style={{ marginTop: 18 }}>{error}</div> : null}

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 24 }}>
            <Button type="submit" disabled={saving}>
              {saving ? 'Submitting…' : 'Submit repair ticket'}
            </Button>
            <Button type="button" variant="secondary" onClick={() => navigate('/repairs')}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
      )}
    </div>
  );
}
