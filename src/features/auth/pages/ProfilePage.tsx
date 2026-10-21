import { FormEvent, useState, useEffect } from 'react';
import { User as UserIcon, Lock, Mail, Phone, Shield } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Button } from '../../../components/ui/Button';
import { useToast } from '../../../context/toast';
import { useAuthStore } from '../../../store/authStore';
import { getCurrentUser, updateOwnProfile, changeOwnPassword } from '../../../lib/api/authApi';
import { validatePassword } from '../../user-management/hooks/useUsersManager';
import { getApiErrorMessage } from '../../../lib/api/errors';

export function ProfilePage() {
  const storeUser = useAuthStore((state) => state.user);
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const [profileForm, setProfileForm] = useState({
    name: '',
    email: '',
    contact: '',
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [profileError, setProfileError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  useEffect(() => {
    getCurrentUser()
      .then((fullUser) => {
        setProfileForm({
          name: fullUser.name || '',
          email: fullUser.email || '',
          contact: fullUser.contact || '',
        });
      })
      .catch((err) => {
        console.error('Failed to load user details:', err);
        showToast('Failed to load profile details.', 'error');
      })
      .finally(() => setLoading(false));
  }, [showToast]);

  const handleProfileSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setProfileError(null);

    if (!profileForm.name.trim() || !profileForm.email.trim()) {
      setProfileError('Name and email are required.');
      return;
    }

    setSavingProfile(true);
    try {
      const updatedUser = await updateOwnProfile({
        name: profileForm.name.trim(),
        email: profileForm.email.trim().toLowerCase(),
        contact: profileForm.contact.trim() || undefined,
      });

      // Update local storage and auth store
      if (storeUser) {
        const updated = {
          ...storeUser,
          name: updatedUser.name,
          email: updatedUser.email,
        };
        useAuthStore.setState({ user: updated });
        localStorage.setItem('welinc_user', JSON.stringify(updated));
      }

      showToast('Profile updated successfully.', 'success');
    } catch (err) {
      console.error(err);
      setProfileError(getApiErrorMessage(err, 'Failed to update profile.'));
      showToast('Failed to update profile.', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    const { currentPassword, newPassword, confirmPassword } = passwordForm;

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('All password fields are required.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirm password do not match.');
      return;
    }

    const validationError = validatePassword(newPassword);
    if (validationError) {
      setPasswordError(validationError);
      return;
    }

    setSavingPassword(true);
    try {
      await changeOwnPassword({
        currentPassword,
        newPassword,
        confirmPassword,
      });

      showToast('Password updated successfully.', 'success');
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (err) {
      console.error(err);
      setPasswordError(getApiErrorMessage(err, 'Failed to update password.'));
      showToast('Failed to update password.', 'error');
    } finally {
      setSavingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-container" style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
        <p style={{ color: 'var(--muted)' }}>Loading profile...</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <PageHeader
        title="My Profile"
        subtitle="Manage your personal details and account password"
        icon={UserIcon}
      />

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: 24,
      }}>
        {/* Personal Details Card */}
        <section className="card">
          <div className="section-heading" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 12, marginBottom: 16 }}>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <UserIcon size={18} style={{ color: 'var(--warning)' }} /> Personal Details
            </h3>
            <p style={{ margin: '4px 0 0 0', color: 'var(--muted)', fontSize: 13 }}>Update your name, email, and contact number</p>
          </div>

          <form onSubmit={handleProfileSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="input-group">
              <label className="label" htmlFor="profile-name">
                Full Name <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <input
                id="profile-name"
                className="input"
                value={profileForm.name}
                onChange={(e) => setProfileForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Juan Dela Cruz"
              />
            </div>

            <div className="input-group">
              <label className="label" htmlFor="profile-email">
                Email Address <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="profile-email"
                  type="email"
                  className="input"
                  value={profileForm.email}
                  onChange={(e) => setProfileForm((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="user@welinc.com"
                  style={{ paddingLeft: 34 }}
                />
                <Mail size={16} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
              </div>
            </div>

            <div className="input-group">
              <label className="label" htmlFor="profile-contact">
                Contact Number
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="profile-contact"
                  className="input"
                  value={profileForm.contact}
                  onChange={(e) => setProfileForm((prev) => ({ ...prev, contact: e.target.value }))}
                  placeholder="09171234567"
                  style={{ paddingLeft: 34 }}
                />
                <Phone size={16} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
              </div>
            </div>

            <div className="input-group">
              <label className="label">Role</label>
              <div style={{ position: 'relative' }}>
                <input
                  className="input"
                  value={storeUser?.role === 'ADMIN' ? 'System Administrator' : 'Mechanic'}
                  readOnly
                  style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: 'var(--muted)', cursor: 'not-allowed', paddingLeft: 34 }}
                />
                <Shield size={16} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
              </div>
            </div>

            {profileError && <div className="alert" style={{ margin: 0 }}>{profileError}</div>}

            <div className="form-actions" style={{ marginTop: 8 }}>
              <Button type="submit" disabled={savingProfile}>
                {savingProfile ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </section>

        {/* Change Password Card */}
        <section className="card">
          <div className="section-heading" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 12, marginBottom: 16 }}>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Lock size={18} style={{ color: 'var(--warning)' }} /> Change Password
            </h3>
            <p style={{ margin: '4px 0 0 0', color: 'var(--muted)', fontSize: 13 }}>Update your account security password</p>
          </div>

          <form onSubmit={handlePasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="input-group">
              <label className="label" htmlFor="current-password">
                Current Password <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <input
                id="current-password"
                type="password"
                className="input"
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }))}
                placeholder="Enter your current password"
              />
            </div>

            <div className="input-group">
              <label className="label" htmlFor="new-password">
                New Password <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <input
                id="new-password"
                type="password"
                className="input"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))}
                placeholder="At least 8 characters"
              />
            </div>

            <div className="input-group">
              <label className="label" htmlFor="confirm-password">
                Confirm New Password <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <input
                id="confirm-password"
                type="password"
                className="input"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                placeholder="Re-enter your new password"
              />
            </div>

            {passwordError && <div className="alert" style={{ margin: 0 }}>{passwordError}</div>}

            <div className="form-actions" style={{ marginTop: 8 }}>
              <Button type="submit" disabled={savingPassword}>
                {savingPassword ? 'Updating...' : 'Update Password'}
              </Button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
