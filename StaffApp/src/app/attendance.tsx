// app/attendance.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { 
  MapPin, LogOut, LogIn, Calendar as CalendarIcon, 
  Clock, History, ChevronLeft, ChevronRight, 
  Check, Info, Timer, BadgeCheck, PieChart, Signal,
  TrendingUp, CalendarX2, AlertCircle, Plane, Globe, UserCheck, ShieldAlert
} from 'lucide-react-native';
import * as Location from 'expo-location';
import { db } from '../config/firebase';
import { collection, query, where, doc, getDoc, setDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Module-level global memory cache to guarantee zero reload/skeleton when navigating between tabs
let globalAttendanceCache: {
  isLoaded: boolean;
  userData: any;
  historyData: any[];
  rawAttendance: any[];
  approvedLeaves: any[];
  punchInTime: Date | null;
  punchOutTime: Date | null;
  monthlyStats: { present: number; absent: number; late: number; leave: number; totalHours: number };
  isOnLeave: boolean;
  isHoliday: boolean;
  isOffCanceled: boolean;
  isExtraDuty: boolean;
  isCompanyHoliday: boolean;
  holidayData: any;
} = {
  isLoaded: false,
  userData: null,
  historyData: [],
  rawAttendance: [],
  approvedLeaves: [],
  punchInTime: null,
  punchOutTime: null,
  monthlyStats: { present: 0, absent: 0, late: 0, leave: 0, totalHours: 0 },
  isOnLeave: false,
  isHoliday: false,
  isOffCanceled: false,
  isExtraDuty: false,
  isCompanyHoliday: false,
  holidayData: null
};

const checkAndAutoPunchOut = async (docId: string, data: any, shiftEndTime: string) => {
  if (!data.punchIn || data.punchOut) return;

  const dateStr = data.date; // e.g. "2026-08-16"
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hour, minute] = (shiftEndTime || '18:00').split(':').map(Number);
  
  // Create shift end Date in local timezone
  const shiftEndLocal = new Date(year, month - 1, day, hour, minute, 0, 0);
  const now = new Date();

  if (now > shiftEndLocal) {
    const punchInDate = new Date(data.punchIn);
    
    // Set punchOut to shiftEndLocal. If they punched in after shiftEndLocal, set it to punchInDate + 1 minute.
    let punchOutDate = shiftEndLocal;
    if (punchInDate >= shiftEndLocal) {
      punchOutDate = new Date(punchInDate.getTime() + 60000); // 1 minute later
    }

    const diffMs = punchOutDate.getTime() - punchInDate.getTime();
    const hoursStr = `${Math.floor(diffMs / 3600000)}h ${Math.floor((diffMs % 3600000) / 60000)}m`;

    try {
      await updateDoc(doc(db, 'attendance', docId), {
        punchOut: punchOutDate.toISOString(),
        hours: hoursStr,
        locationOut: 'Auto Punch Out (Shift End)',
        autoPunchedOut: true
      });
      console.log(`Successfully auto-punched out attendance doc in attendance tab: ${docId}`);
    } catch (error) {
      console.error(`Error auto-punching out attendance doc in attendance tab: ${docId}`, error);
    }
  }
};

export default function AttendanceScreen() {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // State initialized from global memory cache for instant render with zero reload
  const [userData, setUserData] = useState<any>(globalAttendanceCache.userData);
  const [punchInTime, setPunchInTime] = useState<Date | null>(globalAttendanceCache.punchInTime);
  const [punchOutTime, setPunchOutTime] = useState<Date | null>(globalAttendanceCache.punchOutTime);
  const [historyData, setHistoryData] = useState<any[]>(globalAttendanceCache.historyData);
  const [monthlyStats, setMonthlyStats] = useState(globalAttendanceCache.monthlyStats);
  
  // Skeleton / Initial loading state (false if memory cache is loaded)
  const [isInitialLoading, setIsInitialLoading] = useState(!globalAttendanceCache.isLoaded);
  const [locationAddress, setLocationAddress] = useState('Not Punched In');
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);
  
  // Tab State: 'Daily' | 'Monthly' | 'History'
  const [activeTab, setActiveTab] = useState<'Daily' | 'Monthly' | 'History'>('Daily');

  // Role & Proximity simulation states
  const [userRole, setUserRole] = useState<'Office' | 'Field'>('Office');
  const [isNearOffice, setIsNearOffice] = useState(true);

  // Calendar State
  const [viewMonthDate, setViewMonthDate] = useState(new Date());

  // History Pagination (7 days per page)
  const [historyPage, setHistoryPage] = useState(1);
  const PAGE_SIZE = 7;

  // Leave & Holiday states
  const [isOnLeave, setIsOnLeave] = useState(globalAttendanceCache.isOnLeave);
  const [isHoliday, setIsHoliday] = useState(globalAttendanceCache.isHoliday);
  const [isOffCanceled, setIsOffCanceled] = useState(globalAttendanceCache.isOffCanceled);
  const [isExtraDuty, setIsExtraDuty] = useState(globalAttendanceCache.isExtraDuty);
  const [isCompanyHoliday, setIsCompanyHoliday] = useState(globalAttendanceCache.isCompanyHoliday);
  const [holidayData, setHolidayData] = useState<any>(globalAttendanceCache.holidayData);
  const [rawAttendance, setRawAttendance] = useState<any[]>(globalAttendanceCache.rawAttendance);
  const [approvedLeaves, setApprovedLeaves] = useState<any[]>(globalAttendanceCache.approvedLeaves);
  const [isAttLoaded, setIsAttLoaded] = useState(globalAttendanceCache.isLoaded);
  const [isLeavesLoaded, setIsLeavesLoaded] = useState(globalAttendanceCache.isLoaded);

  useEffect(() => {
    let unsubAtt: any;
    let unsubUser: any;
    let unsubLeaves: any;
    let unsubOffCancel: any;
    let unsubActiveLeave: any;
    let unsubExtraDuties: any;
    let unsubCompanyHoliday: any;

    const fetchAttendanceData = async () => {
      try {
        const data = await AsyncStorage.getItem('userData');
        if (data) {
          const parsed = JSON.parse(data);
          setUserData(parsed);
          globalAttendanceCache.userData = parsed;
          setUserRole((parsed.staffType || 'Office').includes('Field') ? 'Field' : 'Office');

          // Realtime listener for User Profile updates
          const userDocRef = doc(db, 'users', parsed.uid);
          unsubUser = onSnapshot(userDocRef, async (snap) => {
            if (snap.exists()) {
              const freshUserData = snap.data();
              setUserData(freshUserData);
              globalAttendanceCache.userData = freshUserData;
              setUserRole((freshUserData.staffType || 'Office').includes('Field') ? 'Field' : 'Office');
              await AsyncStorage.setItem('userData', JSON.stringify(freshUserData));
            }
          });
          
          const today = new Date().toISOString().split('T')[0];
          const attendanceId = `${parsed.empId}_${today}`;
          const attRef = doc(db, 'attendance', attendanceId);
          const attSnap = await getDoc(attRef);

          if (attSnap.exists()) {
            const attData = attSnap.data();
            if (attData.punchIn) {
              const pIn = new Date(attData.punchIn);
              setPunchInTime(pIn);
              globalAttendanceCache.punchInTime = pIn;
            }
            if (attData.punchOut) {
              const pOut = new Date(attData.punchOut);
              setPunchOutTime(pOut);
              globalAttendanceCache.punchOutTime = pOut;
            }
            if (attData.locationIn) {
              setLocationAddress(attData.locationIn);
            }
          }

          // 1. Realtime Listener for Approved Leaves (for today check and history merge)
          const qLeaves = query(
            collection(db, 'leaves'),
            where('staffId', '==', parsed.empId),
            where('status', '==', 'Approved')
          );
          unsubLeaves = onSnapshot(qLeaves, (snapshot) => {
            const leaves: any[] = [];
            let activeLeaveFound = false;
            const todayStr = new Date().toISOString().split('T')[0];

            snapshot.forEach(docSnap => {
              const lData = docSnap.data();
              leaves.push({ id: docSnap.id, ...lData });
              if (lData.startDate <= todayStr && todayStr <= lData.endDate) {
                activeLeaveFound = true;
              }
            });

            setApprovedLeaves(leaves);
            globalAttendanceCache.approvedLeaves = leaves;
            setIsOnLeave(activeLeaveFound);
            globalAttendanceCache.isOnLeave = activeLeaveFound;
            setIsLeavesLoaded(true);
          });

          // 2. Realtime Listener for Attendance History
          const qHistory = query(collection(db, 'attendance'), where('staffId', '==', parsed.empId));
          unsubAtt = onSnapshot(qHistory, (snapshot) => {
            const historyList: any[] = [];

            snapshot.forEach(docSnap => {
              const item = docSnap.data();

              // Auto-punch out check
              if (item.punchIn && !item.punchOut) {
                const currentShiftEndTime = globalAttendanceCache.userData?.shiftEndTime || parsed.shiftEndTime || '18:00';
                checkAndAutoPunchOut(docSnap.id, item, currentShiftEndTime);
              }
              
              // Format date string and day of week
              let dayName = 'N/A';
              if (item.date) {
                try {
                  const dObj = new Date(item.date);
                  dayName = dObj.toLocaleDateString('en-US', { weekday: 'long' });
                } catch {}
              }

              historyList.push({
                id: docSnap.id,
                date: item.date || 'N/A',
                day: dayName,
                status: item.status || 'Present',
                in: item.punchIn ? formatTime(new Date(item.punchIn)) : '--:--',
                out: item.punchOut ? formatTime(new Date(item.punchOut)) : '--:--',
                total: item.hours || '00h 00m',
                rawDate: item.date
              });
            });

            setRawAttendance(historyList);
            globalAttendanceCache.rawAttendance = historyList;
            globalAttendanceCache.isLoaded = true;
            setIsAttLoaded(true);
          });

          // 3. Determine default Weekly Off day
          const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
          const todayDayName = daysOfWeek[new Date().getDay()];
          const defaultWeeklyOff = parsed.weeklyOff || 'Sunday';
          const isTodayDefaultOff = todayDayName === defaultWeeklyOff;
          setIsHoliday(isTodayDefaultOff);
          globalAttendanceCache.isHoliday = isTodayDefaultOff;

          // 4. Listener for Weekly Off Cancellation for Today
          const qOffCancellations = query(
            collection(db, 'weekly_off_cancellations'),
            where('staffId', '==', parsed.empId),
            where('date', '==', today)
          );
          unsubOffCancel = onSnapshot(qOffCancellations, (snapshot) => {
            const hasCancel = !snapshot.empty;
            setIsOffCanceled(hasCancel);
            globalAttendanceCache.isOffCanceled = hasCancel;
          });

          // 5. Listener for Approved Leaves Today
          const qActiveLeaves = query(
            collection(db, 'leaves'),
            where('staffId', '==', parsed.empId),
            where('status', '==', 'Approved')
          );
          unsubActiveLeave = onSnapshot(qActiveLeaves, (snapshot) => {
            let activeLeaveFound = false;
            snapshot.forEach(docSnap => {
              const data = docSnap.data();
              if (data.startDate <= today && today <= data.endDate) {
                activeLeaveFound = true;
              }
            });
            setIsOnLeave(activeLeaveFound);
            globalAttendanceCache.isOnLeave = activeLeaveFound;
          });

          // 6. Listener for Extra Duties Today
          const qExtraDuties = query(
            collection(db, 'extra_duties'),
            where('staffId', '==', parsed.empId),
            where('date', '==', today),
            where('status', '==', 'Active')
          );
          unsubExtraDuties = onSnapshot(qExtraDuties, (snapshot) => {
            const hasExtra = !snapshot.empty;
            setIsExtraDuty(hasExtra);
            globalAttendanceCache.isExtraDuty = hasExtra;
          });

          // 7. Listener for Company Holidays Today
          const qCompanyHolidays = query(
            collection(db, 'company_holidays'),
            where('date', '==', today)
          );
          unsubCompanyHoliday = onSnapshot(qCompanyHolidays, (snapshot) => {
            if (!snapshot.empty) {
              const data = snapshot.docs[0].data();
              const hData = {
                name: data.name || 'Festival Holiday',
                wishMessage: data.wishMessage || 'Wishing you a happy holiday!'
              };
              setIsCompanyHoliday(true);
              setHolidayData(hData);
              globalAttendanceCache.isCompanyHoliday = true;
              globalAttendanceCache.holidayData = hData;
            } else {
              setIsCompanyHoliday(false);
              setHolidayData(null);
              globalAttendanceCache.isCompanyHoliday = false;
              globalAttendanceCache.holidayData = null;
            }
          });
        }
      } catch (error) {
        console.error("Error fetching attendance data", error);
      } finally {
        setIsInitialLoading(false);
      }
    };
    
    fetchAttendanceData();

    const timer = setInterval(() => {
      setCurrentDate(new Date());
    }, 60000);

    return () => {
      clearInterval(timer);
      if (unsubAtt) unsubAtt();
      if (unsubUser) unsubUser();
      if (unsubLeaves) unsubLeaves();
      if (unsubOffCancel) unsubOffCancel();
      if (unsubActiveLeave) unsubActiveLeave();
      if (unsubExtraDuties) unsubExtraDuties();
      if (unsubCompanyHoliday) unsubCompanyHoliday();
    };
  }, []);

  useEffect(() => {
    if (!isAttLoaded || !isLeavesLoaded) return;

    const yr = viewMonthDate.getFullYear();
    const mo = String(viewMonthDate.getMonth() + 1).padStart(2, '0');
    const currentYearMonth = `${yr}-${mo}`;
    
    // We want to generate a record for each day of the selected month
    const daysInMonth = new Date(yr, viewMonthDate.getMonth() + 1, 0).getDate();
    
    const combinedMap = new Map<string, any>();
    
    // Get weekly off day name
    const userWeeklyOff = userData?.weeklyOff || 'Sunday';
    
    // Format today's date string in local timezone YYYY-MM-DD
    const localToday = new Date();
    const todayStr = `${localToday.getFullYear()}-${String(localToday.getMonth() + 1).padStart(2, '0')}-${String(localToday.getDate()).padStart(2, '0')}`;
    
    for (let d = 1; d <= daysInMonth; d++) {
      const dy = String(d).padStart(2, '0');
      const dateStr = `${currentYearMonth}-${dy}`;
      
      // We only generate records for past days or today. Future days remain empty.
      if (dateStr > todayStr) {
        continue;
      }
      
      const dateObj = new Date(yr, viewMonthDate.getMonth(), d);
      const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
      
      // 1. Check if we have real attendance
      const realAtt = rawAttendance.find(att => att.date === dateStr);
      if (realAtt) {
        combinedMap.set(dateStr, realAtt);
        continue;
      }
      
      // 2. Check if we have approved leave
      let isOnLeave = false;
      let leaveId = '';
      approvedLeaves.forEach(leave => {
        if (leave.status === 'Approved') {
          let current = new Date(leave.startDate);
          const end = new Date(leave.endDate);
          while (current <= end) {
            const lDateStr = current.toISOString().split('T')[0];
            if (lDateStr === dateStr) {
              isOnLeave = true;
              leaveId = leave.id;
              break;
            }
            current.setDate(current.getDate() + 1);
          }
        }
      });
      
      if (isOnLeave) {
        combinedMap.set(dateStr, {
          id: `leave_${leaveId}_${dateStr}`,
          date: dateStr,
          day: dayName,
          status: 'On Leave',
          in: '--:--',
          out: '--:--',
          total: '00h 00m',
          rawDate: dateStr,
          isVirtual: true
        });
        continue;
      }
      
      // 3. Check if it is a Weekly Off day
      if (dayName.toLowerCase() === userWeeklyOff.toLowerCase()) {
        combinedMap.set(dateStr, {
          id: `weeklyoff_${dateStr}`,
          date: dateStr,
          day: dayName,
          status: 'Weekly Off',
          in: '--:--',
          out: '--:--',
          total: '00h 00m',
          rawDate: dateStr,
          isVirtual: true
        });
        continue;
      }
      
      // 4. Otherwise, if it is a past day (before today), mark as Absent
      if (dateStr < todayStr) {
        combinedMap.set(dateStr, {
          id: `absent_${dateStr}`,
          date: dateStr,
          day: dayName,
          status: 'Absent',
          in: '--:--',
          out: '--:--',
          total: '00h 00m',
          rawDate: dateStr,
          isVirtual: true
        });
      }
    }

    // Convert to list
    const combinedList = Array.from(combinedMap.values());
    combinedList.sort((a, b) => new Date(b.rawDate || 0).getTime() - new Date(a.rawDate || 0).getTime());

    // 3. Compute stats for the selected month (currentYearMonth)
    let pres = 0, abs = 0, lat = 0, lev = 0, totalMins = 0;
    combinedList.forEach(item => {
      if (item.rawDate && item.rawDate.startsWith(currentYearMonth)) {
        if (item.status === 'Present') pres++;
        else if (item.status === 'Late') { pres++; lat++; }
        else if (item.status === 'Absent') abs++;
        else if (item.status === 'On Leave' || item.status === 'Leave') lev++;

        if (item.total && item.total !== '00h 00m') {
          const match = item.total.match(/(\d+)h\s*(\d+)m/);
          if (match) {
            totalMins += Number(match[1]) * 60 + Number(match[2]);
          }
        }
      }
    });

    const statsObj = {
      present: pres,
      absent: abs,
      late: lat,
      leave: lev,
      totalHours: Math.round((totalMins / 60) * 10) / 10
    };

    setHistoryData(combinedList);
    setMonthlyStats(statsObj);
    
    globalAttendanceCache.historyData = combinedList;
    globalAttendanceCache.monthlyStats = statsObj;

  }, [rawAttendance, approvedLeaves, viewMonthDate, isAttLoaded, isLeavesLoaded]);

  useEffect(() => {
    if (isAttLoaded && isLeavesLoaded) {
      setIsInitialLoading(false);
    }
  }, [isAttLoaded, isLeavesLoaded]);

  const handlePunch = async () => {
    if (!userData) return;

    setIsFetchingLocation(true);
    setLocationAddress('Fetching Location...');
    
    const today = new Date().toISOString().split('T')[0];
    const attendanceId = `${userData.empId}_${today}`;
    const attRef = doc(db, 'attendance', attendanceId);

    let fetchedAddress = 'Location Acquired';
    let coords: { latitude: number; longitude: number } | null = null;
    const isFieldStaff = userRole === 'Field';

    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        if (isFieldStaff) {
          Alert.alert("Permission Required", "Field staff must grant location permission to punch in/out.");
          setIsFetchingLocation(false);
          return;
        } else {
          setLocationAddress('Location Permission Denied');
        }
      } else {
        let location = await Location.getCurrentPositionAsync({});
        coords = { latitude: location.coords.latitude, longitude: location.coords.longitude };
        let geocode = await Location.reverseGeocodeAsync({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude
        });
        
        if (geocode.length > 0) {
          const addr = geocode[0];
          fetchedAddress = [addr.name, addr.street, addr.city, addr.region].filter(Boolean).join(', ');
          setLocationAddress(fetchedAddress);
        }
      }
    } catch (error) {
      console.log("Location error", error);
      if (isFieldStaff) {
        Alert.alert("Location Error", "Could not retrieve location. Please check your GPS settings.");
        setIsFetchingLocation(false);
        return;
      }
    }
    
    setIsFetchingLocation(false);

    if (!punchInTime) {
      const now = new Date();
      setPunchInTime(now);
      globalAttendanceCache.punchInTime = now;
      
      try {
        await setDoc(attRef, {
          staffId: userData.empId,
          name: userData.name,
          dept: userData.staffType || userData.department || 'General',
          avatar: userData.avatar || null,
          date: today,
          punchIn: now.toISOString(),
          locationIn: fetchedAddress,
          latitudeIn: isFieldStaff && coords ? coords.latitude : null,
          longitudeIn: isFieldStaff && coords ? coords.longitude : null,
          status: 'Present'
        });
        Alert.alert("Success", `Punch In successful at ${fetchedAddress}!`);
      } catch (error: any) {
        Alert.alert("Error", error.message);
      }
    } else if (!punchOutTime) {
      const now = new Date();
      setPunchOutTime(now);
      globalAttendanceCache.punchOutTime = now;
      
      const diffMs = now.getTime() - punchInTime.getTime();
      const hoursStr = `${Math.floor(diffMs / 3600000)}h ${Math.floor((diffMs % 3600000) / 60000)}m`;

      try {
        await updateDoc(attRef, {
          punchOut: now.toISOString(),
          locationOut: fetchedAddress,
          latitudeOut: isFieldStaff && coords ? coords.latitude : null,
          longitudeOut: isFieldStaff && coords ? coords.longitude : null,
          hours: hoursStr
        });
        Alert.alert("Success", "Punch Out successful!");
      } catch (error: any) {
        Alert.alert("Error", error.message);
      }
    }
  };

  const formatTime = (date: Date | null) => {
    if (!date) return '--:-- --';
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const getWorkingHours = () => {
    if (!punchInTime) return '00h 00m';
    const end = punchOutTime || currentDate;
    const diffMs = end.getTime() - punchInTime.getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours.toString().padStart(2, '0')}h ${minutes.toString().padStart(2, '0')}m`;
  };

  // Calendar Logic
  const prevMonth = () => {
    setViewMonthDate(new Date(viewMonthDate.getFullYear(), viewMonthDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setViewMonthDate(new Date(viewMonthDate.getFullYear(), viewMonthDate.getMonth() + 1, 1));
  };

  const monthNameYear = viewMonthDate.toLocaleString('default', { month: 'long', year: 'numeric' });
  const daysInMonth = new Date(viewMonthDate.getFullYear(), viewMonthDate.getMonth() + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewMonthDate.getFullYear(), viewMonthDate.getMonth(), 1).getDay();
  const emptyDays = Array.from({ length: firstDayOfWeek });
  const monthDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // History Pagination Calculations (7 days per page)
  const totalHistoryPages = Math.ceil(historyData.length / PAGE_SIZE) || 1;
  const paginatedHistory = historyData.slice((historyPage - 1) * PAGE_SIZE, historyPage * PAGE_SIZE);

  // Skeleton Loader Component
  if (isInitialLoading) {
    return (
      <View className="px-4 pt-4 gap-4 animate-pulse">
        <View className="bg-gray-200 rounded-[20px] h-48 w-full" />
        <View className="bg-gray-200 rounded-2xl h-12 w-full" />
        <View className="bg-gray-200 rounded-[20px] h-64 w-full" />
      </View>
    );
  }

  const getBannerDetails = () => {
    if (isCompanyHoliday && holidayData) {
      return {
        bgClass: 'bg-[#FEF3C7] border-[#FDE68A]', // festive gold
        iconBgClass: 'bg-[#F59E0B]',
        icon: <CalendarIcon color="white" size={20} />,
        title: `Holiday: ${holidayData.name}`,
        subtitle: `${holidayData.wishMessage} 🎉`,
        disabled: true
      };
    }
    if (isOnLeave) {
      return {
        bgClass: 'bg-purple-50 border-purple-100',
        iconBgClass: 'bg-purple-500',
        icon: <Plane color="white" size={20} />,
        title: 'Approved Leave',
        subtitle: 'You are on an approved leave today.',
        disabled: true
      };
    }
    if (isHoliday && isOffCanceled) {
      return {
        bgClass: 'bg-red-50 border-red-100',
        iconBgClass: 'bg-red-500',
        icon: <CalendarIcon color="white" size={20} />,
        title: 'Weekly Off Cancelled',
        subtitle: 'Weekly off cancelled by Admin. Please punch in.',
        disabled: false
      };
    }
    if (isHoliday) {
      return {
        bgClass: 'bg-orange-50 border-orange-100',
        iconBgClass: 'bg-orange-500',
        icon: <CalendarIcon color="white" size={20} />,
        title: 'Weekly Off',
        subtitle: 'Today is your scheduled holiday.',
        disabled: true
      };
    }
    if (isExtraDuty) {
      return {
        bgClass: 'bg-[#EFF6FF] border-blue-100',
        iconBgClass: 'bg-[#3B82F6]',
        icon: <UserCheck color="white" size={20} />,
        title: 'Extra Duty Assigned',
        subtitle: 'You have extra duty today. Live tracking active.',
        disabled: false
      };
    }
    if (punchOutTime) {
      return {
        bgClass: 'bg-gray-50 border-gray-200',
        iconBgClass: 'bg-gray-400',
        icon: <MapPin color="white" size={20} />,
        title: 'Duty Completed',
        subtitle: 'You have punched out for today.',
        disabled: false
      };
    }
    if (punchInTime) {
      return {
        bgClass: 'bg-[#F0FDF4] border-green-50',
        iconBgClass: 'bg-[#138A43]',
        icon: <MapPin color="white" size={20} />,
        title: 'Punched In (On Duty)',
        subtitle: userRole === 'Field' ? 'Live tracking is active.' : 'Office Location Verified.',
        disabled: false
      };
    }
    if (userRole === 'Field') {
      return {
        bgClass: 'bg-[#EFF6FF] border-blue-100',
        iconBgClass: 'bg-[#3B82F6]',
        icon: <Globe color="white" size={20} />,
        title: 'Punch In to Start Duty',
        subtitle: 'Your location will be acquired.',
        disabled: false
      };
    }
    if (userRole === 'Office' && isNearOffice) {
      return {
        bgClass: 'bg-[#F0FDF4] border-green-50',
        iconBgClass: 'bg-[#138A43]',
        icon: <MapPin color="white" size={20} />,
        title: 'You are in the office',
        subtitle: 'Office Location Verified.',
        disabled: false
      };
    }
    return {
      bgClass: 'bg-[#FEF2F2] border-red-100',
      iconBgClass: 'bg-[#EF4444]',
      icon: <ShieldAlert color="white" size={20} />,
      title: 'Outside Office Area',
      subtitle: 'Move closer to office to Punch In.',
      disabled: true
    };
  };

  const bannerData = getBannerDetails();

  const totalDaysCalculated = (monthlyStats.present + monthlyStats.absent + monthlyStats.leave) || 1;
  const onTimeDays = Math.max(0, monthlyStats.present - monthlyStats.late);
  const presentPct = Math.round((onTimeDays / totalDaysCalculated) * 100);
  const absentPct = Math.round((monthlyStats.absent / totalDaysCalculated) * 100);
  const latePct = Math.round((monthlyStats.late / totalDaysCalculated) * 100);
  const leavePct = Math.round((monthlyStats.leave / totalDaysCalculated) * 100);

  return (
    <ScrollView 
      bounces={false} 
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 100 }}
    >
      <View className="px-4 pt-4 gap-4">
        
        {/* 1. Duty Status Card */}
        <View className="bg-white rounded-[20px] p-4 shadow-sm border border-gray-100">
          <View className="flex-row justify-between items-center mb-4">
            <View className="flex-row items-center gap-3">
              <Text className="text-black text-[16px] font-bold">Duty Status</Text>
              <View className={`flex-row items-center px-2 py-1 rounded-full gap-1 ${
                isOnLeave 
                  ? 'bg-purple-100' 
                  : isCompanyHoliday 
                    ? 'bg-amber-100'
                    : isHoliday && !isOffCanceled 
                      ? 'bg-orange-100'
                      : punchInTime && !punchOutTime 
                        ? 'bg-[#E6F4EA]' 
                        : 'bg-[#FEE2E2]'
              }`}>
                <View className={`w-2 h-2 rounded-full ${
                  isOnLeave 
                    ? 'bg-purple-600' 
                    : isCompanyHoliday 
                      ? 'bg-[#D97706]'
                      : isHoliday && !isOffCanceled 
                        ? 'bg-orange-500'
                        : punchInTime && !punchOutTime 
                          ? 'bg-[#138A43]' 
                          : 'bg-[#EF4444]'
                }`} />
                <Text className={`text-xs font-semibold ${
                  isOnLeave 
                    ? 'text-purple-700' 
                    : isCompanyHoliday 
                      ? 'text-[#D97706]'
                      : isHoliday && !isOffCanceled 
                        ? 'text-orange-600'
                        : punchInTime && !punchOutTime 
                          ? 'text-[#138A43]' 
                          : 'text-[#EF4444]'
                }`}>
                  {isOnLeave 
                    ? 'On Leave' 
                    : isCompanyHoliday 
                      ? 'Holiday'
                      : isHoliday && !isOffCanceled 
                        ? 'Weekly Off'
                        : punchInTime && !punchOutTime 
                          ? 'On Duty' 
                          : 'Not Punched In'}
                </Text>
              </View>
            </View>
            <View className="flex-row items-center gap-1">
              <Text className={`text-xs font-medium ${
                isOnLeave 
                  ? 'text-purple-600' 
                  : isCompanyHoliday 
                    ? 'text-amber-600'
                    : isHoliday && !isOffCanceled 
                      ? 'text-orange-600'
                      : punchInTime && !punchOutTime 
                        ? 'text-[#138A43]' 
                        : 'text-gray-500'
              }`}>
                {isOnLeave 
                  ? 'On Leave' 
                  : isCompanyHoliday 
                    ? 'Public Holiday'
                    : isHoliday && !isOffCanceled 
                      ? 'Weekly Off'
                      : punchInTime && !punchOutTime 
                        ? 'Live Tracking' 
                        : 'Not Tracking'}
              </Text>
              <Signal color={isOnLeave ? "#8B5CF6" : isCompanyHoliday ? "#D97706" : (isHoliday && !isOffCanceled) ? "#F97316" : punchInTime && !punchOutTime ? "#138A43" : "#6B7280"} size={14} strokeWidth={3} />
            </View>
          </View>

          {/* Banner Card */}
          <View className={`rounded-2xl p-4 flex-row justify-between items-center mb-4 border ${bannerData.bgClass}`}>
            <View className="flex-row items-center gap-3">
              <View className={`w-10 h-10 rounded-full items-center justify-center ${bannerData.iconBgClass}`}>
                {bannerData.icon}
              </View>
              <View>
                <Text className="text-black font-bold text-[15px]">{bannerData.title}</Text>
                <Text className="text-gray-500 text-[11px] mt-0.5">{bannerData.subtitle}</Text>
              </View>
            </View>
            {!punchOutTime && (!bannerData.disabled || bannerData.title === 'Outside Office Area') && (
              <TouchableOpacity 
                activeOpacity={0.8}
                onPress={handlePunch}
                disabled={isFetchingLocation || (bannerData.disabled && bannerData.title === 'Outside Office Area')}
                className={`px-3 py-2.5 rounded-xl shadow-sm flex-row items-center gap-1 ${
                  bannerData.disabled 
                    ? 'bg-gray-300 shadow-none' 
                    : punchInTime ? 'bg-red-500' : 'bg-[#138A43]'
                }`}
              >
                {isFetchingLocation ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <>
                    <Text className={`text-sm font-bold ${bannerData.disabled ? 'text-gray-600' : 'text-white'}`}>
                      {bannerData.disabled ? 'Outside Office' : punchInTime ? 'Punch Out' : 'Punch In'}
                    </Text>
                    {!bannerData.disabled && (
                      punchInTime ? (
                        <LogOut color="white" size={16} strokeWidth={2.5} />
                      ) : (
                        <LogIn color="white" size={16} strokeWidth={2.5} />
                      )
                    )}
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>

          {isOnLeave ? (
            <View className="items-center justify-center py-4 bg-purple-50/50 rounded-2xl border border-purple-100 mt-2">
              <Plane color="#8B5CF6" size={24} strokeWidth={2} className="mb-1" />
              <Text className="text-purple-700 text-sm font-bold">You are on Approved Leave today</Text>
              <Text className="text-purple-500 text-[10px] mt-0.5">Punch operations are disabled</Text>
            </View>
          ) : (
            <View className="flex-row justify-between items-center pt-2">
              <View>
                <Text className="text-black font-bold mb-2">Today's Punch</Text>
                <View className="flex-row items-center gap-2">
                  <LogIn color="#138A43" size={20} strokeWidth={2.5} />
                  <View>
                    <Text className="text-gray-500 text-[11px]">Punch In</Text>
                    <Text className="text-black text-xs font-bold">{formatTime(punchInTime)}</Text>
                  </View>
                </View>
              </View>
              
              <View className="h-10 w-[1px] bg-gray-200 mt-6" />

              <View className="mt-6 flex-row items-center gap-2">
                <LogOut color="#EF4444" size={20} strokeWidth={2.5} />
                <View>
                  <Text className="text-gray-500 text-[11px]">Punch Out</Text>
                  <Text className="text-black text-xs font-bold">{formatTime(punchOutTime)}</Text>
                </View>
              </View>

              <View className="h-10 w-[1px] bg-gray-200 mt-6" />

              <View className="mt-6 items-end">
                <Text className="text-gray-500 text-[11px] mb-0.5">Total Hours</Text>
                <Text className="text-black text-sm font-bold">{getWorkingHours()}</Text>
              </View>
            </View>
          )}
        </View>

        {/* 2. Sub Navigation Tabs */}
        <View className="bg-white rounded-2xl p-1 flex-row shadow-sm border border-gray-100">
          <TouchableOpacity 
            onPress={() => setActiveTab('Daily')}
            className={`flex-1 flex-row items-center justify-center py-3 gap-2 ${activeTab === 'Daily' ? 'border-b-2 border-[#208AEF]' : ''}`}
          >
            <CalendarIcon color={activeTab === 'Daily' ? '#208AEF' : '#6B7280'} size={16} strokeWidth={2.5} />
            <Text className={`text-xs font-bold ${activeTab === 'Daily' ? 'text-[#208AEF]' : 'text-gray-500 font-medium'}`}>Daily</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={() => setActiveTab('Monthly')}
            className={`flex-1 flex-row items-center justify-center py-3 gap-2 ${activeTab === 'Monthly' ? 'border-b-2 border-[#208AEF]' : ''}`}
          >
            <PieChart color={activeTab === 'Monthly' ? '#208AEF' : '#6B7280'} size={16} strokeWidth={2} />
            <Text className={`text-xs font-bold ${activeTab === 'Monthly' ? 'text-[#208AEF]' : 'text-gray-500 font-medium'}`}>Overview</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={() => setActiveTab('History')}
            className={`flex-1 flex-row items-center justify-center py-3 gap-2 ${activeTab === 'History' ? 'border-b-2 border-[#208AEF]' : ''}`}
          >
            <History color={activeTab === 'History' ? '#208AEF' : '#6B7280'} size={16} strokeWidth={2} />
            <Text className={`text-xs font-bold ${activeTab === 'History' ? 'text-[#208AEF]' : 'text-gray-500 font-medium'}`}>History</Text>
          </TouchableOpacity>
        </View>

        {/* 3. Conditional Content Based on Active Tab */}
        
        {/* ================= DAILY TAB ================= */}
        {activeTab === 'Daily' && (
          <View className="bg-white rounded-[20px] p-4 shadow-sm border border-gray-100">
            {/* Month Header */}
            <View className="flex-row justify-between items-center mb-6 px-2">
              <TouchableOpacity onPress={prevMonth} className="p-2">
                <ChevronLeft color="#000" size={20} />
              </TouchableOpacity>
              <Text className="text-black text-sm font-bold">{monthNameYear}</Text>
              <TouchableOpacity onPress={nextMonth} className="p-2">
                <ChevronRight color="#000" size={20} />
              </TouchableOpacity>
            </View>

            {/* Calendar Grid */}
            <View className="w-full">
              <View className="flex-row flex-wrap w-full mb-2">
                {weekDays.map((d, index) => (
                  <Text key={index} style={{ width: '14.28%' }} className="text-center text-[11px] text-gray-500 font-bold">
                    {d}
                  </Text>
                ))}
              </View>

              <View className="flex-row flex-wrap w-full">
                {emptyDays.map((_, index) => (
                  <View key={`empty-${index}`} style={{ width: '14.28%' }} className="h-10" />
                ))}
                
                {monthDays.map((dayNum) => {
                  const yr = viewMonthDate.getFullYear();
                  const mo = String(viewMonthDate.getMonth() + 1).padStart(2, '0');
                  const dy = String(dayNum).padStart(2, '0');
                  const dateStr = `${yr}-${mo}-${dy}`;
                  const isToday = (dayNum === currentDate.getDate() && viewMonthDate.getMonth() === currentDate.getMonth() && viewMonthDate.getFullYear() === currentDate.getFullYear());
                  
                  // Match with real history data
                  const matchedRecord = historyData.find(h => h.rawDate === dateStr);
                  
                  let content = null;
                  if (matchedRecord) {
                    if (matchedRecord.status === 'Present') {
                      content = <Check color="#10B981" size={12} strokeWidth={4} className="mt-0.5" />;
                    } else if (matchedRecord.status === 'Late') {
                      content = <View className="w-1.5 h-1.5 bg-[#FFD100] rounded-full mt-1" />;
                    } else if (matchedRecord.status === 'Absent') {
                      content = <Text className="text-red-500 font-bold text-[10px] mt-0.5">A</Text>;
                    } else if (matchedRecord.status === 'Leave' || matchedRecord.status === 'On Leave') {
                      content = <Text className="text-blue-500 font-bold text-[10px] mt-0.5">L</Text>;
                    } else if (matchedRecord.status === 'Weekly Off') {
                      content = <Text className="text-gray-400 font-bold text-[9px] mt-0.5">W</Text>;
                    }
                  } else if (isToday) {
                    if (punchInTime) {
                      content = <Check color="#10B981" size={12} strokeWidth={4} className="mt-0.5" />;
                    } else {
                      content = <View className="w-1.5 h-1.5 bg-[#EF4444] rounded-full mt-1" />;
                    }
                  }

                  return (
                    <View key={`day-${dayNum}`} style={{ width: '14.28%' }} className="items-center py-1.5 mb-1">
                      <View className={`w-8 h-8 rounded-full items-center justify-center ${isToday ? 'bg-[#208AEF] shadow-sm' : ''}`}>
                        <Text className={`text-[12px] ${isToday ? 'text-white font-bold' : 'text-black font-medium'}`}>
                          {dayNum}
                        </Text>
                        {content}
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>

            <View className="flex-row flex-wrap justify-center items-center gap-4 mt-4">
              <View className="flex-row items-center gap-1">
                <Check color="#10B981" size={12} strokeWidth={4} />
                <Text className="text-gray-600 text-[10px] font-medium">Present</Text>
              </View>
              <View className="flex-row items-center gap-1">
                <Text className="text-red-500 text-[10px] font-bold">A</Text>
                <Text className="text-gray-600 text-[10px] font-medium">Absent</Text>
              </View>
              <View className="flex-row items-center gap-1">
                <View className="w-1.5 h-1.5 bg-[#FFD100] rounded-full" />
                <Text className="text-gray-600 text-[10px] font-medium">Half Day / Late</Text>
              </View>
              <View className="flex-row items-center gap-1">
                <Text className="text-blue-500 text-[10px] font-bold">L</Text>
                <Text className="text-gray-600 text-[10px] font-medium">Leave</Text>
              </View>
              <View className="flex-row items-center gap-1">
                <Text className="text-gray-400 text-[10px] font-bold">W</Text>
                <Text className="text-gray-600 text-[10px] font-medium">Weekly Off</Text>
              </View>
            </View>

            <View className="h-[1px] bg-gray-100 my-5" />

            <Text className="text-black text-sm font-bold mb-4">Today's Attendance Details</Text>
            
            <View className="gap-5 mb-2">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-3 flex-1 pr-2">
                  <View className="w-8 items-center justify-center">
                    <MapPin color="#9CA3AF" size={20} strokeWidth={2} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-gray-500 text-[11px]">Punch In Location</Text>
                    <Text className="text-black text-xs font-medium mt-0.5 leading-snug">
                      {locationAddress}
                    </Text>
                  </View>
                </View>
                {punchInTime && (
                  <View className="bg-[#E6F4EA] flex-row items-center px-2 py-1 rounded gap-1">
                    <BadgeCheck color="#138A43" size={12} />
                    <Text className="text-[#138A43] text-[10px] font-bold">Verified</Text>
                  </View>
                )}
              </View>

              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-3">
                  <View className="w-8 items-center justify-center">
                    <Clock color="#9CA3AF" size={20} strokeWidth={2} />
                  </View>
                  <View>
                    <Text className="text-gray-500 text-[11px]">Punch In Time</Text>
                    <Text className="text-black text-xs font-medium mt-0.5">{formatTime(punchInTime)}</Text>
                  </View>
                </View>
                <View className={`px-2 py-1 rounded ${punchInTime ? 'bg-[#E6F4EA]' : 'bg-gray-100'}`}>
                  <Text className={`text-[10px] font-bold ${punchInTime ? 'text-[#138A43]' : 'text-gray-500'}`}>
                     {punchInTime ? 'Recorded' : 'Pending'}
                  </Text>
                </View>
              </View>

              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-3">
                  <View className="w-8 items-center justify-center">
                    <Clock color="#9CA3AF" size={20} strokeWidth={2} />
                  </View>
                  <View>
                    <Text className="text-gray-500 text-[11px]">Punch Out Time</Text>
                    <Text className="text-gray-400 text-xs font-medium mt-0.5">{formatTime(punchOutTime)}</Text>
                  </View>
                </View>
                <View className={`px-2 py-1 rounded ${punchOutTime ? 'bg-[#E6F4EA]' : 'bg-gray-100'}`}>
                  <Text className={`text-[10px] font-bold ${punchOutTime ? 'text-[#138A43]' : 'text-gray-500'}`}>
                     {punchOutTime ? 'Recorded' : 'Pending'}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* ================= MONTHLY OVERVIEW TAB ================= */}
        {activeTab === 'Monthly' && (
          <View className="bg-white rounded-[20px] p-4 shadow-sm border border-gray-100">
            <View className="flex-row justify-between items-center mb-6">
              <TouchableOpacity onPress={prevMonth} className="p-2">
                <ChevronLeft color="#000" size={20} />
              </TouchableOpacity>
              <Text className="text-black text-[16px] font-bold">{monthNameYear} Overview</Text>
              <TouchableOpacity onPress={nextMonth} className="p-2">
                <ChevronRight color="#000" size={20} />
              </TouchableOpacity>
            </View>

            {/* Quick Stats connected to Real Data */}
            <View className="flex-row flex-wrap justify-between gap-y-3 mb-6">
              <View className="w-[48%] bg-[#E6F4EA] rounded-xl p-3 items-center">
                <Text className="text-[#138A43] text-2xl font-black mb-1">{monthlyStats.present}</Text>
                <Text className="text-gray-600 text-[11px] font-medium">Days Present</Text>
              </View>
              <View className="w-[48%] bg-[#FEE2E2] rounded-xl p-3 items-center">
                <Text className="text-[#EF4444] text-2xl font-black mb-1">{monthlyStats.absent}</Text>
                <Text className="text-gray-600 text-[11px] font-medium">Days Absent</Text>
              </View>
              <View className="w-[48%] bg-[#FEF3C7] rounded-xl p-3 items-center">
                <Text className="text-[#D97706] text-2xl font-black mb-1">{monthlyStats.late}</Text>
                <Text className="text-gray-600 text-[11px] font-medium">Half Day / Late</Text>
              </View>
              <View className="w-[48%] bg-[#EFF6FF] rounded-xl p-3 items-center">
                <Text className="text-[#208AEF] text-2xl font-black mb-1">{monthlyStats.leave}</Text>
                <Text className="text-gray-600 text-[11px] font-medium">On Leave</Text>
              </View>
            </View>

            {/* Progress Bar Chart visualization */}
            <Text className="text-black text-sm font-bold mb-3">Attendance Breakdown</Text>
            <View className="w-full h-4 rounded-full flex-row overflow-hidden mb-2 bg-gray-100">
              <View className="h-full bg-[#10B981]" style={{ width: `${presentPct}%` }} />
              <View className="h-full bg-[#EF4444]" style={{ width: `${absentPct}%` }} />
              <View className="h-full bg-[#F59E0B]" style={{ width: `${latePct}%` }} />
              <View className="h-full bg-[#3B82F6]" style={{ width: `${leavePct}%` }} />
            </View>
            
            <View className="flex-row flex-wrap justify-between gap-y-2 px-1">
              <View className="flex-row items-center gap-1.5 w-[48%]">
                <View className="w-2 h-2 rounded-full bg-[#10B981]" />
                <Text className="text-gray-600 text-[10px]">On Time ({presentPct}%)</Text>
              </View>
              <View className="flex-row items-center gap-1.5 w-[48%]">
                <View className="w-2 h-2 rounded-full bg-[#EF4444]" />
                <Text className="text-gray-600 text-[10px]">Absent ({absentPct}%)</Text>
              </View>
              <View className="flex-row items-center gap-1.5 w-[48%]">
                <View className="w-2 h-2 rounded-full bg-[#F59E0B]" />
                <Text className="text-gray-600 text-[10px]">Late/Half ({latePct}%)</Text>
              </View>
              <View className="flex-row items-center gap-1.5 w-[48%]">
                <View className="w-2 h-2 rounded-full bg-[#3B82F6]" />
                <Text className="text-gray-600 text-[10px]">Leave ({leavePct}%)</Text>
              </View>
            </View>
            
            <View className="h-[1px] bg-gray-100 my-5" />

            {/* Other Insights */}
            <View className="flex-row justify-between items-center mb-3">
              <View className="flex-row items-center gap-2">
                <TrendingUp color="#6B7280" size={16} />
                <Text className="text-gray-700 text-xs font-semibold">Total Logged Hours</Text>
              </View>
              <Text className="text-black font-bold">{monthlyStats.totalHours} hrs</Text>
            </View>
            
            <View className="flex-row justify-between items-center">
              <View className="flex-row items-center gap-2">
                <CalendarX2 color="#6B7280" size={16} />
                <Text className="text-gray-700 text-xs font-semibold">Deduction Days</Text>
              </View>
              <Text className="text-red-500 font-bold">{monthlyStats.absent + (monthlyStats.late * 0.5)} Days</Text>
            </View>
          </View>
        )}

        {/* ================= HISTORY TAB (7 Days Per Page Pagination) ================= */}
        {activeTab === 'History' && (
          <View className="bg-transparent">
            <View className="flex-row justify-between items-center mb-4 px-1">
              <Text className="text-black text-[16px] font-bold">Attendance History</Text>
              <Text className="text-gray-500 text-xs font-semibold">
                Page {historyPage} of {totalHistoryPages} ({historyData.length} records)
              </Text>
            </View>

            {historyData.length === 0 ? (
              <View className="bg-white rounded-[20px] p-8 items-center justify-center border border-gray-100">
                <AlertCircle color="#9CA3AF" size={32} className="mb-2" />
                <Text className="text-gray-500 text-sm font-medium">No attendance records found.</Text>
              </View>
            ) : (
              paginatedHistory.map((item, index) => {
                let statusBg = 'bg-[#E6F4EA]';
                let statusText = 'text-[#138A43]';
                if (item.status === 'Absent') {
                  statusBg = 'bg-[#FEE2E2]';
                  statusText = 'text-[#EF4444]';
                } else if (item.status === 'Late') {
                  statusBg = 'bg-[#FEF3C7]';
                  statusText = 'text-[#D97706]';
                } else if (item.status === 'Leave' || item.status === 'On Leave') {
                  statusBg = 'bg-[#EFF6FF]';
                  statusText = 'text-[#208AEF]';
                }

                return (
                  <View key={item.id || index} className="bg-white rounded-[20px] p-4 shadow-sm border border-gray-100 mb-3">
                    <View className="flex-row justify-between items-center mb-3">
                      <View>
                        <Text className="text-black font-bold text-sm">{item.date}</Text>
                        <Text className="text-gray-500 text-[10px]">{item.day}</Text>
                      </View>
                      <View className={`${statusBg} px-3 py-1 rounded-full`}>
                        <Text className={`${statusText} text-[10px] font-bold`}>{item.status}</Text>
                      </View>
                    </View>
                    
                    <View className="bg-[#F8FAFC] rounded-xl p-3 flex-row justify-between items-center border border-gray-100">
                      <View>
                        <Text className="text-gray-500 text-[10px] mb-1">Punch In</Text>
                        <Text className="text-black text-xs font-semibold">{item.in}</Text>
                      </View>
                      <View className="w-[1px] h-8 bg-gray-200" />
                      <View>
                        <Text className="text-gray-500 text-[10px] mb-1">Punch Out</Text>
                        <Text className="text-black text-xs font-semibold">{item.out}</Text>
                      </View>
                      <View className="w-[1px] h-8 bg-gray-200" />
                      <View>
                        <Text className="text-gray-500 text-[10px] mb-1">Total</Text>
                        <Text className="text-black text-xs font-bold">{item.total}</Text>
                      </View>
                    </View>
                  </View>
                );
              })
            )}

            {/* Pagination Controls (7 Days Per Page) */}
            {totalHistoryPages > 1 && (
              <View className="flex-row justify-between items-center bg-white p-3 rounded-2xl border border-gray-100 my-3 shadow-sm">
                <TouchableOpacity
                  disabled={historyPage === 1}
                  onPress={() => setHistoryPage(prev => Math.max(1, prev - 1))}
                  className={`px-3 py-2 rounded-xl flex-row items-center gap-1 ${historyPage === 1 ? 'bg-gray-100 opacity-50' : 'bg-blue-50 border border-blue-100'}`}
                >
                  <ChevronLeft color={historyPage === 1 ? '#9CA3AF' : '#2563EB'} size={16} />
                  <Text className={`text-xs font-bold ${historyPage === 1 ? 'text-gray-400' : 'text-blue-600'}`}>Previous</Text>
                </TouchableOpacity>

                <View className="flex-row gap-1 items-center">
                  {Array.from({ length: totalHistoryPages }, (_, i) => i + 1).map((pageNum) => (
                    <TouchableOpacity
                      key={pageNum}
                      onPress={() => setHistoryPage(pageNum)}
                      className={`w-7 h-7 rounded-lg items-center justify-center ${historyPage === pageNum ? 'bg-[#208AEF]' : 'bg-gray-50'}`}
                    >
                      <Text className={`text-xs font-bold ${historyPage === pageNum ? 'text-white' : 'text-gray-700'}`}>
                        {pageNum}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TouchableOpacity
                  disabled={historyPage === totalHistoryPages}
                  onPress={() => setHistoryPage(prev => Math.min(totalHistoryPages, prev + 1))}
                  className={`px-3 py-2 rounded-xl flex-row items-center gap-1 ${historyPage === totalHistoryPages ? 'bg-gray-100 opacity-50' : 'bg-blue-50 border border-blue-100'}`}
                >
                  <Text className={`text-xs font-bold ${historyPage === totalHistoryPages ? 'text-gray-400' : 'text-blue-600'}`}>Next</Text>
                  <ChevronRight color={historyPage === totalHistoryPages ? '#9CA3AF' : '#2563EB'} size={16} />
                </TouchableOpacity>
              </View>
            )}

          </View>
        )}

        {/* 4. Info Message */}
        {activeTab === 'Daily' && (
          <View className="bg-[#F0F7FF] border border-[#D1E5FF] rounded-[16px] p-3 flex-row items-start gap-3 mb-4">
            <Info color="#208AEF" size={20} strokeWidth={2} className="mt-0.5" />
            <Text className="text-[#3B82F6] text-[11px] flex-1 leading-snug font-medium">
              Please make sure to Punch In/Out from your verified location for accurate attendance.
            </Text>
          </View>
        )}

      </View>
    </ScrollView>
  );
}