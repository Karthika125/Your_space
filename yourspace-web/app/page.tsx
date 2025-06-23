"use client";
import Link from 'next/link';
import React, { useState, useEffect } from 'react';

const coffeeColors = {
  bg: '#f7f3ee',
  card: '#fff8f0',
  accent: '#c69c6d',
  dark: '#6f4e37',
  darkBrown: '#3e2723',
  cream: '#faf6f0',
  lightBrown: '#d4a574',
  espresso: '#2c1810',
};

export default function HomePage() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isLoaded, setIsLoaded] = useState(false);
  const [currentFeature, setCurrentFeature] = useState(0);
  const [beans, setBeans] = useState<any[]>([]);

  const features = [
    { icon: '🏢', title: 'Common Rooms', desc: 'Spacious collaborative areas' },
    { icon: '🏠', title: 'Private Cubicles', desc: 'Focused work environments' },
    { icon: '📅', title: 'Real-time Booking', desc: 'Instant availability updates' },
    { icon: '☕', title: 'Coffee Lounge', desc: 'Premium beverage station' }
  ];

  useEffect(() => {
    setIsLoaded(true);
    const interval = setInterval(() => {
      setCurrentFeature((prev) => (prev + 1) % features.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Generate floating beans only on client
  useEffect(() => {
    const newBeans = Array.from({ length: 12 }).map(() => ({
      width: Math.random() * 8 + 4,
      height: Math.random() * 8 + 4,
      left: Math.random() * 100,
      top: Math.random() * 100,
      opacity: 0.1,
      animation: `float ${Math.random() * 10 + 5}s infinite ease-in-out`,
      animationDelay: `${Math.random() * 5}s`
    }));
    setBeans(newBeans);
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePosition({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    });
  };

  const handleButtonMouseEnter = (e: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => {
    e.currentTarget.style.transform = 'translateY(-2px) scale(1.05)';
    e.currentTarget.style.boxShadow = `0 12px 35px rgba(198, 156, 109, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.2)`;
  };
  const handleButtonMouseLeave = (e: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => {
    e.currentTarget.style.transform = 'translateY(0) scale(1)';
    e.currentTarget.style.boxShadow = `0 8px 25px rgba(198, 156, 109, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)`;
  };
  const handleExploreMouseEnter = (e: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => {
    e.currentTarget.style.background = coffeeColors.accent;
    e.currentTarget.style.color = '#fff';
    e.currentTarget.style.transform = 'translateY(-1px)';
  };
  const handleExploreMouseLeave = (e: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => {
    e.currentTarget.style.background = 'transparent';
    e.currentTarget.style.color = coffeeColors.dark;
    e.currentTarget.style.transform = 'translateY(0)';
  };

  return (
    <div 
      style={{ 
        minHeight: '100vh', 
        background: `radial-gradient(circle at ${mousePosition.x}% ${mousePosition.y}%, ${coffeeColors.cream} 0%, ${coffeeColors.bg} 50%)`,
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        fontFamily: '"Inter", "Segoe UI", sans-serif',
        transition: 'background 0.3s ease',
        position: 'relative',
        overflow: 'hidden'
      }}
      onMouseMove={handleMouseMove}
    >
      {/* Floating Coffee Beans */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1 }}>
        {beans.map((bean, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              width: bean.width,
              height: bean.height,
              left: `${bean.left}%`,
              top: `${bean.top}%`,
              opacity: bean.opacity,
              animation: bean.animation,
              animationDelay: bean.animationDelay,
              background: coffeeColors.dark,
              borderRadius: '50%'
            }}
          />
        ))}
      </div>

      <div
        className="main-card"
        style={{
          background: `linear-gradient(135deg, ${coffeeColors.card} 0%, ${coffeeColors.cream} 100%)`,
          borderRadius: '2.5rem',
          boxShadow: `
            0 25px 50px rgba(108, 78, 55, 0.15),
            0 0 0 1px rgba(198, 156, 109, 0.1),
            inset 0 1px 0 rgba(255, 255, 255, 0.5)
          `,
          padding: '4rem 3rem',
          width: '90vw',
          maxWidth: 900,
          minWidth: 0,
          position: 'relative',
          overflow: 'hidden',
          transform: isLoaded ? 'translateY(0) scale(1)' : 'translateY(50px) scale(0.9)',
          opacity: isLoaded ? 1 : 0,
          transition: 'all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
          textAlign: 'center',
          zIndex: 2,
          backdropFilter: 'blur(10px)'
        }}
      >
        
        {/* Decorative Corner Elements */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: 60,
          height: 60,
          background: `linear-gradient(45deg, ${coffeeColors.accent}20, transparent)`,
          borderRadius: '0 0 100% 0'
        }} />
        <div style={{
          position: 'absolute',
          bottom: 0,
          right: 0,
          width: 60,
          height: 60,
          background: `linear-gradient(225deg, ${coffeeColors.accent}20, transparent)`,
          borderRadius: '100% 0 0 0'
        }} />

        {/* Enhanced Coffee Cup with Dynamic Steam */}
        <div style={{ marginBottom: 28, position: 'relative' }}>
          <div style={{ position: 'relative', display: 'inline-block' }}>
            {/* Cup Body */}
            <div style={{ 
              width: 80, 
              height: 80, 
              background: `linear-gradient(145deg, ${coffeeColors.accent}, ${coffeeColors.dark})`,
              borderRadius: '0 0 45px 45px', 
              position: 'relative', 
              zIndex: 3,
              margin: '0 auto',
              boxShadow: `
                0 8px 25px rgba(198, 156, 109, 0.4),
                inset 0 2px 4px rgba(255, 255, 255, 0.2)
              `,
              transform: 'perspective(100px) rotateX(10deg)',
              animation: isLoaded ? 'cupGlow 3s infinite ease-in-out' : 'none'
            }}>
              {/* Coffee Surface */}
              <div style={{
                position: 'absolute',
                top: 8,
                left: 8,
                right: 8,
                height: 12,
                background: coffeeColors.espresso,
                borderRadius: '50%',
                opacity: 0.8
              }} />
            </div>
            
            {/* Cup Handle */}
            <div style={{
              position: 'absolute',
              right: -15,
              top: 20,
              width: 25,
              height: 35,
              border: `4px solid ${coffeeColors.dark}`,
              borderLeft: 'none',
              borderRadius: '0 20px 20px 0',
              zIndex: 2
            }} />
            
            {/* Saucer */}
            <div style={{ 
              width: 110, 
              height: 20, 
              background: `linear-gradient(145deg, ${coffeeColors.cream}, ${coffeeColors.lightBrown})`,
              borderRadius: '50%', 
              position: 'absolute', 
              left: -15, 
              top: 70, 
              zIndex: 1,
              boxShadow: '0 4px 15px rgba(198, 156, 109, 0.2)'
            }} />
            
            {/* Dynamic Steam Effects */}
            {[...Array(4)].map((_, i) => (
              <div key={i} style={{ 
                position: 'absolute', 
                left: 35 + i * 8, 
                top: -40, 
                zIndex: 4 
              }}>
                <div style={{ 
                  width: 3, 
                  height: 50, 
                  background: `linear-gradient(180deg, rgba(255, 248, 240, 0.8) 0%, transparent 100%)`,
                  borderRadius: 3, 
                  animation: `steam${i} ${2 + i * 0.5}s infinite ease-in-out`,
                  animationDelay: `${i * 0.3}s`
                }} />
              </div>
            ))}
          </div>
        </div>

        {/* Main Title with Gradient */}
        <div style={{ 
          fontSize: 42, 
          fontWeight: 800, 
          background: `linear-gradient(135deg, ${coffeeColors.accent}, ${coffeeColors.dark})`,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          marginBottom: 12, 
          letterSpacing: '0.5px',
          textShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          BrewSpace
        </div>

        {/* Subtitle */}
        <div style={{ 
          color: coffeeColors.darkBrown, 
          fontSize: 16, 
          opacity: 0.9, 
          marginBottom: 32,
          lineHeight: 1.6,
          fontWeight: 500
        }}>
          Where productivity meets comfort. Book your perfect workspace—from collaborative lounges to private sanctuaries.
        </div>

        {/* Interactive Feature Showcase */}
        <div style={{
          background: `linear-gradient(135deg, ${coffeeColors.accent}10, ${coffeeColors.cream})`,
          borderRadius: '1.5rem',
          padding: '2rem',
          marginBottom: '2rem',
          border: `1px solid ${coffeeColors.accent}30`,
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            top: 0,
            left: `${(currentFeature / features.length) * 100}%`,
            width: `${100 / features.length}%`,
            height: '4px',
            background: `linear-gradient(90deg, ${coffeeColors.accent}, ${coffeeColors.dark})`,
            transition: 'left 0.5s ease',
            borderRadius: '0 0 4px 4px'
          }} />
          
          <div style={{
            fontSize: 32,
            marginBottom: '0.5rem',
            transform: 'scale(1.1)',
            transition: 'transform 0.3s ease'
          }}>
            {features[currentFeature].icon}
          </div>
          <div style={{
            fontSize: 18,
            fontWeight: 700,
            color: coffeeColors.dark,
            marginBottom: '0.25rem'
          }}>
            {features[currentFeature].title}
          </div>
          <div style={{
            fontSize: 14,
            color: coffeeColors.darkBrown,
            opacity: 0.8
          }}>
            {features[currentFeature].desc}
          </div>
        </div>

        {/* CTA Buttons */}
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/book" style={{
            display: 'inline-flex',
            alignItems: 'center',
            background: `linear-gradient(135deg, ${coffeeColors.accent}, ${coffeeColors.dark})`,
            color: '#fff',
            fontWeight: 700,
            fontSize: 16,
            border: 'none',
            borderRadius: '12px',
            padding: '1rem 2rem',
            boxShadow: `
              0 8px 25px rgba(198, 156, 109, 0.4),
              inset 0 1px 0 rgba(255, 255, 255, 0.2)
            `,
            cursor: 'pointer',
            textDecoration: 'none',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            transform: 'translateY(0)',
            position: 'relative',
            overflow: 'hidden'
          }}
          onMouseEnter={handleButtonMouseEnter}
          onMouseLeave={handleButtonMouseLeave}>
            Book Your Space
          </Link>
          
          <Link href="/explore" style={{
            display: 'inline-flex',
            alignItems: 'center',
            background: 'transparent',
            color: coffeeColors.dark,
            fontWeight: 600,
            fontSize: 16,
            border: `2px solid ${coffeeColors.accent}`,
            borderRadius: '12px',
            padding: '0.9rem 1.8rem',
            cursor: 'pointer',
            textDecoration: 'none',
            transition: 'all 0.3s ease',
            backdropFilter: 'blur(10px)'
          }}
          onMouseEnter={handleExploreMouseEnter}
          onMouseLeave={handleExploreMouseLeave}>
            Explore Spaces
          </Link>
          <Link href="/auth" style={{
            display: 'inline-flex',
            alignItems: 'center',
            background: coffeeColors.accent,
            color: '#fff',
            fontWeight: 700,
            fontSize: 16,
            border: 'none',
            borderRadius: '12px',
            padding: '1rem 2rem',
            boxShadow: `0 8px 25px rgba(198, 156, 109, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)`,
            cursor: 'pointer',
            textDecoration: 'none',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            transform: 'translateY(0)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            Sign In / Sign Up
          </Link>
        </div>

        {/* Trust Indicators */}
        <div style={{
          marginTop: '2rem',
          display: 'flex',
          justifyContent: 'center',
          gap: '2rem',
          opacity: 0.7,
          fontSize: '12px',
          color: coffeeColors.darkBrown
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: 8, height: 8, background: '#4CAF50', borderRadius: '50%' }} />
            Available 24/7
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: 8, height: 8, background: '#2196F3', borderRadius: '50%' }} />
            Instant Booking
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: 8, height: 8, background: '#FF9800', borderRadius: '50%' }} />
            Premium Coffee
          </div>
        </div>

        <style>{`
          @keyframes float {
            0%, 100% { transform: translateY(0) rotate(0deg); }
            50% { transform: translateY(-20px) rotate(180deg); }
          }
          @keyframes cupGlow {
            0%, 100% { box-shadow: 0 8px 25px rgba(198, 156, 109, 0.4), inset 0 2px 4px rgba(255, 255, 255, 0.2); }
            50% { box-shadow: 0 12px 35px rgba(198, 156, 109, 0.6), inset 0 2px 4px rgba(255, 255, 255, 0.3); }
          }
          @keyframes steam0 {
            0% { opacity: 0.8; transform: translateY(0) translateX(0) scaleX(1); }
            100% { opacity: 0; transform: translateY(-30px) translateX(5px) scaleX(1.5); }
          }
          @keyframes steam1 {
            0% { opacity: 0.6; transform: translateY(0) translateX(0) scaleX(1); }
            100% { opacity: 0; transform: translateY(-35px) translateX(-3px) scaleX(1.3); }
          }
          @keyframes steam2 {
            0% { opacity: 0.7; transform: translateY(0) translateX(0) scaleX(1); }
            100% { opacity: 0; transform: translateY(-32px) translateX(7px) scaleX(1.4); }
          }
          @keyframes steam3 {
            0% { opacity: 0.5; transform: translateY(0) translateX(0) scaleX(1); }
            100% { opacity: 0; transform: translateY(-38px) translateX(-5px) scaleX(1.6); }
          }
          @media (max-width: 600px) {
            .main-card {
              padding: 2rem 0.5rem !important;
              width: 98vw !important;
              max-width: 100vw !important;
              border-radius: 1rem !important;
            }
          }
        `}</style>
      </div>
    </div>
  );
}