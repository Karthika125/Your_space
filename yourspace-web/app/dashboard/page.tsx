"use client";
import { useEffect, useState } from 'react';
import { Coffee, Calendar, Clock, CreditCard, Star, Bell, Settings, LogOut, Plus, Filter, User, DollarSign, Home, Settings as SettingsIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';

const coffeeColors = {
  bg: '#f7f3ee',
  card: '#fff8f0',
  accent: '#c69c6d',
  dark: '#6f4e37',
  darkBrown: '#3e2723',
  cream: '#faf6f0',
  lightBrown: '#d4a574',
  espresso: '#2c1810',
  text: '#3e2723',
  error: '#b00020',
  success: '#388e3c',
};

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [currentView, setCurrentView] = useState('dashboard');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedSpace, setSelectedSpace] = useState<any>(null);
  const [spaces, setSpaces] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingSpaces, setLoadingSpaces] = useState(true);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [loadingNotifications, setLoadingNotifications] = useState(true);
  const [timeSlots] = useState([
    '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'
  ]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [editName, setEditName] = useState(profile?.full_name || '');
  const [editPhone, setEditPhone] = useState(profile?.phone || '');
  const [editLoading, setEditLoading] = useState(false);
  const [spaceTypeFilter, setSpaceTypeFilter] = useState('All Types');
  const [filteredSpaces, setFilteredSpaces] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [seatAvailability, setSeatAvailability] = useState<Record<string, { total: number, available: number }>>({});
  const router = useRouter();

  // Add state for unread notifications
  const unreadCount = notifications.filter(n => !n.read).length;

  // Fetch user and profile
  useEffect(() => {
    const fetchUserAndProfile = async () => {
      setLoadingProfile(true);
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        router.replace('/auth');
        return;
      }
      setUser(userData.user);
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userData.user.id)
        .single();
      setProfile(profileData);
      setLoadingProfile(false);
    };
    fetchUserAndProfile();
  }, [router]);

  // Fetch spaces
  useEffect(() => {
    setLoadingSpaces(true);
    supabase
      .from('spaces')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setSpaces(data || []);
        setLoadingSpaces(false);
      });
  }, []);

  // Filter spaces by type
  useEffect(() => {
    if (spaceTypeFilter === 'All Types') setFilteredSpaces(spaces);
    else setFilteredSpaces(spaces.filter(s => s.type === spaceTypeFilter.toLowerCase().replace(' ', '_')));
  }, [spaces, spaceTypeFilter]);

  // Fetch bookings for user
  useEffect(() => {
    if (!user) return;
    setLoadingBookings(true);
    supabase
      .from('bookings')
      .select('*, slots(*), spaces(*)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setBookings(data || []);
        setLoadingBookings(false);
      });
  }, [user]);

  // Fetch notifications for user
  useEffect(() => {
    if (!user) return;
    setLoadingNotifications(true);
    supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setNotifications(data || []);
        setLoadingNotifications(false);
      });
  }, [user]);

  // Fetch feedback for all spaces the user has booked
  useEffect(() => {
    if (!bookings.length) return;
    const spaceIds = bookings.map(b => b.space_id).filter(Boolean);
    if (!spaceIds.length) return;
    const fetchFeedbacks = async () => {
      const { data: feedbackData } = await supabase
        .from('feedback')
        .select('*, profiles(full_name), spaces(name)')
        .in('space_id', spaceIds);
      setFeedbacks(feedbackData || []);
    };
    fetchFeedbacks();
  }, [bookings]);

  // Fetch seat availability for each space (next available slot)
  useEffect(() => {
    const fetchSeatAvailability = async () => {
      const result: Record<string, { total: number, available: number }> = {};
      for (const space of spaces) {
        // Get next available slot for this space
        const { data: slots } = await supabase
          .from('slots')
          .select('*')
          .eq('space_id', space.id)
          .gte('date', new Date().toISOString().split('T')[0])
          .order('date', { ascending: true })
          .limit(1);
        const slot = slots?.[0];
        if (slot) {
          // Get bookings for this slot
          const { data: bookings } = await supabase
            .from('bookings')
            .select('seat_numbers')
            .eq('slot_id', slot.id)
            .eq('status', 'confirmed');
          const occupied = (bookings || []).flatMap(b => b.seat_numbers || []);
          result[space.id] = {
            total: space.capacity,
            available: space.capacity - occupied.length
          };
        } else {
          result[space.id] = { total: space.capacity, available: space.capacity };
        }
      }
      setSeatAvailability(result);
    };
    if (spaces.length > 0) fetchSeatAvailability();
  }, [spaces]);

  const getSpaceIcon = (type: string) => {
    switch(type) {
      case 'cubicle': return '🏢';
      case 'meeting': return '👥';
      case 'common': return '☕';
      default: return '📍';
    }
  };

  const StatCard = ({ icon, title, value, change, color }: any) => (
    <div style={{
      background: `linear-gradient(135deg, ${coffeeColors.card}, ${coffeeColors.cream})`,
      borderRadius: 18,
      padding: '1.2rem 1rem',
      border: `1.5px solid ${coffeeColors.accent}22`,
      boxShadow: '0 2px 12px #c69c6d11',
      flex: 1,
      minWidth: 140,
      margin: 4,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      transition: 'all 0.3s',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <div style={{ background: coffeeColors.accent, borderRadius: 12, padding: 6, color: '#fff', display: 'flex', alignItems: 'center' }}>{icon}</div>
        {change && (
          <span style={{ fontSize: 12, fontWeight: 500, color: '#388e3c', background: '#e8f5e9', borderRadius: 8, padding: '2px 8px' }}>+{change}%</span>
        )}
      </div>
      <div style={{ fontSize: 14, color: coffeeColors.dark, fontWeight: 600, marginBottom: 2 }}>{title}</div>
      <div style={{ fontSize: 24, fontWeight: 800, color: coffeeColors.darkBrown }}>{value}</div>
    </div>
  );

  const SpaceCard = ({ space, onSelect }: any) => (
    <div 
      style={{
        background: '#fff',
        borderRadius: 18,
        padding: 18,
        border: `2px solid ${space.available ? coffeeColors.accent + '33' : '#eee'}`,
        boxShadow: space.available ? '0 4px 16px #c69c6d11' : 'none',
        opacity: space.available ? 1 : 0.6,
        cursor: space.available ? 'pointer' : 'not-allowed',
        marginBottom: 12,
        marginRight: 8,
        marginLeft: 0,
        marginTop: 0,
        transition: 'all 0.3s',
        minWidth: 220,
        maxWidth: 340,
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
      onClick={() => space.available && onSelect(space)}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 24 }}>{getSpaceIcon(space.type)}</span>
          <div>
            <div style={{ fontWeight: 700, color: coffeeColors.darkBrown }}>{space.name}</div>
            <div style={{ fontSize: 12, color: coffeeColors.accent, textTransform: 'capitalize' }}>{space.type} • {space.capacity} people</div>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: coffeeColors.accent }}>${space.price}</div>
          <div style={{ fontSize: 11, color: coffeeColors.accent }}>per hour</div>
        </div>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
        {space.amenities.map((amenity: string, idx: number) => (
          <span key={idx} style={{ fontSize: 11, background: coffeeColors.cream, color: coffeeColors.accent, padding: '2px 8px', borderRadius: 8, marginRight: 2 }}>{amenity}</span>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12, fontWeight: 500, padding: '2px 8px', borderRadius: 8, background: space.available ? '#e8f5e9' : '#ffebee', color: space.available ? '#388e3c' : '#b71c1c' }}>
          {space.available ? '✓ Available' : '✕ Occupied'}
        </span>
        {space.available && (
          <button style={{ fontSize: 12, background: coffeeColors.accent, color: '#fff', padding: '4px 14px', borderRadius: 12, border: 'none', cursor: 'pointer', fontWeight: 600, transition: 'background 0.2s' }}>
            Book Now
          </button>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 2, marginTop: 6 }}>
        {Array.from({ length: seatAvailability[space.id]?.total || space.capacity }).map((_, idx) => (
          <span key={idx} role="img" aria-label="seat" style={{ fontSize: 18, color: idx < (seatAvailability[space.id]?.available || space.capacity) ? coffeeColors.accent : '#ccc' }}>💺</span>
        ))}
        <span style={{ fontSize: 13, color: coffeeColors.accent, marginLeft: 6 }}>
          {seatAvailability[space.id]?.available ?? space.capacity} / {seatAvailability[space.id]?.total ?? space.capacity} available
        </span>
      </div>
    </div>
  );

  const BookingModal = ({ space, onClose }: any) => {
    const [selectedTime, setSelectedTime] = useState('');
    const [duration, setDuration] = useState(1);
    const [bookingLoading, setBookingLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const router = useRouter();

    const handleBook = async (payNow: boolean) => {
      setBookingLoading(true);
      setError('');
      setSuccess('');
      // 1. Create booking in DB with status and payment_status
      const bookingData = {
        user_id: user.id,
        space_id: space.id,
        slot_time: selectedTime,
        duration,
        status: payNow ? 'pending' : 'pending',
        payment_status: payNow ? 'pending' : 'onsite',
      };
      const { data, error: bookingError } = await supabase.from('bookings').insert(bookingData).select().single();
      if (bookingError) {
        setError('Booking failed. Try again.');
        setBookingLoading(false);
        return;
      }
      if (payNow) {
        // Redirect to payment page with booking id
        router.push(`/payment?booking_id=${data.id}`);
      } else {
        setSuccess('Seat reserved! Please pay onsite to confirm.');
        setBookingLoading(false);
        onClose();
      }
    };

    return (
      <div style={{ position: 'fixed', inset: 0, background: '#0008', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}>
        <div style={{ background: '#fff', borderRadius: 24, padding: 32, maxWidth: 400, width: '100%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 8px 32px #c69c6d22' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: coffeeColors.accent }}>Book {space.name}</div>
            <button onClick={onClose} style={{ color: coffeeColors.accent, fontSize: 20, background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: coffeeColors.dark, marginBottom: 6 }}>Date</label>
            <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} style={{ width: '100%', padding: 10, borderRadius: 10, border: `1.5px solid ${coffeeColors.accent}55`, fontSize: 15, color: coffeeColors.dark, background: coffeeColors.cream }} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: coffeeColors.dark, marginBottom: 6 }}>Time Slot</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {timeSlots.map(time => (
                <button
                  key={time}
                  onClick={() => setSelectedTime(time)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 8,
                    fontSize: 14,
                    background: selectedTime === time ? coffeeColors.accent : coffeeColors.cream,
                    color: selectedTime === time ? '#fff' : coffeeColors.dark,
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: 600,
                    transition: 'background 0.2s',
                  }}
                >
                  {time}
                </button>
              ))}
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: coffeeColors.dark, marginBottom: 6 }}>Duration (hours)</label>
            <select value={duration} onChange={e => setDuration(Number(e.target.value))} style={{ width: '100%', padding: 10, borderRadius: 10, border: `1.5px solid ${coffeeColors.accent}55`, fontSize: 15, color: coffeeColors.dark, background: coffeeColors.cream }}>
              {[1,2,3,4,5,6,7,8].map(h => (
                <option key={h} value={h}>{h} hour{h > 1 ? 's' : ''}</option>
              ))}
            </select>
          </div>
          <div style={{ background: coffeeColors.cream, padding: 16, borderRadius: 14, marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ color: coffeeColors.dark }}>Subtotal</span>
              <span style={{ fontWeight: 600 }}>${space.price * duration}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ color: coffeeColors.dark }}>Platform fee</span>
              <span style={{ fontWeight: 600 }}>$2</span>
            </div>
            <div style={{ borderTop: `1px solid ${coffeeColors.accent}22`, paddingTop: 8, display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 700, color: coffeeColors.accent }}>Total</span>
              <span style={{ fontWeight: 800, color: coffeeColors.accent, fontSize: 18 }}>${space.price * duration + 2}</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 18 }}>
            <button
              onClick={() => handleBook(true)}
              disabled={bookingLoading}
              style={{ flex: 1, background: coffeeColors.accent, color: '#fff', fontWeight: 700, fontSize: 16, border: 'none', borderRadius: 12, padding: '12px 0', cursor: 'pointer', transition: 'background 0.2s', opacity: bookingLoading ? 0.7 : 1 }}
            >
              Pay Now
            </button>
            <button
              onClick={() => handleBook(false)}
              disabled={bookingLoading}
              style={{ flex: 1, background: coffeeColors.cream, color: coffeeColors.accent, fontWeight: 700, fontSize: 16, borderRadius: 12, padding: '12px 0', cursor: 'pointer', transition: 'background 0.2s', opacity: bookingLoading ? 0.7 : 1, border: `2px solid ${coffeeColors.accent}` }}
            >
              Book & Pay Onsite
            </button>
          </div>
          {error && <div style={{ color: coffeeColors.error, marginTop: 12 }}>{error}</div>}
          {success && <div style={{ color: coffeeColors.success, marginTop: 12 }}>{success}</div>}
        </div>
      </div>
    );
  };

  const renderContent = () => {
    switch(currentView) {
      case 'spaces':
        return (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 8 }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: coffeeColors.darkBrown }}>Available Spaces</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <select value={spaceTypeFilter} onChange={e => setSpaceTypeFilter(e.target.value)} style={{ padding: 8, borderRadius: 8, border: `1.5px solid ${coffeeColors.accent}33`, color: coffeeColors.accent, fontWeight: 600 }}>
                  <option>All Types</option>
                  <option>Cubicle</option>
                  <option>Meeting</option>
                  <option>Common</option>
                </select>
                <button style={{ padding: 8, borderRadius: 8, border: `1.5px solid ${coffeeColors.accent}33`, color: coffeeColors.accent, background: coffeeColors.cream, cursor: 'pointer' }}>
                  <Filter size={18} />
                </button>
              </div>
            </div>
            {loadingSpaces ? (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
                <div style={{ border: '4px solid #c69c6d33', borderTop: '4px solid #c69c6d', borderRadius: '50%', width: 36, height: 36, animation: 'spin 1s linear infinite' }} />
                <style>{`@keyframes spin { 0% { transform: rotate(0deg);} 100% { transform: rotate(360deg);} }`}</style>
              </div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'flex-start' }}>
                {filteredSpaces.map(space => (
                  <Link key={space.id} href={`/spaces/${space.id}`} style={{ textDecoration: 'none', flex: 1, minWidth: 220, maxWidth: 340 }}>
                    <div style={{
                      background: '#fff',
                      borderRadius: 18,
                      padding: 18,
                      border: `2px solid ${seatAvailability[space.id]?.available === 0 ? '#eee' : coffeeColors.accent + '33'}`,
                      boxShadow: seatAvailability[space.id]?.available === 0 ? 'none' : '0 4px 16px #c69c6d11',
                      opacity: seatAvailability[space.id]?.available === 0 ? 0.6 : 1,
                      cursor: seatAvailability[space.id]?.available === 0 ? 'not-allowed' : 'pointer',
                      marginBottom: 12,
                      marginRight: 8,
                      marginLeft: 0,
                      marginTop: 0,
                      transition: 'all 0.3s',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      pointerEvents: seatAvailability[space.id]?.available === 0 ? 'none' : 'auto',
                      boxSizing: 'border-box',
                    }}
                    onMouseEnter={e => {
                      if (seatAvailability[space.id]?.available !== 0) e.currentTarget.style.boxShadow = '0 8px 25px #c69c6d33';
                    }}
                    onMouseLeave={e => {
                      if (seatAvailability[space.id]?.available !== 0) e.currentTarget.style.boxShadow = '0 4px 16px #c69c6d11';
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 24 }}>{space.type === 'cubicle' ? '🏢' : space.type === 'meeting' ? '👥' : '☕'}</span>
                          <div>
                            <div style={{ fontWeight: 700, color: coffeeColors.darkBrown }}>{space.name}</div>
                            <div style={{ fontSize: 12, color: coffeeColors.accent, textTransform: 'capitalize' }}>{space.type} • {space.capacity} people</div>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 18, fontWeight: 700, color: coffeeColors.accent }}>${space.price}</div>
                          <div style={{ fontSize: 11, color: coffeeColors.accent }}>per hour</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                        {(space.amenities || []).map((amenity: string, idx: number) => (
                          <span key={idx} style={{ fontSize: 11, background: coffeeColors.cream, color: coffeeColors.accent, padding: '2px 8px', borderRadius: 8, marginRight: 2 }}>{amenity}</span>
                        ))}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 12, fontWeight: 500, padding: '2px 8px', borderRadius: 8, background: seatAvailability[space.id]?.available === 0 ? '#ffebee' : '#e8f5e9', color: seatAvailability[space.id]?.available === 0 ? '#b71c1c' : '#388e3c' }}>
                          {seatAvailability[space.id]?.available === 0 ? 'Fully Occupied' : 'Available'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 2, marginTop: 6 }}>
                        {Array.from({ length: seatAvailability[space.id]?.total || space.capacity }).map((_, idx) => (
                          <span key={idx} role="img" aria-label="seat" style={{ fontSize: 18, color: idx < (seatAvailability[space.id]?.available || space.capacity) ? coffeeColors.accent : '#ccc' }}>💺</span>
                        ))}
                        <span style={{ fontSize: 13, color: coffeeColors.accent, marginLeft: 6 }}>
                          {seatAvailability[space.id]?.available ?? space.capacity} / {seatAvailability[space.id]?.total ?? space.capacity} available
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
                {filteredSpaces.length === 0 && <div style={{ color: coffeeColors.accent, marginTop: 32 }}>No spaces found.</div>}
              </div>
            )}
          </div>
        );
      case 'bookings':
        return (
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, color: coffeeColors.darkBrown, marginBottom: 24 }}>My Bookings</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {bookings.map(booking => (
                <div key={booking.id} style={{ background: '#fff', borderRadius: 18, padding: 18, border: `1.5px solid ${coffeeColors.accent}22`, boxShadow: '0 2px 12px #c69c6d11', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ background: coffeeColors.cream, borderRadius: 12, padding: 8 }}>
                      <Coffee color={coffeeColors.accent} size={20} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, color: coffeeColors.darkBrown }}>{booking.space}</div>
                      <div style={{ fontSize: 13, color: coffeeColors.accent }}>{booking.date} • {booking.time}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: 12, fontWeight: 600, padding: '4px 14px', borderRadius: 12, background: booking.status === 'confirmed' ? '#e8f5e9' : '#fffde7', color: booking.status === 'confirmed' ? '#388e3c' : '#fbc02d' }}>{booking.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      default:
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Welcome Section */}
            <div style={{ background: `linear-gradient(90deg, ${coffeeColors.accent}, ${coffeeColors.dark})`, borderRadius: 24, padding: 28, color: '#fff', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 24, fontWeight: 800, marginBottom: 6 }}>Good morning, {user?.user_metadata?.name}! ☕</div>
                  <div style={{ opacity: 0.92 }}>Ready to brew some productivity today?</div>
                </div>
                <div style={{ fontSize: 48, opacity: 0.18 }}>☕</div>
              </div>
            </div>
            {/* Stats Grid */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 8 }}>
              <StatCard icon={<Calendar color="#fff" size={20} />} title="Active Bookings" value="3" change="12" color="from-blue-500 to-blue-600" />
              <StatCard icon={<Clock color="#fff" size={20} />} title="Hours This Month" value="24" change="8" color="from-emerald-500 to-emerald-600" />
              <StatCard icon={<DollarSign color="#fff" size={20} />} title="Amount Spent" value="$456" change="15" color="from-purple-500 to-purple-600" />
              <StatCard icon={<Star color="#fff" size={20} />} title="Loyalty Points" value="127" change="23" color="from-orange-500 to-orange-600" />
            </div>
            {/* Quick Actions */}
            <div style={{ background: '#fff', borderRadius: 18, padding: 24, border: `1.5px solid ${coffeeColors.accent}22`, marginBottom: 8 }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: coffeeColors.darkBrown, marginBottom: 16 }}>Quick Actions</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
                <button onClick={() => setCurrentView('spaces')} style={{ flex: 1, minWidth: 120, background: coffeeColors.cream, borderRadius: 14, padding: 18, border: 'none', color: coffeeColors.accent, fontWeight: 700, fontSize: 15, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, transition: 'background 0.2s' }}>
                  <Plus color={coffeeColors.accent} size={24} />
                  Book Space
                </button>
                <button style={{ flex: 1, minWidth: 120, background: coffeeColors.cream, borderRadius: 14, padding: 18, border: 'none', color: coffeeColors.accent, fontWeight: 700, fontSize: 15, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, transition: 'background 0.2s' }}>
                  <Calendar color={coffeeColors.accent} size={24} />
                  Schedule
                </button>
                <button style={{ flex: 1, minWidth: 120, background: coffeeColors.cream, borderRadius: 14, padding: 18, border: 'none', color: coffeeColors.accent, fontWeight: 700, fontSize: 15, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, transition: 'background 0.2s' }}>
                  <CreditCard color={coffeeColors.accent} size={24} />
                  Payments
                </button>
                <button style={{ flex: 1, minWidth: 120, background: coffeeColors.cream, borderRadius: 14, padding: 18, border: 'none', color: coffeeColors.accent, fontWeight: 700, fontSize: 15, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, transition: 'background 0.2s' }}>
                  <Star color={coffeeColors.accent} size={24} />
                  Reviews
                </button>
              </div>
            </div>
            {/* Recent Activity */}
            <div style={{ background: '#fff', borderRadius: 18, padding: 24, border: `1.5px solid ${coffeeColors.accent}22` }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: coffeeColors.darkBrown, marginBottom: 16 }}>Recent Activity</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {notifications.map(notif => (
                  <div key={notif.id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: coffeeColors.cream, borderRadius: 12, padding: 12 }}>
                    <div style={{ background: notif.type === 'success' ? '#e8f5e9' : '#e3f2fd', color: notif.type === 'success' ? '#388e3c' : '#1976d2', borderRadius: 8, padding: 6, display: 'flex', alignItems: 'center' }}>
                      <Bell size={16} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, color: coffeeColors.dark }}>{notif.message}</div>
                      <div style={{ fontSize: 12, color: coffeeColors.accent }}>{notif.time}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* Feedback Section */}
            <div style={{ margin: '32px 0' }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: coffeeColors.darkBrown, marginBottom: 12 }}>What people are saying</div>
              <div style={{ display: 'flex', overflowX: 'auto', gap: 16, paddingBottom: 8 }}>
                {feedbacks.map(fb => (
                  <div key={fb.id} style={{ minWidth: 260, background: coffeeColors.cream, borderRadius: 16, padding: 18, boxShadow: '0 2px 8px #c69c6d11', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ fontWeight: 700, color: coffeeColors.accent }}>{fb.spaces?.name}</div>
                    <div style={{ fontSize: 15, color: coffeeColors.dark }}>{fb.comment}</div>
                    <div style={{ fontSize: 13, color: coffeeColors.accent }}>Rating: {fb.rating} ⭐</div>
                    <div style={{ fontSize: 13, color: coffeeColors.darkBrown, opacity: 0.7 }}>by {fb.profiles?.full_name || 'User'}</div>
                  </div>
                ))}
                {feedbacks.length === 0 && <div style={{ color: coffeeColors.accent }}>No feedback yet.</div>}
              </div>
            </div>
          </div>
        );
    }
  };

  // Responsive styles
  const responsiveStyles = `
    @media (max-width: 900px) {
      .main-content { padding: 12px !important; }
      .stat-card, .space-card, .quick-action, .recent-activity { min-width: 120px !important; }
    }
    @media (max-width: 600px) {
      .main-content { padding: 4px !important; }
      .stat-card, .space-card, .quick-action, .recent-activity { min-width: 90vw !important; max-width: 100vw !important; }
    }
  `;

  // Function to update profile
  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditLoading(true);
    await supabase.from('profiles').update({ full_name: editName, phone: editPhone }).eq('id', user.id);
    setProfile({ ...profile, full_name: editName, phone: editPhone });
    setEditLoading(false);
    setShowEditProfile(false);
  };

  // Mark notification as read
  const markAsRead = async (id: string) => {
    await supabase.from('notifications').update({ read: true }).eq('id', id);
    setNotifications(notifications.map(n => n.id === id ? { ...n, read: true } : n));
  };

  // Dismiss notification
  const dismissNotification = async (id: string) => {
    await supabase.from('notifications').delete().eq('id', id);
    setNotifications(notifications.filter(n => n.id !== id));
  };

  // Fix logout to actually sign out
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace('/auth');
  };

  // On mount, check for valid session
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.replace('/auth');
    });
  }, [router]);

  // Show loading spinner if any main data is loading
  if (loadingProfile || loadingSpaces || loadingBookings || loadingNotifications) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: coffeeColors.bg }}>
        <div style={{ border: '4px solid #c69c6d33', borderTop: '4px solid #c69c6d', borderRadius: '50%', width: 48, height: 48, animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { 0% { transform: rotate(0deg);} 100% { transform: rotate(360deg);} }`}</style>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: coffeeColors.bg }}>
      {/* Sidebar */}
      <aside style={{
        width: 90,
        background: coffeeColors.cream,
        borderRight: `2px solid ${coffeeColors.accent}22`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        paddingTop: 32,
        gap: 32,
        position: 'fixed',
        top: 0,
        left: 0,
        height: '100vh',
        zIndex: 10,
      }}>
        <Link href="/dashboard" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: coffeeColors.accent, textDecoration: 'none', marginBottom: 8 }}>
          <Home size={28} />
          <span style={{ fontSize: 13, marginTop: 4 }}>Home</span>
        </Link>
        <Link href="/profile" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: coffeeColors.accent, textDecoration: 'none', marginBottom: 8 }}>
          <User size={28} />
          <span style={{ fontSize: 13, marginTop: 4 }}>Profile</span>
        </Link>
        <Link href="/settings" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: coffeeColors.accent, textDecoration: 'none', marginBottom: 8 }}>
          <SettingsIcon size={28} />
          <span style={{ fontSize: 13, marginTop: 4 }}>Settings</span>
        </Link>
      </aside>
      {/* Main content shifted right */}
      <main style={{ marginLeft: 90, flex: 1, minHeight: '100vh' }}>
        {renderContent()}
      </main>
      {/* Booking Modal */}
      {selectedSpace && (
        <BookingModal space={selectedSpace} onClose={() => setSelectedSpace(null)} />
      )}
      {/* Floating Action Button */}
      <button onClick={() => setCurrentView('spaces')} style={{ position: 'fixed', bottom: 24, right: 24, width: 56, height: 56, background: `linear-gradient(90deg, ${coffeeColors.accent}, ${coffeeColors.dark})`, color: '#fff', borderRadius: '50%', boxShadow: '0 4px 16px #c69c6d33', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, fontSize: 24, transition: 'background 0.2s' }}>
        <Plus size={24} />
      </button>
      {/* Edit Profile Modal */}
      {showEditProfile && (
        <div style={{ position: 'fixed', inset: 0, background: '#0008', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <form onSubmit={handleProfileUpdate} style={{ background: '#fff', borderRadius: 24, padding: 32, minWidth: 320, maxWidth: 400, width: '100%', boxShadow: '0 8px 32px #c69c6d22', display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: coffeeColors.accent, marginBottom: 8 }}>Edit Profile</div>
            <input type="text" value={editName} onChange={e => setEditName(e.target.value)} placeholder="Full Name" required style={{ padding: 10, borderRadius: 10, border: `1.5px solid ${coffeeColors.accent}55`, fontSize: 15, color: coffeeColors.dark, background: coffeeColors.cream }} />
            <input type="text" value={editPhone} onChange={e => setEditPhone(e.target.value)} placeholder="Phone" style={{ padding: 10, borderRadius: 10, border: `1.5px solid ${coffeeColors.accent}55`, fontSize: 15, color: coffeeColors.dark, background: coffeeColors.cream }} />
            <button type="submit" disabled={editLoading} style={{ background: coffeeColors.accent, color: '#fff', fontWeight: 700, fontSize: 16, border: 'none', borderRadius: 12, padding: '12px 0', cursor: 'pointer', marginTop: 8, transition: 'background 0.2s' }}>{editLoading ? 'Saving...' : 'Save'}</button>
            <button type="button" onClick={() => setShowEditProfile(false)} style={{ background: coffeeColors.cream, color: coffeeColors.accent, fontWeight: 600, fontSize: 15, border: 'none', borderRadius: 12, padding: '10px 0', cursor: 'pointer', marginTop: 4 }}>Cancel</button>
          </form>
        </div>
      )}
      {/* Notifications Modal */}
      {showNotifications && (
        <div style={{ position: 'fixed', inset: 0, background: '#0008', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: '#fff', borderRadius: 24, padding: 32, minWidth: 320, maxWidth: 400, width: '100%', boxShadow: '0 8px 32px #c69c6d22', display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: coffeeColors.accent, marginBottom: 8 }}>Notifications</div>
            {notifications.length === 0 ? <div style={{ color: coffeeColors.text }}>No notifications.</div> : (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {notifications.map(n => (
                  <li key={n.id} style={{ background: n.read ? coffeeColors.cream : '#ffe0b2', borderRadius: 10, padding: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, color: coffeeColors.text }}>{n.message}</div>
                      <div style={{ fontSize: 13, color: coffeeColors.accent }}>{new Date(n.created_at).toLocaleString()}</div>
                    </div>
                    {!n.read && <button onClick={() => markAsRead(n.id)} style={{ background: coffeeColors.accent, color: '#fff', border: 'none', borderRadius: 8, padding: '4px 10px', fontWeight: 600, cursor: 'pointer', marginRight: 6 }}>Mark as read</button>}
                    <button onClick={() => dismissNotification(n.id)} style={{ background: '#b00020', color: '#fff', border: 'none', borderRadius: 8, padding: '4px 10px', fontWeight: 600, cursor: 'pointer' }}>Dismiss</button>
                  </li>
                ))}
              </ul>
            )}
            <button type="button" onClick={() => setShowNotifications(false)} style={{ background: coffeeColors.cream, color: coffeeColors.accent, fontWeight: 600, fontSize: 15, border: 'none', borderRadius: 12, padding: '10px 0', cursor: 'pointer', marginTop: 4 }}>Close</button>
          </div>
        </div>
      )}
      {/* Responsive styles */}
      <style>{responsiveStyles}</style>
    </div>
  );
}