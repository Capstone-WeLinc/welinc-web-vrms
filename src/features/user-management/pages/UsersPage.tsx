import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Users } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { PageHeader } from '../../../components/layout/PageHeader';
import {
  createUser,
  getUsers,
  resetUserPassword,
  setUserStatus,
  unlockUser,
  updateUser,
} from '../../../lib/api/authApi';
import { ManagedUser, UserRole, UserRoleAssignment } from '../../../types';
import { useAuthStore } from '../../../store/authStore';
import { formatDate } from '../../../lib/utils/format';
import { useToast } from '../../../context/ToastContext';
import ConfirmModal from '../../../components/ConfirmModal';

const roleOptions: UserRole[] = ['ADMIN', 'MECHANIC'];
const defaultRoleAssignments: UserRoleAssignment[] = [{ role: 'ADMIN', system: 'VRMS' }];

type UserFormState = {
  name: string;
  email: string;
  password: string;
  isActive: boolean;
  role: UserRole;
};

const emptyForm: UserFormState = {
  name: '',
  email: '',
  password: '',
  isActive: true,
  role: 'MECHANIC',
};

function formatRoleAssignment(assignment: UserRoleAssignment) {
  return assignment.role.replace('_', ' ');
}

function getVrmsRoleAssignments(roleAssignments: UserRoleAssignment[]) {
  return roleAssignments.filter((assignment) => assignment.system === 'VRMS');
}

function validatePassword(password: string): string | null {
  const trimmed = password.trim();
  if (trimmed.length < 8) {
    return 'Password must be at least 8 characters.';
  }
  if (!/[A-Z]/.test(trimmed)) {
    return 'Password must include at least one uppercase letter.';
  }
  if (!/[a-z]/.test(trimmed)) {
    return 'Password must include at least one lowercase letter.';
  }
  if (!/\d/.test(trimmed)) {
    return 'Password must include at least one number.';
  }
  if (!/[^A-Za-z0-9]/.test(trimmed)) {
    return 'Password must include at least one special character.';
  }
  return null;
}

export function UsersPage() {
  const currentUser = useAuthStore((state) => state.user);
  const { showToast } = useToast();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [form, setForm] = useState<UserFormState>(emptyForm);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    type: 'default' | 'danger' | 'warning';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    type: 'default',
  });

  const triggerConfirm = (options: {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    type?: 'default' | 'danger' | 'warning';
  }) => {
    setConfirmState({
      isOpen: true,
      title: options.title,
      message: options.message,
      confirmText: options.confirmText,
      cancelText: options.cancelText,
      onConfirm: () => {
        options.onConfirm();
        setConfirmState((prev) => ({ ...prev, isOpen: false }));
      },
      type: options.type || 'default',
    });
  };

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
      showToast('Unable to load user accounts.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEditingUserId(null);
    setForm(emptyForm);
    setError(null);
  };

  const handleEdit = (user: ManagedUser) => {
    setEditingUserId(user.id);
    const vrmsRole = getVrmsRoleAssignments(user.roles)[0]?.role || 'MECHANIC';
    setForm({
      name: user.name,
      email: user.email,
      password: '',
      isActive: user.isActive,
      role: vrmsRole,
    });
    setError(null);
  };

  const executeSave = async () => {
    setSaving(true);
    setError(null);

    const trimmedName = form.name.trim();
    const trimmedEmail = form.email.trim().toLowerCase();
    const trimmedPassword = form.password.trim();

    try {
      const savedUser = editingUserId
        ? await updateUser(editingUserId, {
            name: trimmedName,
            email: trimmedEmail,
            ...(trimmedPassword ? { password: trimmedPassword } : {}),
            isActive: form.isActive,
            roleAssignments: [{ role: form.role, system: 'VRMS' }],
          })
        : await createUser({
            name: trimmedName,
            email: trimmedEmail,
            isActive: form.isActive,
            roleAssignments: [{ role: form.role, system: 'VRMS' }],
          });

      setUsers((current) => {
        const exists = current.some((user) => user.id === savedUser.id);
        return exists
          ? current.map((user) => (user.id === savedUser.id ? savedUser : user))
          : [savedUser, ...current];
      });

      showToast(
        editingUserId 
          ? `User account for ${trimmedEmail} updated successfully.` 
          : `User account for ${trimmedEmail} created successfully.`, 
        'success'
      );
      setEditingUserId(null);
      setForm(emptyForm);
    } catch (err: any) {
      const msg = err.response?.data?.message;
      const displayMsg = Array.isArray(msg) ? msg.join(', ') : (msg || 'Unable to save user account.');
      setError(displayMsg);
      showToast(displayMsg, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedName = form.name.trim();
    const trimmedEmail = form.email.trim().toLowerCase();
    const trimmedPassword = form.password.trim();

    if (!trimmedName || !trimmedEmail) {
      setError('Name and email are required.');
      return;
    }

    if (editingUserId && trimmedPassword) {
      const pwError = validatePassword(trimmedPassword);
      if (pwError) {
        setError(pwError);
        return;
      }
    }

    triggerConfirm({
      title: editingUserId ? 'Update User Details?' : 'Create User Account?',
      message: editingUserId 
        ? `Are you sure you want to save changes to the account for ${trimmedEmail}?` 
        : `Are you sure you want to create a new user account for ${trimmedEmail}?`,
      confirmText: editingUserId ? 'Save Changes' : 'Create Account',
      onConfirm: executeSave,
    });
  };

  const handleStatusToggle = (user: ManagedUser) => {
    triggerConfirm({
      title: user.isActive ? 'Deactivate Account?' : 'Reactivate Account?',
      message: user.isActive 
        ? `Are you sure you want to deactivate ${user.email}? They will no longer be able to log in.`
        : `Are you sure you want to reactivate ${user.email}?`,
      confirmText: user.isActive ? 'Deactivate' : 'Reactivate',
      type: user.isActive ? 'danger' : 'default',
      onConfirm: async () => {
        setSaving(true);
        setError(null);
        try {
          const updated = await setUserStatus(user.id, !user.isActive);
          setUsers((current) => current.map((item) => (item.id === updated.id ? updated : item)));
          showToast(updated.isActive ? 'User account reactivated.' : 'User account deactivated.', 'success');
        } catch (err) {
          setError('Unable to update account status.');
          showToast('Unable to update account status.', 'error');
        } finally {
          setSaving(false);
        }
      }
    });
  };

  const handlePasswordReset = async (user: ManagedUser) => {
    const password = window.prompt(`Enter a new password for ${user.email}.`);
    if (password == null) return;

    const pwError = validatePassword(password);
    if (pwError) {
      setError(pwError);
      showToast(pwError, 'error');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const updated = await resetUserPassword(user.id, password.trim());
      setUsers((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      showToast('Password reset saved successfully.', 'success');
    } catch (err: any) {
      const msg = err.response?.data?.message;
      const displayMsg = Array.isArray(msg) ? msg.join(', ') : (msg || 'Unable to reset password.');
      setError(displayMsg);
      showToast(displayMsg, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleUnlock = (user: ManagedUser) => {
    triggerConfirm({
      title: 'Unlock User Account?',
      message: `Are you sure you want to unlock the login session for ${user.email}?`,
      confirmText: 'Unlock',
      onConfirm: async () => {
        setSaving(true);
        setError(null);
        try {
          const updated = await unlockUser(user.id);
          setUsers((current) => current.map((item) => (item.id === updated.id ? updated : item)));
          showToast(`Account for ${user.email} has been unlocked successfully.`, 'success');
        } catch (err) {
          setError('Unable to unlock account.');
          showToast('Unable to unlock account.', 'error');
        } finally {
          setSaving(false);
        }
      }
    });
  };

  if (!isAdmin) {
    return (
      <div className="card">
        <PageHeader
          title="Account Management"
          subtitle="Admin access is required."
          icon={Users}
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Account Management"
        subtitle="Create accounts, manage role assignments, and reset passwords."
        icon={Users}
        action={
          <div className="user-summary">
            <span>{summary.total} total</span>
            <span>{summary.active} active</span>
            <span>{summary.inactive} inactive</span>
          </div>
        }
      />

      <div className="account-grid">
        <section className="card">
          <div className="section-heading">
            <h3 style={{ margin: 0 }}>{editingUserId ? 'Edit account' : 'New account'}</h3>
            <p style={{ margin: 0, color: 'var(--muted)' }}>VRMS accounts only</p>
          </div>
          <form onSubmit={handleSubmit}>
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
            </div>

            {editingUserId ? (
              <div className="input-group">
                <label className="label" htmlFor="password">
                  New password
                </label>
                <input
                  id="password"
                  className="input"
                  type="password"
                  value={form.password}
                  onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                  placeholder="Leave blank to keep current password"
                />
              </div>
            ) : null}

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
            </div>

            {error ? <div className="alert" style={{ marginTop: 16 }}>{error}</div> : null}

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
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div>
                <h3 style={{ margin: 0 }}>Users</h3>
                <p style={{ margin: '8px 0 0', color: 'var(--muted)' }}>VRMS role holders and retained system roles</p>
              </div>
              {!loading && (
                <span style={{ 
                  fontSize: '11px', 
                  color: 'var(--muted)', 
                  fontWeight: 600,
                  backgroundColor: 'var(--surface-alt)',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  border: '1px solid var(--border)',
                  alignSelf: 'center',
                  marginTop: 6
                }}>
                  {users.length} records
                </span>
              )}
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
            <div className="table-scroll" style={{ maxHeight: '480px', overflowY: 'auto' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email Address</th>
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
                      <td>{user.email}</td>
                      <td>
                        <span className={`status-pill ${user.isActive ? 'active' : 'inactive'}`}>
                          {user.isActive ? 'Active' : 'Inactive'}
                        </span>
                        {user.isLocked && (
                          <span className="status-pill" style={{ marginLeft: 6, background: '#fde68a', color: '#92400e' }}>Locked</span>
                        )}
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
                          {user.isLocked && (
                            <button
                              type="button"
                              className="text-button"
                              style={{ color: '#d97706' }}
                              onClick={() => handleUnlock(user)}
                              disabled={saving}
                            >
                              Unlock
                            </button>
                          )}
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
      <ConfirmModal
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        confirmText={confirmState.confirmText}
        cancelText={confirmState.cancelText}
        type={confirmState.type}
        onConfirm={confirmState.onConfirm}
        onCancel={() => setConfirmState((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
