"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import type { User } from '@supabase/supabase-js';

const coffeeColors = {
  background: '#f7f3ef',
  accent: '#6f4e37',
  cream: '#e9dbc7',
  highlight: '#c69c6d',
  error: '#b00020',
  success: '#388e3c',
  bg: '#f7f3ee',
  card: '#fff8f0',
  dark: '#6f4e37',
  text: '#3e2723',
};

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [role, setRole] = useState('user');
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [modalRole, setModalRole] = useState('user');
  const [modalFullName, setModalFullName] = useState('');
  const [creatingProfile, setCreatingProfile] = useState(false);
  const [pendingUser, setPendingUser] = useState<User | null>(null);
  const router = useRouter();

  const handleCreateProfile = async () => {
    setCreatingProfile(true);
    if (!pendingUser) return;
    
    console.log('=== PROFILE CREATION DEBUG ===');
    console.log('modalRole state:', modalRole);
    console.log('modalFullName state:', modalFullName);
    console.log('pendingUser.id:', pendingUser.id);
    
    const roleToInsert = modalRole;
    console.log('roleToInsert:', roleToInsert);
    
    const profileData = {
      id: pendingUser.id,
      full_name: modalFullName,
      role: roleToInsert,
    };
    
    console.log('Profile data being upserted:', profileData);
    
    // Use UPSERT instead of INSERT to handle conflicts
    const { data: insertedData, error: profileError } = await supabase
      .from('profiles')
      .upsert(profileData, { 
        onConflict: 'id',
        ignoreDuplicates: false 
      })
      .select();
    
    console.log('Supabase upsert result:', { insertedData, profileError });
    
    // If admin, also upsert into admins table
    let adminError = null;
    if (roleToInsert === 'admin') {
      console.log('Upserting into admins table...');
      const { data: adminData, error } = await supabase
        .from('admins')
        .upsert({
          id: pendingUser.id,
          full_name: modalFullName,
        }, {
          onConflict: 'id',
          ignoreDuplicates: false
        })
        .select();
      
      adminError = error;
      console.log('Admin upsert result:', { adminData, adminError });
    } else {
      // If changing from admin to user, remove from admins table
      console.log('Removing from admins table (if exists)...');
      const { error } = await supabase
        .from('admins')
        .delete()
        .eq('id', pendingUser.id);
      
      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found" - which is OK
        console.log('Error removing from admins (this might be OK):', error);
      }
    }
    
    setCreatingProfile(false);
    setShowProfileModal(false);
    
    if (profileError) {
      console.error('Profile creation error:', profileError);
      setError('Failed to create profile: ' + profileError.message);
      return;
    }
    if (adminError) {
      console.error('Admin creation error:', adminError);
      setError('Failed to create admin: ' + adminError.message);
      return;
    }
    
    // Clear any stored signup role
    if (typeof window !== 'undefined') {
      localStorage.removeItem('yourspace_signup_role');
    }
    
    setSuccess('Profile updated!');
    console.log('Redirecting based on role:', roleToInsert);
    if (roleToInsert === 'admin') router.replace('/admin');
    else router.replace('/dashboard');
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    
    if (isLogin) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(error.message);
      } else {
        // Fetch profile to check role
        let { data: profileData } = await supabase.from('profiles').select('role, full_name').eq('id', data.user.id).single();
        if (!profileData) {
          // No profile exists, prompt user to select role and full name
          setPendingUser(data.user);
          
          // Check if there's a stored role from signup
          let storedRole = 'user';
          if (typeof window !== 'undefined') {
            storedRole = localStorage.getItem('yourspace_signup_role') || 'user';
          }
          
          setModalRole(storedRole);
          setModalFullName(data.user.user_metadata?.full_name || fullName || '');
          setShowProfileModal(true);
          setLoading(false);
          return;
        }
        
        setSuccess('Welcome back!');
        if (profileData?.role === 'admin') router.replace('/admin');
        else router.replace('/dashboard');
      }
    } else {
      // Store selected role in localStorage for use after email confirmation
      if (typeof window !== 'undefined') {
        localStorage.setItem('yourspace_signup_role', role);
      }
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName, role },
        },
      });
      
      if (error) {
        setError(error.message);
      } else {
        setSuccess('Check your email to confirm sign up!');
        // Do NOT insert into profiles here; wait for login after confirmation
      }
    }
    setLoading(false);
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    
    // For Google OAuth, we can't pre-select a role, so we'll handle it in the callback
    const { error } = await supabase.auth.signInWithOAuth({ 
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth`
      }
    });
    
    if (error) setError(error.message);
    setLoading(false);
  };

  // Check for existing session on component mount
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // Check if profile exists
        const { data: profileData } = await supabase.from('profiles').select('role, full_name').eq('id', session.user.id).single();
        
        if (!profileData) {
          // No profile exists, show modal
          setPendingUser(session.user);
          
          // Check for stored role (from regular signup) or default to user
          let storedRole = 'user';
          if (typeof window !== 'undefined') {
            storedRole = localStorage.getItem('yourspace_signup_role') || 'user';
          }
          
          setModalRole(storedRole);
          setModalFullName(session.user.user_metadata?.full_name || '');
          setShowProfileModal(true);
        } else {
          // Profile exists, redirect appropriately
          if (profileData.role === 'admin') {
            router.replace('/admin');
          } else {
            router.replace('/dashboard');
          }
        }
      }
    };
    
    checkSession();
  }, [router]);

  return (
    <div style={{ minHeight: '100vh', background: coffeeColors.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: '"Segoe UI", sans-serif', transition: 'background 0.5s' }}>
      <div style={{
        background: coffeeColors.card,
        borderRadius: '2rem',
        boxShadow: '0 8px 32px rgba(108, 78, 55, 0.15)',
        padding: '3rem 2.5rem',
        minWidth: 350,
        maxWidth: 400,
        position: 'relative',
        overflow: 'hidden',
        animation: 'fadeIn 1s',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 48, marginBottom: 8, color: coffeeColors.accent, fontWeight: 700, letterSpacing: 2, textShadow: '0 2px 8px #c69c6d33' }}>
            <span role="img" aria-label="coffee">☕</span> YourSpace
          </div>
          <div style={{ color: coffeeColors.text, fontSize: 18, opacity: 0.8 }}>
            {isLogin ? 'Welcome back! Please login.' : 'Create your account and grab a coffee!'}
          </div>
        </div>
        
        <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: 18, transition: 'all 0.5s' }}>
          {!isLogin && (
            <div style={{ marginTop: 12, marginBottom: 8 }}>
              <label style={{ fontWeight: 600, color: coffeeColors.accent, marginRight: 8 }}>Sign up as:</label>
              <select 
                value={role} 
                onChange={e => setRole(e.target.value)} 
                style={{ 
                  padding: 6, 
                  borderRadius: 8, 
                  border: `1px solid ${coffeeColors.accent}33`, 
                  background: coffeeColors.cream, 
                  color: coffeeColors.accent 
                }}
              >
                <option value='user'>User</option>
                <option value='admin'>Admin</option>
              </select>
            </div>
          )}
          
          {!isLogin && (
            <input
              type="text"
              placeholder="Full Name"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              required
              style={{
                padding: '0.8rem 1rem',
                borderRadius: 8,
                border: `1.5px solid ${coffeeColors.accent}`,
                fontSize: 16,
                outline: 'none',
                background: '#fff',
                color: coffeeColors.text,
                boxShadow: '0 1px 4px #c69c6d11',
                transition: 'border 0.3s',
              }}
            />
          )}
          
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            style={{
              padding: '0.8rem 1rem',
              borderRadius: 8,
              border: `1.5px solid ${coffeeColors.accent}`,
              fontSize: 16,
              outline: 'none',
              background: '#fff',
              color: coffeeColors.text,
              boxShadow: '0 1px 4px #c69c6d11',
              transition: 'border 0.3s',
            }}
          />
          
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            minLength={6}
            style={{
              padding: '0.8rem 1rem',
              borderRadius: 8,
              border: `1.5px solid ${coffeeColors.accent}`,
              fontSize: 16,
              outline: 'none',
              background: '#fff',
              color: coffeeColors.text,
              boxShadow: '0 1px 4px #c69c6d11',
              transition: 'border 0.3s',
            }}
          />
          
          <button
            type="submit"
            disabled={loading}
            style={{
              background: coffeeColors.accent,
              color: '#fff',
              fontWeight: 600,
              fontSize: 18,
              border: 'none',
              borderRadius: 8,
              padding: '0.8rem',
              marginTop: 8,
              boxShadow: '0 2px 8px #c69c6d33',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background 0.3s',
            }}
          >
            {loading ? (isLogin ? 'Logging in...' : 'Signing up...') : (isLogin ? 'Login' : 'Sign Up')}
          </button>
        </form>
        
        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          style={{
            background: '#fff',
            color: coffeeColors.dark,
            border: `1.5px solid ${coffeeColors.accent}`,
            borderRadius: 8,
            padding: '0.7rem',
            fontWeight: 600,
            fontSize: 16,
            marginTop: 18,
            width: '100%',
            boxShadow: '0 1px 4px #c69c6d11',
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          <span role="img" aria-label="google" style={{ marginRight: 8 }}>🌐</span>
          {isLogin ? 'Login with Google' : 'Sign up with Google'}
        </button>
        
        {/* Toggle between Login and Signup */}
        <div style={{ textAlign: 'center', marginTop: 24 }}>
          {isLogin ? (
            <span style={{ color: coffeeColors.text, fontSize: 15 }}>
              Don't have an account?{' '}
              <button 
                type="button" 
                onClick={() => { 
                  setIsLogin(false); 
                  setError(''); 
                  setSuccess(''); 
                }} 
                style={{ 
                  color: coffeeColors.accent, 
                  background: 'none', 
                  border: 'none', 
                  fontWeight: 700, 
                  cursor: 'pointer', 
                  textDecoration: 'underline', 
                  fontSize: 15 
                }}
              >
                Sign Up
              </button>
            </span>
          ) : (
            <span style={{ color: coffeeColors.text, fontSize: 15 }}>
              Already have an account?{' '}
              <button 
                type="button" 
                onClick={() => { 
                  setIsLogin(true); 
                  setError(''); 
                  setSuccess(''); 
                }} 
                style={{ 
                  color: coffeeColors.accent, 
                  background: 'none', 
                  border: 'none', 
                  fontWeight: 700, 
                  cursor: 'pointer', 
                  textDecoration: 'underline', 
                  fontSize: 15 
                }}
              >
                Login
              </button>
            </span>
          )}
        </div>
        
        {/* Debug/Testing buttons */}
        <div style={{ textAlign: 'center', marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button
            type="button"
            onClick={async () => { 
              await supabase.auth.signOut(); 
              if (typeof window !== 'undefined') {
                localStorage.removeItem('yourspace_signup_role');
              }
              router.replace('/auth'); 
            }}
            style={{ 
              color: coffeeColors.error, 
              background: 'none', 
              border: 'none', 
              fontWeight: 600, 
              cursor: 'pointer', 
              fontSize: 14, 
              textDecoration: 'underline' 
            }}
          >
            Log out (for testing)
          </button>
          
          <button
            type="button"
            onClick={async () => {
              const { data: { user } } = await supabase.auth.getUser();
              if (user) {
                console.log('Cleaning up user data for:', user.id);
                // Delete from admins first (foreign key constraint)
                await supabase.from('admins').delete().eq('id', user.id);
                // Then delete from profiles
                await supabase.from('profiles').delete().eq('id', user.id);
                console.log('User data cleaned up');
                alert('User data cleaned up - you can now test profile creation again');
              }
            }}
            style={{ 
              color: coffeeColors.highlight, 
              background: 'none', 
              border: 'none', 
              fontWeight: 600, 
              cursor: 'pointer', 
              fontSize: 12, 
              textDecoration: 'underline' 
            }}
          >
            Clean up my profile data (for testing)
          </button>
        </div>
        
        {/* Show error/success messages */}
        {error && <div style={{ color: coffeeColors.error, marginTop: 18, textAlign: 'center', fontWeight: 600 }}>{error}</div>}
        {success && <div style={{ color: coffeeColors.success, marginTop: 18, textAlign: 'center', fontWeight: 600 }}>{success}</div>}
        
        {/* Coffee steam animation */}
        <div style={{ position: 'absolute', left: 30, top: 10, pointerEvents: 'none' }}>
          <div className="steam" style={{ width: 8, height: 40, background: 'linear-gradient(180deg, #fff8f0 0%, #fff0 100%)', borderRadius: 8, animation: 'steamUp 2s infinite alternate' }} />
        </div>
        
        {showProfileModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: '#0008', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <form 
              onSubmit={e => { 
                e.preventDefault(); 
                console.log('Submitting profile with role:', modalRole); // Debug log
                handleCreateProfile(); 
              }} 
              style={{ 
                background: '#fff', 
                borderRadius: 16, 
                padding: 32, 
                minWidth: 320, 
                boxShadow: '0 8px 32px #c69c6d44', 
                display: 'flex', 
                flexDirection: 'column', 
                gap: 16 
              }}
            >
              <h3 style={{ color: coffeeColors.accent, fontWeight: 700, fontSize: 22, marginBottom: 8 }}>
                Complete Your Profile
              </h3>
              
              <label style={{ fontWeight: 600, color: coffeeColors.accent }}>Full Name:</label>
              <input 
                type="text" 
                value={modalFullName} 
                onChange={e => setModalFullName(e.target.value)} 
                placeholder="Full Name" 
                required 
                style={{ 
                  padding: 12, 
                  borderRadius: 8, 
                  border: `1.5px solid ${coffeeColors.accent}55`, 
                  fontSize: 16, 
                  color: coffeeColors.accent, 
                  background: coffeeColors.cream 
                }} 
              />
              
              <label style={{ fontWeight: 600, color: coffeeColors.accent }}>Role:</label>
              <select 
                value={modalRole} 
                onChange={e => {
                  const newRole = e.target.value;
                  console.log('=== ROLE SELECTION DEBUG ===');
                  console.log('Previous modalRole:', modalRole);
                  console.log('New role selected:', newRole);
                  console.log('Event target value:', e.target.value);
                  setModalRole(newRole);
                  console.log('modalRole state should update to:', newRole);
                }} 
                style={{ 
                  padding: 12, 
                  borderRadius: 8, 
                  border: `1.5px solid ${coffeeColors.accent}55`, 
                  background: coffeeColors.cream, 
                  color: coffeeColors.accent,
                  fontSize: 16
                }}
              >
                <option value='user'>User</option>
                <option value='admin'>Admin</option>
              </select>
              
              <button 
                type="submit" 
                disabled={creatingProfile} 
                style={{ 
                  background: coffeeColors.accent, 
                  color: '#fff', 
                  fontWeight: 700, 
                  fontSize: 16, 
                  border: 'none', 
                  borderRadius: 8, 
                  padding: '12px 0', 
                  cursor: creatingProfile ? 'not-allowed' : 'pointer', 
                  marginTop: 8 
                }}
              >
                {creatingProfile ? 'Saving...' : `Save & Continue as ${modalRole.toUpperCase()}`}
              </button>
            </form>
          </div>
        )}
        
        <style>{`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(30px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes shake {
            0% { transform: translateX(0); }
            20% { transform: translateX(-8px); }
            40% { transform: translateX(8px); }
            60% { transform: translateX(-8px); }
            80% { transform: translateX(8px); }
            100% { transform: translateX(0); }
          }
          @keyframes steamUp {
            0% { opacity: 0.7; transform: translateY(0) scaleX(1); }
            100% { opacity: 0.1; transform: translateY(-20px) scaleX(1.2); }
          }
        `}</style>
        
        {loading && (
          <div style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            background: '#fff8f0cc',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 10,
            borderRadius: '2rem',
          }}>
            <div style={{ border: '4px solid #c69c6d33', borderTop: '4px solid #c69c6d', borderRadius: '50%', width: 36, height: 36, animation: 'spin 1s linear infinite' }} />
            <style>{`@keyframes spin { 0% { transform: rotate(0deg);} 100% { transform: rotate(360deg);} }`}</style>
          </div>
        )}
      </div>
    </div>
  );
}