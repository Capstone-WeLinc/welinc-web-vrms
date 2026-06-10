import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Button } from '../components/ui/Button';
import {
  createUser,
  getUsers,
  resetUserPassword,
  setUserStatus,
  updateUser,
} from '../lib/api/authApi';
import { ManagedUser, UserRole, UserRoleAssignment } from '../types';
import { useAuthStore } from '../store/authStore';
import { formatDate } from '../lib/utils/format';

const roleOptions: UserRole[] = ['ADMIN', 'MECHANIC'];
const defaultRoleAssignments: UserRoleAssignment[] = [{ role: 'ADMIN', system: 'VRMS' }];

type UserFormState = {
  name: string;
  username: string;
  password: string;
  isActive: boolean;
  roleAssignments: UserRoleAssignment[];
};

const emptyForm: UserFormState = {
  name: '',
  username: '',
  password: '',
  isActive: true,
  roleAssignments: defaultRoleAssignments,
};

function formatRoleAssignment(assignment: UserRoleAssignment) {
  return assignment.role.replace('_', ' ');
}

function getVrmsRoleAssignments(roleAssignments: UserRoleAssignment[]) {
  return roleAssignments.filter((assignment) => assignment.system === 'VRMS');
}

export function UsersPage() {
  const currentUser = useAuthStore((state) => state.user);
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [form, setForm] = useState<UserFormState>(emptyForm);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = currentUser?.role === 'ADMIN';

  const summary = useMemo(
    () => ({
      total: users.length,
      active: users.filter((user) => user.isActive).length,
      inactive: users.filter((user) => !user.isActive).length,
    }),
    [users],
  );

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }

    loadUsers();
  }, [isAdmin]);

  const loadUsers = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await getUsers('VRMS');
      setUsers(data);
    } catch (err) {
      setError('Unable to load user accounts.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEditingUserId(null);
    setForm(emptyForm);
    setMessage(null);
    setError(null);
  };

  const handleEdit = (user: ManagedUser) => {
    setEditingUserId(user.id);
    setForm({
      name: user.name,
      username: user.username,
      password: '',
      isActive: user.isActive,
      roleAssignments:
        getVrmsRoleAssignments(user.roles).length > 0
          ? getVrmsRoleAssignments(user.roles)
          : defaultRoleAssignments,
    });
    setMessage(null);
    setError(null);
  };

  const updateRoleAssignment = (index: number, role: UserRole) => {
    setForm((current) => ({
      ...current,
      roleAssignments: current.roleAssignments.map((assignment, assignmentIndex) =>
        assignmentIndex === index ? { ...assignment, role } : assignment,
      ),
    }));
  };

  const addRoleAssignment = () => {
    setForm((current) => ({
      ...current,
      roleAssignments: [...current.roleAssignments, { role: 'MECHANIC', system: 'VRMS' }],
    }));
  };

  const removeRoleAssignment = (index: number) => {
    setForm((current) => ({
      ...current,
      roleAssignments:
        current.roleAssignments.length === 1
          ? current.roleAssignments
          : current.roleAssignments.filter((_, assignmentIndex) => assignmentIndex !== index),
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);

    const trimmedName = form.name.trim();
    const trimmedUsername = form.username.trim();
    const trimmedPassword = form.password.trim();

    if (!trimmedName || !trimmedUsername) {
      setError('Name and username are required.');
      setSaving(false);
      return;
    }

    if (!editingUserId && trimmedPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      setSaving(false);
      return;
    }

    try {
      const savedUser = editingUserId
        ? await updateUser(editingUserId, {
            name: trimmedName,
            username: trimmedUsername,
            ...(trimmedPassword ? { password: trimmedPassword } : {}),
            isActive: form.isActive,
            roleAssignments: getVrmsRoleAssignments(form.roleAssignments),
          })
        : await createUser({
            name: trimmedName,
            username: trimmedUsername,
            password: trimmedPassword,
            isActive: form.isActive,
            roleAssignments: getVrmsRoleAssignments(form.roleAssignments),
          });

      setUsers((current) => {
        const exists = current.some((user) => user.id === savedUser.id);
        return exists
          ? current.map((user) => (user.id === savedUser.id ? savedUser : user))
          : [savedUser, ...current];
      });
      setMessage(editingUserId ? 'User account updated.' : 'User account created.');
      setEditingUserId(null);
      setForm(emptyForm);
    } catch (err) {
      setError('Unable to save user account.');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusToggle = async (user: ManagedUser) => {
    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      const updated = await setUserStatus(user.id, !user.isActive);
      setUsers((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      setMessage(updated.isActive ? 'User account reactivated.' : 'User account deactivated.');
    } catch (err) {
      setError('Unable to update account status.');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordReset = async (user: ManagedUser) => {
    const password = window.prompt(`Enter a new password for ${user.username}.`);
    if (password == null) return;

    if (password.trim().length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      const updated = await resetUserPassword(user.id, password.trim());
      setUsers((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      setMessage('Password reset saved.');
    } catch (err) {
      setError('Unable to reset password.');
    } finally {
      setSaving(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="card">
        <h2 className="page-title">Account Management</h2>
        <p style={{ color: 'var(--muted)' }}>Admin access is required.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">Account Management</h2>
          <p className="page-subtitle">Create accounts, manage role assignments, and reset passwords.</p>
        </div>
          <div className="user-summary">
            <span>{summary.total} total</span>
            <span>{summary.active} active</span>
            <span>{summary.inactive} inactive</span>
          </div>
      </div>

      <div className="account-grid">
        <section className="card">
          <div className="section-heading">
            <h3 style={{ margin: 0 }}>{editingUserId ? 'Edit account' : 'New account'}</h3>
            <p style={{ margin: 0, color: 'var(--muted)' }}>VRMS accounts only</p>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <label className="label" htmlFor="name">
                Name
              </label>
              <input
                id="name"
                className="input"
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="WeLinc Admin"
              />
            </div>

            <div className="input-group">
              <label className="label" htmlFor="username">
                Username
              </label>
              <input
                id="username"
                className="input"
                value={form.username}
                onChange={(event) => setForm((current) => ({ ...current, username: event.target.value }))}
                placeholder="admin"
              />
            </div>

            <div className="input-group">
              <label className="label" htmlFor="password">
                {editingUserId ? 'New password' : 'Password'}
              </label>
              <input
                id="password"
                className="input"
                type="password"
                value={form.password}
                onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                placeholder={editingUserId ? 'Leave blank to keep current password' : 'At least 6 characters'}
              />
            </div>

            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.checked }))}
              />
              Active account
            </label>

            <div className="role-editor">
              <div className="role-editor-header">
                <span className="label">Role assignments</span>
                <button type="button" className="text-button" onClick={addRoleAssignment}>
                  Add role
                </button>
              </div>
              <p className="help-text">Only ADMIN and MECHANIC roles can be assigned for VRMS users.</p>

              {form.roleAssignments.map((assignment, index) => (
                <div className="role-assignment-row" key={`${assignment.role}-${assignment.system}-${index}`}>
                  <select
                    className="select"
                    value={assignment.role}
                    onChange={(event) => updateRoleAssignment(index, event.target.value as UserRole)}
                  >
                    {roleOptions.map((role) => (
                      <option key={role} value={role}>
                        {role.replace('_', ' ')}
                      </option>
                    ))}
                  </select>

                  <div className="role-assignment-system">
                    <span className="system-pill">VRMS</span>
                  </div>

                  <button
                    type="button"
                    className="icon-action"
                    onClick={() => removeRoleAssignment(index)}
                    disabled={form.roleAssignments.length === 1}
                    aria-label="Remove role assignment"
                  >
                    x
                  </button>
                </div>
              ))}
            </div>

            {error ? <div className="alert" style={{ marginTop: 16 }}>{error}</div> : null}
            {message ? (
              <div className="alert success-alert" style={{ marginTop: 16 }}>
                {message}
              </div>
            ) : null}

            <div className="form-actions">
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving...' : editingUserId ? 'Save changes' : 'Create account'}
              </Button>
              {editingUserId ? (
                <Button type="button" variant="secondary" onClick={resetForm}>
                  Cancel
                </Button>
              ) : null}
            </div>
          </form>
        </section>

        <section className="card">
          <div className="page-header" style={{ marginBottom: 12 }}>
            <div>
              <h3 style={{ margin: 0 }}>Users</h3>
              <p style={{ margin: '8px 0 0', color: 'var(--muted)' }}>VRMS role holders and retained system roles</p>
            </div>
            <Button type="button" variant="secondary" onClick={loadUsers} disabled={loading}>
              Refresh
            </Button>
          </div>

          {loading ? (
            <p>Loading accounts...</p>
          ) : users.length === 0 ? (
            <p>No user accounts found.</p>
          ) : (
            <div className="table-scroll">
              <table className="table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Username</th>
                    <th>Status</th>
                    <th>Roles</th>
                    <th>Updated</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td>{user.name}</td>
                      <td>{user.username}</td>
                      <td>
                        <span className={`status-pill ${user.isActive ? 'active' : 'inactive'}`}>
                          {user.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>
                        <div className="role-tags">
                          {getVrmsRoleAssignments(user.roles).map((assignment) => (
                            <span className="role-tag" key={`${user.id}-${assignment.role}-${assignment.system}`}>
                              {formatRoleAssignment(assignment)}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td>{formatDate(user.updatedAt)}</td>
                      <td>
                        <div className="row-actions">
                          <button type="button" className="text-button" onClick={() => handleEdit(user)}>
                            Edit
                          </button>
                          <button
                            type="button"
                            className="text-button"
                            onClick={() => handleStatusToggle(user)}
                            disabled={saving}
                          >
                            {user.isActive ? 'Deactivate' : 'Reactivate'}
                          </button>
                          <button
                            type="button"
                            className="text-button"
                            onClick={() => handlePasswordReset(user)}
                            disabled={saving}
                          >
                            Reset
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
