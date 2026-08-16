import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, X, User, MapPin, Briefcase, Hash, Calendar, Phone, Mail, 
  Clock, CreditCard, Landmark, FileText, CheckCircle2, AlertCircle, 
  ShieldCheck, Download, Edit, KeyRound, ExternalLink, Eye, Image as ImageIcon,
  Building2, Sparkles, AlertTriangle, Loader2
} from 'lucide-react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';

interface StaffDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  staff: any;
  onEdit?: (staff: any) => void;
  onResetPassword?: (email: string) => void;
}

export default function StaffDetailsModal({ isOpen, onClose, staff, onEdit, onResetPassword }: StaffDetailsModalProps) {
  const [selectedImagePreview, setSelectedImagePreview] = useState<{ title: string; url: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'documents' | 'bank' | 'payroll'>('all');
  
  // Real Attendance Logs & Selected Month Key
  const [attendanceLogs, setAttendanceLogs] = useState<any[]>([]);
  const [selectedMonthKey, setSelectedMonthKey] = useState(`${new Date().getFullYear()}-${new Date().getMonth()}`);
  const [loadingLogs, setLoadingLogs] = useState(true);

  useEffect(() => {
    if (!isOpen || (!staff?.id && !staff?.empId)) return;

    setLoadingLogs(true);

    const qAtt = query(
      collection(db, 'attendance'),
      where('staffId', '==', staff.empId || staff.id)
    );

    const unsub = onSnapshot(qAtt, (snapshot) => {
      const logs: any[] = [];
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        logs.push({ id: docSnap.id, ...data });
      });
      // Sort logs descending by date
      logs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setAttendanceLogs(logs);
      setLoadingLogs(false);
    }, (err) => {
      console.log("Error loading attendance stats:", err);
      setLoadingLogs(false);
    });

    return () => unsub();
  }, [isOpen, staff?.id, staff?.empId]);

  if (!isOpen || !staff) return null;

  const docs = staff.documents || {};
  const bank = staff.bankDetails || {};

  // Recalculate stats dynamically based on the selected month/year filter
  const filteredLogs = attendanceLogs.filter(log => {
    if (!log.date) return false;
    const parts = log.date.split('-');
    const logYear = parseInt(parts[0]);
    const logMonth = parseInt(parts[1]) - 1;
    const [selYear, selMonth] = selectedMonthKey.split('-').map(Number);
    return logYear === selYear && logMonth === selMonth;
  });

  let presentCount = 0;
  let lateCount = 0;
  let absentCount = 0;
  let halfDayCount = 0;

  filteredLogs.forEach(log => {
    const st = log.status || '';
    if (st === 'Present' || st === 'On Duty') presentCount++;
    else if (st === 'Late') lateCount++;
    else if (st === 'Absent') absentCount++;
    else if (st === 'Half Day') halfDayCount++;
  });

  const getMonthOptions = () => {
    const options = [];
    const now = new Date();
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      options.push({
        label: d.toLocaleString('default', { month: 'long', year: 'numeric' }),
        value: `${d.getFullYear()}-${d.getMonth()}`
      });
    }
    return options;
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#F8FAFC] overflow-y-auto w-full h-full flex flex-col animate-in fade-in duration-200">
      
      {/* ----- STICKY TOP NAVIGATION HEADER ----- */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <button 
            onClick={onClose}
            className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm"
          >
            <ArrowLeft size={16} /> Back to Directory
          </button>
          <div className="h-6 w-px bg-gray-200 hidden sm:block"></div>
          <div>
            <h1 className="text-lg font-extrabold text-gray-900 leading-none flex items-center gap-2">
              {staff.name}
              <span className="bg-blue-50 text-blue-700 border border-blue-200 text-[10px] px-2 py-0.5 rounded-full font-bold">
                ID: {staff.empId || staff.employeeId || 'N/A'}
              </span>
            </h1>
            <p className="text-xs text-gray-500 mt-1 font-medium">
              {staff.designation || 'Staff Member'} • {staff.staffType || staff.department || 'General'}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          {onResetPassword && staff.email && (
            <button 
              onClick={() => onResetPassword(staff.email)}
              className="hidden md:flex items-center gap-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 px-3 py-2 rounded-xl text-xs font-bold transition-all"
            >
              <KeyRound size={14} /> Reset Password
            </button>
          )}

          {onEdit && (
            <button 
              onClick={() => { onClose(); onEdit(staff); }}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm shadow-blue-200"
            >
              <Edit size={14} /> Edit Staff
            </button>
          )}

          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors ml-2"
          >
            <X size={22} />
          </button>
        </div>
      </header>

      {/* ----- MAIN CONTENT BODY ----- */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        
        {/* ----- PROFILE HERO BANNER ----- */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
          {/* Background decorative glowing circles */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none" />

          <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-6 relative z-10">
            {/* Left: Avatar & Basic Info */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-5">
              <div className="relative">
                {staff.avatar ? (
                  <img 
                    src={staff.avatar} 
                    alt={staff.name} 
                    className="w-24 h-24 rounded-2xl object-cover border-4 border-white/20 shadow-lg bg-slate-800"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 border-4 border-white/20 shadow-lg flex items-center justify-center text-3xl font-extrabold text-white uppercase tracking-wider">
                    {staff.name?.charAt(0) || 'U'}
                  </div>
                )}
                <span className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-slate-900 ${
                  staff.status === 'Active' || staff.status === 'On Duty' ? 'bg-emerald-500' : 'bg-amber-500'
                }`} title={staff.status} />
              </div>

              <div>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1">
                  <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">{staff.name}</h2>
                  <span className={`px-3 py-0.5 rounded-full text-xs font-bold border ${
                    staff.status === 'Active' || staff.status === 'On Duty' 
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' 
                      : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                  }`}>
                    {staff.status || 'Active'}
                  </span>
                  <span className="bg-white/10 text-blue-200 border border-white/15 text-xs px-2.5 py-0.5 rounded-full font-semibold">
                    {staff.staffType || 'Staff'}
                  </span>
                </div>

                <p className="text-blue-200 text-sm font-medium mb-3">
                  {staff.designation || 'Employee'} &nbsp;•&nbsp; {staff.department || 'Diagnostics & Care'}
                </p>

                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs text-slate-300">
                  <span className="flex items-center gap-1.5"><Mail size={14} className="text-blue-400" /> {staff.email}</span>
                  <span className="flex items-center gap-1.5"><Phone size={14} className="text-blue-400" /> {staff.phone || staff.phoneNumber || 'N/A'}</span>
                  <span className="flex items-center gap-1.5"><MapPin size={14} className="text-blue-400" /> {staff.workLocation || 'Main Hub'}</span>
                </div>
              </div>
            </div>

            {/* Right: Quick Stats Pill Container */}
            <div className="grid grid-cols-2 gap-3 w-full md:w-auto shrink-0">
              <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-3.5 text-center min-w-[120px]">
                <p className="text-[10px] text-blue-200 uppercase font-semibold tracking-wider">Monthly Salary</p>
                <p className="text-lg font-bold text-emerald-400 mt-0.5">₹ {Number(staff.salaryAmount || 0).toLocaleString()}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-3.5 text-center min-w-[120px]">
                <p className="text-[10px] text-blue-200 uppercase font-semibold tracking-wider">Shift Timing</p>
                <p className="text-sm font-bold text-white mt-1">{staff.shiftStartTime || '09:00'} - {staff.shiftEndTime || '18:00'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* ----- SECTION NAVIGATION TABS ----- */}
        <div className="flex items-center gap-2 border-b border-gray-200 pb-1 overflow-x-auto">
          {[
            { id: 'all', label: 'Overview & Details', icon: User },
            { id: 'documents', label: 'Uploaded Documents', icon: FileText, count: (docs.aadharFront ? 1 : 0) + (docs.aadharBack ? 1 : 0) + (docs.panCard ? 1 : 0) },
            { id: 'bank', label: 'Bank Account Info', icon: Landmark, isVerified: !!bank.accountNumber },
            { id: 'payroll', label: 'Salary & Attendance', icon: CreditCard },
          ].map((t) => {
            const IconComponent = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as any)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  activeTab === t.id 
                    ? 'bg-blue-600 text-white shadow-sm' 
                    : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                <IconComponent size={15} />
                {t.label}
                {t.count !== undefined && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${activeTab === t.id ? 'bg-white/20 text-white' : 'bg-blue-50 text-blue-600'}`}>
                    {t.count}
                  </span>
                )}
                {t.isVerified && (
                  <span className="w-2 h-2 rounded-full bg-emerald-500" title="Bank Details Present" />
                )}
              </button>
            );
          })}
        </div>

        {/* ----- GRID CONTAINER FOR DETAILS CARDS ----- */}
        {(activeTab === 'all' || activeTab === 'payroll') && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Personal Information */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                  <User size={18} className="text-blue-600" /> Personal Information
                </h3>
              </div>
              
              <div className="space-y-3.5 text-xs">
                <div>
                  <p className="text-gray-400 font-semibold uppercase text-[10px]">Full Name</p>
                  <p className="font-bold text-gray-900 text-sm mt-0.5">{staff.name || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-gray-400 font-semibold uppercase text-[10px]">Email Address</p>
                  <p className="font-semibold text-gray-800 mt-0.5">{staff.email || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-gray-400 font-semibold uppercase text-[10px]">Phone Number</p>
                  <p className="font-semibold text-gray-800 mt-0.5">{staff.phone || staff.phoneNumber || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-gray-400 font-semibold uppercase text-[10px]">Home Address</p>
                  <p className="font-medium text-gray-700 leading-relaxed mt-0.5">{staff.address || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-gray-400 font-semibold uppercase text-[10px]">Work Location</p>
                  <p className="font-semibold text-gray-800 mt-0.5">{staff.workLocation || 'Main Hub'}</p>
                </div>
              </div>
            </div>

            {/* Employment & Professional Details */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                  <Briefcase size={18} className="text-indigo-600" /> Professional Details
                </h3>
              </div>

              <div className="space-y-3.5 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-gray-400 font-semibold uppercase text-[10px]">Employee ID</p>
                    <p className="font-bold text-blue-600 text-sm mt-0.5">{staff.empId || staff.employeeId || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 font-semibold uppercase text-[10px]">Designation</p>
                    <p className="font-bold text-gray-900 text-sm mt-0.5">{staff.designation || 'N/A'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-gray-400 font-semibold uppercase text-[10px]">Department</p>
                    <p className="font-semibold text-gray-800 mt-0.5">{staff.department || staff.staffType || 'General'}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 font-semibold uppercase text-[10px]">Staff Type</p>
                    <p className="font-semibold text-gray-800 mt-0.5">{staff.staffType || 'Staff'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-gray-400 font-semibold uppercase text-[10px]">Shift Timings</p>
                    <p className="font-semibold text-gray-800 mt-0.5">{staff.shiftStartTime || '09:00'} - {staff.shiftEndTime || '18:00'}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 font-semibold uppercase text-[10px]">Weekly Off</p>
                    <p className="font-semibold text-gray-800 mt-0.5">{staff.weeklyOff || 'Sunday'}</p>
                  </div>
                </div>

                <div>
                  <p className="text-gray-400 font-semibold uppercase text-[10px]">Date of Joining</p>
                  <p className="font-semibold text-gray-800 mt-0.5">{staff.joinDate || staff.doj || 'N/A'}</p>
                </div>
              </div>
            </div>

            {/* Salary & Attendance Summary */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                  <CreditCard size={18} className="text-emerald-600" /> Salary & Payroll
                </h3>
              </div>

              <div className="space-y-3.5 text-xs">
                <div className="bg-emerald-50/60 p-3.5 rounded-xl border border-emerald-100">
                  <p className="text-emerald-700 text-[10px] uppercase font-bold">Base Monthly Salary</p>
                  <p className="text-xl font-extrabold text-emerald-800 mt-1">₹ {Number(staff.salaryAmount || 0).toLocaleString()}</p>
                  <p className="text-[10px] text-emerald-600 mt-1">Next Salary Cycle: {staff.nextSalaryDate ? new Date(staff.nextSalaryDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'}</p>
                </div>

                <div className="pt-2">
                  <div className="flex justify-between items-center mb-3">
                    <p className="text-gray-400 font-semibold uppercase text-[10px]">Monthly Attendance Stats</p>
                    <div className="flex items-center gap-1.5">
                      {loadingLogs && <Loader2 size={12} className="animate-spin text-blue-500" />}
                      <select 
                        value={selectedMonthKey} 
                        onChange={(e) => setSelectedMonthKey(e.target.value)}
                        className="bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold text-gray-700 px-2 py-1 outline-none cursor-pointer"
                      >
                        {getMonthOptions().map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 text-center">
                    <div className="bg-green-50 p-2.5 rounded-xl border border-green-100">
                      <p className="text-base font-bold text-green-700">{presentCount}</p>
                      <p className="text-[9px] font-bold text-green-600 uppercase">Present</p>
                    </div>
                    <div className="bg-amber-50 p-2.5 rounded-xl border border-amber-100">
                      <p className="text-base font-bold text-amber-700">{lateCount}</p>
                      <p className="text-[9px] font-bold text-amber-600 uppercase">Late</p>
                    </div>
                    <div className="bg-red-50 p-2.5 rounded-xl border border-red-100">
                      <p className="text-base font-bold text-red-700">{absentCount}</p>
                      <p className="text-[9px] font-bold text-red-600 uppercase">Absent</p>
                    </div>
                    <div className="bg-orange-50 p-2.5 rounded-xl border border-orange-100 hidden sm:block">
                      <p className="text-base font-bold text-orange-700">{halfDayCount}</p>
                      <p className="text-[9px] font-bold text-orange-600 uppercase">Half Day</p>
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-100 pt-4 mt-4">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Daily Logs History</h4>
                  
                  {loadingLogs ? (
                    <div className="py-4 text-center text-xs text-gray-500">Loading history logs...</div>
                  ) : filteredLogs.length === 0 ? (
                    <div className="py-4 text-center text-xs text-gray-400 font-medium">No logs recorded for this month.</div>
                  ) : (
                    <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                      {filteredLogs.map(log => {
                        let punchInTime = 'N/A';
                        let punchOutTime = 'N/A';
                        if (log.punchIn) {
                          try {
                            punchInTime = new Date(log.punchIn).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
                          } catch {}
                        }
                        if (log.punchOut) {
                          try {
                            punchOutTime = new Date(log.punchOut).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
                          } catch {}
                        }

                        const statusStyle = log.status === 'Present' || log.status === 'On Duty'
                          ? 'text-green-600 bg-green-50 border-green-100'
                          : log.status === 'Late'
                            ? 'text-amber-600 bg-amber-50 border-amber-100'
                            : log.status === 'Half Day'
                              ? 'text-orange-600 bg-orange-50 border-orange-100'
                              : 'text-red-500 bg-red-50 border-red-100';

                        return (
                          <div key={log.id} className="flex justify-between items-center bg-gray-50/50 p-2.5 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors">
                            <div>
                              <p className="font-bold text-gray-800 text-[11px]">
                                {new Date(log.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                              </p>
                              <p className="text-[10px] text-gray-500 mt-0.5">
                                In: <span className="font-bold text-gray-700">{punchInTime}</span> | Out: <span className="font-bold text-gray-700">{punchOutTime}</span>
                              </p>
                            </div>
                            <div className="text-right">
                              <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold border ${statusStyle}`}>
                                {log.status || 'Present'}
                              </span>
                              <p className="text-[9px] text-gray-400 mt-1 font-bold">
                                {log.hours ? `${log.hours} worked` : '--:--'}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>
        )}

        {/* ----- BANK ACCOUNT DETAILS SECTION ----- */}
        {(activeTab === 'all' || activeTab === 'bank') && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-4">
              <div>
                <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                  <Landmark size={20} className="text-blue-600" /> Bank Account Details
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">Banking information used for monthly salary transfers</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                bank.accountNumber 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                  : 'bg-gray-100 text-gray-500 border-gray-200'
              }`}>
                {bank.accountNumber ? '✓ Details Added' : 'Pending Bank Details'}
              </span>
            </div>

            {bank.accountNumber ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Virtual ATM Metallic Card */}
                <div className="bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-950 text-white rounded-2xl p-6 shadow-lg relative overflow-hidden border border-slate-700">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 blur-xl pointer-events-none" />
                  
                  <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-2">
                      <Landmark size={22} className="text-blue-400" />
                      <span className="font-bold text-lg tracking-wider">{bank.bankName || 'BANK NAME'}</span>
                    </div>
                    <CreditCard size={28} className="text-slate-400" />
                  </div>

                  <div className="mb-6">
                    <p className="text-[9px] text-slate-400 uppercase tracking-widest font-semibold mb-1">Account Number</p>
                    <p className="text-xl sm:text-2xl font-mono font-bold tracking-[3px] text-blue-300">
                      {bank.accountNumber ? bank.accountNumber.replace(/(\d{4})/g, '$1 ').trim() : 'xxxx xxxx xxxx'}
                    </p>
                  </div>

                  <div className="flex justify-between items-end text-xs">
                    <div>
                      <p className="text-[9px] text-slate-400 uppercase tracking-widest font-semibold mb-0.5">Account Holder</p>
                      <p className="font-bold uppercase text-white truncate max-w-[180px]">{bank.accountHolder || staff.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] text-slate-400 uppercase tracking-widest font-semibold mb-0.5">IFSC Code</p>
                      <p className="font-mono font-bold text-emerald-400">{bank.ifsc || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                {/* Structured Text Info Table */}
                <div className="grid grid-cols-2 gap-4 bg-gray-50/80 p-5 rounded-2xl border border-gray-200/80">
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase font-bold">Bank Name</p>
                    <p className="text-sm font-bold text-gray-900 mt-1">{bank.bankName || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase font-bold">Account Holder</p>
                    <p className="text-sm font-bold text-gray-900 mt-1">{bank.accountHolder || staff.name}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase font-bold">Account Number</p>
                    <p className="text-sm font-mono font-bold text-blue-600 mt-1">{bank.accountNumber || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase font-bold">IFSC Code</p>
                    <p className="text-sm font-mono font-bold text-gray-900 mt-1">{bank.ifsc || 'N/A'}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-[10px] text-gray-400 uppercase font-bold">Branch Name</p>
                    <p className="text-sm font-semibold text-gray-800 mt-1">{bank.branch || 'N/A'}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                <Landmark size={36} className="text-gray-300 mx-auto mb-2" />
                <p className="text-sm font-bold text-gray-600">No Bank Account Details Uploaded</p>
                <p className="text-xs text-gray-400 mt-1">Staff member has not updated unki bank details yet in the Staff App.</p>
              </div>
            )}
          </div>
        )}

        {/* ----- UPLOADED DOCUMENTS GALLERY SECTION ----- */}
        {(activeTab === 'all' || activeTab === 'documents') && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-4">
              <div>
                <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                  <FileText size={20} className="text-purple-600" /> Government Documents Gallery
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">Click any document image to view full high-resolution preview</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {/* Aadhaar Front */}
              <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200/80 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-gray-800">Aadhaar Card (Front)</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${docs.aadharFront ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-500'}`}>
                      {docs.aadharFront ? 'Uploaded' : 'Missing'}
                    </span>
                  </div>
                  {docs.aadharFront ? (
                    <div 
                      onClick={() => setSelectedImagePreview({ title: 'Aadhaar Card (Front)', url: docs.aadharFront })}
                      className="relative rounded-xl overflow-hidden border border-gray-300 cursor-pointer group bg-black/5"
                    >
                      <img src={docs.aadharFront} alt="Aadhaar Front" className="w-full h-44 object-cover group-hover:scale-105 transition-transform duration-200" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-bold text-xs gap-1.5">
                        <Eye size={18} /> Click to View
                      </div>
                    </div>
                  ) : (
                    <div className="h-44 rounded-xl bg-white border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400 text-xs">
                      <ImageIcon size={32} className="mb-2 text-gray-300" />
                      Not Uploaded
                    </div>
                  )}
                </div>
              </div>

              {/* Aadhaar Back */}
              <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200/80 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-gray-800">Aadhaar Card (Back)</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${docs.aadharBack ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-500'}`}>
                      {docs.aadharBack ? 'Uploaded' : 'Missing'}
                    </span>
                  </div>
                  {docs.aadharBack ? (
                    <div 
                      onClick={() => setSelectedImagePreview({ title: 'Aadhaar Card (Back)', url: docs.aadharBack })}
                      className="relative rounded-xl overflow-hidden border border-gray-300 cursor-pointer group bg-black/5"
                    >
                      <img src={docs.aadharBack} alt="Aadhaar Back" className="w-full h-44 object-cover group-hover:scale-105 transition-transform duration-200" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-bold text-xs gap-1.5">
                        <Eye size={18} /> Click to View
                      </div>
                    </div>
                  ) : (
                    <div className="h-44 rounded-xl bg-white border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400 text-xs">
                      <ImageIcon size={32} className="mb-2 text-gray-300" />
                      Not Uploaded
                    </div>
                  )}
                </div>
              </div>

              {/* PAN Card */}
              <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200/80 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-gray-800">PAN Card</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${docs.panCard ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-500'}`}>
                      {docs.panCard ? 'Uploaded' : 'Missing'}
                    </span>
                  </div>
                  {docs.panCard ? (
                    <div 
                      onClick={() => setSelectedImagePreview({ title: 'PAN Card', url: docs.panCard })}
                      className="relative rounded-xl overflow-hidden border border-gray-300 cursor-pointer group bg-black/5"
                    >
                      <img src={docs.panCard} alt="PAN Card" className="w-full h-44 object-cover group-hover:scale-105 transition-transform duration-200" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-bold text-xs gap-1.5">
                        <Eye size={18} /> Click to View
                      </div>
                    </div>
                  ) : (
                    <div className="h-44 rounded-xl bg-white border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400 text-xs">
                      <ImageIcon size={32} className="mb-2 text-gray-300" />
                      Not Uploaded
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* ----- HIGH-RES DOCUMENT IMAGE PREVIEW MODAL ----- */}
      {selectedImagePreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl overflow-hidden shadow-2xl max-w-4xl w-full flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 bg-gray-50">
              <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                <FileText size={18} className="text-blue-600" /> {selectedImagePreview.title} - {staff.name}
              </h3>
              <button 
                onClick={() => setSelectedImagePreview(null)}
                className="p-1.5 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-200 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 overflow-auto flex items-center justify-center bg-gray-900/5">
              <img src={selectedImagePreview.url} alt={selectedImagePreview.title} className="max-h-[70vh] object-contain rounded-xl shadow-md" />
            </div>
            <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 flex justify-between items-center text-xs">
              <span className="text-gray-500">Full Resolution Document Preview</span>
              <a 
                href={selectedImagePreview.url} 
                target="_blank" 
                rel="noreferrer"
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-1.5 transition-colors"
              >
                <ExternalLink size={14} /> Open Original File
              </a>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
