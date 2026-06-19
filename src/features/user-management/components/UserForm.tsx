import { FormEvent, Dispatch, SetStateAction } from 'react';
import { UserRole } from '../../../types';
import { Button } from '../../../components/ui/Button';
import { UserFormState } from '../hooks/useUsersManager';

interface UserFormProps {
  form: UserFormState;
  setForm: Dispatch<SetStateAction<UserFormState>>;
  editingUserId: string | null;
  saving: boolean;
  error: string | null;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
}

const roleOptions: UserRole[] = ['ADMIN', 'MECHANIC'];

export function UserForm({
  form,
  setForm,
  editingUserId,
  saving,
  error,
  onSubmit,
  onCancel,
}: UserFormProps) {
  return (
    <section className="card">
      <div className="section-heading">
        <h3 style={{ margin: 0 }}>{editingUserId ? 'Edit account' : 'New account'}</h3>
        <p style={{ margin: 0, color: 'var(--muted)' }}>VRMS accounts only</p>
      </div>
      <form onSubmit={onSubmit}>
        <div className="input-group">
          <label className="label" htmlFor="name">
            Name <span style={{ color: '#dc2626' }}>*</span>
          </label>
          <input
            id="name"
            className="input"
            value={form.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            placeholder="WeLinc Admin"
          />
          <p className="small-note">The full name displayed across the system.</p>
        </div>

        <div className="input-group">
          <label className="label" htmlFor="email">
            Email Address <span style={{ color: '#dc2626' }}>*</span>
          </label>
          <input
            id="email"
            type="email"
            className="input"
            value={form.email}
            onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
            placeholder="user@welinc.com"
          />
          <p className="small-note">Must be a valid WeLinc company email address.</p>
        </div>


        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.checked }))}
          />
          Active account
        </label>

        <div className="input-group">
          <label className="label" htmlFor="role">
            Role <span style={{ color: '#dc2626' }}>*</span>
          </label>
          <select
            id="role"
            className="select"
            value={form.role}
            onChange={(event) => setForm((current) => ({ ...current, role: event.target.value as UserRole }))}
          >
            {roleOptions.map((role) => (
              <option key={role} value={role}>
                {role.replace('_', ' ')}
              </option>
            ))}
          </select>
          <p className="small-note">Defines user permissions inside the VRMS module.</p>
        </div>

        {error ? <div className="alert" style={{ marginTop: 16 }}>{error}</div> : null}

        <div className="form-actions">
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving...' : editingUserId ? 'Save changes' : 'Create account'}
          </Button>
          {editingUserId ? (
            <Button type="button" variant="secondary" onClick={onCancel}>
              Cancel
            </Button>
          ) : null}
        </div>
      </form>
    </section>
  );
}
