import { useMemo, useState } from 'react';
import { MechanicOption } from '../../../lib/api/vrmsConfigApi';
import { MechanicAssignment } from '../../../types';
import { Button } from '../../../components/ui/Button';

interface MechanicAssignmentSectionProps {
  mechanicOptions: MechanicOption[];
  assignedMechanics: MechanicAssignment[];
  setAssignedMechanics: React.Dispatch<React.SetStateAction<MechanicAssignment[]>>;
  setError: (err: string | null) => void;
}

export function MechanicAssignmentSection({
  mechanicOptions,
  assignedMechanics,
  setAssignedMechanics,
  setError,
}: MechanicAssignmentSectionProps) {
  const [mechanicSelection, setMechanicSelection] = useState('');
  const [outsourcedMechanicName, setOutsourcedMechanicName] = useState('');

  const assignedMechanicIds = useMemo(() => new Set(assignedMechanics.map((m) => m.id)), [assignedMechanics]);

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
    setAssignedMechanics((current) => current.filter((m) => m.id !== id));
  };

  return (
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
              Outsourced mechanic / shop <span style={{ color: '#dc2626' }}>*</span>
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
        <Button
          type="button"
          onClick={handleAddMechanic}
          disabled={!mechanicSelection || (mechanicSelection === 'OTHER' && !outsourcedMechanicName.trim())}
        >
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
  );
}
