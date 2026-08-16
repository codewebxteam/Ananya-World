// app/salary.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { 
  Calendar, Hourglass, Info, FileText, 
  Wallet, Gift, MinusCircle, CalendarCheck2, 
  CalendarX2, Clock, Plane, Lightbulb, 
  ReceiptText, ChevronRight, ArrowRight, ChevronDown
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDoc, collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';

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
    expectedSalary: 0
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
  const [isAttLoaded, setIsAttLoaded] = useState(globalSalaryCache.isLoaded);
  const [isLeavesLoaded, setIsLeavesLoaded] = useState(globalSalaryCache.isLoaded);

  // Skeleton / Initial loading state (false if memory cache is already loaded)
  const [isInitialLoading, setIsInitialLoading] = useState(!globalSalaryCache.isLoaded);

  useEffect(() => {
    let unsubAtt: any;
    let unsubLeaves: any;

    const fetchSalaryInfo = async () => {
      try {
        const stored = await AsyncStorage.getItem('userData');
        if (stored) {
          const parsed = JSON.parse(stored);
          setUserData(parsed);
          globalSalaryCache.userData = parsed;

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
    };
  }, []);

  useEffect(() => {
    if (!userData || !isAttLoaded || !isLeavesLoaded) return;

    const localToday = new Date();
    const yr = localToday.getFullYear();
    const mo = String(localToday.getMonth() + 1).padStart(2, '0');
    const currentYearMonth = `${yr}-${mo}`;
    
    // Fetch fresh salary properties from userData
    const salaryAmount = Number(userData.salaryAmount || userData.baseSalary || userData.salary || 0);
    const rawNextSalaryDate = userData.nextSalaryDate || null;

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

    // We want to generate a record for each day of the current month
    const daysInMonth = new Date(yr, localToday.getMonth() + 1, 0).getDate();
    
    const combinedMap = new Map<string, any>();
    const userWeeklyOff = userData?.weeklyOff || 'Sunday';
    const todayStr = `${yr}-${mo}-${String(localToday.getDate()).padStart(2, '0')}`;
    
    for (let d = 1; d <= daysInMonth; d++) {
      const dy = String(d).padStart(2, '0');
      const dateStr = `${currentYearMonth}-${dy}`;
      
      if (dateStr > todayStr) {
        continue;
      }
      
      const dateObj = new Date(yr, localToday.getMonth(), d);
      const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
      
      // 1. Check real attendance
      const realAtt = rawAttendance.find(att => att.date === dateStr);
      if (realAtt) {
        combinedMap.set(dateStr, {
          status: realAtt.status || 'Present',
          date: dateStr
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
    combinedMap.forEach(item => {
      if (item.status === 'Present') pres++;
      else if (item.status === 'Late') { pres++; lat++; }
      else if (item.status === 'Absent') abs++;
      else if (item.status === 'On Leave' || item.status === 'Leave') lev++;
    });

    const perDay = salaryAmount > 0 ? (salaryAmount / 30) : 0;
    const deductionDays = abs + (lat * 0.5);
    const deductionsAmount = Math.round(deductionDays * perDay);
    const expected = salaryAmount > 0 ? Math.max(0, Math.round(salaryAmount - deductionsAmount)) : 0;

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
      expectedSalary: expected
    };

    setSalaryDetails(updatedDetails);
    globalSalaryCache.salaryDetails = updatedDetails;
    globalSalaryCache.isLoaded = true;

  }, [rawAttendance, leaveList, userData, isAttLoaded, isLeavesLoaded]);

  useEffect(() => {
    if (isAttLoaded && isLeavesLoaded) {
      setIsInitialLoading(false);
    }
  }, [isAttLoaded, isLeavesLoaded]);

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

            {/* Divider */}
            <View className="w-[1px] h-12 bg-gray-100" />
            
            {/* Expected Salary */}
            <View className="items-center flex-1">
              <Text className="text-gray-500 text-[10px] font-medium mb-2">Expected Salary</Text>
              <View className="w-10 h-10 bg-[#E6F4EA] rounded-full items-center justify-center mb-2">
                <Hourglass color="#10B981" size={20} strokeWidth={2} />
              </View>
              <Text className="text-[#10B981] text-xs font-bold">
                {salaryDetails.expectedSalary > 0 ? `₹ ${salaryDetails.expectedSalary.toLocaleString('en-IN')}` : '₹ 0'}
              </Text>
            </View>
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
            <Text className="text-black text-[16px] font-bold">Salary Summary</Text>
          </View>

          {/* Total Earnings */}
          <View className="items-center mb-6">
            <Text className="text-gray-500 text-xs font-medium mb-1">Total Earnings</Text>
            <Text className="text-[#208AEF] text-3xl font-bold tracking-tight">
              ₹ {salaryDetails.baseSalary.toLocaleString('en-IN')}
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
            <View className="w-[31%] bg-[#FFF1F2] rounded-xl p-3 items-center">
              <View className="flex-row items-center gap-1.5 mb-2">
                <MinusCircle color="#EF4444" size={14} strokeWidth={2.5} />
                <Text className="text-gray-600 text-[10px] font-medium">Deductions</Text>
              </View>
              <Text className="text-[#EF4444] text-xs font-bold">
                - ₹ {salaryDetails.deductionsAmount.toLocaleString('en-IN')}
              </Text>
            </View>
          </View>

          {/* Net Pay */}
          <View className="flex-row justify-between items-center pt-4 mt-5 border-t border-gray-100">
            <Text className="text-black text-sm font-bold">Net Pay</Text>
            <Text className="text-[#10B981] text-lg font-bold">
              ₹ {salaryDetails.expectedSalary.toLocaleString('en-IN')}
            </Text>
          </View>
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
            <View className="bg-[#FEE2E2] w-[23%] aspect-square rounded-2xl items-center justify-center p-2">
              <CalendarX2 color="#EF4444" size={24} strokeWidth={2.5} className="mb-1" />
              <Text className="text-gray-500 text-[9px] font-medium text-center">Days Absent</Text>
              <Text className="text-black text-lg font-bold leading-tight">{salaryDetails.daysAbsent}</Text>
              <Text className="text-gray-500 text-[9px] font-medium text-center">Days</Text>
            </View>
            <View className="bg-[#FEF3C7] w-[23%] aspect-square rounded-2xl items-center justify-center p-2">
              <Clock color="#F59E0B" size={24} strokeWidth={2.5} className="mb-1" />
              <Text className="text-gray-500 text-[9px] font-medium text-center">Days Late</Text>
              <Text className="text-black text-lg font-bold leading-tight">{salaryDetails.daysLate}</Text>
              <Text className="text-gray-500 text-[9px] font-medium text-center">Days</Text>
            </View>
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
    </ScrollView>
  );
}