"use client";
import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { User as UserIcon, Globe, Lock, LogOut, UploadCloud, Activity } from 'lucide-react';

const coffeeColors = {
  background: '#f7f3ef',
  accent: '#6f4e37',
  cream: '#e9dbc7',
  highlight: '#c69c6d',
  error: '#b00020',
  success: '#388e3c',
};

const languages = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Spanish' },
  { code: 'fr', label: 'French' },
  { code: 'de', label: 'German' },
  { code: 'hi', label: 'Hindi' },
];

export default function SettingsPage() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [theme, setTheme] = useState('coffee');
  const [notifEnabled, setNotifEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [password, setPassword] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [language, setLanguage] = useState('en');
  const [twoFA, setTwoFA] = useState(false);
  const [activityLog, setActivityLog] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchUser = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = '/auth';
        return;
      }
      setUser(user);
      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      setProfile(profileData);
      setTheme(profileData?.theme || 'coffee');
      setNotifEnabled(profileData?.notifications_enabled ?? true);
      setAvatarUrl(profileData?.avatar_url || '');
      setLanguage(profileData?.language || 'en');
      setTwoFA(profileData?.two_fa_enabled ?? false);
      // Fetch activity log (mock if not available)
      const { data: logData } = await supabase.from('activity_log').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
      setActivityLog(logData || [
        { id: 1, action: 'Logged in', created_at: new Date().toISOString() },
        { id: 2, action: 'Changed password', created_at: new Date(Date.now() - 86400000).toISOString() },
      ]);
      setLoading(false);
    };
    fetchUser();
  }, []);

  // Live theme update
  useEffect(() => {
    document.body.style.background = theme === 'coffee' ? coffeeColors.background : theme === 'dark' ? '#222' : '#fff';
    document.body.style.color = theme === 'dark' ? '#fff' : coffeeColors.accent;
  }, [theme]);

  const handleThemeChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (!user) return;
    const newTheme = e.target.value;
    setTheme(newTheme);
    setMessage('');
    setError('');
    const { error } = await supabase.from('profiles').update({ theme: newTheme }).eq('id', user.id);
    if (error) setError('Failed to update theme.');
    else setMessage('Theme updated!');
  };

  const handleNotifChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user) return;
    const enabled = e.target.checked;
    setNotifEnabled(enabled);
    setMessage('');
    setError('');
    const { error } = await supabase.from('profiles').update({ notifications_enabled: enabled }).eq('id', user.id);
    if (error) setError('Failed to update notification preferences.');
    else setMessage('Notification preferences updated!');
  };

  const handlePasswordChange = async () => {
    if (!user) return;
    setMessage('');
    setError('');
    if (!password) return setError('Enter a new password.');
    const { error } = await supabase.auth.updateUser({ password });
    if (error) setError('Failed to change password.');
    else setMessage('Password changed!');
    setPassword('');
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    setDeleting(true);
    setMessage('');
    setError('');
    const { error } = await supabase.rpc('delete_user', { uid: user.id });
    if (error) setError('Failed to delete account.');
    else {
      setMessage('Account deleted.');
      await supabase.auth.signOut();
      window.location.href = '/auth';
    }
    setDeleting(false);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setAvatarUploading(true);
    setMessage('');
    setError('');
    const fileExt = file.name.split('.').pop();
    const filePath = `avatars/${user.id}.${fileExt}`;
    const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file, { upsert: true });
    if (uploadError) {
      setError('Failed to upload avatar.');
      setAvatarUploading(false);
      return;
    }
    const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
    setAvatarUrl(data.publicUrl);
    await supabase.from('profiles').update({ avatar_url: data.publicUrl }).eq('id', user.id);
    setMessage('Avatar updated!');
    setAvatarUploading(false);
  };

  const handleLanguageChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (!user) return;
    const lang = e.target.value;
    setLanguage(lang);
    setMessage('');
    setError('');
    const { error } = await supabase.from('profiles').update({ language: lang }).eq('id', user.id);
    if (error) setError('Failed to update language.');
    else setMessage('Language updated!');
  };

  const handle2FAToggle = async () => {
    if (!user) return;
    setTwoFA(v => !v);
    setMessage('');
    setError('');
    const { error } = await supabase.from('profiles').update({ two_fa_enabled: !twoFA }).eq('id', user.id);
    if (error) setError('Failed to update 2FA.');
    else setMessage(`2FA ${!twoFA ? 'enabled' : 'disabled'}!`);
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: coffeeColors.accent }}>Loading...</div>;

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', background: '#fff', borderRadius: 18, boxShadow: '0 4px 24px #c69c6d22', padding: 32, marginTop: 40 }}>
      <h2 style={{ color: coffeeColors.accent, fontWeight: 700, fontSize: 28, marginBottom: 18 }}>Settings</h2>
      {/* Avatar Section */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 32 }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: coffeeColors.cream, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', border: `2px solid ${coffeeColors.accent}` }}>
          {avatarUrl ? <img src={avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <UserIcon size={40} color={coffeeColors.accent} />}
        </div>
        <div>
          <button onClick={() => fileInputRef.current?.click()} style={{ background: coffeeColors.accent, color: '#fff', border: 'none', borderRadius: 8, padding: '8px 18px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }} disabled={avatarUploading}>
            <UploadCloud size={18} /> {avatarUploading ? 'Uploading...' : 'Change Avatar'}
          </button>
          <input type="file" accept="image/*" ref={fileInputRef} style={{ display: 'none' }} onChange={handleAvatarUpload} />
        </div>
      </div>
      {/* Theme & Language */}
      <div style={{ display: 'flex', gap: 32, marginBottom: 28 }}>
        <div style={{ flex: 1 }}>
          <label style={{ color: coffeeColors.accent, fontWeight: 600 }}>Theme:</label>
          <select value={theme} onChange={handleThemeChange} style={{ marginLeft: 12, padding: 8, borderRadius: 8, border: `1px solid ${coffeeColors.accent}33`, background: coffeeColors.cream, color: coffeeColors.accent }}>
            <option value='coffee'>Coffee</option>
            <option value='light'>Light</option>
            <option value='dark'>Dark</option>
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ color: coffeeColors.accent, fontWeight: 600 }}>Language:</label>
          <select value={language} onChange={handleLanguageChange} style={{ marginLeft: 12, padding: 8, borderRadius: 8, border: `1px solid ${coffeeColors.accent}33`, background: coffeeColors.cream, color: coffeeColors.accent }}>
            {languages.map(lang => <option key={lang.code} value={lang.code}>{lang.label}</option>)}
          </select>
        </div>
      </div>
      {/* Notifications & 2FA */}
      <div style={{ display: 'flex', gap: 32, marginBottom: 28 }}>
        <div style={{ flex: 1 }}>
          <label style={{ color: coffeeColors.accent, fontWeight: 600 }}>Enable Notifications:</label>
          <input type='checkbox' checked={notifEnabled} onChange={handleNotifChange} style={{ marginLeft: 12, transform: 'scale(1.3)' }} />
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Lock size={18} color={twoFA ? coffeeColors.success : coffeeColors.accent} />
          <label style={{ color: coffeeColors.accent, fontWeight: 600 }}>2FA:</label>
          <input type='checkbox' checked={twoFA} onChange={handle2FAToggle} style={{ marginLeft: 8, transform: 'scale(1.3)' }} />
          <span style={{ color: twoFA ? coffeeColors.success : coffeeColors.accent, fontWeight: 600, marginLeft: 8 }}>{twoFA ? 'Enabled' : 'Disabled'}</span>
        </div>
      </div>
      {/* Password & Delete */}
      <div style={{ marginBottom: 28 }}>
        <label style={{ color: coffeeColors.accent, fontWeight: 600 }}>Change Password:</label>
        <input type='password' value={password} onChange={e => setPassword(e.target.value)} placeholder='New password' style={{ marginLeft: 12, padding: 8, borderRadius: 8, border: `1px solid ${coffeeColors.accent}33`, background: coffeeColors.cream, color: coffeeColors.accent }} />
        <button onClick={handlePasswordChange} style={{ marginLeft: 12, background: coffeeColors.accent, color: '#fff', border: 'none', borderRadius: 8, padding: '8px 18px', fontWeight: 600, cursor: 'pointer' }}>Change</button>
      </div>
      <div style={{ marginBottom: 28 }}>
        <label style={{ color: coffeeColors.error, fontWeight: 600 }}>Delete Account:</label>
        <button onClick={handleDeleteAccount} disabled={deleting} style={{ marginLeft: 12, background: coffeeColors.error, color: '#fff', border: 'none', borderRadius: 8, padding: '8px 18px', fontWeight: 600, cursor: deleting ? 'not-allowed' : 'pointer', opacity: deleting ? 0.7 : 1 }}>Delete</button>
      </div>
      {/* Activity Log */}
      <div style={{ marginTop: 32 }}>
        <h3 style={{ color: coffeeColors.accent, fontWeight: 700, fontSize: 20, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}><Activity size={20} /> Account Activity</h3>
        <div style={{ background: coffeeColors.cream, borderRadius: 12, padding: 16, maxHeight: 180, overflowY: 'auto' }}>
          {activityLog.length === 0 ? <div style={{ color: coffeeColors.highlight }}>No activity yet.</div> : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {activityLog.map(log => (
                <li key={log.id} style={{ marginBottom: 8, color: coffeeColors.accent, fontSize: 15, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontWeight: 600 }}>{log.action}</span>
                  <span style={{ color: coffeeColors.highlight, fontSize: 13 }}>{new Date(log.created_at).toLocaleString()}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      {message && <div style={{ color: coffeeColors.success, marginTop: 18 }}>{message}</div>}
      {error && <div style={{ color: coffeeColors.error, marginTop: 18 }}>{error}</div>}
    </div>
  );
} 