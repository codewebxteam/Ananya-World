
import { initialStaff, initialAttendance } from '../services/mockData';
import { Users, Calendar, AlertTriangle, MapPin, User } from 'lucide-react';

export default function Dashboard() {
  const totalStaff = initialStaff.length;
  const onlineStaff = initialStaff.filter((s) => s.status === 'Online').length;
  const todayAttendance = initialAttendance.length;
  const geofenceViolations = initialAttendance.filter((a) => !a.inGeofence).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Welcome Banner */}
      <div
        className="glass"
        style={{
          padding: '24px',
          background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(59, 130, 246, 0.05) 100%)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)' }}>
            Welcome back, Nisha!
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
            Monitor and manage Dr. Lal Pathlabs field and laboratory staff operations in real-time.
          </p>
        </div>
        <div style={{ fontSize: '13px', color: 'var(--accent-warning)', fontWeight: 600 }}>
          Today: {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="stats-grid">
        <div className="glass-interactive stat-card">
          <div className="stat-icon" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', color: 'var(--accent-primary)' }}>
            <Users size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Total / Active Staff</span>
            <span className="stat-value">{totalStaff} <span style={{ fontSize: '14px', color: 'var(--accent-success)' }}>({onlineStaff} Online)</span></span>
          </div>
        </div>

        <div className="glass-interactive stat-card">
          <div className="stat-icon" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--accent-success)' }}>
            <Calendar size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Today's Attendance</span>
            <span className="stat-value">{todayAttendance} <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>/ {totalStaff}</span></span>
          </div>
        </div>

        <div className="glass-interactive stat-card">
          <div className="stat-icon" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', color: 'var(--accent-warning)' }}>
            <AlertTriangle size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Geofence Violations</span>
            <span className="stat-value" style={{ color: geofenceViolations > 0 ? 'var(--accent-warning)' : 'var(--text-primary)' }}>
              {geofenceViolations}
            </span>
          </div>
        </div>

        <div className="glass-interactive stat-card">
          <div className="stat-icon" style={{ backgroundColor: 'rgba(6, 182, 212, 0.1)', color: 'var(--accent-secondary)' }}>
            <MapPin size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-label">GPS Tracking Live</span>
            <span className="stat-value">{onlineStaff} Staff</span>
          </div>
        </div>
      </div>

      {/* Primary Section */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* Recent Attendance / Checkins */}
        <div className="glass" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', color: 'var(--text-primary)' }}>
            Today's Attendance Stream
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {initialAttendance.map((a) => (
              <div
                key={a.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingBottom: '12px',
                  borderBottom: '1px solid rgba(255,255,255,0.03)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--bg-tertiary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '14px',
                    }}
                  >
                    <User size={16} />
                  </div>
                  <div>
                    <h4 style={{ fontSize: '13px', fontWeight: 600 }}>{a.staffName}</h4>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                      Punched in at {a.punchIn}
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className={`badge ${a.inGeofence ? 'badge-success' : 'badge-warning'}`}>
                    {a.inGeofence ? 'In Geofence' : 'Out Geofence'}
                  </span>
                  <span className={`badge ${a.status === 'Present' ? 'badge-info' : 'badge-warning'}`}>
                    {a.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Live GPS Map Mini View */}
        <div className="glass" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
              Live Field Staff Distribution
            </h3>
            <span className="badge badge-success" style={{ animation: 'pulse 2s infinite' }}>
              ● LIVE
            </span>
          </div>

          {/* Stylized Grid Representing a Map */}
          <div
            style={{
              flexGrow: 1,
              height: '220px',
              backgroundColor: '#111827',
              borderRadius: '12px',
              border: '1px solid var(--border-glass)',
              position: 'relative',
              overflow: 'hidden',
              backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.15) 1px, transparent 0)',
              backgroundSize: '24px 24px',
            }}
          >
            {/* Delhi Center / Noida / Gurgaon Labels */}
            <div style={{ position: 'absolute', top: '15%', left: '15%', color: 'var(--text-muted)', fontSize: '10px', fontWeight: 'bold' }}>
              DELHI LABS
            </div>
            <div style={{ position: 'absolute', bottom: '25%', right: '20%', color: 'var(--text-muted)', fontSize: '10px', fontWeight: 'bold' }}>
              NOIDA CENTRAL
            </div>

            {/* Field Staff Positions */}
            <div
              style={{
                position: 'absolute',
                top: '30%',
                left: '35%',
                transform: 'translate(-50%, -50%)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <div style={{ position: 'relative' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: 'var(--accent-primary)' }} />
                <div style={{ position: 'absolute', width: '24px', height: '24px', borderRadius: '50%', backgroundColor: 'var(--accent-primary)', opacity: 0.3, left: '-6px', top: '-6px', animation: 'ping 2s infinite' }} />
              </div>
              <span style={{ fontSize: '9px', background: 'rgba(0,0,0,0.6)', padding: '2px 6px', borderRadius: '4px', whiteSpace: 'nowrap' }}>
                Amit K. (Field CP)
              </span>
            </div>

            <div
              style={{
                position: 'absolute',
                bottom: '35%',
                right: '40%',
                transform: 'translate(-50%, -50%)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <div style={{ position: 'relative' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: 'var(--accent-success)' }} />
                <div style={{ position: 'absolute', width: '24px', height: '24px', borderRadius: '50%', backgroundColor: 'var(--accent-success)', opacity: 0.3, left: '-6px', top: '-6px', animation: 'ping 2.5s infinite' }} />
              </div>
              <span style={{ fontSize: '9px', background: 'rgba(0,0,0,0.6)', padding: '2px 6px', borderRadius: '4px', whiteSpace: 'nowrap' }}>
                Priya S. (Lab N18)
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)' }}>
            <span>Active Tracking Sessions: 3</span>
            <span style={{ color: 'var(--accent-primary)', cursor: 'pointer', fontWeight: 600 }}>
              Open Full Map &rarr;
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
