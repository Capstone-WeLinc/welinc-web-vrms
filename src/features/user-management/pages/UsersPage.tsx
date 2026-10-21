import { FormEvent, useState, useMemo } from 'react';
import { Users as UsersIcon, Search } from 'lucide-react';
import { ManagedUser } from '../../../types';
import { PageHeader } from '../../../components/layout/PageHeader';
import { useToast } from '../../../context/toast';
import ConfirmModal from '../../../components/ConfirmModal';
import {
  useUsersManager,
  UserFormState,
  emptyForm,
  getVrmsRoleAssignments,
  validateEmail,
} from '../hooks/useUsersManager';
import { UserForm } from '../components/UserForm';
import { UsersTable } from '../components/UsersTable';
import { useConfirm } from '../../../hooks/useConfirm';
import { LegacyButton } from '../../../components/legacy/LegacyButton';
import { getApiErrorMessage } from '../../../lib/api/errors';

export function UsersPage() {
  const {
    isAdmin,
    users,
    loading,
    error: usersError,
    saveUser,
    toggleUserStatus,
    resetPassword,
    unlockUserAccount,
  } = useUsersManager();
  
  const { confirmState, triggerConfirm, closeConfirm } = useConfirm();
  const { showToast } = useToast();

  const [form, setForm] = useState<UserFormState>(emptyForm);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');

  const handleEdit = (user: ManagedUser) => {
    const vrmsRoles = getVrmsRoleAssignments(user.roles);
    const role = vrmsRoles.length > 0 ? vrmsRoles[0].role : 'MECHANIC';

    setEditingUserId(user.id);
    setForm({
      name: user.name,
      email: user.email,
      password: '',
      isActive: user.isActive,
      role: role,
    });
    setFormError(null);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancel = () => {
    setEditingUserId(null);
    setForm(emptyForm);
    setFormError(null);
    setShowForm(false);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    if (!form.name.trim() || !form.email.trim()) {
      setFormError('Name and email are required.');
      return;
    }

    const emailError = validateEmail(form.email);
    if (emailError) {
      setFormError(emailError);
      return;
    }



    setSaving(true);
    try {
      await saveUser(editingUserId, form);
      showToast(editingUserId ? 'User account updated successfully.' : 'User account created successfully.', 'success');
      handleCancel();
    } catch (err) {
      setFormError(getApiErrorMessage(err, 'Failed to save user account.'));
      showToast('Failed to save user account.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const confirmToggleStatus = (user: ManagedUser) => {
    triggerConfirm({
      title: user.isActive ? 'Deactivate Account?' : 'Activate Account?',
      message: `Are you sure you want to ${user.isActive ? 'deactivate' : 'activate'} the account for ${user.name}?`,
      confirmText: user.isActive ? 'Deactivate' : 'Activate',
      type: user.isActive ? 'danger' : 'default',
      onConfirm: async () => {
        try {
          await toggleUserStatus(user);
          showToast(`Account ${user.isActive ? 'deactivated' : 'activated'} successfully.`, 'success');
        } catch {
          showToast('Failed to update account status.', 'error');
        }
      },
    });
  };

  const confirmResetPassword = (user: ManagedUser) => {
    const defaultPassword = 'Password123!';
    triggerConfirm({
      title: 'Reset User Password?',
      message: `Are you sure you want to reset the password for ${user.name} to the system default (${defaultPassword})? They will be required to change it on their next login.`,
      confirmText: 'Reset Password',
      type: 'danger',
      onConfirm: async () => {
        try {
          await resetPassword(user, defaultPassword);
          showToast(`Password reset successfully for ${user.name}.`, 'success');
        } catch {
          showToast('Failed to reset password.', 'error');
        }
      },
    });
  };

  const confirmUnlockAccount = (user: ManagedUser) => {
    triggerConfirm({
      title: 'Unlock Account?',
      message: `The account for ${user.name} is currently locked due to multiple failed login attempts. Are you sure you want to unlock it?`,
      confirmText: 'Unlock Account',
      type: 'warning',
      onConfirm: async () => {
        try {
          await unlockUserAccount(user);
          showToast(`Account for ${user.name} has been unlocked.`, 'success');
        } catch {
          showToast('Failed to unlock account.', 'error');
        }
      },
    });
  };

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            user.email.toLowerCase().includes(searchTerm.toLowerCase());
      
      let matchesRole = true;
      if (filterRole !== 'ALL') {
        const vrmsRoles = getVrmsRoleAssignments(user.roles);
        const primaryRole = vrmsRoles.length > 0 ? vrmsRoles[0].role : 'NO_ACCESS';
        matchesRole = primaryRole === filterRole;
      }

      let matchesStatus = true;
      if (filterStatus !== 'ALL') {
        matchesStatus = (filterStatus === 'ACTIVE' && user.isActive) || 
                        (filterStatus === 'INACTIVE' && !user.isActive);
      }

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, searchTerm, filterRole, filterStatus]);

  if (!isAdmin) {
    return (
      <div>
        <PageHeader title="Access Denied" subtitle="" icon={UsersIcon} />
        <div className="card alert">You do not have permission to view this page.</div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="User Management"
        subtitle="Manage VRMS administrator and mechanic access."
        icon={UsersIcon}
      />

      <div className="dashboard-grid" style={{ marginBottom: 24 }}>
        <div className="card summary-card">
          <div className="stat-card-value">{users.length}</div>
          <div className="stat-card-label">Total Users</div>
        </div>
        <div className="card summary-card">
          <div className="stat-card-value">{users.filter(u => u.isActive).length}</div>
          <div className="stat-card-label">Active Users</div>
        </div>
        <div className="card summary-card">
          <div className="stat-card-value">{users.filter(u => !u.isActive).length}</div>
          <div className="stat-card-label">Inactive Users</div>
        </div>
        <div className="card summary-card">
          <div className="stat-card-value">{users.filter(u => u.isLocked).length}</div>
          <div className="stat-card-label">Locked Accounts</div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
         <div style={{ display: 'flex', gap: '12px', flex: 1, maxWidth: '600px' }}>
           <div style={{ position: 'relative', flex: 1 }}>
             <Search size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-foreground)' }} />
             <input 
               className="input" 
               placeholder="Search by name or email..." 
               value={searchTerm} 
               onChange={e => setSearchTerm(e.target.value)} 
               style={{ paddingLeft: '38px' }}
             />
           </div>
           <select className="select" value={filterRole} onChange={e => setFilterRole(e.target.value)} style={{ width: '160px' }}>
             <option value="ALL">All Roles</option>
             <option value="ADMIN">Admin</option>
             <option value="MECHANIC">Mechanic</option>
           </select>
           <select className="select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ width: '160px' }}>
             <option value="ALL">All Status</option>
             <option value="ACTIVE">Active</option>
             <option value="INACTIVE">Inactive</option>
           </select>
         </div>
         <LegacyButton onClick={() => setShowForm(true)}>+ New User Account</LegacyButton>
      </div>

      {showForm && (
        <div style={{ marginBottom: 24 }}>
          <UserForm
            form={form}
            setForm={setForm}
            editingUserId={editingUserId}
            saving={saving}
            error={formError}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
          />
        </div>
      )}

      <section className="card" style={{ flex: 1 }}>
        <div className="section-heading">
          <h3 style={{ margin: 0 }}>Registered users</h3>
          <p style={{ margin: 0, color: 'var(--muted-foreground)' }}>Manage existing VRMS accounts</p>
        </div>

        {loading ? (
          <p>Loading users...</p>
        ) : usersError ? (
          <div className="alert">{usersError}</div>
        ) : (
          <UsersTable
            users={filteredUsers}
            onEditUser={handleEdit}
            onResetPassword={confirmResetPassword}
            onToggleStatus={confirmToggleStatus}
            onUnlockAccount={confirmUnlockAccount}
          />
        )}
      </section>

      <ConfirmModal
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        confirmText={confirmState.confirmText}
        onConfirm={confirmState.onConfirm}
        onCancel={closeConfirm}
      />
    </div>
  );
}
