import React, { useState, useEffect } from 'react';
import { 
  Calendar, Check, X, Users, ShieldAlert, Clock, 
  Plus, Trash2, CalendarX, UserCheck, Search
} from 'lucide-react';
import { collection, onSnapshot, query, addDoc, updateDoc, deleteDoc, doc, where, orderBy } from 'firebase/firestore';
import { db } from '../services/firebase';

interface StaffSelectorProps {
  selectedStaffId: string;
  onSelect: (empId: string) => void;
  staffList: any[];
  label: string;
}

function StaffSelector({ selectedStaffId, onSelect, staffList, label }: StaffSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'All' | 'Office Staff' | 'Field Staff'>('All');
  const [isOpen, setIsOpen] = useState(false);

  const selectedStaff = staffList.find(s => s.empId === selectedStaffId);

  // Filter staff list
  const filteredStaff = staffList.filter(s => {
    const matchesType = typeFilter === 'All' || s.staffType === typeFilter;
    const matchesSearch = 
      (s.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.empId || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  return (
    <div className="space-y-2 relative">
      <label className="block text-xs font-bold text-gray-500 uppercase">{label}</label>
      
      {selectedStaff ? (
        // Selected Card
        <div className="flex items-center justify-between p-3.5 bg-emerald-50/30 border border-emerald-100 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 font-bold uppercase">
              {selectedStaff.name?.substring(0, 2)}
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">{selectedStaff.name}</p>
              <p className="text-xs text-gray-500 font-semibold">ID: {selectedStaff.empId} • {selectedStaff.staffType}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              onSelect('');
              setSearchQuery('');
            }}
            className="text-xs font-bold text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-all"
          >
            Change
          </button>
        </div>
      ) : (
        // Search and Dropdown
        <div className="space-y-2">
          {/* Type Filters */}
          <div className="flex bg-gray-100 p-1 rounded-xl gap-1">
            {(['All', 'Office Staff', 'Field Staff'] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setTypeFilter(type)}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  typeFilter === type
                    ? 'bg-white text-blue-600 shadow-sm font-extrabold'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {type === 'All' ? 'All' : type === 'Office Staff' ? 'Office' : 'Field'}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search by Name or ID..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsOpen(true);
              }}
              onFocus={() => setIsOpen(true)}
              className="w-full pl-9 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 text-xs font-bold"
              >
                Clear
              </button>
            )}
          </div>

          {/* Dropdown list */}
          {isOpen && (
            <>
              <div 
                className="fixed inset-0 z-10" 
                onClick={() => setIsOpen(false)} 
              />
              <div className="absolute z-20 w-full mt-1 bg-white border border-gray-100 rounded-xl shadow-xl max-h-60 overflow-y-auto divide-y divide-gray-50">
                {filteredStaff.length === 0 ? (
                  <div className="p-4 text-center text-xs text-gray-400 font-semibold">
                    No staff members found
                  </div>
                ) : (
                  filteredStaff.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        onSelect(s.empId);
                        setIsOpen(false);
                      }}
                      className="w-full text-left p-3 hover:bg-blue-50/50 transition-colors flex items-center justify-between"
                    >
                      <div>
                        <p className="text-sm font-bold text-gray-900">{s.name}</p>
                        <p className="text-xs text-gray-500">ID: {s.empId} • {s.designation || s.staffType}</p>
                      </div>
                      {s.weeklyOff && (
                        <span className="text-[10px] font-bold bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                          Off: {s.weeklyOff}
                        </span>
                      )}
                    </button>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function Leaves() {
  const [activeTab, setActiveTab] = useState<'requests' | 'active' | 'weekly-off' | 'extra-duty' | 'company-holidays'>('requests');
  const [leavesList, setLeavesList] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [weeklyOffCancellations, setWeeklyOffCancellations] = useState<any[]>([]);
  const [extraDuties, setExtraDuties] = useState<any[]>([]);
  const [companyHolidays, setCompanyHolidays] = useState<any[]>([]);

  // Weekly off cancellation form state
  const [cancelStaffId, setCancelStaffId] = useState('');
  const [cancelDate, setCancelDate] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [isSubmittingOff, setIsSubmittingOff] = useState(false);

  // Extra duty form state
  const [dutyStaffId, setDutyStaffId] = useState('');
  const [dutyDate, setDutyDate] = useState('');
  const [dutyReason, setDutyReason] = useState('');
  const [isSubmittingDuty, setIsSubmittingDuty] = useState(false);

  // Company holiday form state
  const [holidayDate, setHolidayDate] = useState('');
  const [holidayName, setHolidayName] = useState('');
  const [holidayWish, setHolidayWish] = useState('');
  const [isSubmittingHoliday, setIsSubmittingHoliday] = useState(false);

  useEffect(() => {
    // 1. Fetch Leaves list
    const unsubLeaves = onSnapshot(collection(db, 'leaves'), (snapshot) => {
      const leaves: any[] = [];
      snapshot.forEach(docSnap => {
        leaves.push({ id: docSnap.id, ...docSnap.data() });
      });
      // Sort by createdAt desc
      leaves.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      setLeavesList(leaves);
    });

    // 2. Fetch Staff directory (for selectors)
    const unsubStaff = onSnapshot(query(collection(db, 'users'), where('role', '==', 'staff')), (snapshot) => {
      const staff: any[] = [];
      snapshot.forEach(docSnap => {
        staff.push({ id: docSnap.id, ...docSnap.data() });
      });
      setStaffList(staff);
    });

    // 3. Fetch Weekly Off Cancellations
    const unsubCancellations = onSnapshot(collection(db, 'weekly_off_cancellations'), (snapshot) => {
      const cancels: any[] = [];
      snapshot.forEach(docSnap => {
        cancels.push({ id: docSnap.id, ...docSnap.data() });
      });
      cancels.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      setWeeklyOffCancellations(cancels);
    });

    // 4. Fetch Extra Duties
    const unsubDuties = onSnapshot(collection(db, 'extra_duties'), (snapshot) => {
      const duties: any[] = [];
      snapshot.forEach(docSnap => {
        duties.push({ id: docSnap.id, ...docSnap.data() });
      });
      duties.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      setExtraDuties(duties);
    });

    // 5. Fetch Company Holidays
    const unsubHolidays = onSnapshot(collection(db, 'company_holidays'), (snapshot) => {
      const holi: any[] = [];
      snapshot.forEach(docSnap => {
        holi.push({ id: docSnap.id, ...docSnap.data() });
      });
      holi.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
      setCompanyHolidays(holi);
    });

    return () => {
      unsubLeaves();
      unsubStaff();
      unsubCancellations();
      unsubDuties();
      unsubHolidays();
    };
  }, []);

  const handleCompanyHolidaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!holidayDate || !holidayName.trim() || !holidayWish.trim()) {
      alert('Please fill out all fields.');
      return;
    }

    setIsSubmittingHoliday(true);
    try {
      await addDoc(collection(db, 'company_holidays'), {
        date: holidayDate,
        name: holidayName.trim(),
        wishMessage: holidayWish.trim(),
        createdAt: new Date().toISOString()
      });

      setHolidayDate('');
      setHolidayName('');
      setHolidayWish('');
      alert('Company-wide holiday added successfully.');
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setIsSubmittingHoliday(false);
    }
  };

  const handleDeleteHoliday = async (id: string) => {
    if (!confirm('Are you sure you want to delete this company holiday?')) return;
    try {
      await deleteDoc(doc(db, 'company_holidays', id));
      alert('Holiday deleted.');
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  const handleApproveLeave = async (leaveId: string) => {
    try {
      await updateDoc(doc(db, 'leaves', leaveId), {
        status: 'Approved'
      });
      alert('Leave request approved successfully.');
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  const handleRejectLeave = async (leaveId: string) => {
    try {
      await updateDoc(doc(db, 'leaves', leaveId), {
        status: 'Rejected'
      });
      alert('Leave request rejected successfully.');
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  const handleCancelWeeklyOffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelStaffId || !cancelDate || !cancelReason.trim()) {
      alert('Please fill out all fields.');
      return;
    }

    setIsSubmittingOff(true);
    try {
      const staffMember = staffList.find(s => s.empId === cancelStaffId);
      const name = staffMember ? staffMember.name : 'Unknown Staff';

      await addDoc(collection(db, 'weekly_off_cancellations'), {
        staffId: cancelStaffId,
        name,
        date: cancelDate,
        reason: cancelReason.trim(),
        createdAt: new Date().toISOString()
      });

      setCancelStaffId('');
      setCancelDate('');
      setCancelReason('');
      alert('Weekly Off cancelled successfully for this date.');
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setIsSubmittingOff(false);
    }
  };

  const handleDeleteWeeklyOffCancellation = async (id: string) => {
    if (!confirm('Are you sure you want to restore this weekly off?')) return;
    try {
      await deleteDoc(doc(db, 'weekly_off_cancellations', id));
      alert('Weekly Off restored.');
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  const handleExtraDutySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dutyStaffId || !dutyDate || !dutyReason.trim()) {
      alert('Please fill out all fields.');
      return;
    }

    setIsSubmittingDuty(true);
    try {
      const staffMember = staffList.find(s => s.empId === dutyStaffId);
      const name = staffMember ? staffMember.name : 'Unknown Staff';

      await addDoc(collection(db, 'extra_duties'), {
        staffId: dutyStaffId,
        name,
        date: dutyDate,
        reason: dutyReason.trim(),
        status: 'Active',
        createdAt: new Date().toISOString()
      });

      setDutyStaffId('');
      setDutyDate('');
      setDutyReason('');
      alert('Extra duty assigned successfully.');
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setIsSubmittingDuty(false);
    }
  };

  const handleCompleteExtraDuty = async (id: string) => {
    try {
      await updateDoc(doc(db, 'extra_duties', id), {
        status: 'Completed'
      });
      alert('Extra duty marked as Completed.');
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  const handleDeleteExtraDuty = async (id: string) => {
    if (!confirm('Are you sure you want to delete this extra duty record?')) return;
    try {
      await deleteDoc(doc(db, 'extra_duties', id));
      alert('Extra duty record deleted.');
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  // Helper: check if today falls inside leave dates
  const isCurrentlyOnLeave = (startDate: string, endDate: string) => {
    const today = new Date().toISOString().split('T')[0];
    return today >= startDate && today <= endDate;
  };

  const activeLeaves = leavesList.filter(l => l.status === 'Approved' && isCurrentlyOnLeave(l.startDate, l.endDate));
  const pendingRequests = leavesList.filter(l => l.status === 'Pending');
  const pastLeaves = leavesList.filter(l => l.status !== 'Pending');

  // Separating extra duties
  const activeDuties = extraDuties.filter(d => d.status === 'Active');
  const completedDuties = extraDuties.filter(d => d.status === 'Completed');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leaves &amp; Offs Management</h1>
          <p className="text-sm text-gray-500 mt-1">Manage staff leaves, weekly offs cancellations, and assign extra duties</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 bg-white p-2 rounded-xl shadow-sm gap-2">
        <button
          onClick={() => setActiveTab('requests')}
          className={`flex-1 py-3 text-sm font-semibold rounded-lg transition-all ${
            activeTab === 'requests'
              ? 'bg-[#2563EB] text-white shadow-sm'
              : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
          }`}
        >
          Leave Requests ({pendingRequests.length})
        </button>
        <button
          onClick={() => setActiveTab('active')}
          className={`flex-1 py-3 text-sm font-semibold rounded-lg transition-all ${
            activeTab === 'active'
              ? 'bg-[#2563EB] text-white shadow-sm'
              : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
          }`}
        >
          Who's On Leave ({activeLeaves.length})
        </button>
        <button
          onClick={() => setActiveTab('weekly-off')}
          className={`flex-1 py-3 text-sm font-semibold rounded-lg transition-all ${
            activeTab === 'weekly-off'
              ? 'bg-[#2563EB] text-white shadow-sm'
              : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
          }`}
        >
          Weekly Off Cancellations
        </button>
        <button
          onClick={() => setActiveTab('extra-duty')}
          className={`flex-1 py-3 text-sm font-semibold rounded-lg transition-all ${
            activeTab === 'extra-duty'
              ? 'bg-[#2563EB] text-white shadow-sm'
              : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
          }`}
        >
          Extra Duties ({activeDuties.length} Active)
        </button>
        <button
          onClick={() => setActiveTab('company-holidays')}
          className={`flex-1 py-3 text-sm font-semibold rounded-lg transition-all ${
            activeTab === 'company-holidays'
              ? 'bg-[#2563EB] text-white shadow-sm'
              : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
          }`}
        >
          Company Holidays ({companyHolidays.length})
        </button>
      </div>

      {/* TAB 1: Leave Requests */}
      {activeTab === 'requests' && (
        <div className="space-y-6">
          {/* Pending Requests */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
              <h2 className="font-bold text-gray-900 flex items-center gap-2">
                <Clock className="text-amber-500" size={18} />
                Pending Leave Requests ({pendingRequests.length})
              </h2>
            </div>
            {pendingRequests.length === 0 ? (
              <div className="p-8 text-center text-gray-500 font-medium">No pending leave requests.</div>
            ) : (
              <div className="divide-y divide-gray-100">
                {pendingRequests.map((req) => (
                  <div key={req.id} className="p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-gray-50/50 transition-colors">
                    <div className="space-y-1">
                      <h3 className="font-bold text-gray-900 text-lg">{req.name}</h3>
                      <p className="text-xs font-semibold text-gray-400">Emp ID: {req.staffId} • Ph: {req.phone}</p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <span className="bg-blue-50 text-blue-600 text-xs px-2.5 py-1 rounded-full font-bold border border-blue-100">{req.leaveType}</span>
                        <span className="bg-amber-50 text-amber-700 text-xs px-2.5 py-1 rounded-full font-bold border border-amber-100">
                          {req.startDate === req.endDate ? req.startDate : `${req.startDate} to ${req.endDate}`}
                        </span>
                      </div>
                      <p className="text-gray-700 text-sm mt-3 pt-2 border-t border-gray-100"><span className="font-semibold text-gray-900">Reason:</span> {req.reason}</p>
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto">
                      <button
                        onClick={() => handleApproveLeave(req.id)}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-sm transition-colors"
                      >
                        <Check size={16} /> Approve
                      </button>
                      <button
                        onClick={() => handleRejectLeave(req.id)}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-sm rounded-xl shadow-sm transition-colors"
                      >
                        <X size={16} /> Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Past Requests History */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
              <h2 className="font-bold text-gray-900 flex items-center gap-2">
                <Calendar className="text-blue-500" size={18} />
                Processed Requests History
              </h2>
            </div>
            {pastLeaves.length === 0 ? (
              <div className="p-8 text-center text-gray-500 font-medium">No leave request history.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50/55 text-gray-500 text-xs font-bold border-b border-gray-100">
                      <th className="p-4">Staff Member</th>
                      <th className="p-4">Leave Duration</th>
                      <th className="p-4">Leave Type</th>
                      <th className="p-4">Reason</th>
                      <th className="p-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-sm">
                    {pastLeaves.map((req) => (
                      <tr key={req.id} className="hover:bg-gray-50/30 transition-colors">
                        <td className="p-4">
                          <p className="font-bold text-gray-900">{req.name}</p>
                          <p className="text-xs text-gray-400">ID: {req.staffId}</p>
                        </td>
                        <td className="p-4 font-semibold text-gray-700">
                          {req.startDate === req.endDate ? req.startDate : `${req.startDate} to ${req.endDate}`}
                        </td>
                        <td className="p-4">
                          <span className="bg-gray-100 text-gray-700 text-xs px-2 py-0.5 rounded-full font-semibold border border-gray-200">{req.leaveType}</span>
                        </td>
                        <td className="p-4 text-gray-600 max-w-xs truncate">{req.reason}</td>
                        <td className="p-4">
                          <span className={`text-xs px-2.5 py-1 rounded-full font-bold border ${
                            req.status === 'Approved' 
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                              : 'bg-red-50 text-red-700 border-red-100'
                          }`}>
                            {req.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: Who's On Leave */}
      {activeTab === 'active' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
            <h2 className="font-bold text-gray-900 flex items-center gap-2">
              <Users className="text-purple-500" size={18} />
              Currently Active On Leave (Today)
            </h2>
          </div>
          {activeLeaves.length === 0 ? (
            <div className="p-12 text-center text-gray-500 font-medium">
              <ShieldAlert className="mx-auto text-gray-300 mb-3" size={36} />
              No staff members are on leave today.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6">
              {activeLeaves.map((leave) => (
                <div key={leave.id} className="p-4 border border-purple-100 rounded-xl bg-purple-50/20 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-gray-900 text-base">{leave.name}</h3>
                    <p className="text-xs text-gray-500 font-semibold mt-0.5">Emp ID: {leave.staffId}</p>
                    <p className="text-xs font-semibold text-purple-700 mt-2 bg-purple-50 border border-purple-100 w-fit px-2 py-0.5 rounded-full">
                      Duration: {leave.startDate} to {leave.endDate}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="bg-purple-100 text-purple-700 text-xs px-2.5 py-1 rounded-full font-bold">On Leave</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Weekly Off Cancellations */}
      {activeTab === 'weekly-off' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Cancel Weekly Off Form */}
          <div className="lg:col-span-1 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm h-fit">
            <h2 className="font-bold text-gray-900 text-lg mb-4 flex items-center gap-2">
              <CalendarX className="text-red-500" size={20} />
              Cancel Weekly Off
            </h2>
            <form onSubmit={handleCancelWeeklyOffSubmit} className="space-y-4">
              <StaffSelector
                selectedStaffId={cancelStaffId}
                onSelect={setCancelStaffId}
                staffList={staffList}
                label="Select Staff Member"
              />

              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Select Date</label>
                <input
                  type="date"
                  value={cancelDate}
                  onChange={(e) => setCancelDate(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Reason / Cause</label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  required
                  rows={3}
                  placeholder="e.g. Extra load at Branch, Emergency Cover"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB] resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmittingOff}
                className="w-full flex items-center justify-center gap-2 py-3 bg-[#2563EB] hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-sm transition-colors disabled:opacity-70"
              >
                <Plus size={16} /> {isSubmittingOff ? 'Cancelling Off...' : 'Cancel Weekly Off'}
              </button>
            </form>
          </div>

          {/* Cancellations List */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
              <h2 className="font-bold text-gray-900">Cancelled Weekly Offs Records</h2>
            </div>
            {weeklyOffCancellations.length === 0 ? (
              <div className="p-8 text-center text-gray-500 font-medium">No cancelled weekly offs found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50/55 text-gray-500 text-xs font-bold border-b border-gray-100">
                      <th className="p-4">Staff Member</th>
                      <th className="p-4">Canceled Date</th>
                      <th className="p-4">Reason</th>
                      <th className="p-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-sm">
                    {weeklyOffCancellations.map((cancel) => (
                      <tr key={cancel.id} className="hover:bg-gray-50/30 transition-colors">
                        <td className="p-4">
                          <p className="font-bold text-gray-900">{cancel.name}</p>
                          <p className="text-xs text-gray-400">ID: {cancel.staffId}</p>
                        </td>
                        <td className="p-4 font-semibold text-red-600">{cancel.date}</td>
                        <td className="p-4 text-gray-600">{cancel.reason}</td>
                        <td className="p-4">
                          <button
                            onClick={() => handleDeleteWeeklyOffCancellation(cancel.id)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Restore Weekly Off"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: Extra Duties */}
      {activeTab === 'extra-duty' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Assign Extra Duty Form */}
          <div className="lg:col-span-1 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm h-fit">
            <h2 className="font-bold text-gray-900 text-lg mb-4 flex items-center gap-2">
              <UserCheck className="text-blue-500" size={20} />
              Assign Extra Duty
            </h2>
            <form onSubmit={handleExtraDutySubmit} className="space-y-4">
              <StaffSelector
                selectedStaffId={dutyStaffId}
                onSelect={setDutyStaffId}
                staffList={staffList}
                label="Select Staff Member"
              />

              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Duty Date</label>
                <input
                  type="date"
                  value={dutyDate}
                  onChange={(e) => setDutyDate(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Duty Reason / Description</label>
                <textarea
                  value={dutyReason}
                  onChange={(e) => setDutyReason(e.target.value)}
                  required
                  rows={3}
                  placeholder="e.g. Branch stock maintenance, Sunday backup coverage"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB] resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmittingDuty}
                className="w-full flex items-center justify-center gap-2 py-3 bg-[#2563EB] hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-sm transition-colors disabled:opacity-70"
              >
                <Plus size={16} /> {isSubmittingDuty ? 'Assigning...' : 'Assign Extra Duty'}
              </button>
            </form>
          </div>

          {/* Extra Duties Lists */}
          <div className="lg:col-span-2 space-y-6">
            {/* Active Duties */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                <h2 className="font-bold text-gray-900">Active Extra Duties</h2>
              </div>
              {activeDuties.length === 0 ? (
                <div className="p-8 text-center text-gray-500 font-medium">No active extra duties.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50/55 text-gray-500 text-xs font-bold border-b border-gray-100">
                        <th className="p-4">Staff Member</th>
                        <th className="p-4">Date</th>
                        <th className="p-4">Reason</th>
                        <th className="p-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-sm">
                      {activeDuties.map((duty) => (
                        <tr key={duty.id} className="hover:bg-gray-50/30 transition-colors">
                          <td className="p-4">
                            <p className="font-bold text-gray-900">{duty.name}</p>
                            <p className="text-xs text-gray-400">ID: {duty.staffId}</p>
                          </td>
                          <td className="p-4 font-semibold text-blue-600">{duty.date}</td>
                          <td className="p-4 text-gray-600">{duty.reason}</td>
                          <td className="p-4 flex gap-2">
                            <button
                              onClick={() => handleCompleteExtraDuty(duty.id)}
                              className="px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold rounded-lg hover:bg-emerald-100 transition-colors"
                            >
                              Complete
                            </button>
                            <button
                              onClick={() => handleDeleteExtraDuty(duty.id)}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Completed/Past Duties */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                <h2 className="font-bold text-gray-900">Past Completed Extra Duties</h2>
              </div>
              {completedDuties.length === 0 ? (
                <div className="p-8 text-center text-gray-500 font-medium">No completed extra duty history.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50/55 text-gray-500 text-xs font-bold border-b border-gray-100">
                        <th className="p-4">Staff Member</th>
                        <th className="p-4">Completed Date</th>
                        <th className="p-4">Reason</th>
                        <th className="p-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-sm">
                      {completedDuties.map((duty) => (
                        <tr key={duty.id} className="hover:bg-gray-50/30 transition-colors">
                          <td className="p-4">
                            <p className="font-bold text-gray-900">{duty.name}</p>
                            <p className="text-xs text-gray-400">ID: {duty.staffId}</p>
                          </td>
                          <td className="p-4 text-gray-500">{duty.date}</td>
                          <td className="p-4 text-gray-600">{duty.reason}</td>
                          <td className="p-4">
                            <span className="bg-gray-100 text-gray-700 text-xs px-2.5 py-1 rounded-full font-bold border border-gray-200">
                              Completed
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
          </div>
        </div>
      </div>
    )}
      {activeTab === 'company-holidays' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Add Company Holiday Form */}
          <div className="lg:col-span-1 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm h-fit">
            <h2 className="font-bold text-gray-900 text-lg mb-4 flex items-center gap-2">
              <Calendar className="text-blue-600" size={20} />
              Add Company Holiday
            </h2>
            <form onSubmit={handleCompanyHolidaySubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Holiday Date</label>
                <input
                  type="date"
                  value={holidayDate}
                  onChange={(e) => setHolidayDate(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Holiday Name</label>
                <input
                  type="text"
                  value={holidayName}
                  onChange={(e) => setHolidayName(e.target.value)}
                  required
                  placeholder="e.g. Diwali"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Festival Wish / Msg</label>
                <textarea
                  value={holidayWish}
                  onChange={(e) => setHolidayWish(e.target.value)}
                  required
                  rows={3}
                  placeholder="e.g. Wishing you a happy and prosperous Diwali! Enjoy the day off with your loved ones."
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB] resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmittingHoliday}
                className="w-full flex items-center justify-center gap-2 py-3 bg-[#2563EB] hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-sm transition-colors disabled:opacity-70"
              >
                <Plus size={16} /> {isSubmittingHoliday ? 'Adding...' : 'Add Holiday'}
              </button>
            </form>
          </div>

          {/* Holiday List */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
              <h2 className="font-bold text-gray-900">Company-wide Holidays List</h2>
            </div>
            {companyHolidays.length === 0 ? (
              <div className="p-8 text-center text-gray-500 font-medium">No company-wide holidays recorded.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50/55 text-gray-500 text-xs font-bold border-b border-gray-100">
                      <th className="p-4">Holiday Name</th>
                      <th className="p-4">Date</th>
                      <th className="p-4">Wish Message</th>
                      <th className="p-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-sm">
                    {companyHolidays.map((holi) => (
                      <tr key={holi.id} className="hover:bg-gray-50/30 transition-colors">
                        <td className="p-4 font-bold text-gray-900">{holi.name}</td>
                        <td className="p-4 font-semibold text-blue-600">{holi.date}</td>
                        <td className="p-4 text-gray-600 max-w-xs">{holi.wishMessage}</td>
                        <td className="p-4">
                          <button
                            onClick={() => handleDeleteHoliday(holi.id)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete Holiday"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
