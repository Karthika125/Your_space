"use client";
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

const coffeeColors = {
  background: '#f7f3ef',
  accent: '#6f4e37',
  cream: '#e9dbc7',
  highlight: '#c69c6d',
  error: '#b00020',
  success: '#388e3c',
};

export default function ProfilePage() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      setProfile(profileData);
      setEditName(profileData?.full_name || '');
      setEditPhone(profileData?.phone || '');
      const { data: bookingsData } = await supabase.from('bookings').select('*, slots(*), spaces(*)').eq('user_id', user.id);
      setBookings(bookingsData || []);
      const { data: feedbackData } = await supabase.from('feedback').select('*, spaces(name)').eq('user_id', user.id);
      setFeedbacks(feedbackData || []);
      setLoading(false);
    };
    fetchData();
    // Realtime updates
    const bookingSub = supabase
      .channel('bookings')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, payload => {
        if (payload.new.user_id === user?.id) {
          setBookings(prev => {
            const filtered = prev.filter(b => b.id !== payload.new.id);
            return [...filtered, payload.new];
          });
        }
      })
      .subscribe();
    const feedbackSub = supabase
      .channel('feedback')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'feedback' }, payload => {
        if (payload.new.user_id === user?.id) {
          setFeedbacks(prev => {
            const filtered = prev.filter(f => f.id !== payload.new.id);
            return [...filtered, payload.new];
          });
        }
      })
      .subscribe();
    return () => {
      supabase.removeChannel(bookingSub);
      supabase.removeChannel(feedbackSub);
    };
  }, [user?.id]);

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setEditLoading(true);
    setMessage('');
    const { error } = await supabase.from('profiles').update({ full_name: editName, phone: editPhone }).eq('id', user.id);
    if (!error) {
      setProfile({ ...profile, full_name: editName, phone: editPhone });
      setEditMode(false);
      setMessage('Profile updated!');
    }
    setEditLoading(false);
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: coffeeColors.accent }}>Loading...</div>;

  return (
    <div style={{ minHeight: '100vh', background: coffeeColors.background, padding: 24 }}>
      <div style={{ maxWidth: 700, margin: '0 auto', background: '#fff', borderRadius: 18, padding: 32, boxShadow: '0 4px 24px #c69c6d22' }}>
        <h2 style={{ fontSize: 32, fontWeight: 800, color: coffeeColors.accent, marginBottom: 8 }}>My Profile</h2>
        <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontWeight: 700, color: coffeeColors.accent, fontSize: 20 }}>Name: {profile.full_name}</div>
            <div style={{ color: coffeeColors.highlight, fontSize: 16 }}>Email: {user.email}</div>
            <div style={{ color: coffeeColors.accent, fontSize: 16 }}>Phone: {profile.phone || '-'}</div>
          </div>
          <button onClick={() => setEditMode(true)} style={{ background: coffeeColors.accent, color: '#fff', border: 'none', borderRadius: 8, padding: '10px 22px', fontWeight: 600, cursor: 'pointer', fontSize: 16 }}>Edit</button>
        </div>
        {editMode && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: '#0008', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <form onSubmit={handleProfileUpdate} style={{ background: '#fff', borderRadius: 16, padding: 32, minWidth: 320, boxShadow: '0 8px 32px #c69c6d44', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <h3 style={{ color: coffeeColors.accent, fontWeight: 700, fontSize: 22, marginBottom: 8 }}>Edit Profile</h3>
              <input type="text" value={editName} onChange={e => setEditName(e.target.value)} placeholder="Full Name" required style={{ padding: 12, borderRadius: 8, border: `1.5px solid ${coffeeColors.accent}55`, fontSize: 16, color: coffeeColors.accent, background: coffeeColors.cream }} />
              <input type="text" value={editPhone} onChange={e => setEditPhone(e.target.value)} placeholder="Phone" style={{ padding: 12, borderRadius: 8, border: `1.5px solid ${coffeeColors.accent}55`, fontSize: 16, color: coffeeColors.accent, background: coffeeColors.cream }} />
              <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                <button type="submit" disabled={editLoading} style={{ background: coffeeColors.accent, color: '#fff', fontWeight: 700, fontSize: 16, border: 'none', borderRadius: 8, padding: '10px 0', cursor: 'pointer', flex: 1 }}>{editLoading ? 'Saving...' : 'Save'}</button>
                <button type="button" onClick={() => setEditMode(false)} style={{ background: coffeeColors.cream, color: coffeeColors.accent, fontWeight: 600, fontSize: 16, border: 'none', borderRadius: 8, padding: '10px 0', cursor: 'pointer', flex: 1 }}>Cancel</button>
              </div>
              {message && <div style={{ color: coffeeColors.success, marginTop: 8 }}>{message}</div>}
            </form>
          </div>
        )}
        <div style={{ marginTop: 32 }}>
          <h3 style={{ fontSize: 22, fontWeight: 700, color: coffeeColors.accent, marginBottom: 8 }}>Booking History</h3>
          {bookings.length === 0 ? <div style={{ color: coffeeColors.highlight }}>No bookings yet.</div> : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
              {bookings.map(b => (
                <div key={b.id} style={{ background: coffeeColors.cream, borderRadius: 12, padding: 16, boxShadow: '0 2px 8px #c69c6d22', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ fontWeight: 600, color: coffeeColors.accent, fontSize: 17 }}>{b.spaces?.name || '-'}</div>
                  <div style={{ color: coffeeColors.highlight, fontSize: 15 }}>{b.slots?.date} {b.slots?.start_time}-{b.slots?.end_time}</div>
                  <div style={{ color: coffeeColors.accent, fontSize: 14 }}>Status: {b.status}</div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div style={{ marginTop: 32 }}>
          <h3 style={{ fontSize: 22, fontWeight: 700, color: coffeeColors.accent, marginBottom: 8 }}>My Feedback</h3>
          {feedbacks.length === 0 ? <div style={{ color: coffeeColors.highlight }}>No feedback yet.</div> : (
            <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 8 }}>
              {feedbacks.map(fb => (
                <div key={fb.id} style={{ minWidth: 220, background: coffeeColors.cream, borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 6, boxShadow: '0 2px 8px #c69c6d22' }}>
                  <div style={{ fontWeight: 600, color: coffeeColors.accent }}>{fb.spaces?.name}</div>
                  <div style={{ color: coffeeColors.highlight, fontSize: 15 }}>{fb.comment}</div>
                  <div style={{ color: coffeeColors.accent, fontSize: 14 }}>Rating: {fb.rating} ⭐</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 