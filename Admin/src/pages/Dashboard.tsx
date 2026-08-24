import React, { useState, useEffect } from 'react';
import { 
  Users, MapPin, Clock, CalendarCheck2, CalendarX2, 
  UserPlus, Megaphone, ChevronDown, IndianRupee
} from 'lucide-react';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { db } from '../services/firebase';

interface DashboardProps {
  staffList?: any[];
  setActiveTab?: (tab: string) => void;
  branchesList?: any[];
}

export default function Dashboard({ staffList = [], setActiveTab, branchesList = [] }: DashboardProps) {
  const [attendanceData, setAttendanceData] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [payrollData, setPayrollData] = useState<any[]>([]);
  const [activeDetailType, setActiveDetailType] = useState<string | null>('present');

  useEffect(() => {
    // Fetch today's attendance
    const today = new Date().toISOString().split('T')[0];
    const attendanceQuery = query(collection(db, 'attendance'), where('date', '==', today));
    const unsubscribeAttendance = onSnapshot(attendanceQuery, (snapshot) => {
      const data: any[] = [];
      snapshot.forEach(doc => data.push({ id: doc.id, ...doc.data() }));
      setAttendanceData(data);
    });

    // Fetch recent announcements
    const announcementsQuery = query(collection(db, 'communications'), orderBy('createdAt', 'desc'), limit(5));
    const unsubscribeAnnouncements = onSnapshot(announcementsQuery, (snapshot) => {
      const data: any[] = [];
      snapshot.forEach(doc => data.push({ id: doc.id, ...doc.data() }));
      setAnnouncements(data);
    });

    // Fetch payroll data
    const payrollQuery = query(collection(db, 'payroll'));
    const unsubscribePayroll = onSnapshot(payrollQuery, (snapshot) => {
      const data: any[] = [];
      snapshot.forEach(doc => data.push({ id: doc.id, ...doc.data() }));
      setPayrollData(data);
    });

    return () => {
      unsubscribeAttendance();
      unsubscribeAnnouncements();
      unsubscribePayroll();
    };
  }, []);

  const approvedStaffList = staffList.filter(s => s.status !== 'Pending');
  const totalStaff = approvedStaffList.length;
  const activeStaffList = staffList.filter(s => s.status === 'Active' || s.status === 'On Duty');
  const activeStaff = activeStaffList.length;
  
  // Field Staff specific metrics
  const fieldStaffList = staffList.filter(s => s.staffType === 'Field Staff' || s.staffType === 'Field staff');
  const totalFieldStaff = fieldStaffList.length;
  const onlineFieldStaff = attendanceData.filter(a => {
    const s = staffList.find(staff => staff.empId === a.staffId);
    return s && (s.staffType === 'Field Staff' || s.staffType === 'Field staff') && a.punchIn && !a.punchOut;
  }).length;
  const offlineFieldStaff = Math.max(0, totalFieldStaff - onlineFieldStaff);

  // Calculate payroll sum (used previously)

  // Attendance metrics
  const presentToday = attendanceData.filter(a => a.status === 'Present').length;
  const lateToday = attendanceData.filter(a => a.status === 'Late').length;
  
  // Calculate Absent: Active Staff who haven't logged in today
  const loggedInStaffIds = new Set(attendanceData.map(a => a.staffId));
  const absentStaffDetails = activeStaffList.filter(s => !loggedInStaffIds.has(s.empId) && !loggedInStaffIds.has(s.id));
  const absentToday = absentStaffDetails.length;
  const onLeaveToday = 0; // Requires Leave Module integration
  
  const punchedInCount = attendanceData.filter(a => a.punchIn).length;
  const punchedOutCount = attendanceData.filter(a => a.punchOut).length;
  const yetToPunchIn = activeStaff > 0 ? Math.max(0, activeStaff - punchedInCount) : 0;

  const presentPercentage = activeStaff > 0 ? Math.round((presentToday / activeStaff) * 100) : 0;
  const absentPercentage = activeStaff > 0 ? Math.round((absentToday / activeStaff) * 100) : 0;

  // Helper to map branchId to branch name
  const getBranchName = (branchId: string) => {
    if (!branchId) return 'N/A';
    const branch = branchesList.find(b => b.id === branchId);
    return branch ? branch.name : 'N/A';
  };

  // Helper to fetch details list dynamically
  const getDetailList = () => {
    switch (activeDetailType) {
      case 'present':
        return attendanceData
          .filter(a => a.status === 'Present')
          .map(a => {
            const s = staffList.find(staff => staff.empId === a.staffId || staff.id === a.staffId);
            return {
              id: a.id,
              name: a.name || s?.name || 'Unknown',
              empId: a.staffId || s?.empId || 'N/A',
              department: s?.department || s?.staffType || a.dept || 'N/A',
              branch: getBranchName(s?.branchId || a.branchId),
              avatar: a.avatar || s?.avatar,
              statusText: 'Present',
              statusColor: 'bg-green-100 text-green-800',
              timeInfo: a.punchIn ? `Punched In: ${new Date(a.punchIn).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}` : 'N/A',
              location: a.locationIn
            };
          });
      case 'field':
        return attendanceData
          .filter(a => {
            const s = staffList.find(staff => staff.empId === a.staffId || staff.id === a.staffId);
            return s && (s.staffType === 'Field Staff' || s.staffType === 'Field staff') && a.punchIn && !a.punchOut;
          })
          .map(a => {
            const s = staffList.find(staff => staff.empId === a.staffId || staff.id === a.staffId);
            return {
              id: a.id,
              name: a.name || s?.name || 'Unknown',
              empId: a.staffId || s?.empId || 'N/A',
              department: s?.department || s?.staffType || a.dept || 'Field Staff',
              branch: getBranchName(s?.branchId || a.branchId),
              avatar: a.avatar || s?.avatar,
              statusText: 'On Field Duty',
              statusColor: 'bg-orange-100 text-orange-800',
              timeInfo: a.punchIn ? `Active since: ${new Date(a.punchIn).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}` : 'N/A',
              location: a.currentLocation || a.locationIn
            };
          });
      case 'absent':
        return absentStaffDetails.map(s => ({
          id: s.id,
          name: s.name,
          empId: s.empId,
          department: s.department || s.staffType || 'N/A',
          branch: getBranchName(s.branchId),
          avatar: s.avatar,
          statusText: 'Absent',
          statusColor: 'bg-red-100 text-red-800',
          timeInfo: 'No Punch-In recorded today'
        }));
      case 'late':
        return attendanceData
          .filter(a => a.status === 'Late')
          .map(a => {
            const s = staffList.find(staff => staff.empId === a.staffId || staff.id === a.staffId);
            return {
              id: a.id,
              name: a.name || s?.name || 'Unknown',
              empId: a.staffId || s?.empId || 'N/A',
              department: s?.department || s?.staffType || a.dept || 'N/A',
              branch: getBranchName(s?.branchId || a.branchId),
              avatar: a.avatar || s?.avatar,
              statusText: `Late (${a.lateMinutes || 0}m)`,
              statusColor: 'bg-yellow-100 text-yellow-800',
              timeInfo: a.punchIn ? `Punched In: ${new Date(a.punchIn).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}` : 'N/A',
              location: a.locationIn
            };
          });
      default:
        return [];
    }
  };
  
  // Payroll stats (filtered for current month only)
  const currentYearMonth = new Date().toISOString().slice(0, 7); // e.g. "2026-08"
  const thisMonthPayroll = payrollData.filter(p => p.maturityDate && p.maturityDate.startsWith(currentYearMonth));

  const totalPaid = thisMonthPayroll.reduce((sum, p) => sum + (Number(p.paidAmount) || 0), 0);
  
  // Real monthly expected salaries sum of all active staff
  const totalPayrollValue = activeStaffList.reduce((sum, s) => sum + (Number(s.salaryAmount) || 0), 0);
  const totalPending = Math.max(0, totalPayrollValue - totalPaid);
  
  // Salary Progress %
  const paidPercentage = totalPayrollValue > 0 ? Math.round((totalPaid / totalPayrollValue) * 100) : 0;
  const pendingPercentage = totalPayrollValue > 0 ? Math.round((totalPending / totalPayrollValue) * 100) : 0;

  // Upcoming Salaries
  const todayTime = new Date().setHours(0,0,0,0);
  const upcomingSalaries = [...activeStaffList]
    .filter(s => s.nextSalaryDate)
    .filter(s => new Date(s.nextSalaryDate).getTime() >= todayTime)
    .sort((a, b) => new Date(a.nextSalaryDate).getTime() - new Date(b.nextSalaryDate).getTime())
    .slice(0, 4);
  
  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
  };

  return (
    <div className="animate-in fade-in duration-500">
      {/* ----- TOP STATS ROW ----- */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        {/* Total Staff Card */}
        <div 
          onClick={() => setActiveTab && setActiveTab('staff')}
          className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:border-blue-300 hover:-translate-y-0.5 cursor-pointer transition-all duration-300 flex flex-col justify-between"
        >
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 bg-blue-50 text-blue-500">
              <Users size={24} strokeWidth={2} />
            </div>
            <div>
              <p className="text-gray-500 text-xs font-medium mb-0.5">Total Staff</p>
              <h3 className="text-2xl font-bold text-gray-900 leading-tight">{totalStaff}</h3>
            </div>
          </div>
          <p className="text-gray-500 text-[10px] mt-2 ml-[60px]">Registered Employees</p>
        </div>

        {/* Present Today Card */}
        <div 
          onClick={() => setActiveDetailType(activeDetailType === 'present' ? null : 'present')}
          className={`bg-white rounded-2xl p-4 shadow-sm border cursor-pointer transition-all duration-300 flex flex-col justify-between ${
            activeDetailType === 'present' 
              ? 'border-green-500 ring-2 ring-green-500/20 -translate-y-1 shadow-md bg-green-50/10' 
              : 'border-gray-100 hover:border-green-300 hover:-translate-y-0.5'
          }`}
        >
          <div className="flex items-start gap-3">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${activeDetailType === 'present' ? 'bg-green-500 text-white' : 'bg-green-50 text-green-500'}`}>
              <CalendarCheck2 size={24} strokeWidth={2} />
            </div>
            <div>
              <p className="text-gray-500 text-xs font-medium mb-0.5">Present Today</p>
              <h3 className="text-2xl font-bold text-gray-900 leading-tight">{presentToday}</h3>
            </div>
          </div>
          <p className="text-gray-500 text-[10px] mt-2 ml-[60px]">{presentPercentage}% of Total</p>
        </div>

        {/* On Field Duty Card */}
        <div 
          onClick={() => setActiveDetailType(activeDetailType === 'field' ? null : 'field')}
          className={`bg-white rounded-2xl p-4 shadow-sm border cursor-pointer transition-all duration-300 flex flex-col justify-between ${
            activeDetailType === 'field' 
              ? 'border-orange-500 ring-2 ring-orange-500/20 -translate-y-1 shadow-md bg-orange-50/10' 
              : 'border-gray-100 hover:border-orange-300 hover:-translate-y-0.5'
          }`}
        >
          <div className="flex items-start gap-3">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${activeDetailType === 'field' ? 'bg-orange-500 text-white' : 'bg-orange-50 text-orange-500'}`}>
              <MapPin size={24} strokeWidth={2} />
            </div>
            <div>
              <p className="text-gray-500 text-xs font-medium mb-0.5">On Field Duty</p>
              <h3 className="text-2xl font-bold text-gray-900 leading-tight">{onlineFieldStaff}</h3>
            </div>
          </div>
          <p className="text-gray-500 text-[10px] mt-2 ml-[60px]">Live Tracking</p>
        </div>

        {/* Absent Today Card */}
        <div 
          onClick={() => setActiveDetailType(activeDetailType === 'absent' ? null : 'absent')}
          className={`bg-white rounded-2xl p-4 shadow-sm border cursor-pointer transition-all duration-300 flex flex-col justify-between ${
            activeDetailType === 'absent' 
              ? 'border-red-500 ring-2 ring-red-500/20 -translate-y-1 shadow-md bg-red-50/10' 
              : 'border-gray-100 hover:border-red-300 hover:-translate-y-0.5'
          }`}
        >
          <div className="flex items-start gap-3">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${activeDetailType === 'absent' ? 'bg-red-500 text-white' : 'bg-red-50 text-red-500'}`}>
              <CalendarX2 size={24} strokeWidth={2} />
            </div>
            <div>
              <p className="text-gray-500 text-xs font-medium mb-0.5">Absent Today</p>
              <h3 className="text-2xl font-bold text-gray-900 leading-tight">{absentToday}</h3>
            </div>
          </div>
          <p className="text-gray-500 text-[10px] mt-2 ml-[60px]">{absentPercentage}% of Total</p>
        </div>

        {/* Late Login Card */}
        <div 
          onClick={() => setActiveDetailType(activeDetailType === 'late' ? null : 'late')}
          className={`bg-white rounded-2xl p-4 shadow-sm border cursor-pointer transition-all duration-300 flex flex-col justify-between ${
            activeDetailType === 'late' 
              ? 'border-purple-500 ring-2 ring-purple-500/20 -translate-y-1 shadow-md bg-purple-50/10' 
              : 'border-gray-100 hover:border-purple-300 hover:-translate-y-0.5'
          }`}
        >
          <div className="flex items-start gap-3">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${activeDetailType === 'late' ? 'bg-purple-500 text-white' : 'bg-purple-50 text-purple-600'}`}>
              <Clock size={24} strokeWidth={2} />
            </div>
            <div>
              <p className="text-gray-500 text-xs font-medium mb-0.5">Late Login</p>
              <h3 className="text-2xl font-bold text-gray-900 leading-tight">{lateToday}</h3>
            </div>
          </div>
          <p className="text-gray-500 text-[10px] mt-2 ml-[60px]">Today</p>
        </div>
      </div>

      {/* ----- DETAILED LIST ROW ----- */}
      {activeDetailType && (
        <div 
          onClick={activeDetailType === 'field' ? () => setActiveTab && setActiveTab('gps') : undefined}
          className={`bg-white rounded-2xl p-6 shadow-sm border mb-6 animate-in fade-in slide-in-from-top-2 duration-300 ${
            activeDetailType === 'field' 
              ? 'cursor-pointer border-orange-200 hover:border-orange-400 hover:shadow-md transition-all duration-300' 
              : 'border-gray-100'
          }`}
        >
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-gray-900 font-bold text-lg">
                {activeDetailType === 'present' && 'Staff Present Today'}
                {activeDetailType === 'field' && 'Active Field Duty Staff'}
                {activeDetailType === 'absent' && 'Staff Absent Today'}
                {activeDetailType === 'late' && 'Late Logins Today'}
              </h3>
              <p className="text-gray-500 text-xs mt-1">
                Showing {getDetailList().length} employee{getDetailList().length === 1 ? '' : 's'}
                {activeDetailType === 'field' && (
                  <span className="text-orange-500 font-semibold ml-1.5 animate-pulse">
                    • Click anywhere to track live on GPS Map
                  </span>
                )}
              </p>
            </div>
            
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
              activeDetailType === 'present' ? 'bg-green-50 text-green-600' :
              activeDetailType === 'field' ? 'bg-orange-50 text-orange-600' :
              activeDetailType === 'absent' ? 'bg-red-50 text-red-600' :
              'bg-purple-50 text-purple-600'
            }`}>
              {activeDetailType.toUpperCase()}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="py-3 px-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Employee</th>
                  <th className="py-3 px-4 text-xs font-bold text-gray-400 uppercase tracking-wider">ID & Dept</th>
                  <th className="py-3 px-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Branch</th>
                  <th className="py-3 px-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="py-3 px-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Timing Info</th>
                  {activeDetailType === 'field' || activeDetailType === 'present' || activeDetailType === 'late' ? (
                    <th className="py-3 px-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Last Location</th>
                  ) : null}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {getDetailList().length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-gray-400 text-sm">
                      No staff members found in this category.
                    </td>
                  </tr>
                ) : (
                  getDetailList().map((staff: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <img 
                            src={staff.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(staff.name)}&background=EFF6FF&color=1D4ED8&bold=true`} 
                            alt={staff.name} 
                            className="w-9 h-9 rounded-full object-cover border border-gray-100" 
                          />
                          <span className="font-semibold text-gray-900 text-sm">{staff.name}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="text-sm font-medium text-gray-800">{staff.empId || 'N/A'}</div>
                        <div className="text-xs text-gray-400">{staff.department}</div>
                      </td>
                      <td className="py-3.5 px-4 text-sm text-gray-600">{staff.branch}</td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${staff.statusColor}`}>
                          {staff.statusText}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-xs font-semibold text-gray-700">{staff.timeInfo}</td>
                      {staff.location !== undefined ? (
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5 text-xs text-gray-500 max-w-[200px] truncate" title={staff.location || 'Unknown'}>
                            <MapPin size={12} className="text-gray-400 shrink-0" />
                            <span>{staff.location || 'Unknown'}</span>
                          </div>
                        </td>
                      ) : (activeDetailType === 'field' || activeDetailType === 'present' || activeDetailType === 'late' ? (
                        <td className="py-3.5 px-4 text-xs text-gray-400">Location not available</td>
                      ) : null)}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ----- BOTTOM ROW ----- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        
        {/* Salary Overview */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-col">
          <div className="flex justify-between items-center mb-5">
            <h3 className="text-gray-900 font-bold">Salary Overview</h3>
            <div className="flex items-center gap-1 text-gray-500 text-xs font-medium cursor-pointer">
              This Month <ChevronDown size={14} />
            </div>
          </div>
          
          <div className="mb-5">
            <p className="text-gray-500 text-xs font-medium mb-1">Matured Payroll (Total Expected)</p>
            <h2 className="text-[#2563EB] text-2xl font-bold">{formatCurrency(totalPayrollValue)}</h2>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-[#F0FDF4] p-3 rounded-xl border border-green-50">
              <p className="text-gray-500 text-[10px] font-medium mb-1">Total Paid</p>
              <p className="text-gray-900 text-sm font-bold mb-1">{formatCurrency(totalPaid)}</p>
              <p className="text-green-600 text-[10px] font-bold">{paidPercentage}%</p>
            </div>
            <div className="bg-[#FEF2F2] p-3 rounded-xl border border-red-50">
              <p className="text-gray-500 text-[10px] font-medium mb-1">Total Pending</p>
              <p className="text-gray-900 text-sm font-bold mb-1">{formatCurrency(totalPending)}</p>
              <p className="text-red-500 text-[10px] font-bold">{pendingPercentage}%</p>
            </div>
          </div>

          <div 
            onClick={() => setActiveTab && setActiveTab('attendance')}
            className="mt-auto border-t border-gray-100 pt-3 flex justify-between items-center cursor-pointer group"
          >
            <span className="text-gray-600 text-xs font-medium group-hover:text-blue-600">View Attendance Log</span>
            <ChevronDown size={16} className="text-gray-400 -rotate-90 group-hover:text-blue-600" />
          </div>
        </div>

        {/* Upcoming Salary Dates */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-5">
            <h3 className="text-gray-900 font-bold">Upcoming Salary Dates</h3>
            <span className="text-blue-500 text-xs font-bold cursor-pointer">View Calendar</span>
          </div>
          <div className="space-y-4">
            {upcomingSalaries.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-400 text-xs">No upcoming salary dates scheduled.</p>
              </div>
            ) : (
              upcomingSalaries.map((staff, i) => (
                <div key={i} className="flex justify-between items-center border-b border-gray-50 pb-3 last:border-0 last:pb-0">
                  <div className="flex gap-3 items-center">
                    <img src={staff.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(staff.name)}&background=EFF6FF&color=1D4ED8`} alt={staff.name} className="w-8 h-8 rounded-full object-cover" />
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{staff.name}</p>
                      <p className="text-xs text-gray-500">{staff.department}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-900">{new Date(staff.nextSalaryDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</p>
                    <p className="text-[10px] text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded mt-0.5 inline-block">Due Soon</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Announcements */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-5">
            <h3 className="text-gray-900 font-bold">Recent Announcements</h3>
            <span onClick={() => setActiveTab && setActiveTab('communications')} className="text-blue-500 text-xs font-bold cursor-pointer">View All</span>
          </div>
          <div className="space-y-4 py-2">
             {announcements.length === 0 ? (
               <p className="text-gray-400 text-xs text-center py-6">No recent announcements.</p>
             ) : (
               announcements.map((ann, i) => (
                 <div key={i} className="flex gap-3 items-start border-b border-gray-50 pb-3 last:border-0 last:pb-0">
                   <div className="w-8 h-8 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                     <Megaphone size={14} />
                   </div>
                   <div className="flex-1 min-w-0">
                     <p className="text-sm font-semibold text-gray-900 truncate">{ann.title || `${ann.author || 'Admin'} (${ann.type || 'Chat'})`}</p>
                     <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{ann.text || ann.message || ''}</p>
                   </div>
                 </div>
               ))
             )}
          </div>
        </div>

      </div>

      {/* ----- QUICK ACTIONS ROW ----- */}
      <div className="mb-2">
        <h3 className="text-gray-900 font-bold mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          
          <button 
            onClick={() => setActiveTab && setActiveTab('staff')}
            className="bg-white border border-gray-200 hover:border-blue-300 rounded-2xl p-4 flex items-center gap-3 transition-colors shadow-sm text-left"
          >
            <div className="bg-blue-50 p-2.5 rounded-xl text-blue-500"><UserPlus size={20} /></div>
            <div>
              <p className="text-gray-900 text-xs font-bold mb-0.5">Add New Staff</p>
              <p className="text-gray-400 text-[10px]">Add employee details</p>
            </div>
          </button>

          <button 
            onClick={() => setActiveTab && setActiveTab('attendance')}
            className="bg-white border border-gray-200 hover:border-green-300 rounded-2xl p-4 flex items-center gap-3 transition-colors shadow-sm text-left"
          >
            <div className="bg-green-50 p-2.5 rounded-xl text-green-500"><CalendarCheck2 size={20} /></div>
            <div>
              <p className="text-gray-900 text-xs font-bold mb-0.5">Mark Attendance</p>
              <p className="text-gray-400 text-[10px]">Manual attendance entry</p>
            </div>
          </button>

          <button 
            onClick={() => setActiveTab && setActiveTab('payroll')}
            className="bg-white border border-gray-200 hover:border-yellow-300 rounded-2xl p-4 flex items-center gap-3 transition-colors shadow-sm text-left"
          >
            <div className="bg-yellow-50 p-2.5 rounded-xl text-yellow-500"><IndianRupee size={20} /></div>
            <div>
              <p className="text-gray-900 text-xs font-bold mb-0.5">Process Payroll</p>
              <p className="text-gray-400 text-[10px]">Run salary for staff</p>
            </div>
          </button>

          <button 
            onClick={() => setActiveTab && setActiveTab('communications')}
            className="bg-white border border-gray-200 hover:border-purple-300 rounded-2xl p-4 flex items-center gap-3 transition-colors shadow-sm text-left"
          >
            <div className="bg-purple-50 p-2.5 rounded-xl text-purple-500"><Megaphone size={20} /></div>
            <div>
              <p className="text-gray-900 text-xs font-bold mb-0.5">Send Announcement</p>
              <p className="text-gray-400 text-[10px]">Notify all staff</p>
            </div>
          </button>

          <button 
            onClick={() => setActiveTab && setActiveTab('gps')}
            className="bg-white border border-gray-200 hover:border-orange-300 rounded-2xl p-4 flex items-center gap-3 transition-colors shadow-sm text-left col-span-2 md:col-span-1"
          >
            <div className="bg-orange-50 p-2.5 rounded-xl text-orange-500"><MapPin size={20} /></div>
            <div>
              <p className="text-gray-900 text-xs font-bold mb-0.5">Track Live</p>
              <p className="text-gray-400 text-[10px]">Live GPS tracking</p>
            </div>
          </button>

        </div>
      </div>
    </div>
  );
}