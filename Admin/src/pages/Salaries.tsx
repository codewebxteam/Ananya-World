import { useState } from 'react';
import { Settings, Check } from 'lucide-react';
import { initialSalaries } from '../services/mockData';
import type { SalarySlip } from '../types';

export default function Salaries() {
  const [salaries, setSalaries] = useState<SalarySlip[]>(initialSalaries);
  const [selectedMonth] = useState('July');
  const [processing, setProcessing] = useState(false);

  const handleProcessSalaries = () => {
    setProcessing(true);
    setTimeout(() => {
      setSalaries((prev) =>
        prev.map((slip) => (slip.status === 'Pending' ? { ...slip, status: 'Processing' } : slip))
      );
      setProcessing(false);
      alert('Payroll processing initiated successfully for pending staff.');
    }, 1500);
  };

  const handlePaySalary = (id: string) => {
    setSalaries((prev) =>
      prev.map((slip) => (slip.id === id ? { ...slip, status: 'Paid' } : slip))
    );
  };

  const totalPayroll = salaries.reduce((acc, curr) => acc + curr.finalSalary, 0);
  const totalPending = salaries.filter(s => s.status !== 'Paid').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: 700 }}>Payroll & Salary Management</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
            Automate monthly salary calculation based on attendance tracking, deductions, and payouts.
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={handleProcessSalaries}
          disabled={processing || totalPending === 0}
        >
          {processing ? 'Processing...' : <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Settings size={16} className="spin-on-hover" /> Process Monthly Payroll</span>}
        </button>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
        <div className="glass" style={{ padding: '20px' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Selected Payout Month</div>
          <div style={{ fontSize: '20px', fontWeight: 700, marginTop: '4px', color: 'var(--accent-secondary)' }}>
            {selectedMonth} 2026
          </div>
        </div>
        <div className="glass" style={{ padding: '20px' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Total Payout Value</div>
          <div style={{ fontSize: '20px', fontWeight: 700, marginTop: '4px', color: 'var(--accent-success)' }}>
            ₹{totalPayroll.toLocaleString()}
          </div>
        </div>
        <div className="glass" style={{ padding: '20px' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Pending Disbursals</div>
          <div style={{ fontSize: '20px', fontWeight: 700, marginTop: '4px', color: totalPending > 0 ? 'var(--accent-warning)' : 'var(--accent-success)' }}>
            {totalPending} Slips Pending
          </div>
        </div>
      </div>

      {/* Salary Slips Table */}
      <div className="table-wrapper glass">
        <table className="custom-table">
          <thead>
            <tr>
              <th>Slip ID</th>
              <th>Staff Name</th>
              <th>Days Present</th>
              <th>Base Salary</th>
              <th>Allowances</th>
              <th>Deductions</th>
              <th>Calculated Final</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {salaries.map((slip) => (
              <tr key={slip.id}>
                <td>{slip.id}</td>
                <td style={{ fontWeight: 600 }}>{slip.staffName}</td>
                <td>{slip.attendanceDays} days</td>
                <td>₹{slip.baseSalary.toLocaleString()}</td>
                <td style={{ color: 'var(--accent-success)' }}>+₹{slip.allowances.toLocaleString()}</td>
                <td style={{ color: 'var(--accent-error)' }}>-₹{slip.deductions.toLocaleString()}</td>
                <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                  ₹{slip.finalSalary.toLocaleString()}
                </td>
                <td>
                  <span
                    className={`badge ${
                      slip.status === 'Paid'
                        ? 'badge-success'
                        : slip.status === 'Processing'
                        ? 'badge-warning'
                        : 'badge-error'
                    }`}
                  >
                    {slip.status}
                  </span>
                </td>
                <td>
                  {slip.status !== 'Paid' ? (
                    <button
                      className="btn btn-secondary"
                      style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '8px' }}
                      onClick={() => handlePaySalary(slip.id)}
                    >
                      Release Payout
                    </button>
                  ) : (
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}>Paid <Check size={14} style={{ color: 'var(--accent-success)' }} /></span>
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
