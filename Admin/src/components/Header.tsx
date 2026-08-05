import { useState } from 'react';
import { Bell } from 'lucide-react';

interface HeaderProps {
  activeTab: string;
}

export default function Header({ activeTab }: HeaderProps) {
  const [showNotifications, setShowNotifications] = useState(false);

  const notifications = [
    { id: 1, text: 'Amit Kumar punched in outside geofence boundary.', type: 'warning', time: '10m ago' },
    { id: 2, text: 'Salary processing completed for July 2026.', type: 'success', time: '2h ago' },
    { id: 3, text: 'Field Staff Rahul Dev shared live GPS access.', type: 'info', time: '3h ago' },
  ];

  const getPageTitle = () => {
    switch (activeTab) {
      case 'dashboard':
        return 'System Overview';
      case 'staff':
        return 'Staff Directory';
      case 'attendance':
        return 'Attendance Tracker';
      case 'tracking':
        return 'Live GPS Location Tracker';
      case 'salaries':
        return 'Payroll & Salary Management';
      case 'communications':
        return 'Staff Communication Center';
      default:
        return 'Dashboard';
    }
  };

  return (
    <header
      style={{
        height: 'var(--header-height)',
        padding: '0 24px',
        backgroundColor: 'var(--bg-glass)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--border-glass)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 90,
      }}
    >
      <div>
        <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>
          {getPageTitle()}
        </h1>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        {/* Status Indicators */}
        <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: 'var(--text-secondary)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--accent-success)' }} />
            <span>GPS Tracking Active</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--accent-primary)' }} />
            <span>Server Online</span>
          </div>
        </div>

        {/* Notifications Icon with Dropdown */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            style={{
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-glass)',
              borderRadius: '10px',
              width: '40px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: '18px',
              position: 'relative',
              transition: 'var(--transition)',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)')}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border-glass)')}
          >
            <Bell size={18} />
            <span
              style={{
                position: 'absolute',
                top: '-3px',
                right: '-3px',
                backgroundColor: 'var(--accent-error)',
                width: '16px',
                height: '16px',
                borderRadius: '50%',
                fontSize: '10px',
                color: 'white',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {notifications.length}
            </span>
          </button>

          {showNotifications && (
            <div
              className="glass"
              style={{
                position: 'absolute',
                right: 0,
                top: '50px',
                width: '320px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                zIndex: 200,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 700 }}>Notifications</h3>
                <button
                  onClick={() => setShowNotifications(false)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '12px' }}
                >
                  Close
                </button>
              </div>
              <hr style={{ border: 'none', borderBottom: '1px solid var(--border-glass)' }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    style={{
                      padding: '10px',
                      borderRadius: '8px',
                      backgroundColor: 'rgba(255,255,255,0.02)',
                      fontSize: '12px',
                      borderLeft: `4px solid ${
                        n.type === 'warning'
                          ? 'var(--accent-warning)'
                          : n.type === 'success'
                          ? 'var(--accent-success)'
                          : 'var(--accent-primary)'
                      }`,
                    }}
                  >
                    <p style={{ color: 'var(--text-primary)', marginBottom: '4px' }}>{n.text}</p>
                    <span style={{ color: 'var(--text-muted)', fontSize: '10px' }}>{n.time}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
