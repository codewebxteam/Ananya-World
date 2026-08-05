import { useState, useEffect } from 'react';
import { MapPin } from 'lucide-react';
import { initialStaff } from '../services/mockData';
import type { StaffMember } from '../types';

export default function LiveTracking() {
  const onlineStaff = initialStaff.filter((s) => s.status === 'Online' && s.location);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(onlineStaff[0] || null);
  const [mockLocations, setMockLocations] = useState(onlineStaff);

  // Simulate movement for active staff
  useEffect(() => {
    const interval = setInterval(() => {
      setMockLocations((prev) =>
        prev.map((s) => {
          if (s.location) {
            // Add a small jitter to simulate moving
            const latJitter = (Math.random() - 0.5) * 0.0005;
            const lngJitter = (Math.random() - 0.5) * 0.0005;
            return {
              ...s,
              location: {
                ...s.location,
                latitude: s.location.latitude + latJitter,
                longitude: s.location.longitude + lngJitter,
                lastUpdated: 'Just now',
              },
            };
          }
          return s;
        })
      );
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  // Update selected staff details when they move
  const currentSelected = mockLocations.find((s) => s.id === selectedStaff?.id) || selectedStaff;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '24px', height: 'calc(100vh - 130px)' }}>
      {/* Sidebar List of Online Staff */}
      <div className="glass" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Online Staff Directory</h3>
        <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
          Click on any field staff member to center and inspect their live GPS logs.
        </span>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto', flexGrow: 1 }}>
          {mockLocations.map((s) => {
            const isSelected = selectedStaff?.id === s.id;
            return (
              <div
                key={s.id}
                onClick={() => setSelectedStaff(s)}
                style={{
                  padding: '12px',
                  borderRadius: '10px',
                  backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.1)' : 'rgba(255, 255, 255, 0.02)',
                  border: `1px solid ${isSelected ? 'var(--accent-primary)' : 'var(--border-glass)'}`,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  transition: 'var(--transition)',
                }}
              >
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    backgroundImage: `url(${s.avatar})`,
                    backgroundSize: 'cover',
                  }}
                />
                <div style={{ flexGrow: 1, minWidth: 0 }}>
                  <h4 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {s.name}
                  </h4>
                  <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{s.role}</p>
                </div>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--accent-success)' }} />
              </div>
            );
          })}
        </div>
      </div>

      {/* Map Display Console */}
      <div className="glass" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
        {/* Map Canvas */}
        <div
          style={{
            flexGrow: 1,
            backgroundColor: '#0f172a',
            backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.1) 1.5px, transparent 0)',
            backgroundSize: '30px 30px',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Mock Laboratory Geofence circles */}
          <div
            style={{
              position: 'absolute',
              top: '40%',
              left: '45%',
              width: '180px',
              height: '180px',
              borderRadius: '50%',
              border: '2px dashed rgba(16, 185, 129, 0.3)',
              backgroundColor: 'rgba(16, 185, 129, 0.04)',
              transform: 'translate(-50%, -50%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
            }}
          >
            <span style={{ fontSize: '10px', color: 'var(--accent-success)', fontWeight: 'bold' }}>Geofence: Lab-Central</span>
          </div>

          {/* Render markers for all online staff */}
          {mockLocations.map((s) => {
            if (!s.location) return null;
            const isSelected = s.id === selectedStaff?.id;
            
            // Map lat/long coordinates to relative screen percentages
            // Delhi Center is around 28.61, 77.20. Let's position relatively:
            const relativeTop = 50 - (s.location.latitude - 28.57) * 200;
            const relativeLeft = 50 + (s.location.longitude - 77.30) * 200;

            return (
              <div
                key={s.id}
                onClick={() => setSelectedStaff(s)}
                style={{
                  position: 'absolute',
                  top: `${Math.min(Math.max(relativeTop, 10), 90)}%`,
                  left: `${Math.min(Math.max(relativeLeft, 10), 90)}%`,
                  transform: 'translate(-50%, -50%)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  zIndex: isSelected ? 10 : 2,
                }}
              >
                <div style={{ position: 'relative' }}>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      backgroundImage: `url(${s.avatar})`,
                      backgroundSize: 'cover',
                      border: `2px solid ${isSelected ? 'var(--accent-primary)' : 'var(--border-glass)'}`,
                      boxShadow: isSelected ? '0 0 15px var(--accent-primary)' : 'none',
                    }}
                  />
                  {/* Status ping */}
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '-2px',
                      right: '-2px',
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--accent-success)',
                      border: '1px solid #0f172a',
                    }}
                  />
                </div>
                <span
                  style={{
                    fontSize: '9px',
                    background: 'rgba(0,0,0,0.85)',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    color: 'white',
                    marginTop: '4px',
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                    border: isSelected ? '1px solid var(--accent-primary)' : '1px solid transparent',
                  }}
                >
                  {s.name.split(' ')[0]}
                </span>
              </div>
            );
          })}

          {/* Selected Staff Float Detail card */}
          {currentSelected && currentSelected.location && (
            <div
              className="glass"
              style={{
                position: 'absolute',
                bottom: '16px',
                left: '16px',
                right: '16px',
                padding: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: 'rgba(15, 23, 42, 0.95)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '50%',
                    backgroundImage: `url(${currentSelected.avatar})`,
                    backgroundSize: 'cover',
                    border: '2px solid var(--accent-primary)',
                  }}
                />
                <div>
                  <h4 style={{ fontSize: '15px', fontWeight: 700 }}>{currentSelected.name}</h4>
                  <span style={{ fontSize: '12px', color: 'var(--accent-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <MapPin size={14} /> Position: {currentSelected.location.latitude.toFixed(5)}, {currentSelected.location.longitude.toFixed(5)}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '20px', fontSize: '13px' }}>
                <div>
                  <span style={{ color: 'var(--text-secondary)', display: 'block' }}>Speed</span>
                  <span style={{ fontWeight: 600 }}>24 km/h (Moving)</span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-secondary)', display: 'block' }}>Battery</span>
                  <span style={{ fontWeight: 600, color: 'var(--accent-success)' }}>87%</span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-secondary)', display: 'block' }}>Last Sync</span>
                  <span style={{ fontWeight: 600 }}>{currentSelected.location.lastUpdated}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
