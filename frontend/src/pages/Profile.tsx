import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { usersApi } from '../utils/api';
import { Button, Input, Card, ErrorMessage, SuccessMessage, LoadingSpinner } from '../components';

function Profile() {
  const { user, updateUser } = useAuth();
  const [formData, setFormData] = useState({
    username: '',
    first_name: '',
    last_name: '',
    email: ''
  });
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username || '',
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || ''
      });
    }
  }, [user]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const response = await usersApi.getMe();
      const userData = response.data.data;
      setFormData({
        username: userData.username || '',
        first_name: userData.first_name || '',
        last_name: userData.last_name || '',
        email: userData.email || ''
      });
      updateUser(userData);
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSaving(true);

    try {
      const response = await usersApi.updateMe({
        username: formData.username || undefined,
        first_name: formData.first_name || undefined,
        last_name: formData.last_name || undefined
      });
      updateUser(response.data.data);
      setSuccess('Profile updated successfully!');
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (passwordData.new_password !== passwordData.confirm_password) {
      setError('New passwords do not match');
      return;
    }

    if (passwordData.new_password.length < 8) {
      setError('New password must be at least 8 characters long');
      return;
    }

    setSaving(true);

    try {
      await usersApi.changePassword(passwordData.current_password, passwordData.new_password);
      setSuccess('Password changed successfully!');
      setPasswordData({
        current_password: '',
        new_password: '',
        confirm_password: ''
      });
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || 'Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-dark-text-primary mb-2">Profile</h1>
        <p className="text-sm sm:text-base text-dark-text-secondary">Manage your account information</p>
      </div>

      <Card title="Profile Settings">
        {error && (
          <ErrorMessage message={error} onDismiss={() => setError(null)} className="mb-6" />
        )}
        {success && (
          <SuccessMessage message={success} onDismiss={() => setSuccess(null)} className="mb-6" />
        )}

        <form onSubmit={handleUpdateProfile} className="space-y-4">
          <Input
            label="Email"
            type="email"
            value={formData.email}
            disabled
            className="bg-dark-bg-tertiary cursor-not-allowed"
          />

          <Input
            label="Username"
            type="text"
            value={formData.username}
            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            placeholder="Choose a username"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="First Name"
              type="text"
              value={formData.first_name}
              onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
              placeholder="First name"
            />

            <Input
              label="Last Name"
              type="text"
              value={formData.last_name}
              onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
              placeholder="Last name"
            />
          </div>

          <div className="flex justify-end pt-4 border-t border-dark-border-primary">
            <Button type="submit" isLoading={saving}>
              Update Profile
            </Button>
          </div>
        </form>
      </Card>

      <Card title="Change Password">
        {error && (
          <ErrorMessage message={error} onDismiss={() => setError(null)} className="mb-6" />
        )}
        {success && (
          <SuccessMessage message={success} onDismiss={() => setSuccess(null)} className="mb-6" />
        )}

        <form onSubmit={handleChangePassword} className="space-y-4">
          <Input
            label="Current Password"
            type="password"
            value={passwordData.current_password}
            onChange={(e) =>
              setPasswordData({ ...passwordData, current_password: e.target.value })
            }
            required
          />

          <Input
            label="New Password"
            type="password"
            value={passwordData.new_password}
            onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
            placeholder="At least 8 characters"
            required
          />

          <Input
            label="Confirm New Password"
            type="password"
            value={passwordData.confirm_password}
            onChange={(e) =>
              setPasswordData({ ...passwordData, confirm_password: e.target.value })
            }
            required
          />

          <div className="flex justify-end pt-4 border-t border-dark-border-primary">
            <Button type="submit" isLoading={saving} variant="secondary">
              Change Password
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

export default Profile;
