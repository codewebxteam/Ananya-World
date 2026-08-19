import React, { useState, useEffect } from 'react';
import { 
  Users, MapPin, ChevronDown,
  Calendar, Clock, CalendarCheck2, CalendarX2, 
  Plane, Search, Download, Eye, MoreVertical, MapPin as MapPinIcon
} from 'lucide-react';
import { collection, query, onSnapshot, doc, updateDoc, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';

interface AttendanceProps {
  selectedBranchId?: string;
  staffList?: any[];
}

export default function Attendance({ selectedBranchId = 'all', staffList: propStaffList }: AttendanceProps) {
  const [attendanceData, setAttendanceData] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [forgivingId, setForgivingId] = useState<string | null>(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const handleForgive = async (log: any) => {
    if (window.confirm(`Are you sure you want to forgive the deduction for ${log.name} on ${log.date}?`)) {
      setForgivingId(log.id);
      try {
        // 1. Update status in attendance collection
        await updateDoc(doc(db, 'attendance', log.id), {
          status: 'Present',
          originalStatus: log.status,
          forgiven: true
        });

        // 2. Resolve empId to User UID
        const qUser = query(collection(db, 'users'), where('empId', '==', log.staffId));
        const userSnap = await getDocs(qUser);
        if (!userSnap.empty) {
          const userUid = userSnap.docs[0].id;
          
          // 3. Query payroll and update if exists
          const qPayroll = query(collection(db, 'payroll'), where('staffId', '==', userUid));
          const querySnapshot = await getDocs(qPayroll);
          
          for (const docSnap of querySnapshot.docs) {
            const pData = docSnap.data();
            const details = [...(pData.deductionDetails || [])];
            const itemIndex = details.findIndex((d: any) => d.date === log.date);
            
            if (itemIndex !== -1 && !details[itemIndex].forgiven) {
              details[itemIndex].forgiven = true;
              
              // Recalculate
              const forgivenDays = details.filter((d: any) => d.forgiven).reduce((sum: number, d: any) => sum + d.deduction, 0);
              const originalDeductionDays = pData.deductionDays || 0;
              const newDeductionDays = Math.max(0, originalDeductionDays - forgivenDays);
              const perDaySalary = pData.perDaySalary || 0;
              const baseSalary = pData.baseSalary || 0;
              const newExpected = Math.max(0, Math.round(baseSalary - (newDeductionDays * perDaySalary)));

              await updateDoc(doc(db, 'payroll', docSnap.id), {
                deductionDetails: details,
                deductionDays: newDeductionDays,
                expectedSalary: newExpected,
                updatedAt: serverTimestamp()
              });
            }
          }
        }

        alert("Deduction has been forgiven successfully!");
      } catch (error: any) {
        alert("Error: " + error.message);
      } finally {
        setForgivingId(null);
      }
    }
  };

  useEffect(() => {
    const unsubStaff = onSnapshot(query(collection(db, 'users')), (snapshot) => {
      const staff: any[] = [];
      snapshot.forEach(doc => {
        if (doc.data().role === 'staff') {
          staff.push({ id: doc.id, ...doc.data() });
        }
      });
      setStaffList(staff);
    });

    const unsubAtt = onSnapshot(query(collection(db, 'attendance')), (snapshot) => {
      const logs: any[] = [];
      snapshot.forEach(doc => {
        logs.push({ id: doc.id, ...doc.data() });
      });
      // Sort descending by date, then punchIn
      logs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || new Date(b.punchIn).getTime() - new Date(a.punchIn).getTime());
      setAttendanceData(logs);
    });

    return () => {
      unsubStaff();
      unsubAtt();
    };
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedBranchId]);

  const effectiveStaffList = propStaffList && propStaffList.length > 0 
    ? (selectedBranchId !== 'all' ? propStaffList.filter(s => s.branchId === selectedBranchId) : propStaffList)
    : (selectedBranchId !== 'all' ? staffList.filter(s => s.branchId === selectedBranchId) : staffList);

  const branchEmpIds = new Set(
    effectiveStaffList.flatMap(s => [s.empId, s.id, s.uid]).filter(Boolean)
  );

  const filteredAttendance = selectedBranchId && selectedBranchId !== 'all'
    ? attendanceData.filter(log => branchEmpIds.has(log.staffId) || log.branchId === selectedBranchId)
    : attendanceData;

  const todayStr = new Date().toISOString().split('T')[0];
  const todayLogs = filteredAttendance.filter(log => log.date === todayStr);

  const totalStaff = effectiveStaffList.length;
  const presentToday = todayLogs.filter(log => log.status === 'Present').length;
  const lateToday = todayLogs.filter(log => log.status === 'Late').length;
  const loggedInStaff = new Set(todayLogs.map(l => l.staffId));
  const absentToday = Math.max(0, totalStaff - loggedInStaff.size);
  const onLeaveToday = 0; // To be implemented with Leave Module
  const halfDayToday = todayLogs.filter(log => log.status === 'Half Day').length;

  const totalToday = presentToday + absentToday + lateToday + onLeaveToday + halfDayToday;
  const presentPct = totalToday > 0 ? (presentToday / totalToday) * 100 : 0;
  const absentPct = totalToday > 0 ? (absentToday / totalToday) * 100 : 0;
  const latePct = totalToday > 0 ? (lateToday / totalToday) * 100 : 0;
  const leavePct = totalToday > 0 ? (onLeaveToday / totalToday) * 100 : 0;

  const gGreen = presentPct;
  const gRed = gGreen + absentPct;
  const gYellow = gRed + latePct;
  const gBlue = gYellow + leavePct;
  
  const conicGradientStr = totalToday > 0 
    ? `conic-gradient(#10B981 0% ${gGreen}%, #EF4444 ${gGreen}% ${gRed}%, #F59E0B ${gRed}% ${gYellow}%, #3B82F6 ${gYellow}% ${gBlue}%, #9CA3AF ${gBlue}% 100%)`
    : `conic-gradient(#E5E7EB 0% 100%)`;

  // Calculate Last 7 Days Trend
  const getTrendData = () => {
    const trendList: any[] = [];
    const activeStaffCount = effectiveStaffList.length;

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayLabel = `${d.getDate()} ${d.toLocaleString('en-US', { month: 'short' })}`; // e.g. "14 Aug"

      const dayLogs = filteredAttendance.filter(log => log.date === dateStr);
      
      const present = dayLogs.filter(log => log.status === 'Present').length;
      const late = dayLogs.filter(log => log.status === 'Late').length;
      const leave = dayLogs.filter(log => log.status === 'On Leave').length;
      const halfDay = dayLogs.filter(log => log.status === 'Half Day').length;

      // Unique logged in staff on this day
      const loggedInCount = new Set(dayLogs.map(l => l.staffId)).size;
      const absent = Math.max(0, activeStaffCount - loggedInCount);

      trendList.push({
        date: dateStr,
        label: dayLabel,
        present,
        absent,
        late,
        leave,
        halfDay
      });
    }
    return trendList;
  };

  const trendData = getTrendData();
  const maxScale = Math.max(5, staffList.length);
  
  // X coords for 7 points in SVG viewbox (0 to 100)
  const getX = (index: number) => 5 + index * 14.5;
  const getY = (val: number) => 90 - (val / maxScale) * 80;

  const presentPath = trendData.map((d, idx) => `${getX(idx)},${getY(d.present)}`).join(' L ');
  const absentPath = trendData.map((d, idx) => `${getX(idx)},${getY(d.absent)}`).join(' L ');
  const latePath = trendData.map((d, idx) => `${getX(idx)},${getY(d.late)}`).join(' L ');
  const leavePath = trendData.map((d, idx) => `${getX(idx)},${getY(d.leave)}`).join(' L ');

  // Pagination calculations
  const totalEntries = filteredAttendance.length;
  const totalPages = Math.ceil(totalEntries / itemsPerPage) || 1;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredAttendance.slice(indexOfFirstItem, indexOfLastItem);

  const pageNumbers = [];
  for (let i = 1; i <= totalPages; i++) {
    pageNumbers.push(i);
  }

  const formatDisplayTime = (isoString: string) => {
    if (!isoString) return '-';
    return new Date(isoString).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  // Helper function for status badges
  const renderStatus = (status: string, forgiven?: boolean) => {
    switch(status) {
      case 'Present': 
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-green-50 text-green-700 text-xs font-bold border border-green-100">
            Present {forgiven && <span className="text-[10px] text-green-500 ml-1 font-normal">(Forgiven)</span>}
          </span>
        );
      case 'Late': return <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-orange-50 text-orange-600 text-xs font-bold border border-orange-100">Late</span>;
      case 'Absent': return <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-red-50 text-red-600 text-xs font-bold border border-red-100">Absent</span>;
      case 'On Leave': return <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-blue-50 text-blue-600 text-xs font-bold border border-blue-100">On Leave</span>;
      default: return null;
    }
  };

  return (
    <div className="animate-in fade-in duration-500">
      {/* ----- TOP STATS ROW ----- */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col justify-between">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-full bg-teal-50 flex items-center justify-center text-teal-500 shrink-0"><Users size={24} strokeWidth={2} /></div>
            <div>
              <p className="text-gray-500 text-xs font-medium mb-0.5">Total Staff</p>
              <h3 className="text-2xl font-bold text-gray-900 leading-tight">{totalStaff}</h3>
            </div>
          </div>
          <p className="text-gray-500 text-[10px] mt-2 ml-[60px]">All Employees</p>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col justify-between">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center text-green-500 shrink-0"><CalendarCheck2 size={24} strokeWidth={2} /></div>
            <div>
              <p className="text-gray-500 text-xs font-medium mb-0.5">Present Today</p>
              <h3 className="text-2xl font-bold text-gray-900 leading-tight">{presentToday}</h3>
            </div>
          </div>
          <p className="text-gray-500 text-[10px] mt-2 ml-[60px]">{totalStaff > 0 ? Math.round((presentToday/totalStaff)*100) : 0}% of Total</p>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col justify-between">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-red-500 shrink-0"><CalendarX2 size={24} strokeWidth={2} /></div>
            <div>
              <p className="text-gray-500 text-xs font-medium mb-0.5">Absent Today</p>
              <h3 className="text-2xl font-bold text-gray-900 leading-tight">{absentToday}</h3>
            </div>
          </div>
          <p className="text-gray-500 text-[10px] mt-2 ml-[60px]">{totalStaff > 0 ? Math.round((absentToday/totalStaff)*100) : 0}% of Total</p>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col justify-between">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center text-orange-500 shrink-0"><Clock size={24} strokeWidth={2} /></div>
            <div>
              <p className="text-gray-500 text-xs font-medium mb-0.5">Late Today</p>
              <h3 className="text-2xl font-bold text-gray-900 leading-tight">{lateToday}</h3>
            </div>
          </div>
          <p className="text-gray-500 text-[10px] mt-2 ml-[60px]">{totalStaff > 0 ? Math.round((lateToday/totalStaff)*100) : 0}% of Total</p>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col justify-between col-span-2 md:col-span-1 lg:col-span-1">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-full bg-purple-50 flex items-center justify-center text-purple-600 shrink-0"><Plane size={24} strokeWidth={2} /></div>
            <div>
              <p className="text-gray-500 text-xs font-medium mb-0.5">On Leave Today</p>
              <h3 className="text-2xl font-bold text-gray-900 leading-tight">{onLeaveToday}</h3>
            </div>
          </div>
          <p className="text-gray-500 text-[10px] mt-2 ml-[60px]">0% of Total</p>
        </div>
      </div>

      {/* ----- FILTERS SECTION (Export button removed) ----- */}

      {/* ----- CHARTS SECTION ----- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        
        {/* Attendance Overview (Doughnut Chart) */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h3 className="text-gray-900 font-bold mb-6">Attendance Overview <span className="text-gray-500 font-normal text-sm ml-1">(Today)</span></h3>
          <div className="flex flex-col sm:flex-row items-center gap-8 justify-center">
            {/* CSS Conic Gradient Doughnut */}
            <div className="relative w-40 h-40 rounded-full flex items-center justify-center shrink-0" 
                 style={{ background: conicGradientStr }}>
              <div className="absolute w-[116px] h-[116px] bg-white rounded-full flex flex-col items-center justify-center shadow-inner">
                <span className="text-gray-500 text-xs font-medium mb-0.5">Total</span>
                <span className="text-2xl font-bold text-gray-900 leading-tight">{todayLogs.length}</span>
                <span className="text-gray-500 text-xs font-medium mt-0.5">Logs</span>
              </div>
            </div>
            {/* Legend */}
            <div className="flex-1 w-full space-y-3.5 max-w-[200px]">
              <div className="flex justify-between items-center text-sm">
                <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-green-500"></div><span className="text-gray-600 font-medium">Present</span></div>
                <span className="text-gray-900 font-semibold">{presentToday}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-red-500"></div><span className="text-gray-600 font-medium">Absent</span></div>
                <span className="text-gray-900 font-semibold">{absentToday}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-yellow-500"></div><span className="text-gray-600 font-medium">Late</span></div>
                <span className="text-gray-900 font-semibold">{lateToday}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div><span className="text-gray-600 font-medium">On Leave</span></div>
                <span className="text-gray-900 font-semibold">{onLeaveToday}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-gray-400"></div><span className="text-gray-600 font-medium">Half Day</span></div>
                <span className="text-gray-900 font-semibold">{halfDayToday}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Daily Attendance Trend (Line Chart) */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 lg:col-span-2 flex flex-col">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-gray-900 font-bold">Daily Attendance Trend</h3>
            <div className="relative">
              <select className="bg-white border border-gray-200 rounded-lg pl-3 pr-8 py-1.5 text-xs text-gray-600 appearance-none cursor-pointer focus:outline-none">
                <option>Last 7 Days</option>
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-2 text-gray-400 pointer-events-none" />
            </div>
          </div>
          
          {/* Mini Legend */}
          <div className="flex items-center gap-4 mb-4 text-[11px] font-medium text-gray-600">
            <div className="flex items-center gap-1.5"><div className="w-2 h-0.5 bg-green-500"></div><div className="w-1.5 h-1.5 rounded-full bg-green-500 -ml-2.5"></div> Present</div>
            <div className="flex items-center gap-1.5"><div className="w-2 h-0.5 bg-red-500"></div><div className="w-1.5 h-1.5 rounded-full bg-red-500 -ml-2.5"></div> Absent</div>
            <div className="flex items-center gap-1.5"><div className="w-2 h-0.5 bg-yellow-500"></div><div className="w-1.5 h-1.5 rounded-full bg-yellow-500 -ml-2.5"></div> Late</div>
            <div className="flex items-center gap-1.5"><div className="w-2 h-0.5 bg-blue-500"></div><div className="w-1.5 h-1.5 rounded-full bg-blue-500 -ml-2.5"></div> On Leave</div>
          </div>

          {/* Chart Graphic using SVG */}
          <div className="flex-1 relative w-full h-[180px] mt-2">
            {/* Y-Axis Labels */}
            <div className="absolute left-0 top-0 bottom-6 flex flex-col justify-between text-[10px] text-gray-400 w-6 text-right pr-2">
              <span>{maxScale}</span>
              <span>{Math.round(maxScale * 0.8)}</span>
              <span>{Math.round(maxScale * 0.6)}</span>
              <span>{Math.round(maxScale * 0.4)}</span>
              <span>{Math.round(maxScale * 0.2)}</span>
              <span>0</span>
            </div>
            
            {/* Graph Area */}
            <div className="absolute left-7 right-2 top-2 bottom-6 border-l border-b border-gray-200">
              {/* Grid lines */}
              <div className="absolute w-full border-t border-gray-100 top-[20%]"></div>
              <div className="absolute w-full border-t border-gray-100 top-[40%]"></div>
              <div className="absolute w-full border-t border-gray-100 top-[60%]"></div>
              <div className="absolute w-full border-t border-gray-100 top-[80%]"></div>
              
              {/* Lines */}
              <svg className="absolute inset-0 w-full h-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
                {/* Present Line */}
                {presentPath && <path d={`M ${presentPath}`} fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />}
                {trendData.map((d, idx) => (
                  <circle key={`pres-${idx}`} cx={getX(idx)} cy={getY(d.present)} r="2" fill="#10B981" />
                ))}

                {/* Absent Line */}
                {absentPath && <path d={`M ${absentPath}`} fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />}
                {trendData.map((d, idx) => (
                  <circle key={`abs-${idx}`} cx={getX(idx)} cy={getY(d.absent)} r="2" fill="#EF4444" />
                ))}

                {/* Late Line */}
                {latePath && <path d={`M ${latePath}`} fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />}
                {trendData.map((d, idx) => (
                  <circle key={`late-${idx}`} cx={getX(idx)} cy={getY(d.late)} r="2" fill="#F59E0B" />
                ))}

                {/* Leave Line */}
                {leavePath && <path d={`M ${leavePath}`} fill="none" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />}
                {trendData.map((d, idx) => (
                  <circle key={`leave-${idx}`} cx={getX(idx)} cy={getY(d.leave)} r="2" fill="#3B82F6" />
                ))}
              </svg>
            </div>

            {/* X-Axis Labels */}
            <div className="absolute left-7 right-2 bottom-0 flex justify-between text-[10px] text-gray-500 font-medium px-2 transform translate-y-full pt-2">
              {trendData.map((d, idx) => (
                <span key={idx} className="whitespace-nowrap">{d.label}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ----- ATTENDANCE LOGS TABLE SECTION ----- */}
      <div className="bg-white rounded-[20px] p-5 shadow-sm border border-gray-100">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Attendance Logs</h2>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px]">
            <thead>
              <tr className="border-y border-gray-100 bg-gray-50/50">
                <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 w-12">#</th>
                <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500">Employee</th>
                <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500">Employee ID</th>
                <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500">Department</th>
                <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500">Date</th>
                <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500">Punch In</th>
                <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500">Punch Out</th>
                <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500">Working Hours</th>
                <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500">Status</th>
                <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500">Location</th>
                <th className="py-3 px-4 text-center text-xs font-semibold text-gray-500">Action</th>
              </tr>
            </thead>
            <tbody>
              {currentItems.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-gray-500">No attendance logs found.</td>
                </tr>
              ) : (
                currentItems.map((log) => (
                  <tr key={log.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="py-3 px-4 text-sm text-gray-600 font-medium">{log.id.slice(-5)}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <img src={log.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(log.name)}&background=EFF6FF&color=1D4ED8`} alt={log.name} className="w-8 h-8 rounded-full object-cover border border-gray-200" />
                        <span className="text-sm font-medium text-gray-900">{log.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="bg-blue-50 text-blue-600 text-xs font-bold px-2 py-1 rounded-md">{log.staffId}</span>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">{log.dept}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{log.date}</td>
                    <td className="py-3 px-4 text-sm text-gray-900 font-medium">
                      {log.punchIn && <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5"></span>}
                      {formatDisplayTime(log.punchIn)}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-900 font-medium">
                      {log.punchOut && <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5"></span>}
                      {formatDisplayTime(log.punchOut)}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600 font-medium">{log.hours || '-'}</td>
                    <td className="py-3 px-4">{renderStatus(log.status, log.forgiven)}</td>
                    <td className="py-3 px-4 text-sm text-gray-600 flex items-center gap-1 mt-1">
                      {log.locationIn && <MapPinIcon size={14} className="text-gray-400" />}
                      {log.locationIn || '-'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {log.status !== 'Present' && log.status !== 'On Leave' && (
                          <button
                            onClick={() => handleForgive(log)}
                            disabled={forgivingId === log.id}
                            className="text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-100 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                          >
                            {forgivingId === log.id ? 'Saving...' : 'Forgive'}
                          </button>
                        )}
                        {log.forgiven && (
                          <span className="text-xs font-bold text-green-600 bg-green-50 px-2.5 py-1.5 rounded-lg border border-green-100">✓ Forgiven</span>
                        )}
                        {log.status === 'Present' && !log.forgiven && (
                          <span className="text-xs font-bold text-gray-500 bg-gray-50 px-2.5 py-1.5 rounded-lg border border-gray-100">No Deduction</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex flex-col sm:flex-row justify-between items-center mt-6 pt-4 border-t border-gray-100 gap-4">
          <p className="text-sm text-gray-500 font-medium">
            Showing {totalEntries > 0 ? indexOfFirstItem + 1 : 0} to {Math.min(indexOfLastItem, totalEntries)} of {totalEntries} entries
          </p>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <button 
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-50"
              >
                &lt;
              </button>
              {pageNumbers.map((num) => (
                <button
                  key={num}
                  onClick={() => setCurrentPage(num)}
                  className={`w-8 h-8 flex items-center justify-center rounded-lg font-medium transition-colors ${
                    currentPage === num
                      ? 'bg-[#2563EB] text-white'
                      : 'border border-transparent text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {num}
                </button>
              ))}
              <button 
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-50"
              >
                &gt;
              </button>
            </div>
            <div className="relative ml-2">
              <select 
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-white border border-gray-200 rounded-lg pl-3 pr-8 py-1.5 text-sm text-gray-600 appearance-none cursor-pointer focus:outline-none"
              >
                <option value={5}>5 / page</option>
                <option value={10}>10 / page</option>
                <option value={25}>25 / page</option>
                <option value={50}>50 / page</option>
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-2.5 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}