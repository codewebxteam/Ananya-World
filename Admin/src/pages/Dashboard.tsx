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
}

export default function Dashboard({ staffList = [], setActiveTab }: DashboardProps) {
  const [attendanceData, setAttendanceData] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [payrollData, setPayrollData] = useState<any[]>([]);

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
  
  // Calculate Absent: Total Active Staff - Unique Staff Logged In Today
  const loggedInStaffIds = new Set(attendanceData.map(a => a.staffId));
  const absentToday = Math.max(0, activeStaff - loggedInStaffIds.size);
  const onLeaveToday = 0; // Requires Leave Module integration
  
  const punchedInCount = attendanceData.filter(a => a.punchIn).length;
  const punchedOutCount = attendanceData.filter(a => a.punchOut).length;
  const yetToPunchIn = activeStaff > 0 ? Math.max(0, activeStaff - punchedInCount) : 0;

  const presentPercentage = activeStaff > 0 ? Math.round((presentToday / activeStaff) * 100) : 0;
  const absentPercentage = activeStaff > 0 ? Math.round((absentToday / activeStaff) * 100) : 0;
  
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
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col justify-between">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-500 shrink-0">
              <Users size={24} strokeWidth={2} />
            </div>
            <div>
              <p className="text-gray-500 text-xs font-medium mb-0.5">Total Staff</p>
              <h3 className="text-2xl font-bold text-gray-900 leading-tight">{totalStaff}</h3>
            </div>
          </div>
          <p className="text-gray-500 text-[10px] mt-2 ml-[60px]">Registered Employees</p>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col justify-between">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center text-green-500 shrink-0">
              <CalendarCheck2 size={24} strokeWidth={2} />
            </div>
            <div>
              <p className="text-gray-500 text-xs font-medium mb-0.5">Present Today</p>
              <h3 className="text-2xl font-bold text-gray-900 leading-tight">{presentToday}</h3>
            </div>
          </div>
          <p className="text-gray-500 text-[10px] mt-2 ml-[60px]">{presentPercentage}% of Total</p>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col justify-between">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center text-orange-500 shrink-0">
              <MapPin size={24} strokeWidth={2} />
            </div>
            <div>
              <p className="text-gray-500 text-xs font-medium mb-0.5">On Field Duty</p>
              <h3 className="text-2xl font-bold text-gray-900 leading-tight">{onlineFieldStaff}</h3>
            </div>
          </div>
          <p className="text-gray-500 text-[10px] mt-2 ml-[60px]">Live Tracking</p>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col justify-between">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-red-500 shrink-0">
              <CalendarX2 size={24} strokeWidth={2} />
            </div>
            <div>
              <p className="text-gray-500 text-xs font-medium mb-0.5">Absent Today</p>
              <h3 className="text-2xl font-bold text-gray-900 leading-tight">{absentToday}</h3>
            </div>
          </div>
          <p className="text-gray-500 text-[10px] mt-2 ml-[60px]">{absentPercentage}% of Total</p>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col justify-between col-span-2 md:col-span-1 lg:col-span-1">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-full bg-purple-50 flex items-center justify-center text-purple-600 shrink-0">
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

      {/* ----- MIDDLE ROW (CHARTS & MAP) ----- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        
        {/* Attendance Overview (Doughnut Chart) */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-gray-900 font-bold">Attendance Overview</h3>
            <div className="flex items-center gap-1 text-gray-500 text-xs font-medium cursor-pointer">
              This Week <ChevronDown size={14} />
            </div>
          </div>
          <div className="flex items-center gap-6">
            {/* CSS Conic Gradient Doughnut */}
            <div className="relative w-32 h-32 rounded-full flex items-center justify-center" 
                 style={{ background: 'conic-gradient(#10B981 0% 72%, #EF4444 72% 90%, #F59E0B 90% 95%, #3B82F6 95% 100%)' }}>
              <div className="absolute w-24 h-24 bg-white rounded-full flex flex-col items-center justify-center shadow-inner">
                <span className="text-gray-500 text-[10px] font-medium">Total</span>
                <span className="text-xl font-bold text-gray-900">{totalStaff}</span>
              </div>
            </div>
            {/* Legend */}
            <div className="flex-1 space-y-3">
              <div className="flex justify-between items-center text-xs">
                <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-green-500"></div><span className="text-gray-600 font-medium">Present</span></div>
                <span className="text-gray-900 font-semibold">{presentToday} ({totalStaff > 0 ? Math.round(presentToday/totalStaff*100) : 0}%)</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-red-500"></div><span className="text-gray-600 font-medium">Absent</span></div>
                <span className="text-gray-900 font-semibold">{absentToday} ({totalStaff > 0 ? Math.round(absentToday/totalStaff*100) : 0}%)</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-yellow-500"></div><span className="text-gray-600 font-medium">Late</span></div>
                <span className="text-gray-900 font-semibold">{lateToday} ({totalStaff > 0 ? Math.round(lateToday/totalStaff*100) : 0}%)</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-500"></div><span className="text-gray-600 font-medium">On Leave</span></div>
                <span className="text-gray-900 font-semibold">{onLeaveToday} ({totalStaff > 0 ? Math.round(onLeaveToday/totalStaff*100) : 0}%)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Field Staff Status */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-col justify-between">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-gray-900 font-bold">Field Staff Status</h3>
            <span onClick={() => setActiveTab && setActiveTab('gps')} className="text-blue-500 text-xs font-bold cursor-pointer hover:underline">Track Live</span>
          </div>
          <div className="flex-1 flex flex-col justify-center gap-3 py-2">
            <div className="flex justify-between items-center bg-blue-50/50 p-2.5 rounded-xl border border-blue-50">
              <span className="text-gray-600 text-xs font-bold">Total Field Staff</span>
              <span className="text-gray-900 font-bold text-base">{totalFieldStaff}</span>
            </div>
            <div className="flex justify-between items-center bg-green-50/50 p-2.5 rounded-xl border border-green-50">
              <span className="text-gray-600 text-xs font-bold">Online (Active)</span>
              <span className="text-green-600 font-bold text-base">{onlineFieldStaff}</span>
            </div>
            <div className="flex justify-between items-center bg-red-50/50 p-2.5 rounded-xl border border-red-50">
              <span className="text-gray-600 text-xs font-bold">Offline</span>
              <span className="text-red-500 font-bold text-base">{offlineFieldStaff}</span>
            </div>
          </div>
        </div>

        {/* Today's Punch Summary (Gauge Chart) */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h3 className="text-gray-900 font-bold mb-4">Today's Punch Summary</h3>
          <div className="flex flex-col items-center">
            {/* Semi-circle Gauge */}
            <div className="relative w-40 h-20 overflow-hidden mb-6 mt-2">
              <div className="w-40 h-40 rounded-full border-[12px] border-gray-100 absolute top-0" style={{ borderTopColor: '#3B82F6', borderRightColor: '#10B981', borderLeftColor: '#F59E0B', transform: 'rotate(-45deg)' }}></div>
              <div className="absolute bottom-0 w-full flex flex-col items-center justify-end pb-1">
                <span className="text-3xl font-bold text-gray-900">{punchedInCount}</span>
                <span className="text-gray-500 text-[10px] font-medium">Punched In</span>
              </div>
            </div>
            
            <div className="w-full space-y-2.5 mt-2">
              <div className="flex justify-between items-center text-xs">
                <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-green-500"></div><span className="text-gray-600 font-medium">Punched In</span></div>
                <span className="text-gray-900 font-semibold">{punchedInCount}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-500"></div><span className="text-gray-600 font-medium">Punched Out</span></div>
                <span className="text-gray-900 font-semibold">{punchedOutCount}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-yellow-500"></div><span className="text-gray-600 font-medium">Yet to Punch In</span></div>
                <span className="text-gray-900 font-semibold">{yetToPunchIn}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

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