import { useState } from 'react';
import { initialAttendance } from '../services/mockData';
import type { AttendanceRecord } from '../types';

export default function Attendance() {
  const [attendance] = useState<AttendanceRecord[]>(initialAttendance);
  const [filterGeofence, setFilterGeofence] = useState('All');
  const [searchName, setSearchName] = useState('');

  const filteredAttendance = attendance.filter((a) => {
    const matchesName = a.staffName.toLowerCase().includes(searchName.toLowerCase());
    const matchesGeofence =
      filterGeofence === 'All' ||
      (filterGeofence === 'In' && a.inGeofence) ||
      (filterGeofence === 'Out' && !a.inGeofence);
    return matchesName && matchesGeofence;
  });

  const totals = {
    present: attendance.filter(a => a.status === 'Present').length,
    late: attendance.filter(a => a.status === 'Late').length,
    violations: attendance.filter(a => !a.inGeofence).length
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Page Header */}
      <div>
        <h2 style={{ fontSize: '22px', fontWeight: 700 }}>Attendance logs</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
          Monitor daily punch-in/out schedules, working hours, and check-in geolocation validation.
        </p>
      </div>

      {/* Highlights Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
        <div className="glass" style={{ padding: '16px 20px', borderLeft: '4px solid var(--accent-success)' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Today Present</div>
          <div style={{ fontSize: '20px', fontWeight: 700, marginTop: '4px', color: 'var(--accent-success)' }}>
            {totals.present} Staff members
          </div>
        </div>
        <div className="glass" style={{ padding: '16px 20px', borderLeft: '4px solid var(--accent-warning)' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Today Late Arrival</div>
          <div style={{ fontSize: '20px', fontWeight: 700, marginTop: '4px', color: 'var(--accent-warning)' }}>
            {totals.late} Staff members
          </div>
        </div>
        <div className="glass" style={{ padding: '16px 20px', borderLeft: '4px solid var(--accent-error)' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Geofence Breaches</div>
          <div style={{ fontSize: '20px', fontWeight: 700, marginTop: '4px', color: 'var(--accent-error)' }}>
            {totals.violations} Unverified check-ins
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="glass" style={{ padding: '16px', display: 'flex', gap: '16px', alignItems: 'center' }}>
        <input
          type="text"
          placeholder="Filter by staff name..."
          className="form-input"
          value={searchName}
          onChange={(e) => setSearchName(e.target.value)}
          style={{ flexGrow: 1 }}
        />
        <select
          className="form-input"
          value={filterGeofence}
          onChange={(e) => setFilterGeofence(e.target.value)}
          style={{ width: '220px' }}
        >
          <option value="All">All Geofence Statuses</option>
          <option value="In">Within Boundary (In Geofence)</option>
          <option value="Out">Outside Boundary (Geofence Breach)</option>
        </select>
      </div>

      {/* Attendance Logs Table */}
      <div className="table-wrapper glass">
        <table className="custom-table">
          <thead>
            <tr>
              <th>Log ID</th>
              <th>Staff Member</th>
              <th>Punch In Time</th>
              <th>Punch Out Time</th>
              <th>Work Duration</th>
              <th>Geofence Status</th>
              <th>Coordinates</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredAttendance.map((a) => (
              <tr key={a.id}>
                <td>{a.id}</td>
                <td style={{ fontWeight: 600 }}>{a.staffName}</td>
                <td style={{ color: 'var(--accent-success)' }}>{a.punchIn}</td>
                <td>{a.punchOut || '—'}</td>
                <td>{a.duration || 'Active now'}</td>
                <td>
                  <span className={`badge ${a.inGeofence ? 'badge-success' : 'badge-error'}`}>
                    {a.inGeofence ? 'In Geofence' : 'Breached'}
                  </span>
                </td>
                <td style={{ fontFamily: 'monospace', fontSize: '12px', color: 'var(--text-secondary)' }}>
                  {a.latitude.toFixed(4)}, {a.longitude.toFixed(4)}
                </td>
                <td>
                  <span className={`badge ${a.status === 'Present' ? 'badge-info' : 'badge-warning'}`}>
                    {a.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
