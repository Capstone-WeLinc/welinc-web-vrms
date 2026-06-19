import { useState } from 'react';
import { Shield, Settings, Key, AlertTriangle, MoreVertical } from 'lucide-react';
import { ManagedUser } from '../../../types';
import { getVrmsRoleAssignments } from '../hooks/useUsersManager';
import { StatusBadge } from '../../../components/shared/StatusBadge';

interface UsersTableProps {
  users: ManagedUser[];
  onEditUser: (user: ManagedUser) => void;
  onResetPassword: (user: ManagedUser) => void;
  onToggleStatus: (user: ManagedUser) => void;
  onUnlockAccount: (user: ManagedUser) => void;
}

export function UsersTable({
  users,
  onEditUser,
  onResetPassword,
  onToggleStatus,
  onUnlockAccount,
}: UsersTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const PAGE_SIZE = 10;
  const totalPages = Math.ceil(users.length / PAGE_SIZE);
  const paginatedUsers = users.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  if (users.length === 0) {
    return <p className="label" style={{ padding: '20px' }}>No users found.</p>;
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="table" style={{ marginTop: 0 }}>
        <thead>
          <tr>
            <th>User Details</th>
            <th>Role</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {paginatedUsers.map((user) => {
            const isLocked = user.isLocked;
            const vrmsRoles = getVrmsRoleAssignments(user.roles);
            const primaryRole = vrmsRoles.length > 0 ? vrmsRoles[0].role : 'NO_ACCESS';

            return (
              <tr key={user.id} style={{ opacity: user.isActive ? 1 : 0.6 }}>
                <td>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{user.name}</span>
                    <span style={{ fontSize: 13, color: 'var(--muted)' }}>{user.email}</span>
                  </div>
                </td>
                <td>
                  <span className="tag-pill">
                    {primaryRole === 'ADMIN' && <Shield size={12} style={{ marginRight: 4, display: 'inline-block' }} />}
                    {primaryRole.replace('_', ' ')}
                  </span>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <StatusBadge status={user.isActive ? 'COMPLETED' : 'CANCELLED'} />
                    {isLocked && (
                      <span title="Account locked due to 5 failed login attempts">
                        <AlertTriangle size={16} color="var(--danger)" />
                      </span>
                    )}
                  </div>
                </td>
                <td>
                  <div style={{ position: 'relative' }}>
                    <button
                      className="button-icon"
                      onClick={() => setOpenMenuId(openMenuId === user.id ? null : user.id)}
                      onBlur={() => setTimeout(() => setOpenMenuId(null), 150)}
                    >
                      <MoreVertical size={16} />
                    </button>

                    {openMenuId === user.id && (
                      <div style={{
                        position: 'absolute',
                        right: 0,
                        top: '100%',
                        zIndex: 10,
                        background: 'var(--surface)',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        boxShadow: 'var(--elevation)',
                        padding: '4px',
                        minWidth: '160px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2px'
                      }}>
                        <button
                          className="sidebar-btn"
                          style={{ padding: '8px 12px', fontSize: '13px' }}
                          onClick={() => { onEditUser(user); setOpenMenuId(null); }}
                        >
                          <Settings size={14} /> Edit Account
                        </button>
                        <button
                          className="sidebar-btn"
                          style={{ padding: '8px 12px', fontSize: '13px' }}
                          onClick={() => { onResetPassword(user); setOpenMenuId(null); }}
                        >
                          <Key size={14} /> Reset Password
                        </button>
                        <button
                          className="sidebar-btn"
                          style={{ padding: '8px 12px', fontSize: '13px', color: user.isActive ? 'var(--danger)' : 'var(--success)' }}
                          onClick={() => { onToggleStatus(user); setOpenMenuId(null); }}
                        >
                          <Shield size={14} /> {user.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                        {isLocked && (
                          <button
                            className="sidebar-btn"
                            style={{ padding: '8px 12px', fontSize: '13px', color: 'var(--danger)' }}
                            onClick={() => { onUnlockAccount(user); setOpenMenuId(null); }}
                          >
                            <AlertTriangle size={14} /> Unlock Account
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 14px', borderTop: '1px solid var(--border)' }}>
          <span style={{ fontSize: '13px', color: 'var(--muted)', fontWeight: 600 }}>
            Page {currentPage} of {totalPages} (Showing {((currentPage - 1) * PAGE_SIZE) + 1} to {Math.min(currentPage * PAGE_SIZE, users.length)} of {users.length})
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className="button secondary small"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </button>
            <button
              className="button secondary small"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
