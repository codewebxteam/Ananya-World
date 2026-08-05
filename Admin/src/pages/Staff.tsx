import { useState } from 'react';
import { Plus } from 'lucide-react';
import { initialStaff } from '../services/mockData';
import type { StaffMember } from '../types';

export default function Staff() {
  const [staffList, setStaffList] = useState<StaffMember[]>(initialStaff);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [showAddModal, setShowAddModal] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<'Field Staff' | 'Lab Staff'>('Field Staff');
  const [baseSalary, setBaseSalary] = useState('');

  const handleAddStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !phone || !baseSalary) return;

    const newStaff: StaffMember = {
      id: `EMP00${staffList.length + 1}`,
      name,
      email,
      phone,
      role,
      status: 'Offline',
      salary: {
        base: parseFloat(baseSalary),
        hourlyRate: parseFloat(baseSalary) / 160,
      },
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
    };

    setStaffList([...staffList, newStaff]);
    setName('');
    setEmail('');
    setPhone('');
    setBaseSalary('');
    setShowAddModal(false);
  };

  const filteredStaff = staffList.filter((s) => {
    const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase()) || s.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === 'All' || s.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: 700 }}>Staff Directory</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
            Manage profiles, pay rates, and operating roles for laboratory and field employees.
          </p>
        </div>
        <button className="btn btn-primary" style={{ gap: '8px' }} onClick={() => setShowAddModal(true)}>
          <Plus size={16} /> Add New Staff
        </button>
      </div>

      {/* Filters */}
      <div className="glass" style={{ padding: '16px', display: 'flex', gap: '16px', alignItems: 'center' }}>
        <input
          type="text"
          placeholder="Search by name or email..."
          className="form-input"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flexGrow: 1 }}
        />
        <select
          className="form-input"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          style={{ width: '180px' }}
        >
          <option value="All">All Roles</option>
          <option value="Field Staff">Field Staff</option>
          <option value="Lab Staff">Lab Staff</option>
        </select>
      </div>

      {/* Staff Table */}
      <div className="table-wrapper glass">
        <table className="custom-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Avatar & Name</th>
              <th>Role</th>
              <th>Contact Details</th>
              <th>Base Salary</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredStaff.map((staff) => (
              <tr key={staff.id}>
                <td>{staff.id}</td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        backgroundImage: `url(${staff.avatar})`,
                        backgroundSize: 'cover',
                        border: '1px solid var(--border-glass)',
                      }}
                    />
                    <div style={{ fontWeight: 600 }}>{staff.name}</div>
                  </div>
                </td>
                <td>{staff.role}</td>
                <td>
                  <div style={{ fontSize: '13px' }}>
                    <div style={{ color: 'var(--text-primary)' }}>{staff.email}</div>
                    <div style={{ color: 'var(--text-secondary)', marginTop: '2px' }}>{staff.phone}</div>
                  </div>
                </td>
                <td>₹{staff.salary.base.toLocaleString()} / mo</td>
                <td>
                  <span className={`badge ${staff.status === 'Online' ? 'badge-success' : 'badge-warning'}`}>
                    {staff.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Staff Modal */}
      {showAddModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div className="glass" style={{ width: '450px', padding: '24px', position: 'relative' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '20px' }}>Register New Staff</h3>
            <form onSubmit={handleAddStaff} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Full Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Official Email</label>
                <input
                  type="email"
                  className="form-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Phone Number</label>
                <input
                  type="text"
                  className="form-input"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Role Designation</label>
                <select
                  className="form-input"
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                >
                  <option value="Field Staff">Field Staff (Lab Specimen Collector)</option>
                  <option value="Lab Staff">Lab Staff (Technician / Pathologist)</option>
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Base Monthly Salary (₹)</label>
                <input
                  type="number"
                  className="form-input"
                  value={baseSalary}
                  onChange={(e) => setBaseSalary(e.target.value)}
                  required
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
