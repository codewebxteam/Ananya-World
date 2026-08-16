// app/index.tsx
import React, { useState, useEffect } from 'react';
import { 
  View, Text, ScrollView, TouchableOpacity, Alert, 
  Modal, TextInput, ActivityIndicator 
} from 'react-native';
import { 
  MapPin, LogIn, LogOut, 
  CalendarCheck2, CalendarX2, Clock, Plane,
  ChevronDown, IndianRupee, Calendar, Zap, Users,
  Signal, ShieldAlert, Globe, MessageSquare, Settings,
  X, Edit2, CheckCircle2, AlertCircle, Phone, User,
  UserCheck
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { db } from '../config/firebase';
import { 
  doc, getDoc, setDoc, updateDoc, collection, 
  query, where, onSnapshot, addDoc 
} from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';

// Module-level global memory cache to guarantee zero reload/skeleton when navigating between tabs
let globalHomeCache: {
  isLoaded: boolean;
  userData: any;
  monthlyAttendance: { present: number; absent: number; late: number; leave: number };
  salaryData: { expectedSalary: number; daysLate: number; leaveTaken: number; formattedSalaryDate: string; baseSalary: number };
  messageCount: number;
  leaveList: any[];
  rawAttendance: any[];
  punchInTime: Date | null;
  punchOutTime: Date | null;
  isHoliday: boolean;
  isOnLeave: boolean;
  isOffCanceled: boolean;
  isExtraDuty: boolean;
  isCompanyHoliday: boolean;
  holidayData: { name: string; wishMessage: string } | null;
} = {
  isLoaded: false,
  userData: null,
  monthlyAttendance: { present: 0, absent: 0, late: 0, leave: 0 },
  salaryData: { expectedSalary: 0, daysLate: 0, leaveTaken: 0, formattedSalaryDate: 'Not Set', baseSalary: 0 },
  messageCount: 0,
  leaveList: [],
  rawAttendance: [],
  punchInTime: null,
  punchOutTime: null,
  isHoliday: false,
  isOnLeave: false,
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
      console.log(`Successfully auto-punched out attendance doc: ${docId}`);
    } catch (error) {
      console.error(`Error auto-punching out attendance doc: ${docId}`, error);
    }
  }
};

export default function HomeScreen() {
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Initialize state directly from global in-memory cache if available!
  const [userData, setUserData] = useState<any>(globalHomeCache.userData);
  const [punchInTime, setPunchInTime] = useState<Date | null>(globalHomeCache.punchInTime);
  const [punchOutTime, setPunchOutTime] = useState<Date | null>(globalHomeCache.punchOutTime);
  const [monthlyAttendance, setMonthlyAttendance] = useState(globalHomeCache.monthlyAttendance);
  const [salaryData, setSalaryData] = useState<any>(globalHomeCache.salaryData);
  const [messageCount, setMessageCount] = useState<number>(globalHomeCache.messageCount);
  const [leaveList, setLeaveList] = useState<any[]>(globalHomeCache.leaveList);
  const [rawAttendance, setRawAttendance] = useState<any[]>(globalHomeCache.rawAttendance);
  const [isAttLoaded, setIsAttLoaded] = useState(globalHomeCache.isLoaded);
  const [isLeavesLoaded, setIsLeavesLoaded] = useState(globalHomeCache.isLoaded);

  // Skeleton / Initial Load state - if globalHomeCache.isLoaded is true, initialize as FALSE so skeleton NEVER shows when switching tabs!
  const [isInitialLoading, setIsInitialLoading] = useState(!globalHomeCache.isLoaded);
  
  // Leave Request Modal & Form States
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [editingLeaveId, setEditingLeaveId] = useState<string | null>(null);
  
  const [leaveType, setLeaveType] = useState<'Single Day' | 'Multi-Day'>('Single Day');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [leaveReason, setLeaveReason] = useState('');
  const [isSubmittingLeave, setIsSubmittingLeave] = useState(false);

  // Role simulation states
  const [userRole, setUserRole] = useState<'Office' | 'Field'>('Office');
  const [isNearOffice, setIsNearOffice] = useState(true);
  const [isHoliday, setIsHoliday] = useState(globalHomeCache.isHoliday);
  const [isOnLeave, setIsOnLeave] = useState(globalHomeCache.isOnLeave);
  const [isOffCanceled, setIsOffCanceled] = useState(globalHomeCache.isOffCanceled);
  const [isExtraDuty, setIsExtraDuty] = useState(globalHomeCache.isExtraDuty);
  const [isCompanyHoliday, setIsCompanyHoliday] = useState(globalHomeCache.isCompanyHoliday);
  const [holidayData, setHolidayData] = useState<{ name: string; wishMessage: string } | null>(globalHomeCache.holidayData);

  useEffect(() => {
    let unsubAtt: any;
    let unsubComm: any;
    let unsubLeaves: any;
    let unsubOffCancel: any;
    let unsubActiveLeave: any;
    let unsubExtraDuties: any;
    let unsubCompanyHoliday: any;
    let unsubUser: any;

    const initData = async () => {
      try {
        const storedUser = await AsyncStorage.getItem('userData');
        if (storedUser) {
          const parsed = JSON.parse(storedUser);
          setUserData(parsed);
          globalHomeCache.userData = parsed;
          setUserRole((parsed.staffType || parsed.department || 'Office').includes('Field') ? 'Field' : 'Office');

          const todayStr = new Date().toISOString().split('T')[0];

          // Immediately restore cached today's punch state to avoid any delay/flicker
          const cachedIn = await AsyncStorage.getItem(`punchIn_${todayStr}`);
          const cachedOut = await AsyncStorage.getItem(`punchOut_${todayStr}`);
          if (cachedIn) {
            const pin = new Date(cachedIn);
            setPunchInTime(pin);
            globalHomeCache.punchInTime = pin;
          } else {
            setPunchInTime(null);
            globalHomeCache.punchInTime = null;
          }
          if (cachedOut) {
            const pout = new Date(cachedOut);
            setPunchOutTime(pout);
            globalHomeCache.punchOutTime = pout;
          } else {
            setPunchOutTime(null);
            globalHomeCache.punchOutTime = null;
          }

          // Realtime listener for User Profile updates
          const userDocRef = doc(db, 'users', parsed.uid);
          unsubUser = onSnapshot(userDocRef, async (snap) => {
            if (snap.exists()) {
              const freshUserData = snap.data();
              setUserData(freshUserData);
              globalHomeCache.userData = freshUserData;
              setUserRole((freshUserData.staffType || freshUserData.department || 'Office').includes('Field') ? 'Field' : 'Office');
              await AsyncStorage.setItem('userData', JSON.stringify(freshUserData));
            }
          });
          
          const currentYearMonth = new Date().toISOString().slice(0, 7); // "YYYY-MM"
          const today = new Date().toISOString().split('T')[0];

          // Fetch fresh staff doc from Admin panel's Firestore staff collection
          let salaryAmount = Number(parsed.salaryAmount || parsed.baseSalary || parsed.salary || 0);
          let rawNextSalaryDate = parsed.nextSalaryDate || null;

          try {
            const staffDocRef = doc(db, 'staff', parsed.empId);
            const staffSnap = await getDoc(staffDocRef);
            if (staffSnap.exists()) {
              const sData = staffSnap.data();
              if (sData.salaryAmount) salaryAmount = Number(sData.salaryAmount);
              if (sData.nextSalaryDate) rawNextSalaryDate = sData.nextSalaryDate;
            }
          } catch (err) {
            console.log("Error fetching staff doc", err);
          }

          let formattedSalaryDate = 'Not Set';
          if (rawNextSalaryDate) {
            try {
              const d = new Date(rawNextSalaryDate);
              if (!isNaN(d.getTime())) {
                formattedSalaryDate = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
              } else {
                formattedSalaryDate = String(rawNextSalaryDate);
              }
            } catch {
              formattedSalaryDate = String(rawNextSalaryDate);
            }
          }

          // 1. Fetch Today's Attendance
          const attendanceId = `${parsed.empId}_${today}`;
          const attRef = doc(db, 'attendance', attendanceId);
          const attSnap = await getDoc(attRef);

          if (attSnap.exists()) {
            const attData = attSnap.data();
            if (attData.punchIn) {
              const pIn = new Date(attData.punchIn);
              setPunchInTime(pIn);
              globalHomeCache.punchInTime = pIn;
              await AsyncStorage.setItem(`punchIn_${today}`, attData.punchIn);
            } else {
              setPunchInTime(null);
              globalHomeCache.punchInTime = null;
              await AsyncStorage.removeItem(`punchIn_${today}`);
            }
            if (attData.punchOut) {
              const pOut = new Date(attData.punchOut);
              setPunchOutTime(pOut);
              globalHomeCache.punchOutTime = pOut;
              await AsyncStorage.setItem(`punchOut_${today}`, attData.punchOut);
            } else {
              setPunchOutTime(null);
              globalHomeCache.punchOutTime = null;
              await AsyncStorage.removeItem(`punchOut_${today}`);
            }
          } else {
            setPunchInTime(null);
            setPunchOutTime(null);
            globalHomeCache.punchInTime = null;
            globalHomeCache.punchOutTime = null;
            await AsyncStorage.removeItem(`punchIn_${today}`);
            await AsyncStorage.removeItem(`punchOut_${today}`);
          }

          // 2. Realtime listener for Attendance Overview & Salary calculations
          const qAtt = query(collection(db, 'attendance'), where('staffId', '==', parsed.empId));
          unsubAtt = onSnapshot(qAtt, (snapshot) => {
            const list: any[] = [];
            snapshot.forEach(docSnap => {
              const data = docSnap.data();

              // Auto-punch out check
              if (data.punchIn && !data.punchOut) {
                const currentShiftEndTime = globalHomeCache.userData?.shiftEndTime || parsed.shiftEndTime || '18:00';
                checkAndAutoPunchOut(docSnap.id, data, currentShiftEndTime);
              }

              list.push({ id: docSnap.id, ...data });
            });
            setRawAttendance(list);
            globalHomeCache.rawAttendance = list;
            setIsAttLoaded(true);
          });

          // 3. Realtime listener for Messages (Filtered by lastReadChatTime)
          const qComm = query(collection(db, 'communications'));
          unsubComm = onSnapshot(qComm, async (snapshot) => {
            const lastReadStr = await AsyncStorage.getItem('lastReadChatTime');
            const lastReadTime = lastReadStr ? new Date(lastReadStr).getTime() : 0;
            let unread = 0;
            snapshot.forEach(docSnap => {
              const data = docSnap.data();
              const msgTime = data.createdAt ? (typeof data.createdAt === 'string' ? new Date(data.createdAt).getTime() : (data.createdAt.seconds ? data.createdAt.seconds * 1000 : Date.now())) : Date.now();
              if (msgTime > lastReadTime) {
                unread++;
              }
            });
            setMessageCount(unread);
            globalHomeCache.messageCount = unread;
          });

          // 4. Realtime listener for Staff Leave Requests
          const qLeaves = query(collection(db, 'leaves'), where('staffId', '==', parsed.empId));
          unsubLeaves = onSnapshot(qLeaves, (snapshot) => {
            const leaves: any[] = [];
            snapshot.forEach(docSnap => {
              leaves.push({ id: docSnap.id, ...docSnap.data() });
            });
            leaves.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
            setLeaveList(leaves);
            globalHomeCache.leaveList = leaves;
            setIsLeavesLoaded(true);
          });

          // 5. Determine default Weekly Off day
          const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
          const todayDayName = daysOfWeek[new Date().getDay()];
          const defaultWeeklyOff = parsed.weeklyOff || 'Sunday';
          const isTodayDefaultOff = todayDayName === defaultWeeklyOff;
          setIsHoliday(isTodayDefaultOff);
          globalHomeCache.isHoliday = isTodayDefaultOff;

          // 6. Listener for Weekly Off Cancellation for Today
          const qOffCancellations = query(
            collection(db, 'weekly_off_cancellations'),
            where('staffId', '==', parsed.empId),
            where('date', '==', today)
          );
          unsubOffCancel = onSnapshot(qOffCancellations, (snapshot) => {
            const hasCancel = !snapshot.empty;
            setIsOffCanceled(hasCancel);
            globalHomeCache.isOffCanceled = hasCancel;
          });

          // 7. Listener for Approved Leaves Today
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
            globalHomeCache.isOnLeave = activeLeaveFound;
          });

          // 8. Listener for Extra Duties Today
          const qExtraDuties = query(
            collection(db, 'extra_duties'),
            where('staffId', '==', parsed.empId),
            where('date', '==', today),
            where('status', '==', 'Active')
          );
          unsubExtraDuties = onSnapshot(qExtraDuties, (snapshot) => {
            const hasExtra = !snapshot.empty;
            setIsExtraDuty(hasExtra);
            globalHomeCache.isExtraDuty = hasExtra;
          });

          // 9. Listener for Company Holidays Today
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
              globalHomeCache.isCompanyHoliday = true;
              globalHomeCache.holidayData = hData;
            } else {
              setIsCompanyHoliday(false);
              setHolidayData(null);
              globalHomeCache.isCompanyHoliday = false;
              globalHomeCache.holidayData = null;
            }
          });
        }
      } catch (error) {
        console.error("Error initializing home screen data", error);
      } finally {
        setIsInitialLoading(false);
      }
    };

    initData();

    const timer = setInterval(() => {
      setCurrentDate(new Date());
    }, 60000);

    return () => {
      clearInterval(timer);
      if (unsubAtt) unsubAtt();
      if (unsubComm) unsubComm();
      if (unsubLeaves) unsubLeaves();
      if (unsubOffCancel) unsubOffCancel();
      if (unsubActiveLeave) unsubActiveLeave();
      if (unsubExtraDuties) unsubExtraDuties();
      if (unsubCompanyHoliday) unsubCompanyHoliday();
      if (unsubUser) unsubUser();
    };
  }, []);

  useEffect(() => {
    if (!userData || !isAttLoaded || !isLeavesLoaded) return;
    
    const localToday = new Date();
    const yr = localToday.getFullYear();
    const mo = String(localToday.getMonth() + 1).padStart(2, '0');
    const currentYearMonth = `${yr}-${mo}`;
    
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

    const attObj = { present: pres, absent: abs, late: lat, leave: lev };
    setMonthlyAttendance(attObj);
    globalHomeCache.monthlyAttendance = attObj;

    // Calculate Salary details
    const salaryAmount = Number(userData.salaryAmount || userData.baseSalary || userData.salary || 0);
    const perDay = salaryAmount > 0 ? (salaryAmount / 30) : 0;
    const deductionDays = abs + (lat * 0.5);
    const expected = salaryAmount > 0 ? Math.max(0, Math.round(salaryAmount - (deductionDays * perDay))) : 0;

    // Next salary date formatting
    let rawNextSalaryDate = userData.nextSalaryDate || null;
    let formattedSalaryDate = 'Not Set';
    if (rawNextSalaryDate) {
      try {
        const d = new Date(rawNextSalaryDate);
        if (!isNaN(d.getTime())) {
          formattedSalaryDate = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
        } else {
          formattedSalaryDate = String(rawNextSalaryDate);
        }
      } catch {
        formattedSalaryDate = String(rawNextSalaryDate);
      }
    }

    const salObj = {
      expectedSalary: expected,
      daysLate: lat,
      leaveTaken: lev,
      formattedSalaryDate,
      baseSalary: salaryAmount
    };
    setSalaryData(salObj);
    globalHomeCache.salaryData = salObj;
    globalHomeCache.isLoaded = true;

  }, [rawAttendance, leaveList, userData, isAttLoaded, isLeavesLoaded]);

  useEffect(() => {
    if (isAttLoaded && isLeavesLoaded) {
      setIsInitialLoading(false);
    }
  }, [isAttLoaded, isLeavesLoaded]);

  const handlePunch = async () => {
    if (!userData) return;

    const today = new Date().toISOString().split('T')[0];
    const attendanceId = `${userData.empId}_${today}`;
    const attRef = doc(db, 'attendance', attendanceId);

    if (!punchInTime) {
      if (userRole === 'Office' && !isNearOffice) {
        Alert.alert("Punch In Failed", "You must be inside the office area to punch in.");
        return;
      }

      let locationAddress = 'Unknown Location';
      let coords: { latitude: number; longitude: number } | null = null;
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          let location = await Location.getCurrentPositionAsync({});
          coords = { latitude: location.coords.latitude, longitude: location.coords.longitude };
          let geocode = await Location.reverseGeocodeAsync({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude
          });
          if (geocode.length > 0) {
            const addr = geocode[0];
            locationAddress = [addr.name, addr.street, addr.city, addr.region].filter(Boolean).join(', ');
          }
        }
      } catch (error) {
        console.log("Location error", error);
      }

      const now = new Date();
      setPunchInTime(now);
      globalHomeCache.punchInTime = now;
      await AsyncStorage.setItem(`punchIn_${today}`, now.toISOString());

      try {
        await setDoc(attRef, {
          staffId: userData.empId,
          name: userData.name,
          dept: userData.staffType || userData.department || 'General',
          avatar: userData.avatar || null,
          date: today,
          punchIn: now.toISOString(),
          locationIn: locationAddress,
          latitudeIn: coords ? coords.latitude : null,
          longitudeIn: coords ? coords.longitude : null,
          status: 'Present'
        });
        Alert.alert("Success", `Punch In successful at ${locationAddress}!`);
      } catch (error: any) {
        Alert.alert("Error", error.message);
      }

    } else if (!punchOutTime) {
      const now = new Date();
      setPunchOutTime(now);
      globalHomeCache.punchOutTime = now;
      await AsyncStorage.setItem(`punchOut_${today}`, now.toISOString());

      let locationAddress = 'Unknown Location';
      let coords: { latitude: number; longitude: number } | null = null;
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          let location = await Location.getCurrentPositionAsync({});
          coords = { latitude: location.coords.latitude, longitude: location.coords.longitude };
          let geocode = await Location.reverseGeocodeAsync({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude
          });
          if (geocode.length > 0) {
            const addr = geocode[0];
            locationAddress = [addr.name, addr.street, addr.city, addr.region].filter(Boolean).join(', ');
          }
        }
      } catch (error) {
        console.log("Location error", error);
      }

      const diffMs = now.getTime() - punchInTime.getTime();
      const hoursStr = `${Math.floor(diffMs / 3600000)}h ${Math.floor((diffMs % 3600000) / 60000)}m`;

      try {
        await updateDoc(attRef, {
          punchOut: now.toISOString(),
          locationOut: locationAddress,
          latitudeOut: coords ? coords.latitude : null,
          longitudeOut: coords ? coords.longitude : null,
          hours: hoursStr
        });
        Alert.alert("Success", "Punch Out successful!");
      } catch (error: any) {
        Alert.alert("Error", error.message);
      }
    }
  };

  const handleSubmitLeave = async () => {
    if (!leaveReason.trim()) {
      Alert.alert("Validation", "Please enter a reason for your leave request.");
      return;
    }
    if (!userData) return;

    setIsSubmittingLeave(true);
    try {
      if (editingLeaveId) {
        const leaveRef = doc(db, 'leaves', editingLeaveId);
        await updateDoc(leaveRef, {
          startDate,
          endDate: leaveType === 'Single Day' ? startDate : endDate,
          leaveType,
          reason: leaveReason,
          updatedAt: new Date().toISOString()
        });
        Alert.alert("Success", "Leave request updated successfully!");
      } else {
        await addDoc(collection(db, 'leaves'), {
          staffId: userData.empId,
          name: userData.name,
          phone: userData.phone || userData.mobile || userData.contact || '+91 98765 43210',
          startDate,
          endDate: leaveType === 'Single Day' ? startDate : endDate,
          leaveType,
          reason: leaveReason,
          status: 'Pending',
          createdAt: new Date().toISOString()
        });
        Alert.alert("Success", "Leave request submitted successfully!");
      }

      setLeaveReason('');
      setEditingLeaveId(null);
      setShowLeaveModal(false);
    } catch (error: any) {
      Alert.alert("Error", error.message);
    } finally {
      setIsSubmittingLeave(false);
    }
  };

  const handleEditLeave = (leave: any) => {
    if (leave.status !== 'Pending') {
      Alert.alert("Not Editable", "This leave request has already been processed.");
      return;
    }
    setEditingLeaveId(leave.id);
    setLeaveType(leave.leaveType || 'Single Day');
    setStartDate(leave.startDate || new Date().toISOString().split('T')[0]);
    setEndDate(leave.endDate || new Date().toISOString().split('T')[0]);
    setLeaveReason(leave.reason || '');
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

  const nextSalaryDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 10);
  if (currentDate.getDate() > 10) {
    nextSalaryDate.setMonth(nextSalaryDate.getMonth() + 1);
  }
  const formattedSalaryDate = nextSalaryDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  const getBannerDetails = () => {
    if (isCompanyHoliday && holidayData) {
      return {
        bgClass: 'bg-[#FEF3C7] border-[#FDE68A]', // festive gold
        iconBgClass: 'bg-[#F59E0B]',
        icon: <Calendar color="white" size={20} />,
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
        icon: <Calendar color="white" size={20} />,
        title: 'Weekly Off Cancelled',
        subtitle: 'Weekly off cancelled by Admin. Please punch in.',
        disabled: false
      };
    }
    if (isHoliday) {
      return {
        bgClass: 'bg-orange-50 border-orange-100',
        iconBgClass: 'bg-orange-500',
        icon: <Calendar color="white" size={20} />,
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

  // Skeleton Loader for smooth first-time loading
  if (isInitialLoading) {
    return (
      <View className="px-4 pt-4 gap-4">
        <View className="bg-gray-200 rounded-[20px] h-48 w-full animate-pulse" />
        <View className="bg-gray-200 rounded-[20px] h-36 w-full animate-pulse" />
        <View className="bg-gray-200 rounded-[20px] h-36 w-full animate-pulse" />
        <View className="bg-gray-200 rounded-[20px] h-28 w-full animate-pulse" />
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
      <View className="px-4 pt-2 gap-4">
        
        {/* 1. Duty Status Card */}
        <View className="bg-white rounded-[20px] p-4 shadow-sm border border-gray-100">
          <View className="flex-row justify-between items-center mb-4">
            <View className="flex-row items-center gap-3">
              <Text className="text-black text-[16px] font-bold">Duty Status</Text>
              <View className={`flex-row items-center px-2 py-1 rounded-full gap-1 ${punchInTime && !punchOutTime ? 'bg-[#E6F4EA]' : 'bg-gray-100'}`}>
                <View className={`w-2 h-2 rounded-full ${punchInTime && !punchOutTime ? 'bg-[#138A43]' : 'bg-gray-400'}`} />
                <Text className={`text-xs font-semibold ${punchInTime && !punchOutTime ? 'text-[#138A43]' : 'text-gray-500'}`}>
                  {punchInTime && !punchOutTime ? 'Online' : 'Offline'}
                </Text>
              </View>
            </View>
            <View className="flex-row items-center gap-1">
              <Text className={`text-xs font-medium ${punchInTime && !punchOutTime ? 'text-[#138A43]' : 'text-gray-500'}`}>
                {punchInTime && !punchOutTime ? 'You are on duty' : 'Not on duty'}
              </Text>
              <Signal color={punchInTime && !punchOutTime ? "#138A43" : "#6B7280"} size={14} strokeWidth={3} />
            </View>
          </View>

          {/* Check-in Banner */}
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
                disabled={bannerData.disabled && bannerData.title === 'Outside Office Area'}
                className={`px-4 py-2.5 rounded-xl shadow-sm ${
                  bannerData.disabled 
                    ? 'bg-gray-300 shadow-none' 
                    : punchInTime ? 'bg-red-500' : 'bg-[#138A43]'
                }`}
              >
                <Text className={`text-sm font-bold ${bannerData.disabled ? 'text-gray-600' : 'text-white'}`}>
                  {bannerData.disabled ? 'Outside Office' : punchInTime ? 'Punch Out' : 'Punch In Now'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Today's Punch Stats */}
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

        {/* 2. Attendance Overview Card (Current Month + Real Data) */}
        <View className="bg-white rounded-[20px] p-4 shadow-sm border border-gray-100">
          <View className="flex-row justify-between items-center mb-4">
            <View className="flex-row items-center gap-2">
              <Calendar color="#208AEF" size={20} strokeWidth={2.5} />
              <Text className="text-black text-[16px] font-bold">Attendance Overview</Text>
            </View>
            <View className="bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
              <Text className="text-[#208AEF] text-xs font-semibold">Current Month</Text>
            </View>
          </View>

          <View className="flex-row justify-between items-center">
            {/* Box 1 */}
            <View className="bg-[#E6F4EA] w-[23%] aspect-square rounded-2xl items-center justify-center p-2">
              <CalendarCheck2 color="#138A43" size={24} strokeWidth={2.5} className="mb-1" />
              <Text className="text-black text-lg font-bold">{monthlyAttendance.present}</Text>
              <Text className="text-gray-600 text-[9px] font-medium text-center">Days Present</Text>
            </View>
            {/* Box 2 */}
            <View className="bg-[#FEE2E2] w-[23%] aspect-square rounded-2xl items-center justify-center p-2">
              <CalendarX2 color="#EF4444" size={24} strokeWidth={2.5} className="mb-1" />
              <Text className="text-black text-lg font-bold">{monthlyAttendance.absent}</Text>
              <Text className="text-gray-600 text-[9px] font-medium text-center">Days Absent</Text>
            </View>
            {/* Box 3 */}
            <View className="bg-[#FEF3C7] w-[23%] aspect-square rounded-2xl items-center justify-center p-2">
              <Clock color="#F59E0B" size={24} strokeWidth={2.5} className="mb-1" />
              <Text className="text-black text-lg font-bold">{monthlyAttendance.late}</Text>
              <Text className="text-gray-600 text-[9px] font-medium text-center">Days Late</Text>
            </View>
            {/* Box 4 */}
            <View className="bg-[#EFF6FF] w-[23%] aspect-square rounded-2xl items-center justify-center p-2">
              <Plane color="#3B82F6" size={24} strokeWidth={2.5} className="mb-1" />
              <Text className="text-black text-lg font-bold">{monthlyAttendance.leave}</Text>
              <Text className="text-gray-600 text-[9px] font-medium text-center">On Leave</Text>
            </View>
          </View>
        </View>

        {/* 3. Salary Overview Card */}
        <View className="bg-white rounded-[20px] p-4 shadow-sm border border-gray-100">
          <View className="flex-row justify-between items-center mb-4">
            <View className="flex-row items-center gap-2">
              <View className="bg-[#208AEF] rounded-full w-6 h-6 items-center justify-center">
                <IndianRupee color="white" size={14} strokeWidth={2.5} />
              </View>
              <Text className="text-black text-[16px] font-bold">Salary Overview</Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/salary')}>
              <Text className="text-[#208AEF] text-xs font-bold">View Details</Text>
            </TouchableOpacity>
          </View>

          <View className="flex-row justify-between items-center">
            {/* Item 1 */}
            <View className="w-[24%] items-center bg-[#F8FAFC] py-3 rounded-xl">
              <View className="flex-row items-center gap-1 mb-2">
                <Calendar color="#10B981" size={12} strokeWidth={3} />
                <Text className="text-gray-500 text-[9px] font-medium">Salary Date</Text>
              </View>
              <Text className="text-black text-[11px] font-bold">{salaryData.formattedSalaryDate || 'Not Set'}</Text>
            </View>
            {/* Item 2 */}
            <View className="w-[24%] items-center bg-[#F8FAFC] py-3 rounded-xl">
              <View className="flex-row items-center gap-1 mb-2">
                <Clock color="#EF4444" size={12} strokeWidth={3} />
                <Text className="text-gray-500 text-[9px] font-medium">Days Late</Text>
              </View>
              <Text className="text-[#EF4444] text-[11px] font-bold">{salaryData.daysLate} Days</Text>
            </View>
            {/* Item 3 */}
            <View className="w-[24%] items-center bg-[#F8FAFC] py-3 rounded-xl">
              <View className="flex-row items-center gap-1 mb-2">
                <Plane color="#3B82F6" size={12} strokeWidth={3} />
                <Text className="text-gray-500 text-[9px] font-medium">Leave Taken</Text>
              </View>
              <Text className="text-gray-600 text-[11px] font-bold">{salaryData.leaveTaken} Days</Text>
            </View>
            {/* Item 4 */}
            <View className="w-[24%] items-center bg-[#F8FAFC] py-3 rounded-xl">
              <View className="flex-row items-center gap-1 mb-2">
                <IndianRupee color="#10B981" size={12} strokeWidth={3} />
                <Text className="text-gray-500 text-[9px] font-medium">Expected</Text>
              </View>
              <Text className="text-[#10B981] text-[11px] font-bold">
                {salaryData.expectedSalary > 0 ? `₹ ${salaryData.expectedSalary.toLocaleString('en-IN')}` : '₹ 0'}
              </Text>
            </View>
          </View>
        </View>

        {/* 4. Quick Actions Card */}
        <View className="bg-transparent mb-6">
          <View className="flex-row items-center gap-2 mb-3 px-1">
            <Zap color="#208AEF" size={20} strokeWidth={2.5} fill="#208AEF" />
            <Text className="text-black text-[16px] font-bold">Quick Actions</Text>
          </View>

          <View className="flex-row justify-between items-center">
            {/* 1st: Chat */}
            <TouchableOpacity 
              onPress={async () => {
                await AsyncStorage.setItem('lastReadChatTime', new Date().toISOString());
                setMessageCount(0);
                router.push('/chat');
              }}
              className="bg-white border border-[#E0F2FE] w-[23%] aspect-square rounded-2xl items-center justify-center p-2 shadow-sm relative"
            >
              {messageCount > 0 && (
                <View className="absolute top-1.5 right-1.5 bg-[#2563EB] rounded-full px-1.5 py-0.5">
                  <Text className="text-white text-[9px] font-bold">{messageCount}</Text>
                </View>
              )}
              <MessageSquare color="#3B82F6" size={22} strokeWidth={2} className="mb-1" />
              <Text className="text-black text-[9px] font-medium text-center leading-tight">Chat</Text>
            </TouchableOpacity>

            {/* 2nd: Leave Request */}
            <TouchableOpacity 
              onPress={() => router.push('/leaves')}
              className="bg-white border border-[#DCFCE7] w-[23%] aspect-square rounded-2xl items-center justify-center p-2 shadow-sm"
            >
              <Plane color="#22C55E" size={22} strokeWidth={2} className="mb-1" />
              <Text className="text-black text-[9px] font-medium text-center leading-tight">Leave{"\n"}Request</Text>
            </TouchableOpacity>

            {/* 3rd: View Attendance */}
            <TouchableOpacity 
              onPress={() => router.push('/attendance')}
              className="bg-white border border-[#F3E8FF] w-[23%] aspect-square rounded-2xl items-center justify-center p-2 shadow-sm"
            >
              <CalendarCheck2 color="#A855F7" size={22} strokeWidth={2} className="mb-1" />
              <Text className="text-black text-[9px] font-medium text-center leading-tight">View{"\n"}Attendance</Text>
            </TouchableOpacity>

            {/* 4th: Settings */}
            <TouchableOpacity 
              onPress={() => router.push('/account/profile')}
              className="bg-white border border-[#FEF3C7] w-[23%] aspect-square rounded-2xl items-center justify-center p-2 shadow-sm"
            >
              <Settings color="#F59E0B" size={22} strokeWidth={2} className="mb-1" />
              <Text className="text-black text-[9px] font-medium text-center leading-tight">Settings</Text>
            </TouchableOpacity>
          </View>
        </View>

      </View>

      {/* Leave Request Form Modal */}
      <Modal visible={showLeaveModal} transparent={true} animationType="slide" onRequestClose={() => setShowLeaveModal(false)}>
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-[28px] p-6 max-h-[90%]">
            
            {/* Modal Header */}
            <View className="flex-row justify-between items-center mb-5 pb-3 border-b border-gray-100">
              <View className="flex-row items-center gap-2">
                <Plane color="#22C55E" size={20} strokeWidth={2.5} />
                <Text className="text-gray-900 font-bold text-lg">
                  {editingLeaveId ? 'Edit Leave Request' : 'Apply for Leave'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowLeaveModal(false)} className="p-1 rounded-full bg-gray-100">
                <X color="#6B7280" size={20} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              
              {/* Prefilled User Details */}
              <View className="bg-gray-50 rounded-xl p-3.5 mb-4 border border-gray-100 flex-row justify-between">
                <View className="flex-row items-center gap-2">
                  <User color="#6B7280" size={16} />
                  <Text className="text-gray-800 text-xs font-bold">{userData?.name || 'Staff Member'}</Text>
                </View>
                <View className="flex-row items-center gap-2">
                  <Phone color="#6B7280" size={16} />
                  <Text className="text-gray-600 text-xs font-medium">{userData?.phone || userData?.mobile || userData?.contact || '+91 98765 43210'}</Text>
                </View>
              </View>

              {/* Leave Type selector */}
              <Text className="text-xs font-semibold text-gray-500 mb-2">Leave Duration</Text>
              <View className="flex-row gap-3 mb-4">
                <TouchableOpacity 
                  onPress={() => setLeaveType('Single Day')}
                  className={`flex-1 py-2.5 rounded-xl border text-center items-center ${leaveType === 'Single Day' ? 'bg-blue-50 border-blue-500' : 'bg-gray-50 border-gray-200'}`}
                >
                  <Text className={`text-xs font-bold ${leaveType === 'Single Day' ? 'text-blue-600' : 'text-gray-600'}`}>Single Day</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={() => setLeaveType('Multi-Day')}
                  className={`flex-1 py-2.5 rounded-xl border text-center items-center ${leaveType === 'Multi-Day' ? 'bg-blue-50 border-blue-500' : 'bg-gray-50 border-gray-200'}`}
                >
                  <Text className={`text-xs font-bold ${leaveType === 'Multi-Day' ? 'text-blue-600' : 'text-gray-600'}`}>Multi-Day</Text>
                </TouchableOpacity>
              </View>

              {/* Dates */}
              <View className="flex-row gap-3 mb-4">
                <View className="flex-1">
                  <Text className="text-xs font-semibold text-gray-500 mb-1">Start Date</Text>
                  <TextInput 
                    value={startDate} 
                    onChangeText={setStartDate} 
                    placeholder="YYYY-MM-DD"
                    className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold text-gray-800"
                  />
                </View>
                {leaveType === 'Multi-Day' && (
                  <View className="flex-1">
                    <Text className="text-xs font-semibold text-gray-500 mb-1">End Date</Text>
                    <TextInput 
                      value={endDate} 
                      onChangeText={setEndDate} 
                      placeholder="YYYY-MM-DD"
                      className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold text-gray-800"
                    />
                  </View>
                )}
              </View>

              {/* Reason */}
              <Text className="text-xs font-semibold text-gray-500 mb-1">Reason for Leave</Text>
              <TextInput 
                value={leaveReason} 
                onChangeText={setLeaveReason} 
                placeholder="Explain the reason for your leave..."
                multiline
                numberOfLines={3}
                className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs text-gray-800 min-h-[70px] mb-5 text-start"
                textAlignVertical="top"
              />

              {/* Submit Button */}
              <TouchableOpacity 
                onPress={handleSubmitLeave}
                disabled={isSubmittingLeave}
                className="bg-[#22C55E] py-3 rounded-xl items-center mb-6 shadow-sm disabled:opacity-50"
              >
                {isSubmittingLeave ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Text className="text-white font-bold text-sm">
                    {editingLeaveId ? 'Update Leave Request' : 'Submit Leave Request'}
                  </Text>
                )}
              </TouchableOpacity>

              {/* Submitted Leave History & Statuses */}
              {leaveList.length > 0 && (
                <View className="border-t border-gray-100 pt-4">
                  <Text className="text-xs font-bold text-gray-900 mb-3 uppercase tracking-wider">Your Submitted Leave Requests</Text>
                  <View className="gap-2.5 mb-4">
                    {leaveList.map((item) => (
                      <View key={item.id} className="bg-gray-50 p-3 rounded-xl border border-gray-200">
                        <View className="flex-row justify-between items-center mb-1">
                          <Text className="text-xs font-bold text-gray-800">
                            {item.startDate} {item.endDate && item.endDate !== item.startDate ? `to ${item.endDate}` : ''}
                          </Text>
                          
                          {/* Approval Status Badges */}
                          {item.status === 'Approved' ? (
                            <View className="bg-green-100 px-2 py-0.5 rounded-md flex-row items-center gap-1">
                              <CheckCircle2 color="#16A34A" size={12} />
                              <Text className="text-[10px] font-bold text-green-700">Approved</Text>
                            </View>
                          ) : item.status === 'Rejected' ? (
                            <View className="bg-red-100 px-2 py-0.5 rounded-md flex-row items-center gap-1">
                              <AlertCircle color="#DC2626" size={12} />
                              <Text className="text-[10px] font-bold text-red-700">Rejected</Text>
                            </View>
                          ) : (
                            <View className="bg-orange-100 px-2 py-0.5 rounded-md flex-row items-center gap-1">
                              <Clock color="#D97706" size={12} />
                              <Text className="text-[10px] font-bold text-amber-700">Pending Approval</Text>
                            </View>
                          )}
                        </View>

                        <Text className="text-gray-500 text-[11px] mb-2">{item.reason}</Text>

                        {/* Edit Button (Only visible if status is Pending) */}
                        {item.status === 'Pending' && (
                          <TouchableOpacity 
                            onPress={() => handleEditLeave(item)}
                            className="self-end bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-lg flex-row items-center gap-1"
                          >
                            <Edit2 color="#2563EB" size={12} />
                            <Text className="text-blue-600 text-[10px] font-bold">Edit Request</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    ))}
                  </View>
                </View>
              )}

            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}