import { useState, useEffect } from 'react';
import { ManagedUser, UserRole, UserRoleAssignment } from '../../../types';
import {
  createUser,
  getUsers,
  resetUserPassword,
  setUserStatus,
  unlockUser,
  updateUser,
} from '../../../lib/api/authApi';
import { useAuthStore } from '../../../store/authStore';

export type UserFormState = {
  name: string;
  email: string;
  password: string;
  isActive: boolean;
  role: UserRole;
};

export const emptyForm: UserFormState = {
  name: '',
  email: '',
  password: '',
  isActive: true,
  role: 'MECHANIC',
};

export function getVrmsRoleAssignments(roleAssignments: UserRoleAssignment[]) {
  return roleAssignments.filter((assignment) => assignment.system === 'VRMS');
}

export function validatePassword(password: string): string | null {
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

export function validateEmail(email: string): string | null {
  const trimmed = email.trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmed)) {
    return 'Please enter a valid email address.';
  }
  return null;
}

export function useUsersManager() {
  const currentUser = useAuthStore((state) => state.user);
  const isAdmin = currentUser?.role === 'ADMIN';

  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(isAdmin);
  const [error, setError] = useState<string | null>(null);

  const loadUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getUsers('VRMS');
      setUsers(data);
    } catch (err) {
      setError('Unable to load user accounts.');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Initial load; loadUsers() above is for refreshing after a change
  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    getUsers('VRMS')
      .then((data) => { if (!cancelled) setUsers(data); })
      .catch(() => { if (!cancelled) setError('Unable to load user accounts.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [isAdmin]);

  const saveUser = async (editingUserId: string | null, form: UserFormState) => {
    const trimmedName = form.name.trim();
    const trimmedEmail = form.email.trim().toLowerCase();
    const trimmedPassword = form.password.trim();

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
          ...(trimmedPassword ? { password: trimmedPassword } : {}),
          isActive: form.isActive,
          roleAssignments: [{ role: form.role, system: 'VRMS' }],
        });

    setUsers((current) => {
      const exists = current.some((user) => user.id === savedUser.id);
      return exists
        ? current.map((user) => (user.id === savedUser.id ? savedUser : user))
        : [savedUser, ...current];
    });

    return savedUser;
  };

  const toggleUserStatus = async (user: ManagedUser) => {
    const updated = await setUserStatus(user.id, !user.isActive);
    setUsers((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    return updated;
  };

  const resetPassword = async (user: ManagedUser, password: string) => {
    const updated = await resetUserPassword(user.id, password.trim());
    setUsers((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    return updated;
  };

  const unlockUserAccount = async (user: ManagedUser) => {
    const updated = await unlockUser(user.id);
    setUsers((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    return updated;
  };

  return {
    isAdmin,
    users,
    loading,
    error,
    loadUsers,
    saveUser,
    toggleUserStatus,
    resetPassword,
    unlockUserAccount,
  };
}
