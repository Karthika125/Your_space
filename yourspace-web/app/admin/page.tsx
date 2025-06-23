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

export default function AdminPage() {
  const [user, setUser] = useState<any>(null);
  const [spaces, setSpaces] = useState<any[]>([]);
  const [slots, setSlots] = useState<any[]>([]);
  const [selectedSpace, setSelectedSpace] = useState<any>(null);
  const [newSlot, setNewSlot] = useState({ date: '', start_time: '', end_time: '', capacity: 1 });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [bookings, setBookings] = useState<any[]>([]);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (!user) {
        setLoading(false);
        return;
      }
      // Check admin access using admins table
      const { data: adminRow } = await supabase.from('admins').select('id').eq('id', user.id).single();
      if (!adminRow) {
        setLoading(false);
        return;
      }
      setLoading(false);
    };
    fetchUser();
  }, []);

  useEffect(() => {
    const fetchSpaces = async () => {
      setLoading(true);
      const { data } = await supabase.from('spaces').select('*');
      setSpaces(data || []);
      setLoading(false);
    };
    fetchSpaces();
  }, []);

  useEffect(() => {
    if (!selectedSpace) return;
    const fetchSlots = async () => {
      setLoading(true);
      const { data } = await supabase.from('slots').select('*').eq('space_id', selectedSpace.id).order('start_time');
      setSlots(data || []);
      setLoading(false);
    };
    fetchSlots();
  }, [selectedSpace]);

  const handleAddSlot = async (e: any) => {
    e.preventDefault();
    setMessage('');
    setError('');
    if (!selectedSpace) return;
    const { error } = await supabase.from('slots').insert({
      space_id: selectedSpace.id,
      date: newSlot.date,
      start_time: newSlot.start_time,
      end_time: newSlot.end_time,
      capacity: newSlot.capacity,
    });
    if (error) setError('Failed to add slot.');
    else {
      setMessage('Slot added!');
      setNewSlot({ date: '', start_time: '', end_time: '', capacity: 1 });
      // Refresh slots
      const { data } = await supabase.from('slots').select('*').eq('space_id', selectedSpace.id).order('start_time');
      setSlots(data || []);
    }
  };

  const handleDeleteSlot = async (slotId: any) => {
    setError('');
    const { error } = await supabase.from('slots').delete().eq('id', slotId);
    if (error) setError('Failed to delete slot.');
    else setSlots(slots.filter((s: any) => s.id !== slotId));
  };

  const handleViewBookings = async (slotId: any) => {
    setBookings([]);
    const { data } = await supabase.from('bookings').select('*, profiles(full_name)').eq('slot_id', slotId);
    setBookings(data || []);
  };

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center', color: coffeeColors.accent }}>Loading...</div>;
  }
  if (!user) {
    if (typeof window !== 'undefined') window.location.href = '/auth';
    return null;
  }

  return (
    <div style={{ background: coffeeColors.background, minHeight: '100vh', padding: 24 }}>
      <div style={{ maxWidth: 900, margin: '0 auto', background: '#fff', borderRadius: 18, boxShadow: '0 4px 24px #c69c6d22', padding: 32 }}>
        <h2 style={{ color: coffeeColors.accent, fontWeight: 700, fontSize: 32, marginBottom: 8 }}>Admin Dashboard</h2>
        <div style={{ marginBottom: 24 }}>
          <label style={{ color: coffeeColors.accent, fontWeight: 600 }}>Select Space:</label>
          <select value={selectedSpace?.id || ''} onChange={e => setSelectedSpace(spaces.find(s => s.id === e.target.value))} style={{ marginLeft: 12, padding: 8, borderRadius: 8, border: `1px solid ${coffeeColors.accent}33`, background: coffeeColors.cream, color: coffeeColors.accent }}>
            <option value='' disabled>Select a space</option>
            {spaces.map(space => (
              <option key={space.id} value={space.id}>{space.name}</option>
            ))}
          </select>
        </div>
        {selectedSpace && (
          <div style={{ marginBottom: 32 }}>
            <h3 style={{ color: coffeeColors.accent, fontWeight: 700, fontSize: 22, marginBottom: 8 }}>Slots for {selectedSpace.name}</h3>
            <form onSubmit={handleAddSlot} style={{ display: 'flex', gap: 12, marginBottom: 18 }}>
              <input type='date' value={newSlot.date} onChange={e => setNewSlot({ ...newSlot, date: e.target.value })} required style={{ padding: 8, borderRadius: 8, border: `1px solid ${coffeeColors.accent}33`, background: coffeeColors.cream, color: coffeeColors.accent }} />
              <input type='time' value={newSlot.start_time} onChange={e => setNewSlot({ ...newSlot, start_time: e.target.value })} required style={{ padding: 8, borderRadius: 8, border: `1px solid ${coffeeColors.accent}33`, background: coffeeColors.cream, color: coffeeColors.accent }} />
              <input type='time' value={newSlot.end_time} onChange={e => setNewSlot({ ...newSlot, end_time: e.target.value })} required style={{ padding: 8, borderRadius: 8, border: `1px solid ${coffeeColors.accent}33`, background: coffeeColors.cream, color: coffeeColors.accent }} />
              <input type='number' min={1} value={newSlot.capacity} onChange={e => setNewSlot({ ...newSlot, capacity: Number(e.target.value) })} required style={{ width: 80, padding: 8, borderRadius: 8, border: `1px solid ${coffeeColors.accent}33`, background: coffeeColors.cream, color: coffeeColors.accent }} placeholder='Capacity' />
              <button type='submit' style={{ background: coffeeColors.accent, color: '#fff', border: 'none', borderRadius: 8, padding: '8px 18px', fontWeight: 600, cursor: 'pointer' }}>Add Slot</button>
            </form>
            {message && <div style={{ color: coffeeColors.success, marginBottom: 8 }}>{message}</div>}
            {error && <div style={{ color: coffeeColors.error, marginBottom: 8 }}>{error}</div>}
            <table style={{ width: '100%', background: coffeeColors.cream, borderRadius: 10, marginBottom: 18 }}>
              <thead>
                <tr style={{ color: coffeeColors.accent, fontWeight: 700 }}>
                  <th>Date</th>
                  <th>Start</th>
                  <th>End</th>
                  <th>Capacity</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {slots.map(slot => (
                  <tr key={slot.id}>
                    <td>{slot.date}</td>
                    <td>{slot.start_time}</td>
                    <td>{slot.end_time}</td>
                    <td>{slot.capacity}</td>
                    <td>
                      <button onClick={() => handleDeleteSlot(slot.id)} style={{ background: coffeeColors.error, color: '#fff', border: 'none', borderRadius: 6, padding: '4px 10px', fontWeight: 600, cursor: 'pointer', marginRight: 8 }}>Delete</button>
                      <button onClick={() => handleViewBookings(slot.id)} style={{ background: coffeeColors.accent, color: '#fff', border: 'none', borderRadius: 6, padding: '4px 10px', fontWeight: 600, cursor: 'pointer' }}>View Bookings</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {bookings.length > 0 && (
              <div style={{ background: coffeeColors.cream, borderRadius: 10, padding: 16, marginTop: 12 }}>
                <h4 style={{ color: coffeeColors.accent, fontWeight: 700, fontSize: 18, marginBottom: 8 }}>Bookings for selected slot</h4>
                <ul style={{ listStyle: 'none', padding: 0 }}>
                  {bookings.map(b => (
                    <li key={b.id} style={{ marginBottom: 8, color: coffeeColors.accent, fontSize: 15 }}>
                      {b.profiles?.full_name || 'User'} — Seat {b.seat_number} — Status: {b.status}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 