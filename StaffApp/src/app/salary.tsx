// app/salary.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Modal } from 'react-native';
import { 
  Calendar, Hourglass, Info, FileText, 
  Wallet, Gift, MinusCircle, CalendarCheck2, 
  CalendarX2, Clock, Plane, Lightbulb, 
  ReceiptText, ChevronRight, ArrowRight, ChevronDown
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDoc, collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';

const formatLateTime = (mins: number): string => {
  if (mins < 60) {
    return `${mins} mins`;
  }
  const hrs = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  return remainingMins > 0 ? `${hrs}h ${remainingMins}m` : `${hrs}h`;
};

// Module-level global memory cache to guarantee zero reload/skeleton when navigating between tabs
let globalSalaryCache: {
  isLoaded: boolean;
  userData: any;
  salaryDetails: {
    baseSalary: number;
    allowances: number;
    deductionsAmount: number;
    formattedSalaryDate: string;
    daysRemaining: string;
    daysPresent: number;
    daysLate: number;
    daysAbsent: number;
    onLeave: number;
    expectedSalary: number;
    isMature: boolean;
  };
  historyData: any[];
  rawAttendance: any[];
  leaveList: any[];
} = {
  isLoaded: false,
  userData: null,
  salaryDetails: {
    baseSalary: 0,
    allowances: 0,
    deductionsAmount: 0,
    formattedSalaryDate: 'Not Set',
    daysRemaining: '--',
    daysPresent: 0,
    daysLate: 0,
    daysAbsent: 0,
    onLeave: 0,
    expectedSalary: 0,
    isMature: false
  },
  historyData: [],
  rawAttendance: [],
  leaveList: []
};

export default function SalaryScreen() {
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [userData, setUserData] = useState<any>(globalSalaryCache.userData);
  const [salaryDetails, setSalaryDetails] = useState<any>(globalSalaryCache.salaryDetails);
  const [historyData, setHistoryData] = useState<any[]>(globalSalaryCache.historyData);
  const [rawAttendance, setRawAttendance] = useState<any[]>(globalSalaryCache.rawAttendance);
  const [leaveList, setLeaveList] = useState<any[]>(globalSalaryCache.leaveList);
  const [staffData, setStaffData] = useState<any>(null);
  const [showLateModal, setShowLateModal] = useState(false);
  const [activeModalTab, setActiveModalTab] = useState<'all' | 'late' | 'absent'>('all');
  const [lateHistory, setLateHistory] = useState<any[]>([]);
  const [absentHistory, setAbsentHistory] = useState<any[]>([]);
  const [cycleMonthName, setCycleMonthName] = useState('');
  const [isAttLoaded, setIsAttLoaded] = useState(globalSalaryCache.isLoaded);
  const [isLeavesLoaded, setIsLeavesLoaded] = useState(globalSalaryCache.isLoaded);

  // Skeleton / Initial loading state (false if memory cache is already loaded)
  const [isInitialLoading, setIsInitialLoading] = useState(!globalSalaryCache.isLoaded);

  useEffect(() => {
    let unsubAtt: any;
    let unsubLeaves: any;
    let unsubStaff: any;

    const fetchSalaryInfo = async () => {
      try {
        const stored = await AsyncStorage.getItem('userData');
        if (stored) {
          const parsed = JSON.parse(stored);
          setUserData(parsed);
          globalSalaryCache.userData = parsed;

          // Listen to staff collection for fresh salaryAmount & nextSalaryDate
          const staffDocRef = doc(db, 'staff', parsed.empId);
          unsubStaff = onSnapshot(staffDocRef, (staffSnap) => {
            if (staffSnap.exists()) {
              setStaffData(staffSnap.data());
            }
          });

          // 1. Fetch raw attendance records
          const qAtt = query(collection(db, 'attendance'), where('staffId', '==', parsed.empId));
          unsubAtt = onSnapshot(qAtt, (snapshot) => {
            const list: any[] = [];
            snapshot.forEach(docSnap => {
              list.push({ id: docSnap.id, ...docSnap.data() });
            });
            setRawAttendance(list);
            globalSalaryCache.rawAttendance = list;
            setIsAttLoaded(true);
          });

          // 2. Fetch leaves
          const qLeaves = query(collection(db, 'leaves'), where('staffId', '==', parsed.empId));
          unsubLeaves = onSnapshot(qLeaves, (snapshot) => {
            const list: any[] = [];
            snapshot.forEach(docSnap => {
              list.push({ id: docSnap.id, ...docSnap.data() });
            });
            setLeaveList(list);
            globalSalaryCache.leaveList = list;
            setIsLeavesLoaded(true);
          });

          // 3. Fetch Salary History from Firestore payroll collection
          try {
            const qPayroll = query(collection(db, 'payroll'), where('staffId', '==', parsed.empId));
            const payrollSnap = await getDocs(qPayroll);
            const pList: any[] = [];
            payrollSnap.forEach(pDoc => {
              const pData = pDoc.data();
              pList.push({
                id: pDoc.id,
                month: pData.month || pData.period || 'Past Month',
                date: pData.date || pData.paidOn || 'Processed',
                amount: `₹ ${Number(pData.finalSalary || pData.expectedSalary || pData.baseSalary || 0).toLocaleString('en-IN')}`,
                rawDate: pData.createdAt || pData.date || ''
              });
            });
            pList.sort((a, b) => new Date(b.rawDate || 0).getTime() - new Date(a.rawDate || 0).getTime());
            setHistoryData(pList);
            globalSalaryCache.historyData = pList;
          } catch (err) {
            console.log("Error fetching salary history", err);
          }
        }
      } catch (err) {
        console.error("Error fetching salary info", err);
      } finally {
        setIsInitialLoading(false);
      }
    };

    fetchSalaryInfo();

    return () => {
      if (unsubAtt) unsubAtt();
      if (unsubLeaves) unsubLeaves();
      if (unsubStaff) unsubStaff();
    };
  }, []);

  useEffect(() => {
    if (!userData || !isAttLoaded || !isLeavesLoaded) return;

    const localToday = new Date();
    
    // Fetch fresh salary properties from staffData or userData
    const rawNextSalaryDate = staffData?.nextSalaryDate || userData?.nextSalaryDate || null;
    const salaryAmount = Number(staffData?.salaryAmount || userData?.salaryAmount || userData?.baseSalary || userData?.salary || 0);

    // Define the cycle window
    let cycleEnd = new Date();
    if (rawNextSalaryDate) {
      cycleEnd = new Date(rawNextSalaryDate);
      cycleEnd.setHours(0,0,0,0);
      const now = new Date(localToday);
      now.setHours(0,0,0,0);
      while (cycleEnd < now) {
        cycleEnd.setMonth(cycleEnd.getMonth() + 1);
      }
    } else {
      cycleEnd = new Date(localToday.getFullYear(), localToday.getMonth() + 1, 0);
    }
    
    const cStart = new Date(cycleEnd);
    cStart.setMonth(cStart.getMonth() - 1);
    
    let actualStart = cStart;
    const jDate = staffData?.joinDate || userData?.joinDate;
    if (jDate) {
      const joinD = new Date(jDate);
      if (joinD > cStart) actualStart = joinD;
    }

    let formattedDate = 'Not Set';
    let daysRemaining = '--';

    if (rawNextSalaryDate) {
      try {
        const targetDate = new Date(rawNextSalaryDate);
        if (!isNaN(targetDate.getTime())) {
          formattedDate = targetDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
          const diffTime = targetDate.getTime() - new Date().getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          daysRemaining = diffDays > 0 ? `${diffDays} Days` : 'Due';
        } else {
          formattedDate = String(rawNextSalaryDate);
        }
      } catch {
        formattedDate = String(rawNextSalaryDate);
      }
    }

    const combinedMap = new Map<string, any>();
    const userWeeklyOff = staffData?.weeklyOff || userData?.weeklyOff || 'Sunday';
    const todayStr = `${localToday.getFullYear()}-${String(localToday.getMonth() + 1).padStart(2, '0')}-${String(localToday.getDate()).padStart(2, '0')}`;
    
    for (let d = new Date(actualStart); d <= cycleEnd; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      
      if (dateStr > todayStr) {
        continue;
      }
      
      const dayName = d.toLocaleDateString('en-US', { weekday: 'long' });
      
      // 1. Check real attendance
      const realAtt = rawAttendance.find(att => att.date === dateStr);
      if (realAtt) {
        combinedMap.set(dateStr, {
          status: realAtt.status || 'Present',
          date: dateStr,
          lateMinutes: realAtt.lateMinutes || 0
        });
        continue;
      }
      
      // 2. Check approved leave
      let isOnLeave = false;
      leaveList.forEach(leave => {
        if (leave.status === 'Approved') {
          let current = new Date(leave.startDate);
          const end = new Date(leave.endDate);
          while (current <= end) {
            const lDateStr = current.toISOString().split('T')[0];
            if (lDateStr === dateStr) {
              isOnLeave = true;
              break;
            }
            current.setDate(current.getDate() + 1);
          }
        }
      });
      
      if (isOnLeave) {
        combinedMap.set(dateStr, {
          status: 'On Leave',
          date: dateStr
        });
        continue;
      }
      
      // 3. Check Weekly Off
      if (dayName.toLowerCase() === userWeeklyOff.toLowerCase()) {
        combinedMap.set(dateStr, {
          status: 'Weekly Off',
          date: dateStr
        });
        continue;
      }
      
      // 4. Otherwise, if it is a past day (before today), mark as Absent
      if (dateStr < todayStr) {
        combinedMap.set(dateStr, {
          status: 'Absent',
          date: dateStr
        });
      }
    }
    
    // Calculate stats
    let pres = 0, abs = 0, lat = 0, lev = 0;
    let totalLateMinutes = 0;
    const lateRecordsList: any[] = [];
    const absentRecordsList: any[] = [];

    combinedMap.forEach(item => {
      if (item.status === 'Present') pres++;
      else if (item.status === 'Late') { 
        pres++; 
        lat++; 
        totalLateMinutes += (item.lateMinutes || 0);

        const realAtt = rawAttendance.find(att => att.date === item.date);
        const formatTime = (dVal: any) => {
          if (!dVal) return '--:--';
          try {
            const dObj = new Date(dVal);
            return dObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
          } catch {
            return '--:--';
          }
        };

        lateRecordsList.push({
          date: item.date,
          lateMinutes: item.lateMinutes || 0,
          in: realAtt?.punchIn ? formatTime(realAtt.punchIn) : '--:--',
          out: realAtt?.punchOut ? formatTime(realAtt.punchOut) : '--:--',
          rawDate: item.date
        });
      }
      else if (item.status === 'Absent') {
        abs++;
        absentRecordsList.push({
          date: item.date,
          rawDate: item.date
        });
      }
      else if (item.status === 'On Leave' || item.status === 'Leave') lev++;
    });

    lateRecordsList.sort((a, b) => new Date(b.rawDate || 0).getTime() - new Date(a.rawDate || 0).getTime());
    absentRecordsList.sort((a, b) => new Date(b.rawDate || 0).getTime() - new Date(a.rawDate || 0).getTime());
    setLateHistory(lateRecordsList);
    setAbsentHistory(absentRecordsList);
    setCycleMonthName(cycleEnd.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }));

    // Total working days in cycle
    let totalWorkingDays = 0;
    for (let d = new Date(actualStart); d <= cycleEnd; d.setDate(d.getDate() + 1)) {
       totalWorkingDays++;
    }
    
    const perDay = totalWorkingDays > 0 ? (salaryAmount / totalWorkingDays) : 0;
    
    // Calculate Shift Duration in minutes
    let shiftDurationMinutes = 480; // Default 8 hours
    const sStart = staffData?.shiftStartTime || userData?.shiftStartTime;
    const sEnd = staffData?.shiftEndTime || userData?.shiftEndTime;
    if (sStart && sEnd) {
      const [startH, startM] = sStart.split(':').map(Number);
      const [endH, endM] = sEnd.split(':').map(Number);
      let diff = (endH * 60 + endM) - (startH * 60 + startM);
      if (diff < 0) diff += 24 * 60; // Cross midnight
      if (diff > 0) shiftDurationMinutes = diff;
    }
    
    const perMinuteSalary = perDay / shiftDurationMinutes;
    const deductionsAmount = Math.round((abs * perDay) + (totalLateMinutes * perMinuteSalary));
    const expected = salaryAmount > 0 ? Math.max(0, Math.round(salaryAmount - deductionsAmount)) : 0;

    // Check if salary is mature (today >= rawNextSalaryDate)
    const isMature = rawNextSalaryDate ? (new Date() >= new Date(rawNextSalaryDate)) : false;

    const updatedDetails = {
      baseSalary: salaryAmount,
      allowances: 0,
      deductionsAmount,
      formattedSalaryDate: formattedDate,
      daysRemaining,
      daysPresent: pres,
      daysLate: lat,
      daysAbsent: abs,
      onLeave: lev,
      expectedSalary: expected,
      isMature
    };

    setSalaryDetails(updatedDetails);
    globalSalaryCache.salaryDetails = updatedDetails;
    globalSalaryCache.isLoaded = true;

  }, [rawAttendance, leaveList, userData, staffData, isAttLoaded, isLeavesLoaded]);

  useEffect(() => {
    if (isAttLoaded && isLeavesLoaded) {
      setIsInitialLoading(false);
    }
  }, [isAttLoaded, isLeavesLoaded]);

  const getAbsentDeduction = () => {
    if (!userData && !staffData) return 0;
    
    const salaryAmount = Number(staffData?.salaryAmount || userData?.salaryAmount || userData?.baseSalary || userData?.salary || 0);
    const rawNextSalaryDate = staffData?.nextSalaryDate || userData?.nextSalaryDate || null;

    let cycleEnd = new Date();
    if (rawNextSalaryDate) {
      cycleEnd = new Date(rawNextSalaryDate);
      cycleEnd.setHours(0,0,0,0);
      const now = new Date();
      now.setHours(0,0,0,0);
      while (cycleEnd < now) {
        cycleEnd.setMonth(cycleEnd.getMonth() + 1);
      }
    } else {
      cycleEnd = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);
    }
    
    const cStart = new Date(cycleEnd);
    cStart.setMonth(cStart.getMonth() - 1);
    
    let actualStart = cStart;
    const jDate = staffData?.joinDate || userData?.joinDate;
    if (jDate) {
      const joinD = new Date(jDate);
      if (joinD > cStart) actualStart = joinD;
    }
    
    let totalWorkingDays = 0;
    for (let d = new Date(actualStart); d <= cycleEnd; d.setDate(d.getDate() + 1)) {
       totalWorkingDays++;
    }
    
    const perDay = totalWorkingDays > 0 ? (salaryAmount / totalWorkingDays) : 0;
    return Math.round(perDay);
  };

  const getLateDeduction = (lateMins: number) => {
    if (!lateMins || (!userData && !staffData)) return 0;
    
    const salaryAmount = Number(staffData?.salaryAmount || userData?.salaryAmount || userData?.baseSalary || userData?.salary || 0);
    const rawNextSalaryDate = staffData?.nextSalaryDate || userData?.nextSalaryDate || null;

    let cycleEnd = new Date();
    if (rawNextSalaryDate) {
      cycleEnd = new Date(rawNextSalaryDate);
      cycleEnd.setHours(0,0,0,0);
      const now = new Date();
      now.setHours(0,0,0,0);
      while (cycleEnd < now) {
        cycleEnd.setMonth(cycleEnd.getMonth() + 1);
      }
    } else {
      cycleEnd = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);
    }
    
    const cStart = new Date(cycleEnd);
    cStart.setMonth(cStart.getMonth() - 1);
    
    let actualStart = cStart;
    const jDate = staffData?.joinDate || userData?.joinDate;
    if (jDate) {
      const joinD = new Date(jDate);
      if (joinD > cStart) actualStart = joinD;
    }
    
    let totalWorkingDays = 0;
    for (let d = new Date(actualStart); d <= cycleEnd; d.setDate(d.getDate() + 1)) {
       totalWorkingDays++;
    }
    
    const perDay = totalWorkingDays > 0 ? (salaryAmount / totalWorkingDays) : 0;
    
    let shiftDurationMinutes = 480;
    const sStart = staffData?.shiftStartTime || userData?.shiftStartTime;
    const sEnd = staffData?.shiftEndTime || userData?.shiftEndTime;
    if (sStart && sEnd) {
      const [startH, startM] = sStart.split(':').map(Number);
      const [endH, endM] = sEnd.split(':').map(Number);
      let diff = (endH * 60 + endM) - (startH * 60 + startM);
      if (diff < 0) diff += 24 * 60;
      if (diff > 0) shiftDurationMinutes = diff;
    }
    
    const perMinuteSalary = perDay / shiftDurationMinutes;
    return Math.round(lateMins * perMinuteSalary);
  };

  const displayedHistory = showAllHistory ? historyData : (historyData.length > 0 ? [historyData[0]] : []);

  // Skeleton Loader for initial loading
  if (isInitialLoading) {
    return (
      <View className="px-4 pt-4 gap-4 animate-pulse">
        <View className="bg-gray-200 rounded-[20px] h-48 w-full" />
        <View className="bg-gray-200 rounded-[20px] h-48 w-full" />
        <View className="bg-gray-200 rounded-[20px] h-36 w-full" />
      </View>
    );
  }

  return (
    <ScrollView 
      bounces={false} 
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 100 }}
    >
      {/* Main Body Content */}
      <View className="px-4 pt-4 gap-4">
        
        {/* 1. Next Salary Details Card */}
        <View className="bg-white rounded-[20px] p-4 shadow-sm border border-gray-100">
          <Text className="text-black text-[16px] font-bold mb-4">Next Salary Details</Text>
          
          <View className="flex-row justify-between items-center mb-5">
            {/* Salary Date */}
            <View className="items-center flex-1">
              <Text className="text-gray-500 text-[10px] font-medium mb-2">Salary Date</Text>
              <View className="w-10 h-10 bg-[#EFF6FF] rounded-full items-center justify-center mb-2">
                <Calendar color="#208AEF" size={20} strokeWidth={2} />
              </View>
              <Text className="text-[#208AEF] text-xs font-bold">{salaryDetails.formattedSalaryDate}</Text>
            </View>
            
            {/* Divider */}
            <View className="w-[1px] h-12 bg-gray-100" />
            
            {/* Days Remaining */}
            <View className="items-center flex-1">
              <Text className="text-gray-500 text-[10px] font-medium mb-2">Days Remaining</Text>
              <View className="w-10 h-10 bg-[#FEF3C7] rounded-full items-center justify-center mb-2">
                <Hourglass color="#F59E0B" size={20} strokeWidth={2} />
              </View>
              <Text className="text-[#F59E0B] text-xs font-bold">{salaryDetails.daysRemaining}</Text>
            </View>

            {salaryDetails.isMature && (
              <>
                {/* Divider */}
                <View className="w-[1px] h-12 bg-gray-100" />
                
                {/* Salary Generated */}
                <View className="items-center flex-1">
                  <Text className="text-gray-500 text-[10px] font-medium mb-2">Salary Generated</Text>
                  <View className="w-10 h-10 bg-[#E6F4EA] rounded-full items-center justify-center mb-2">
                    <Wallet color="#10B981" size={20} strokeWidth={2} />
                  </View>
                  <Text className="text-[#10B981] text-xs font-bold">
                    {salaryDetails.expectedSalary > 0 ? `₹ ${salaryDetails.expectedSalary.toLocaleString('en-IN')}` : '₹ 0'}
                  </Text>
                </View>
              </>
            )}
          </View>

          {/* Info Banner */}
          <View className="bg-[#F0F7FF] rounded-xl p-3 flex-row items-center gap-2">
            <Info color="#208AEF" size={16} strokeWidth={2.5} />
            <Text className="text-gray-600 text-[11px] font-medium flex-1">
              {salaryDetails.formattedSalaryDate !== 'Not Set' 
                ? `Salary will be credited on or before ${salaryDetails.formattedSalaryDate}`
                : 'Salary date will be updated by Admin'}
            </Text>
          </View>
        </View>

        {/* 2. Salary Summary Card */}
        <View className="bg-white rounded-[20px] p-4 shadow-sm border border-gray-100">
          <View className="flex-row justify-between items-center mb-6">
            <Text className="text-black text-[16px] font-bold">
              {salaryDetails.isMature ? "Salary Summary" : "Current Cycle Deductions"}
            </Text>
          </View>

          {salaryDetails.isMature ? (
            <>
              {/* Total Earnings */}
              <View className="items-center mb-6">
                <Text className="text-gray-500 text-xs font-medium mb-1">Total Net Earnings (After Deductions)</Text>
                <Text className="text-[#10B981] text-3xl font-bold tracking-tight">
                  ₹ {salaryDetails.expectedSalary.toLocaleString('en-IN')}
                </Text>
              </View>

              {/* Breakdowns */}
              <View className="flex-row justify-between items-center">
                {/* Basic Salary */}
                <View className="w-[31%] bg-[#F0FDF4] rounded-xl p-3 items-center">
                  <View className="flex-row items-center gap-1.5 mb-2">
                    <Wallet color="#10B981" size={14} strokeWidth={2.5} />
                    <Text className="text-gray-600 text-[10px] font-medium">Basic Salary</Text>
                  </View>
                  <Text className="text-black text-xs font-bold">
                    ₹ {salaryDetails.baseSalary.toLocaleString('en-IN')}
                  </Text>
                </View>
                
                {/* Allowances */}
                <View className="w-[31%] bg-[#EFF6FF] rounded-xl p-3 items-center">
                  <View className="flex-row items-center gap-1.5 mb-2">
                    <Gift color="#3B82F6" size={14} strokeWidth={2.5} />
                    <Text className="text-gray-600 text-[10px] font-medium">Allowances</Text>
                  </View>
                  <Text className="text-black text-xs font-bold">₹ 0</Text>
                </View>

                {/* Deductions */}
                <TouchableOpacity 
                  activeOpacity={0.7}
                  onPress={() => {
                    setActiveModalTab('all');
                    setShowLateModal(true);
                  }}
                  className="w-[31%] bg-[#FFF1F2] rounded-xl p-3 items-center"
                >
                  <View className="flex-row items-center gap-1.5 mb-2">
                    <MinusCircle color="#EF4444" size={14} strokeWidth={2.5} />
                    <Text className="text-gray-600 text-[10px] font-medium">Deductions</Text>
                  </View>
                  <Text className="text-[#EF4444] text-xs font-bold">
                    - ₹ {salaryDetails.deductionsAmount.toLocaleString('en-IN')}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Net Pay */}
              <View className="flex-row justify-between items-center pt-4 mt-5 border-t border-gray-100">
                <Text className="text-black text-sm font-bold">Salary Generated</Text>
                <Text className="text-[#10B981] text-lg font-bold">
                  ₹ {salaryDetails.expectedSalary.toLocaleString('en-IN')}
                </Text>
              </View>
            </>
          ) : (
            <>
              {/* Only show Deduction amount */}
              <TouchableOpacity 
                activeOpacity={0.7}
                onPress={() => {
                  setActiveModalTab('all');
                  setShowLateModal(true);
                }}
                className="items-center mb-5"
              >
                <Text className="text-gray-500 text-xs font-medium mb-1">Total Deductions in Active Cycle</Text>
                <Text className="text-[#EF4444] text-3xl font-bold tracking-tight">
                  ₹ {salaryDetails.deductionsAmount.toLocaleString('en-IN')}
                </Text>
                <Text className="text-[#208AEF] text-[11px] font-semibold mt-1">Tap to view deduction breakdown</Text>
              </TouchableOpacity>
              
              <View className="bg-amber-50 border border-amber-100 rounded-xl p-3 flex-row items-center gap-2">
                <Info color="#D97706" size={16} strokeWidth={2.5} />
                <Text className="text-gray-600 text-[11px] font-medium flex-1">
                  Salary details and net pay will be unlocked on your salary maturity date ({salaryDetails.formattedSalaryDate}).
                </Text>
              </View>
            </>
          )}
        </View>

        {/* 3. Attendance & Deductions Overview */}
        <View className="bg-white rounded-[20px] p-4 shadow-sm border border-gray-100">
          <Text className="text-black text-[16px] font-bold mb-4">Attendance & Deductions Overview</Text>
          
          <View className="flex-row justify-between items-center mb-4">
            <View className="bg-[#E6F4EA] w-[23%] aspect-square rounded-2xl items-center justify-center p-2">
              <CalendarCheck2 color="#138A43" size={24} strokeWidth={2.5} className="mb-1" />
              <Text className="text-gray-500 text-[9px] font-medium text-center">Days Present</Text>
              <Text className="text-black text-lg font-bold leading-tight">{salaryDetails.daysPresent}</Text>
              <Text className="text-gray-500 text-[9px] font-medium text-center">Days</Text>
            </View>
            <TouchableOpacity 
              activeOpacity={0.7}
              onPress={() => {
                setActiveModalTab('absent');
                setShowLateModal(true);
              }}
              className="bg-[#FEE2E2] w-[23%] aspect-square rounded-2xl items-center justify-center p-2"
            >
              <CalendarX2 color="#EF4444" size={24} strokeWidth={2.5} className="mb-1" />
              <Text className="text-gray-500 text-[9px] font-medium text-center">Days Absent</Text>
              <Text className="text-black text-lg font-bold leading-tight">{salaryDetails.daysAbsent}</Text>
              <Text className="text-gray-500 text-[9px] font-medium text-center">Days</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              activeOpacity={0.7}
              onPress={() => {
                setActiveModalTab('late');
                setShowLateModal(true);
              }}
              className="bg-[#FEF3C7] w-[23%] aspect-square rounded-2xl items-center justify-center p-2"
            >
              <Clock color="#F59E0B" size={24} strokeWidth={2.5} className="mb-1" />
              <Text className="text-gray-500 text-[9px] font-medium text-center">Days Late</Text>
              <Text className="text-black text-lg font-bold leading-tight">{salaryDetails.daysLate}</Text>
              <Text className="text-gray-500 text-[9px] font-medium text-center">Days</Text>
            </TouchableOpacity>
            <View className="bg-[#EFF6FF] w-[23%] aspect-square rounded-2xl items-center justify-center p-2">
              <Plane color="#3B82F6" size={24} strokeWidth={2.5} className="mb-1" />
              <Text className="text-gray-500 text-[9px] font-medium text-center">On Leave</Text>
              <Text className="text-black text-lg font-bold leading-tight">{salaryDetails.onLeave}</Text>
              <Text className="text-gray-500 text-[9px] font-medium text-center">Days</Text>
            </View>
          </View>

          {/* Disclaimer */}
          <View className="bg-[#FFFBEB] rounded-xl p-3 flex-row items-center gap-2">
            <Lightbulb color="#F59E0B" size={16} strokeWidth={2.5} />
            <Text className="text-gray-600 text-[10px] font-medium flex-1">
              Your salary may change based on attendance, leaves and other applicable deductions.
            </Text>
          </View>
        </View>

        {/* 4. Salary History */}
        <View className="bg-transparent mb-4">
          <View className="flex-row justify-between items-center mb-3 px-1">
            <Text className="text-black text-[16px] font-bold">Salary History</Text>
            {historyData.length > 1 && (
              <TouchableOpacity 
                onPress={() => setShowAllHistory(!showAllHistory)}
                className="flex-row items-center gap-1"
              >
                <Text className="text-[#208AEF] text-xs font-bold">
                  {showAllHistory ? 'View Less' : 'View All'}
                </Text>
                {showAllHistory ? (
                  <ChevronDown color="#208AEF" size={14} strokeWidth={2.5} />
                ) : (
                  <ArrowRight color="#208AEF" size={14} strokeWidth={2.5} />
                )}
              </TouchableOpacity>
            )}
          </View>

          {/* List Items */}
          <View className="gap-3">
            {displayedHistory.length === 0 ? (
              <View className="py-8 items-center justify-center bg-white rounded-2xl border border-gray-100">
                <Text className="text-gray-500 text-sm font-medium">No salary history available.</Text>
              </View>
            ) : (
              displayedHistory.map((item, index) => (
                <View 
                  key={item.id || index}
                  className="bg-white p-3 rounded-2xl border border-gray-100 flex-row justify-between items-center shadow-sm"
                >
                  <View className="flex-row items-center gap-3">
                    <View className="w-12 h-12 bg-[#EFF6FF] rounded-xl items-center justify-center">
                      <ReceiptText color="#208AEF" size={22} strokeWidth={2} />
                    </View>
                    <View>
                      <Text className="text-black text-sm font-bold mb-1">{item.month} Salary</Text>
                      <Text className="text-gray-500 text-[11px]">{item.date}</Text>
                    </View>
                  </View>
                  <View className="flex-row items-center gap-2">
                    <Text className="text-[#10B981] text-sm font-bold">{item.amount}</Text>
                  </View>
                </View>
              ))
            )}
          </View>
        </View>

      </View>

      {/* Deduction & Late Details Modal */}
      <Modal
        visible={showLateModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowLateModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: 'white', borderTopLeftRadius: 28, borderTopRightRadius: 28, height: '75%', padding: 20 }}>
            {/* Header */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', paddingBottom: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ backgroundColor: '#FEF3C7', padding: 8, borderRadius: 12 }}>
                  <MinusCircle color="#D97706" size={20} strokeWidth={2.5} />
                </View>
                <View>
                  <Text style={{ fontSize: 16, fontWeight: '900', color: '#111827' }}>Deduction Details</Text>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: '#6B7280', marginTop: 2 }}>{cycleMonthName} Cycle</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setShowLateModal(false)} style={{ backgroundColor: '#F3F4F6', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 9999 }}>
                <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#374151' }}>Close</Text>
              </TouchableOpacity>
            </View>

            {/* Navigation Tabs */}
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
              <TouchableOpacity
                onPress={() => setActiveModalTab('all')}
                style={{
                  flex: 1,
                  paddingVertical: 8,
                  borderRadius: 12,
                  backgroundColor: activeModalTab === 'all' ? '#208AEF' : '#F3F4F6',
                  alignItems: 'center'
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: 'bold', color: activeModalTab === 'all' ? 'white' : '#4B5563' }}>All Deductions</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setActiveModalTab('late')}
                style={{
                  flex: 1,
                  paddingVertical: 8,
                  borderRadius: 12,
                  backgroundColor: activeModalTab === 'late' ? '#F59E0B' : '#F3F4F6',
                  alignItems: 'center'
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: 'bold', color: activeModalTab === 'late' ? 'white' : '#4B5563' }}>Late ({lateHistory.length})</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setActiveModalTab('absent')}
                style={{
                  flex: 1,
                  paddingVertical: 8,
                  borderRadius: 12,
                  backgroundColor: activeModalTab === 'absent' ? '#EF4444' : '#F3F4F6',
                  alignItems: 'center'
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: 'bold', color: activeModalTab === 'absent' ? 'white' : '#4B5563' }}>Absent ({absentHistory.length})</Text>
              </TouchableOpacity>
            </View>

            {/* List Content */}
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
              {(() => {
                const perDayAbs = getAbsentDeduction();

                if (activeModalTab === 'all') {
                  const hasDeductions = absentHistory.length > 0 || lateHistory.length > 0;
                  if (!hasDeductions) {
                    return (
                      <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 40 }}>
                        <Text style={{ color: '#9CA3AF', fontSize: 14, fontWeight: 'bold' }}>No deductions for this cycle!</Text>
                      </View>
                    );
                  }

                  return (
                    <View style={{ gap: 12 }}>
                      {/* Summary Banner */}
                      <View style={{ backgroundColor: '#FFF1F2', borderRadius: 16, padding: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <View>
                          <Text style={{ fontSize: 12, fontWeight: '700', color: '#9F1239' }}>Total Deductions</Text>
                          <Text style={{ fontSize: 10, color: '#BE123C', marginTop: 2 }}>
                            {absentHistory.length} Absent Days + {lateHistory.length} Late Punches
                          </Text>
                        </View>
                        <Text style={{ fontSize: 18, fontWeight: '900', color: '#EF4444' }}>
                          - ₹ {salaryDetails.deductionsAmount.toLocaleString('en-IN')}
                        </Text>
                      </View>

                      {/* Absent Entries */}
                      {absentHistory.map((item, idx) => {
                        const formattedDate = item.date ? new Date(item.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : item.date;
                        return (
                          <View key={`abs_${idx}`} style={{ backgroundColor: '#FEF2F2', borderLeftWidth: 4, borderLeftColor: '#EF4444', borderRadius: 16, padding: 14 }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                              <View>
                                <Text style={{ fontSize: 13, fontWeight: '900', color: '#1F2937' }}>{formattedDate}</Text>
                                <Text style={{ fontSize: 10, fontWeight: '700', color: '#EF4444', marginTop: 2 }}>Absent Day</Text>
                              </View>
                              <Text style={{ fontSize: 13, fontWeight: '900', color: '#EF4444' }}>
                                - ₹{perDayAbs.toLocaleString('en-IN')}
                              </Text>
                            </View>
                          </View>
                        );
                      })}

                      {/* Late Entries */}
                      {lateHistory.map((item, idx) => {
                        const formattedDate = item.date ? new Date(item.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : item.date;
                        const deduction = getLateDeduction(item.lateMinutes || 0);

                        return (
                          <View key={`late_${idx}`} style={{ backgroundColor: '#FFFDF5', borderLeftWidth: 4, borderLeftColor: '#F59E0B', borderRadius: 16, padding: 14 }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                              <Text style={{ fontSize: 13, fontWeight: '900', color: '#1F2937' }}>{formattedDate}</Text>
                              <View style={{ backgroundColor: '#FEF3C7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 9999 }}>
                                <Text style={{ fontSize: 10, fontWeight: '800', color: '#D97706' }}>{formatLateTime(item.lateMinutes || 0)} late</Text>
                              </View>
                            </View>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Text style={{ fontSize: 11, fontWeight: '600', color: '#6B7280' }}>In: <Text style={{ color: '#1F2937', fontWeight: 'bold' }}>{item.in}</Text></Text>
                              <Text style={{ fontSize: 12, fontWeight: '900', color: '#EF4444' }}>
                                Deduction: ₹{deduction.toLocaleString('en-IN')}
                              </Text>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  );
                }

                if (activeModalTab === 'late') {
                  if (lateHistory.length === 0) {
                    return (
                      <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 40 }}>
                        <Text style={{ color: '#9CA3AF', fontSize: 14, fontWeight: 'bold' }}>No late logs for this cycle!</Text>
                      </View>
                    );
                  }

                  return lateHistory.map((item, idx) => {
                    const formattedDate = item.date ? new Date(item.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : item.date;
                    const deduction = getLateDeduction(item.lateMinutes || 0);

                    return (
                      <View key={idx} style={{ backgroundColor: '#FFFDF5', borderLeftWidth: 4, borderLeftColor: '#F59E0B', borderRadius: 16, padding: 16, marginBottom: 12 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <Text style={{ fontSize: 13, fontWeight: '900', color: '#1F2937' }}>{formattedDate}</Text>
                          <View style={{ backgroundColor: '#FEF3C7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 9999 }}>
                            <Text style={{ fontSize: 10, fontWeight: '800', color: '#D97706' }}>{formatLateTime(item.lateMinutes || 0)} late</Text>
                          </View>
                        </View>
                        
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                          <View style={{ flexDirection: 'row', gap: 12 }}>
                            <Text style={{ fontSize: 11, fontWeight: '600', color: '#6B7280' }}>In: <Text style={{ color: '#1F2937', fontWeight: 'bold' }}>{item.in}</Text></Text>
                            <Text style={{ fontSize: 11, fontWeight: '600', color: '#6B7280' }}>Out: <Text style={{ color: '#1F2937', fontWeight: 'bold' }}>{item.out}</Text></Text>
                          </View>
                          <Text style={{ fontSize: 12, fontWeight: '900', color: '#EF4444' }}>
                            Deduction: ₹{deduction.toLocaleString('en-IN')}
                          </Text>
                        </View>
                      </View>
                    );
                  });
                }

                if (activeModalTab === 'absent') {
                  if (absentHistory.length === 0) {
                    return (
                      <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 40 }}>
                        <Text style={{ color: '#9CA3AF', fontSize: 14, fontWeight: 'bold' }}>No absent logs for this cycle!</Text>
                      </View>
                    );
                  }

                  return absentHistory.map((item, idx) => {
                    const formattedDate = item.date ? new Date(item.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : item.date;

                    return (
                      <View key={idx} style={{ backgroundColor: '#FEF2F2', borderLeftWidth: 4, borderLeftColor: '#EF4444', borderRadius: 16, padding: 16, marginBottom: 12 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <View>
                            <Text style={{ fontSize: 13, fontWeight: '900', color: '#1F2937' }}>{formattedDate}</Text>
                            <Text style={{ fontSize: 10, fontWeight: '700', color: '#EF4444', marginTop: 2 }}>Full Day Absent</Text>
                          </View>
                          <Text style={{ fontSize: 13, fontWeight: '900', color: '#EF4444' }}>
                            Deduction: ₹{perDayAbs.toLocaleString('en-IN')}
                          </Text>
                        </View>
                      </View>
                    );
                  });
                }

                return null;
              })()}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}