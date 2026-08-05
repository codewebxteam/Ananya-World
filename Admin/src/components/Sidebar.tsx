

import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  MapPin, 
  Coins, 
  MessageSquare 
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'staff', label: 'Staff Directory', icon: Users },
    { id: 'attendance', label: 'Attendance Logs', icon: Calendar },
    { id: 'tracking', label: 'Live GPS Tracking', icon: MapPin },
    { id: 'salaries', label: 'Payroll & Salaries', icon: Coins },
    { id: 'communications', label: 'Communications', icon: MessageSquare },
  ];

  return (
    <div
      style={{
        width: 'var(--sidebar-width)',
        height: '100vh',
        position: 'fixed',
        top: 0,
        left: 0,
        backgroundColor: 'var(--bg-secondary)',
        borderRight: '1px solid var(--border-glass)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 100,
      }}
    >
      {/* Brand Header */}
      <div
        style={{
          padding: '24px',
          borderBottom: '1px solid var(--border-glass)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 'bold',
            fontSize: '18px',
            color: 'white',
          }}
        >
          L
        </div>
        <div>
          <h2 style={{ fontSize: '16px', fontWeight: 800, letterSpacing: '0.5px', color: '#f59e0b' }}>
            DR. LAL PATHLABS
          </h2>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
            Staff Admin Hub
          </span>
        </div>
      </div>

      {/* Navigation List */}
      <nav style={{ padding: '20px 12px', flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {menuItems.map((item) => {
          const isActive = activeTab === item.id;
          const IconComponent = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 16px',
                borderRadius: '10px',
                border: 'none',
                background: isActive ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(6, 182, 212, 0.15))' : 'transparent',
                color: isActive ? 'var(--accent-secondary)' : 'var(--text-secondary)',
                fontWeight: isActive ? '600' : '500',
                fontSize: '14px',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'var(--transition)',
                boxShadow: isActive ? 'inset 0 0 0 1px rgba(59, 130, 246, 0.3)' : 'none',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.02)';
                  e.currentTarget.style.color = 'var(--text-primary)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = 'var(--text-secondary)';
                }
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center' }}>
                <IconComponent size={18} />
              </span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Footer / User Profile Summary */}
      <div
        style={{
          padding: '16px',
          borderTop: '1px solid var(--border-glass)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          backgroundColor: 'rgba(0, 0, 0, 0.1)',
        }}
      >
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            backgroundColor: 'var(--bg-tertiary)',
            backgroundImage: `url('https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&auto=format&fit=crop&q=80')`,
            backgroundSize: 'cover',
            border: '2px solid var(--border-glass)',
          }}
        />
        <div style={{ flexGrow: 1, minWidth: 0 }}>
          <h4 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            Nisha Sharma
          </h4>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            Admin Director
          </p>
        </div>
        <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--accent-success)' }} />
      </div>
    </div>
  );
}
