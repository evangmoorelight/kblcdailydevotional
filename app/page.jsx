'use client';
import { useState } from 'react';

export default function Home() {
  const [room, setRoom] = useState('');
  
  const rooms = [
    { id: 'morning-dew', name: 'Morning Dew Prayer', time: '5:00 AM Daily', desc: 'Start your day with fire', live: true },
    { id: 'midnight-watch', name: 'Midnight Watch', time: '12:00 AM Daily', desc: 'Warfare & intercession', live: true },
    { id: 'sge-family', name: 'SGE Family Altar', time: '8:00 PM Sundays', desc: 'Family restoration prayers', live: false },
    { id: 'healing-stream', name: 'Healing Stream', time: '6:00 PM Wednesdays', desc: 'Prayers for the sick', live: false },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#08080a', color: 'white', fontFamily: 'system-ui' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', padding: '50px 20px 20px' }}>
        <img src="/logo.png" alt="SGE" style={{ width: '110px', height: '110px', borderRadius: '24px', objectFit: 'cover' }} />
        <h1 style={{ fontSize: '38px', fontWeight: '900', margin: '20px 0 8px', letterSpacing: '1px' }}>SGE PRAYER HUB</h1>
        <p style={{ opacity: 0.6, fontSize: '15px' }}>Where Intercessors Gather • Live Audio Prayers 24/7</p>
        <p style={{ marginTop: '12px', background: '#1a1a24', display: 'inline-block', padding: '6px 14px', borderRadius: '20px', fontSize: '12px' }}>📖 Matthew 18:20 • For where two or three gather...</p>
      </div>

      {/* Rooms */}
      <div style={{ maxWidth: '900px', margin: '30px auto', padding: '0 20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
        {rooms.map((r) => (
          <div key={r.id} style={{ background: '#14141c', border: '1px solid #23232f', padding: '20px', borderRadius: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '17px' }}>{r.name}</h3>
              {r.live && <span style={{ background: '#ef4444', color: 'white', fontSize: '10px', padding: '3px 8px', borderRadius: '20px', fontWeight: 'bold' }}>● LIVE</span>}
            </div>
            <p style={{ margin: '6px 0', opacity: 0.5, fontSize: '12px' }}>{r.time} • {r.desc}</p>
            <a href={`/live?room=${r.id}`} style={{ display: 'block', marginTop: '14px', background: 'white', color: 'black', textAlign: 'center', padding: '12px', borderRadius: '12px', textDecoration: 'none', fontWeight: '800', fontSize: '14px' }}>Join Prayer Room 🙏</a>
            <a href={`/live?room=${r.id}&host=sge2024`} style={{ display: 'block', marginTop: '8px', textAlign: 'center', fontSize: '11px', opacity: 0.4, textDecoration: 'none', color: 'white' }}>Host Login</a>
          </div>
        ))}
      </div>

      {/* Create Custom */}
      <div style={{ maxWidth: '900px', margin: '20px auto', padding: '0 20px' }}>
        <div style={{ background: '#14141c', border: '1px solid #23232f', padding: '20px', borderRadius: '20px' }}>
          <h4 style={{ margin: '0 0 12px' }}>Create Your Own Prayer Room</h4>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input value={room} onChange={(e) => setRoom(e.target.value)} placeholder="e.g. sisters-prayer-night" style={{ flex: 1, padding: '14px', borderRadius: '12px', border: 'none', background: '#08080a', color: 'white', outline: 'none' }} />
            <button onClick={() => room && (window.location.href = `/live?room=${room}`)} style={{ padding: '14px 20px', borderRadius: '12px', border: 'none', background: '#7c3aed', color: 'white', fontWeight: 'bold' }}>Create</button>
          </div>
        </div>

        <p style={{ textAlign: 'center', opacity: 0.3, fontSize: '11px', marginTop: '30px', paddingBottom: '40px' }}>SGE PRAYER HUB © 2026 • Built for the Kingdom • Audio Only • No Camera Needed</p>
      </div>
    </div>
  );
}
