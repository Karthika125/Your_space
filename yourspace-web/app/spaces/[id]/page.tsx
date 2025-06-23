"use client";
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

const coffeeColors = {
  background: '#f7f3ef',
  accent: '#6f4e37',
  cream: '#e9dbc7',
  highlight: '#c69c6d',
  error: '#b00020',
  success: '#388e3c',
};

export default function SpaceDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const spaceId = params?.id as string;
  const [space, setSpace] = useState<any>(null);
  const [slots, setSlots] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<any>(null);
  const [selectedSeat, setSelectedSeat] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [user, setUser] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/auth');
        return;
      }
      setUser(user);
      const { data: spaceData } = await supabase.from('spaces').select('*').eq('id', spaceId).single();
      setSpace(spaceData);
      const { data: slotsData } = await supabase.from('slots').select('*').eq('space_id', spaceId).order('start_time');
      setSlots(slotsData || []);
      const { data: bookingsData } = await supabase.from('bookings').select('*').eq('space_id', spaceId);
      setBookings(bookingsData || []);
      setLoading(false);
    };
    if (spaceId) fetchData();
    // Realtime updates
    const bookingSub = supabase
      .channel('bookings')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, payload => {
        if (payload.new.space_id === spaceId) {
          setBookings(prev => {
            const filtered = prev.filter(b => b.id !== payload.new.id);
            return [...filtered, payload.new];
          });
        }
      })
      .subscribe();
    return () => {
      supabase.removeChannel(bookingSub);
    };
  }, [spaceId, router]);

  // Filter slots by selected date
  const filteredSlots = selectedDate
    ? slots.filter(slot => {
        let slotDate = '';
        if (slot.start_time) {
          const d = new Date(slot.start_time);
          if (!isNaN(d.getTime())) {
            slotDate = d.toISOString().slice(0, 10);
          }
        }
        return slotDate === selectedDate;
      })
    : slots.filter(slot => {
        if (!slot.start_time) return false;
        const d = new Date(slot.start_time);
        return !isNaN(d.getTime());
      });

  // Get seat status for selected slot
  const getSeatStatus = (slotId: string) => {
    const slotBookings = bookings.filter(b => b.slot_id === slotId);
    const seatStatus: Record<number, boolean> = {};
    slotBookings.forEach(b => {
      seatStatus[b.seat_number] = true;
    });
    return seatStatus;
  };

  const handleBook = async () => {
    if (!selectedSlot || selectedSeat == null) return;
    setBookingLoading(true);
    setError('');
    setSuccess('');
    // Check if seat is still available
    const seatStatus = getSeatStatus(selectedSlot.id);
    if (seatStatus[selectedSeat]) {
      setError('Seat just got booked! Please select another.');
      setBookingLoading(false);
      return;
    }
    const { error: bookingError } = await supabase.from('bookings').insert({
      user_id: user.id,
      space_id: spaceId,
      slot_id: selectedSlot.id,
      seat_number: selectedSeat,
    });
    if (bookingError) {
      setError('Booking failed. Try again.');
    } else {
      setSuccess('Booking successful!');
      setSelectedSeat(null);
    }
    setBookingLoading(false);
  };

  if (loading || !space) return <div style={{ padding: 40, textAlign: 'center', color: coffeeColors.accent }}>Loading...</div>;

  return (
    <div style={{ background: coffeeColors.background, minHeight: '100vh', padding: 24 }}>
      <div style={{ maxWidth: 700, margin: '0 auto', background: '#fff', borderRadius: 18, boxShadow: '0 4px 24px #c69c6d22', padding: 32 }}>
        <div style={{ color: coffeeColors.error, fontWeight: 600, marginBottom: 12, fontSize: 15 }}>
          If you see no slots, please add slots for this space and date in the Admin Dashboard.
        </div>
        <h2 style={{ color: coffeeColors.accent, fontWeight: 700, fontSize: 32, marginBottom: 8 }}>{space.name}</h2>
        <div style={{ color: coffeeColors.highlight, fontSize: 18, marginBottom: 18 }}>{space.description}</div>
        <div style={{ marginBottom: 24 }}>
          <label style={{ color: coffeeColors.accent, fontWeight: 600, marginRight: 12 }}>Select Date:</label>
          <input
            type="date"
            value={selectedDate}
            onChange={e => { setSelectedDate(e.target.value); setSelectedSlot(null); setSelectedSeat(null); }}
            style={{ padding: 8, borderRadius: 8, border: `1px solid ${coffeeColors.accent}33`, background: coffeeColors.cream, color: coffeeColors.accent, marginRight: 18 }}
          />
          <label style={{ color: coffeeColors.accent, fontWeight: 600 }}>Select Slot:</label>
          <select value={selectedSlot?.id || ''} onChange={e => { setSelectedSlot(filteredSlots.find(s => s.id === e.target.value)); setSelectedSeat(null); }} style={{ marginLeft: 12, padding: 8, borderRadius: 8, border: `1px solid ${coffeeColors.accent}33`, background: coffeeColors.cream, color: coffeeColors.accent }}>
            <option value='' disabled>Select a slot</option>
            {filteredSlots.map(slot => (
              <option key={slot.id} value={slot.id}>
                {slot.start_time && slot.end_time ?
                  `${new Date(slot.start_time).toLocaleDateString()} ${new Date(slot.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${new Date(slot.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                  : 'Invalid Slot'}
              </option>
            ))}
          </select>
          {selectedDate && filteredSlots.length === 0 && (
            <div style={{ color: coffeeColors.error, marginTop: 12, fontWeight: 600 }}>
              No slots available for this date.
            </div>
          )}
        </div>
        {selectedSlot && filteredSlots.length > 0 && (
          <div>
            <div style={{ color: coffeeColors.accent, fontWeight: 600, marginBottom: 8 }}>Select a Seat:</div>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(6, space.capacity)}, 1fr)`, gap: 16, marginBottom: 24 }}>
              {Array.from({ length: space.capacity }).map((_, idx) => {
                const seatStatus = getSeatStatus(selectedSlot.id);
                const isBooked = seatStatus[idx + 1];
                const isSelected = selectedSeat === idx + 1;
                return (
                  <button
                    key={idx}
                    disabled={isBooked || bookingLoading}
                    onClick={() => setSelectedSeat(idx + 1)}
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: '50%',
                      border: isSelected ? `3px solid ${coffeeColors.accent}` : `2px solid ${isBooked ? '#ccc' : coffeeColors.highlight}`,
                      background: isBooked ? '#eee' : isSelected ? coffeeColors.cream : '#fff',
                      color: isBooked ? '#ccc' : coffeeColors.accent,
                      fontSize: 28,
                      cursor: isBooked ? 'not-allowed' : 'pointer',
                      boxShadow: isSelected ? `0 0 0 4px ${coffeeColors.accent}22` : 'none',
                      transition: 'all 0.2s',
                    }}
                    aria-label={isBooked ? 'Booked' : isSelected ? 'Selected' : 'Available'}
                  >
                    💺
                  </button>
                );
              })}
            </div>
            <button
              onClick={handleBook}
              disabled={selectedSeat == null || bookingLoading}
              style={{
                background: coffeeColors.accent,
                color: '#fff',
                padding: '12px 32px',
                border: 'none',
                borderRadius: 10,
                fontWeight: 700,
                fontSize: 18,
                cursor: selectedSeat == null || bookingLoading ? 'not-allowed' : 'pointer',
                opacity: selectedSeat == null || bookingLoading ? 0.7 : 1,
                marginTop: 8,
                boxShadow: '0 2px 8px #c69c6d22',
                transition: 'all 0.2s',
              }}
            >
              {bookingLoading ? 'Booking...' : 'Book Seat'}
            </button>
            {error && <div style={{ color: coffeeColors.error, marginTop: 12 }}>{error}</div>}
            {success && <div style={{ color: coffeeColors.success, marginTop: 12 }}>{success}</div>}
          </div>
        )}
      </div>
    </div>
  );
} 