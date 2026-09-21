import React, { useState, useEffect } from 'react';
import { 
  Users, ChevronDown, Search, ChevronLeft, ChevronRight,
  Calendar, Wallet, CreditCard, Hourglass, 
  Clock4, Play, FileText, CheckCircle2, FileCheck, Eye, Activity, X, AlertTriangle, Undo2,
  CalendarDays, TrendingUp, ArrowUpRight, ArrowDownRight, UserCheck, UserX, Clock,
  Sparkles, Check, ChevronUp, Landmark, ShieldCheck, Download, FileSpreadsheet
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { collection, query, where, onSnapshot, writeBatch, doc, serverTimestamp, updateDoc, arrayUnion, getDocs, setDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import StaffDetailsModal from '../components/StaffDetailsModal';
import VerifiedLocationBadge from '../components/VerifiedLocationBadge';

// Comprehensive Salary & Attendance Cycle Calculation Helper
function calculateSalaryCycleData(
  staff: any,
  rawNextSalaryDate: string,
  salaryAmount: number,
  globalAttendance: any[],
  globalLeaves: any[],
  globalHolidays: any[],
  globalOffCancels: any[],
  targetCycleOffset: number = 0 // 0 = current, 1 = 1 cycle ago, etc.
) {
  const localToday = new Date();
  localToday.setHours(0,0,0,0);
  const todayStr = `${localToday.getFullYear()}-${String(localToday.getMonth() + 1).padStart(2, '0')}-${String(localToday.getDate()).padStart(2, '0')}`;

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

  // Shift cycle if targetCycleOffset > 0
  if (targetCycleOffset > 0) {
    cycleEnd.setMonth(cycleEnd.getMonth() - targetCycleOffset);
  }

  const cStart = new Date(cycleEnd);
  cStart.setMonth(cStart.getMonth() - 1);
  cStart.setDate(cStart.getDate() + 1); // exclude previous cycle boundary

  let actualStart = cStart;
  if (staff.joinDate) {
    const joinD = new Date(staff.joinDate);
    joinD.setHours(0,0,0,0);
    if (joinD > cStart) actualStart = joinD;
  }

  const startStr = actualStart.toISOString().split('T')[0];
  const endStr = cycleEnd.toISOString().split('T')[0];

  const staffEmpId = staff.empId || staff.employeeId || staff.id;
  const staffUids = [staff.id, staff.empId, staff.employeeId, staff.uid].filter(Boolean);

  const userAttList = globalAttendance.filter(att => 
    staffUids.includes(att.staffId) && att.date >= startStr && att.date <= endStr
  );
  const userLeavesList = globalLeaves.filter(leave => 
    staffUids.includes(leave.staffId) && leave.status === 'Approved'
  );
  const userHolidaysList = globalHolidays.filter(h => h.date >= startStr && h.date <= endStr);
  const userCancelsList = globalOffCancels.filter(oc => 
    staffUids.includes(oc.staffId) && oc.date >= startStr && oc.date <= endStr
  );

  const holidaysMap = new Map(userHolidaysList.map(h => [h.date, h.title || h.name || 'Holiday']));
  const offCancelsSet = new Set(userCancelsList.map(oc => oc.date));

  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const isFieldStaff = (staff.staffType || staff.department || '').includes('Field');
  const hasWeeklyOff = Boolean(staff.weeklyOff && staff.weeklyOff !== 'None' && staff.weeklyOff !== 'No Weekly Off');
  const staffWeeklyOff = hasWeeklyOff ? staff.weeklyOff : (isFieldStaff ? null : 'Sunday');

  let totalCycleDays = 0;
  let totalWorkingDays = 0;
  let daysElapsed = 0;
  let deductionDays = 0;
  let presentDaysCount = 0;
  let absentDaysCount = 0;
  let lateDaysCount = 0;
  let halfDaysCount = 0;
  let weeklyOffCount = 0;
  let holidayCount = 0;
  let approvedLeaveCount = 0;

  const deductionDetails: any[] = [];
  const fullCalendar: any[] = [];

  const tempStart = new Date(actualStart);
  tempStart.setHours(0,0,0,0);
  const tempEnd = new Date(cycleEnd);
  tempEnd.setHours(0,0,0,0);

  const baseSalary = Number(salaryAmount || staff.salaryAmount) || 0;

  // Pre-calculate total working days in the entire cycle
  for (let d = new Date(tempStart); d <= tempEnd; d.setDate(d.getDate() + 1)) {
    totalCycleDays++;
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const dayName = days[d.getDay()];
    const isDefaultOff = staffWeeklyOff ? dayName.toLowerCase() === staffWeeklyOff.toLowerCase() : false;
    const isCompanyHoliday = holidaysMap.has(dateStr);
    const isApprovedLeave = userLeavesList.some(leave => dateStr >= leave.startDate && dateStr <= leave.endDate);
    const isOffCancelled = offCancelsSet.has(dateStr);

    const isWorkingDay = !isCompanyHoliday && !isApprovedLeave && (!isDefaultOff || isOffCancelled);
    if (isWorkingDay) {
      totalWorkingDays++;
    }
  }

  // Fixed standard 30-day base division regardless of cycle days or working days
  const perDaySalary = baseSalary > 0 ? (baseSalary / 30) : 0;
  const DAILY_WORKING_HOURS = 9; // 9 hours working time per day
  const DAILY_WORKING_MINUTES = 9 * 60; // 540 minutes per day
  const perHourSalary = perDaySalary / DAILY_WORKING_HOURS;
  const perMinuteSalary = perDaySalary / DAILY_WORKING_MINUTES;

  // Now process each day in chronological order
  for (let d = new Date(tempStart); d <= tempEnd; d.setDate(d.getDate() + 1)) {
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const dayName = days[d.getDay()];
    const isFuture = dateStr > todayStr;
    const isPastOrToday = !isFuture;

    if (isPastOrToday) {
      daysElapsed++;
    }

    const isDefaultOff = staffWeeklyOff ? dayName.toLowerCase() === staffWeeklyOff.toLowerCase() : false;
    const isCompanyHoliday = holidaysMap.has(dateStr);
    const holidayTitle = holidaysMap.get(dateStr);
    const approvedLeave = userLeavesList.find(leave => dateStr >= leave.startDate && dateStr <= leave.endDate);
    const isOffCancelled = offCancelsSet.has(dateStr);

    const isWorkingDay = !isCompanyHoliday && !approvedLeave && (!isDefaultOff || isOffCancelled);

    const attRecord = userAttList.find(att => att.date === dateStr);
    const attStatus = attRecord?.status || null;
    const punchInTime = attRecord?.punchIn || null;
    const punchOutTime = attRecord?.punchOut || null;
    const workingHours = attRecord?.hours || null;
    const isForgiven = Boolean(attRecord?.forgiven);

    let displayStatus = 'Upcoming';
    let dayDeductionFraction = 0;
    let lateMins = attRecord?.lateMinutes || 0;

    if (isFuture) {
      displayStatus = 'Upcoming';
    } else if (isCompanyHoliday) {
      displayStatus = 'Holiday';
      holidayCount++;
    } else if (approvedLeave) {
      displayStatus = 'On Leave';
      approvedLeaveCount++;
    } else if (isDefaultOff && !isOffCancelled) {
      displayStatus = 'Weekly Off';
      weeklyOffCount++;
    } else {
      // It's a working day in the past or today
      if (attStatus === 'Present' || attStatus === 'On Duty') {
        displayStatus = 'Present';
        presentDaysCount++;
      } else if (attStatus === 'Late') {
        displayStatus = 'Late';
        lateDaysCount++;
        dayDeductionFraction = lateMins > 0 ? (lateMins / DAILY_WORKING_MINUTES) : 0.25;
        if (!isForgiven) {
          deductionDays += dayDeductionFraction;
        }
        const lateCutAmount = Math.round(lateMins > 0 ? (lateMins * perMinuteSalary) : (0.25 * perDaySalary));
        deductionDetails.push({
          date: dateStr,
          dayName,
          punchIn: punchInTime,
          punchOut: punchOutTime,
          status: 'Late',
          lateMinutes: lateMins,
          deduction: Number(dayDeductionFraction.toFixed(4)),
          amount: lateCutAmount,
          forgiven: isForgiven
        });
      } else if (attStatus === 'Half Day') {
        displayStatus = 'Half Day';
        halfDaysCount++;
        dayDeductionFraction = 0.5;
        if (!isForgiven) {
          deductionDays += 0.5;
        }
        deductionDetails.push({
          date: dateStr,
          dayName,
          punchIn: punchInTime,
          punchOut: punchOutTime,
          status: 'Half Day',
          lateMinutes: 0,
          deduction: 0.5,
          amount: Math.round(0.5 * perDaySalary),
          forgiven: isForgiven
        });
      } else {
        // Absent (either explicit Absent or no punch in record on past working day)
        displayStatus = 'Absent';
        absentDaysCount++;
        dayDeductionFraction = 1;
        if (!isForgiven) {
          deductionDays += 1;
        }
        deductionDetails.push({
          date: dateStr,
          dayName,
          punchIn: punchInTime,
          punchOut: punchOutTime,
          status: 'Absent',
          lateMinutes: 0,
          deduction: 1,
          amount: Math.round(1 * perDaySalary),
          forgiven: isForgiven
        });
      }
    }

    const punchInLoc = attRecord?.locationIn || attRecord?.currentLocation || (attRecord?.latitudeIn && attRecord?.longitudeIn ? `${attRecord.latitudeIn}, ${attRecord.longitudeIn}` : null);
    const punchOutLoc = attRecord?.locationOut || (attRecord?.latitudeOut && attRecord?.longitudeOut ? `${attRecord.latitudeOut}, ${attRecord.longitudeOut}` : null);

    let resolvedHours = workingHours;
    if (!resolvedHours && punchInTime && punchOutTime) {
      try {
        const tIn = new Date(punchInTime).getTime();
        const tOut = new Date(punchOutTime).getTime();
        if (!isNaN(tIn) && !isNaN(tOut) && tOut > tIn) {
          const diffMs = tOut - tIn;
          const h = Math.floor(diffMs / 3600000);
          const m = Math.floor((diffMs % 3600000) / 60000);
          resolvedHours = `${h}h ${m}m`;
        }
      } catch {}
    }

    fullCalendar.push({
      date: dateStr,
      dayName,
      dayNumber: d.getDate(),
      isFuture,
      isWorkingDay,
      status: displayStatus,
      rawStatus: attStatus,
      punchIn: punchInTime,
      punchOut: punchOutTime,
      hours: resolvedHours,
      lateMinutes: lateMins,
      deductionFraction: dayDeductionFraction,
      deductionAmount: isForgiven ? 0 : (
        displayStatus === 'Late'
          ? Math.round(lateMins > 0 ? (lateMins * perMinuteSalary) : (0.25 * perDaySalary))
          : Math.round(dayDeductionFraction * perDaySalary)
      ),
      forgiven: isForgiven,
      holidayTitle,
      leaveReason: approvedLeave?.reason,
      locationIn: punchInLoc,
      locationOut: punchOutLoc,
      location: punchInLoc || punchOutLoc || null,
      latitudeIn: attRecord?.latitudeIn || attRecord?.currentLatitude || null,
      longitudeIn: attRecord?.longitudeIn || attRecord?.currentLongitude || null,
      latitudeOut: attRecord?.latitudeOut || null,
      longitudeOut: attRecord?.longitudeOut || null,
      latitude: attRecord?.currentLatitude || attRecord?.latitudeIn || null,
      longitude: attRecord?.currentLongitude || attRecord?.longitudeIn || null
    });
  }

  const totalDeductionAmount = Math.round(
    deductionDetails
      .filter((d: any) => !d.forgiven)
      .reduce((sum: number, d: any) => sum + (d.amount || 0), 0)
  );
  const netExpectedAtMaturity = Math.max(0, Math.round(baseSalary - totalDeductionAmount));
  
  // Earned so far: Count actual payable working days passed (excluding deductions) + paid weekly offs / holidays passed
  const payableDaysPassed = Math.max(0, daysElapsed - deductionDays);
  const earnedTillToday = Math.min(baseSalary, Math.max(0, Math.round(payableDaysPassed * perDaySalary)));

  const payrollId = `${staff.empId || staff.id}_${endStr}`;

  return {
    id: payrollId,
    staffId: staff.empId || staff.id,
    staffName: staff.name,
    cycleStartDate: startStr,
    cycleEndDate: endStr,
    maturityDate: endStr,
    baseSalary: baseSalary,
    totalCycleDays: totalCycleDays,
    daysElapsed: daysElapsed,
    totalWorkingDays: totalWorkingDays,
    perDaySalary: Math.round(perDaySalary),
    perHourSalary: Math.round(perHourSalary),
    perMinuteSalary: Number(perMinuteSalary.toFixed(2)),
    workingHoursPerDay: DAILY_WORKING_HOURS,
    deductionDays: Number(deductionDays.toFixed(2)),
    totalDeductionAmount: totalDeductionAmount,
    earnedTillToday: earnedTillToday,
    expectedSalary: netExpectedAtMaturity,
    paidAmount: 0,
    status: 'Not Due',
    payments: [],
    // Breakdown details
    deductionDetails: deductionDetails,
    fullCalendar: fullCalendar,
    stats: {
      present: presentDaysCount,
      absent: absentDaysCount,
      late: lateDaysCount,
      halfDay: halfDaysCount,
      weeklyOff: weeklyOffCount,
      holiday: holidayCount,
      onLeave: approvedLeaveCount
    }
  };
}

export default function Salaries() {
  const [staffList, setStaffList] = useState<any[]>([]);
  const [payrollData, setPayrollData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Full Staff Profile View State
  const [fullViewStaff, setFullViewStaff] = useState<any>(null);
  
  // Search, Filter & Pagination State
  const [searchQuery, setSearchQuery] = useState('');
  const [staffTypeFilter, setStaffTypeFilter] = useState('all');
  const [filterMaturedOnly, setFilterMaturedOnly] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  
  // Salary Details Modal State
  const [showSalaryModal, setShowSalaryModal] = useState(false);
  const [selectedSalaryStaff, setSelectedSalaryStaff] = useState<any>(null);
  const [modalActiveTab, setModalActiveTab] = useState<'attendance' | 'deductions' | 'bank'>('attendance');
  const [modalCycleOffset, setModalCycleOffset] = useState<number>(0); // 0 = current running cycle, 1 = 1 month ago...
  const [forgivingIndex, setForgivingIndex] = useState<number | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Payment Modal State
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPaymentStaff, setSelectedPaymentStaff] = useState<any>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentType, setPaymentType] = useState('Full');
  const [paymentNote, setPaymentNote] = useState('');
  const [submittingPayment, setSubmittingPayment] = useState(false);

  const [globalAttendance, setGlobalAttendance] = useState<any[]>([]);
  const [globalLeaves, setGlobalLeaves] = useState<any[]>([]);
  const [globalHolidays, setGlobalHolidays] = useState<any[]>([]);
  const [globalOffCancels, setGlobalOffCancels] = useState<any[]>([]);

  const currentMonthYear = new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

  useEffect(() => {
    const qStaff = query(collection(db, 'users'), where('role', '==', 'staff'));
    const unsubStaff = onSnapshot(qStaff, (snapshot) => {
      const staff: any[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.status === 'Active' || data.status === 'On Duty') {
          staff.push({ id: doc.id, ...data });
        }
      });
      setStaffList(staff);
    });

    const qPayroll = query(collection(db, 'payroll'));
    const unsubPayroll = onSnapshot(qPayroll, (snapshot) => {
      const payroll: any[] = [];
      snapshot.forEach(doc => {
        payroll.push({ id: doc.id, ...doc.data() });
      });
      setPayrollData(payroll);
    });

    const unsubAtt = onSnapshot(collection(db, 'attendance'), (snapshot) => {
      const list: any[] = [];
      snapshot.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
      setGlobalAttendance(list);
    });

    const unsubLeaves = onSnapshot(collection(db, 'leaves'), (snapshot) => {
      const list: any[] = [];
      snapshot.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
      setGlobalLeaves(list);
    });

    const unsubHolidays = onSnapshot(collection(db, 'company_holidays'), (snapshot) => {
      const list: any[] = [];
      snapshot.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
      setGlobalHolidays(list);
    });

    const unsubOffCancels = onSnapshot(collection(db, 'weekly_off_cancellations'), (snapshot) => {
      const list: any[] = [];
      snapshot.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
      setGlobalOffCancels(list);
    });

    return () => {
      unsubStaff();
      unsubPayroll();
      unsubAtt();
      unsubLeaves();
      unsubHolidays();
      unsubOffCancels();
    };
  }, []);

  // Prepare staff-wise table data with full cycle calculations
  const now = new Date();
  now.setHours(0,0,0,0);

  const staffTableData = staffList.map(staff => {
    const nextDateStr = staff.nextSalaryDate || new Date().toISOString().split('T')[0];
    const payrollId = `${staff.empId || staff.id}_${nextDateStr}`;
    const storedRecord = payrollData.find(p => p.id === payrollId);
    
    const nextDate = new Date(nextDateStr);
    nextDate.setHours(0,0,0,0);
    const isMatured = now >= nextDate;
    
    // Always compute rich cycle data for running / live metrics
    const computedCycle = calculateSalaryCycleData(
      staff,
      nextDateStr,
      Number(staff.salaryAmount) || 0,
      globalAttendance,
      globalLeaves,
      globalHolidays,
      globalOffCancels,
      0
    );

    const baseSalary = Number(staff.salaryAmount) || computedCycle.baseSalary || 0;
    const earnedTillToday = computedCycle.earnedTillToday;
    const paid = storedRecord ? (Number(storedRecord.paidAmount) || 0) : 0;
    
    // For pending/unsettled cycles or active cycle, always use the fresh 30-day / 9-hour calculated expected salary.
    // If a cycle was marked 'Paid' in the past and fully settled, preserve historical expected salary.
    const isHistoricalPaid = storedRecord?.status === 'Paid' && paid > 0 && Math.abs(paid - (Number(storedRecord.expectedSalary) || 0)) <= 10;

    const totalDeducted = isHistoricalPaid && storedRecord?.deductionDays
      ? Math.round(storedRecord.deductionDays * (storedRecord.perDaySalary || computedCycle.perDaySalary))
      : computedCycle.totalDeductionAmount;
    
    const expected = isHistoricalPaid && storedRecord?.expectedSalary
      ? Number(storedRecord.expectedSalary)
      : computedCycle.expectedSalary;

    const pending = Math.max(0, expected - paid);
    
    let status = storedRecord?.status;
    if (paid >= expected && expected > 0) {
      status = 'Paid';
    } else if (paid > 0) {
      status = 'Partial';
    } else if (!status || status === 'Pending') {
      status = isMatured ? 'Pending' : 'Not Due';
    }

    return {
      ...staff,
      record: storedRecord || computedCycle,
      computedCycle: computedCycle,
      baseSalary: baseSalary,
      earnedTillToday: earnedTillToday,
      totalDeducted: totalDeducted,
      expected: expected,
      paid: paid,
      pending: pending,
      status: status,
      isMatured: isMatured,
      maturityDate: computedCycle.maturityDate || nextDateStr,
      cycleStartDate: computedCycle.cycleStartDate,
      cycleEndDate: computedCycle.cycleEndDate,
      daysElapsed: computedCycle.daysElapsed,
      totalCycleDays: computedCycle.totalCycleDays
    };
  });

  // Derived Totals
  const totalEmployees = staffList.length;
  const totalPayable = staffTableData.reduce((sum, s) => sum + s.expected, 0);
  const totalBasePayable = staffList.reduce((sum, s) => sum + (Number(s.salaryAmount) || 0), 0);
  const totalEarnedSoFar = staffTableData.reduce((sum, s) => sum + s.earnedTillToday, 0);
  const totalDeductionsSoFar = staffTableData.reduce((sum, s) => sum + s.totalDeducted, 0);
  const paidAmount = payrollData.reduce((sum, p) => sum + (Number(p.paidAmount) || 0), 0);
  const pendingAmount = Math.max(0, totalPayable - paidAmount);
  
  const paidPercentage = totalPayable > 0 ? Math.round((paidAmount / totalPayable) * 100) : 0;

  const maturedPendingStaffList = staffTableData.filter(s => s.isMatured && s.status !== 'Paid');
  const totalMaturedPendingAmount = maturedPendingStaffList.reduce((sum, s) => sum + s.pending, 0);
  const maturedPendingStaffCount = maturedPendingStaffList.length;

  // Auto-sync pending payroll records in Firestore if their perDaySalary or expectedSalary differs from standard 30-day / 9-hr rule
  useEffect(() => {
    if (staffTableData.length === 0 || payrollData.length === 0) return;

    const timer = setTimeout(async () => {
      try {
        const batch = writeBatch(db);
        let updatedCount = 0;

        for (const staff of staffTableData) {
          if (staff.status !== 'Paid' && staff.computedCycle) {
            const payrollId = `${staff.empId || staff.id}_${staff.maturityDate}`;
            const existingRecord = payrollData.find(p => p.id === payrollId);

            if (existingRecord) {
              const expectedSalary = staff.computedCycle.expectedSalary;
              const perDaySalary = staff.computedCycle.perDaySalary;

              const needsUpdate =
                existingRecord.perDaySalary !== perDaySalary ||
                existingRecord.expectedSalary !== expectedSalary;

              if (needsUpdate) {
                const payrollRef = doc(db, 'payroll', payrollId);
                batch.update(payrollRef, {
                  perDaySalary: perDaySalary,
                  expectedSalary: expectedSalary,
                  deductionDays: staff.computedCycle.deductionDays,
                  deductionDetails: staff.computedCycle.deductionDetails,
                  updatedAt: serverTimestamp()
                });
                updatedCount++;
              }
            }
          }
        }

        if (updatedCount > 0) {
          await batch.commit();
          console.log(`Auto-synchronized ${updatedCount} pending payroll records to standard 30-day formula.`);
        }
      } catch (err) {
        console.error('Error auto-syncing pending payroll records:', err);
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [payrollData.length]);

  const handleProcessMaturedSalaries = async () => {
    setLoading(true);
    try {
      const batch = writeBatch(db);
      let count = 0;

      for (const staff of staffTableData) {
        if (staff.isMatured && staff.status !== 'Paid') {
          const payrollId = `${staff.empId || staff.id}_${staff.maturityDate}`;
          const existingRecord = payrollData.find(p => p.id === payrollId);
          const payrollRef = doc(db, 'payroll', payrollId);
          
          const payload = {
            staffId: staff.empId || staff.id,
            staffName: staff.name,
            department: staff.staffType || staff.department || 'General',
            maturityDate: staff.maturityDate,
            cycleStartDate: staff.cycleStartDate,
            cycleEndDate: staff.cycleEndDate,
            baseSalary: staff.baseSalary,
            totalWorkingDays: staff.computedCycle.totalWorkingDays,
            deductionDays: staff.computedCycle.deductionDays,
            perDaySalary: staff.computedCycle.perDaySalary,
            deductionDetails: staff.computedCycle.deductionDetails,
            expectedSalary: staff.computedCycle.expectedSalary,
            status: (staff.paid || 0) > 0 ? ((staff.paid || 0) >= staff.computedCycle.expectedSalary ? 'Paid' : 'Partial') : 'Pending',
            updatedAt: serverTimestamp()
          };

          if (!existingRecord) {
            batch.set(payrollRef, {
              ...payload,
              paidAmount: 0,
              payments: []
            });
            count++;
          } else if (existingRecord.perDaySalary !== staff.computedCycle.perDaySalary || existingRecord.expectedSalary !== staff.computedCycle.expectedSalary) {
            batch.update(payrollRef, payload);
            count++;
          }
        }
      }

      if (count > 0) {
        await batch.commit();
        alert(`Successfully processed and synchronized ${count} matured salaries with verified deductions.`);
      } else {
        alert('All matured salaries are already processed and up to date.');
      }
    } catch (error: any) {
      alert('Error processing salaries: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const openPaymentModal = (staff: any) => {
    setSelectedPaymentStaff(staff);
    setPaymentAmount(staff.pending > 0 ? staff.pending.toString() : '');
    setPaymentType(staff.pending === staff.expected && staff.expected > 0 ? 'Full' : 'Partial');
    setPaymentNote('');
    setShowPaymentModal(true);
  };

  const submitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPaymentStaff || !paymentAmount || isNaN(Number(paymentAmount)) || Number(paymentAmount) <= 0) {
      return alert('Please enter a valid amount.');
    }

    setSubmittingPayment(true);
    try {
      const amountToPay = Number(paymentAmount);
      const payrollId = `${selectedPaymentStaff.empId || selectedPaymentStaff.id}_${selectedPaymentStaff.maturityDate}`;
      const payrollRef = doc(db, 'payroll', payrollId);
      const staffRef = doc(db, 'users', selectedPaymentStaff.id);
      
      const newPayment = {
        id: Date.now().toString(),
        amount: amountToPay,
        type: paymentType,
        note: paymentNote,
        date: new Date().toISOString()
      };

      const expectedSalary = selectedPaymentStaff.expected;
      const currentPaid = Number(selectedPaymentStaff.paid) || 0;
      const newPaidAmount = currentPaid + amountToPay;
      const status = newPaidAmount >= expectedSalary ? 'Paid' : 'Partial';
      const isFullyPaid = status === 'Paid';

      const batch = writeBatch(db);

      const existingRecord = payrollData.find(p => p.id === payrollId);

      if (!existingRecord) {
        batch.set(payrollRef, {
          staffId: selectedPaymentStaff.empId || selectedPaymentStaff.id,
          staffName: selectedPaymentStaff.name,
          department: selectedPaymentStaff.staffType || selectedPaymentStaff.department || 'General',
          maturityDate: selectedPaymentStaff.maturityDate,
          cycleStartDate: selectedPaymentStaff.cycleStartDate,
          cycleEndDate: selectedPaymentStaff.cycleEndDate,
          baseSalary: selectedPaymentStaff.baseSalary,
          totalWorkingDays: selectedPaymentStaff.computedCycle.totalWorkingDays,
          deductionDays: selectedPaymentStaff.computedCycle.deductionDays,
          perDaySalary: selectedPaymentStaff.computedCycle.perDaySalary,
          deductionDetails: selectedPaymentStaff.computedCycle.deductionDetails,
          expectedSalary: expectedSalary,
          paidAmount: newPaidAmount,
          status: status,
          payments: [newPayment],
          updatedAt: serverTimestamp()
        });
      } else {
        batch.update(payrollRef, {
          perDaySalary: selectedPaymentStaff.computedCycle.perDaySalary,
          expectedSalary: expectedSalary,
          deductionDays: selectedPaymentStaff.computedCycle.deductionDays,
          deductionDetails: selectedPaymentStaff.computedCycle.deductionDetails,
          paidAmount: newPaidAmount,
          status: status,
          payments: arrayUnion(newPayment),
          updatedAt: serverTimestamp()
        });
      }

      if (isFullyPaid) {
        // Advance nextSalaryDate by 1 month
        const currentMaturity = new Date(selectedPaymentStaff.maturityDate);
        currentMaturity.setMonth(currentMaturity.getMonth() + 1);
        batch.update(staffRef, {
          nextSalaryDate: currentMaturity.toISOString().split('T')[0]
        });
      }

      await batch.commit();
      setShowPaymentModal(false);
      if (isFullyPaid) {
        alert("Payment completed! Staff next salary date has rolled forward by 1 month.");
      }
    } catch (error: any) {
      alert('Error recording payment: ' + error.message);
    } finally {
      setSubmittingPayment(false);
    }
  };

  const openSalaryModal = (staff: any) => {
    setSelectedSalaryStaff(staff);
    setModalCycleOffset(0);
    setModalActiveTab('attendance');
    setShowSalaryModal(true);
  };

  const handleForgiveDeduction = async (item: any, index: number) => {
    if (!selectedSalaryStaff) return;
    setForgivingIndex(index);
    try {
      const payrollId = `${selectedSalaryStaff.empId || selectedSalaryStaff.id}_${selectedSalaryStaff.maturityDate}`;
      const payrollRef = doc(db, 'payroll', payrollId);

      // 1. Mark attendance collection log as forgiven if it exists
      const staffUids = [selectedSalaryStaff.id, selectedSalaryStaff.empId, selectedSalaryStaff.employeeId, selectedSalaryStaff.uid].filter(Boolean);
      const qAtt = query(
        collection(db, 'attendance'),
        where('date', '==', item.date)
      );
      const attSnap = await getDocs(qAtt);
      attSnap.forEach(async (attDoc) => {
        if (staffUids.includes(attDoc.data().staffId)) {
          await updateDoc(doc(db, 'attendance', attDoc.id), { forgiven: true });
        }
      });

      // 2. Update or create payroll record in Firestore
      const details = [...(selectedSalaryStaff.computedCycle?.deductionDetails || [])];
      if (details[index]) {
        details[index].forgiven = true;
      }

      const forgivenDays = details.filter((d: any) => d.forgiven).reduce((sum: number, d: any) => sum + d.deduction, 0);
      const originalDeductionDays = selectedSalaryStaff.computedCycle.deductionDays || 0;
      const newDeductionDays = Math.max(0, originalDeductionDays - forgivenDays);
      const perDaySalary = selectedSalaryStaff.computedCycle.perDaySalary || 0;
      const baseSalary = selectedSalaryStaff.baseSalary || 0;
      const newExpected = Math.max(0, Math.round(baseSalary - (newDeductionDays * perDaySalary)));

      await setDoc(payrollRef, {
        staffId: selectedSalaryStaff.empId || selectedSalaryStaff.id,
        staffName: selectedSalaryStaff.name,
        department: selectedSalaryStaff.staffType || selectedSalaryStaff.department || 'General',
        maturityDate: selectedSalaryStaff.maturityDate,
        cycleStartDate: selectedSalaryStaff.cycleStartDate,
        cycleEndDate: selectedSalaryStaff.cycleEndDate,
        baseSalary: baseSalary,
        totalWorkingDays: selectedSalaryStaff.computedCycle.totalWorkingDays,
        deductionDays: newDeductionDays,
        perDaySalary: perDaySalary,
        deductionDetails: details,
        expectedSalary: newExpected,
        paidAmount: selectedSalaryStaff.paid || 0,
        status: selectedSalaryStaff.status === 'Paid' ? 'Paid' : (selectedSalaryStaff.paid > 0 ? 'Partial' : 'Pending'),
        updatedAt: serverTimestamp()
      }, { merge: true });

      alert(`Deduction for ${item.date} has been forgiven! Updated expected salary: ₹${newExpected.toLocaleString()}`);
    } catch (error: any) {
      alert('Error forgiving deduction: ' + error.message);
    } finally {
      setForgivingIndex(null);
    }
  };

  // Search & Filter
  const filteredStaffData = staffTableData.filter(s => {
    const queryLower = searchQuery.toLowerCase().trim();
    const nameMatch = s.name?.toLowerCase().includes(queryLower);
    const phoneMatch = s.phone?.includes(queryLower) || s.phoneNumber?.includes(queryLower);
    const idMatch = (s.empId || s.employeeId || '').toLowerCase().includes(queryLower);
    const matchesSearch = !queryLower || nameMatch || phoneMatch || idMatch;

    const staffType = (s.staffType || s.department || s.roleType || '').toLowerCase();
    let matchesCategory = true;
    if (staffTypeFilter === 'Office Staff') {
      matchesCategory = staffType.includes('office') || staffType.includes('admin') || staffType.includes('reception') || staffType.includes('manager') || staffType.includes('lab');
    } else if (staffTypeFilter === 'Field Staff') {
      matchesCategory = staffType.includes('field') || staffType.includes('phlebo') || staffType.includes('collector') || staffType.includes('rider') || staffType.includes('sample');
    } else if (staffTypeFilter !== 'all') {
      matchesCategory = staffType.includes(staffTypeFilter.toLowerCase());
    }

    let matchesMatured = true;
    if (filterMaturedOnly) {
      matchesMatured = s.isMatured && s.status !== 'Paid';
    }

    return matchesSearch && matchesCategory && matchesMatured;
  });

  // Pagination Logic (10 items per page)
  const totalPages = Math.ceil(filteredStaffData.length / ITEMS_PER_PAGE) || 1;
  const paginatedStaffData = filteredStaffData.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Active calculation for selected modal staff (allows cycling back to past months)
  const modalCycleData = selectedSalaryStaff ? (
    modalCycleOffset === 0 
      ? selectedSalaryStaff.computedCycle 
      : calculateSalaryCycleData(
          selectedSalaryStaff,
          selectedSalaryStaff.nextSalaryDate,
          selectedSalaryStaff.baseSalary,
          globalAttendance,
          globalLeaves,
          globalHolidays,
          globalOffCancels,
          modalCycleOffset
        )
  ) : null;

  // Generate selectable salary cycles for the selected staff member
  const cycleSelectOptions = React.useMemo(() => {
    if (!selectedSalaryStaff) return [];
    const options = [];
    for (let offset = 0; offset <= 5; offset++) {
      const cData = (offset === 0 && selectedSalaryStaff.computedCycle)
        ? selectedSalaryStaff.computedCycle
        : calculateSalaryCycleData(
            selectedSalaryStaff,
            selectedSalaryStaff.nextSalaryDate,
            selectedSalaryStaff.baseSalary,
            globalAttendance,
            globalLeaves,
            globalHolidays,
            globalOffCancels,
            offset
          );
      if (!cData || !cData.cycleStartDate || !cData.cycleEndDate) continue;
      const startFmt = new Date(cData.cycleStartDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
      const endFmt = new Date(cData.cycleEndDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
      
      let prefix = 'Current Cycle';
      if (offset === 1) prefix = 'Previous Cycle (1 Month Ago)';
      else if (offset > 1) prefix = `${offset} Cycles Ago`;

      options.push({
        value: offset,
        label: `${prefix}: ${startFmt} — ${endFmt}`
      });
    }
    return options;
  }, [selectedSalaryStaff, globalAttendance, globalLeaves, globalHolidays, globalOffCancels]);

  // Export Selected Cycle Details to Excel (.xlsx)
  const handleExportCycleExcel = () => {
    if (!selectedSalaryStaff || !modalCycleData) return;
    setIsExporting(true);
    try {
      const wb = XLSX.utils.book_new();

      // ----------------------------------------------------
      // Sheet 1: Daily Attendance History (Primary Sheet on open)
      // ----------------------------------------------------
      const attBannerData: any[][] = [
        ['STAFF SALARY CYCLE - DAILY ATTENDANCE & PUNCH REPORT'],
        ['Report Generated On', new Date().toLocaleString('en-GB'), '', 'Cycle Type', modalCycleOffset === 0 ? 'Current Active Cycle' : `${modalCycleOffset} Cycle(s) Prior`],
        [],
        ['Staff Name', selectedSalaryStaff.name || '—', 'Employee ID', selectedSalaryStaff.empId || selectedSalaryStaff.employeeId || 'N/A', 'Designation', selectedSalaryStaff.designation || 'Staff', 'Department', selectedSalaryStaff.staffType || selectedSalaryStaff.department || 'General'],
        ['Cycle Period', `${modalCycleData.cycleStartDate} to ${modalCycleData.cycleEndDate}`, 'Total Days in Cycle', modalCycleData.totalCycleDays, 'Total Working Days', modalCycleData.totalWorkingDays, 'Shift Timings', `${selectedSalaryStaff.shiftStartTime || '--'} to ${selectedSalaryStaff.shiftEndTime || '--'}`],
        ['Present Days', modalCycleData.stats?.present || 0, 'Late Days', modalCycleData.stats?.late || 0, 'Half Days', modalCycleData.stats?.halfDay || 0, 'Absent Days', modalCycleData.stats?.absent || 0, 'Weekly Off Days', modalCycleData.stats?.weeklyOff || 0, 'Company Holidays', modalCycleData.stats?.holiday || 0],
        ['Base Monthly Salary', `₹${modalCycleData.baseSalary}`, 'Per Day Rate (÷ 30)', `₹${modalCycleData.perDaySalary}`, 'Total Deductions', `₹${modalCycleData.totalDeductionAmount}`, 'Net Payable', `₹${modalCycleData.expectedSalary}`],
        [],
      ];

      const attendanceHeaders = [
        'Day #',
        'Date',
        'Day',
        'Attendance Status',
        'Punch In Time (Aane Ka Time)',
        'Punch Out Time (Jaane Ka Time)',
        'Total Working Hours',
        'Late Duration (Kitna Late)',
        'Punch In Location (Aane Ka Location)',
        'Punch Out Location (Jaane Ka Location)',
        'Deduction Amount (₹)',
        'Deduction Status',
        'Notes / Remarks'
      ];

      const attendanceRows = (modalCycleData.fullCalendar || []).map((day: any) => {
        let punchInStr = '—';
        let punchOutStr = '—';
        if (day.punchIn) {
          try {
            const pIn = new Date(day.punchIn);
            punchInStr = !isNaN(pIn.getTime())
              ? pIn.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
              : String(day.punchIn);
          } catch {
            punchInStr = String(day.punchIn);
          }
        }
        if (day.punchOut) {
          try {
            const pOut = new Date(day.punchOut);
            punchOutStr = !isNaN(pOut.getTime())
              ? pOut.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
              : String(day.punchOut);
          } catch {
            punchOutStr = String(day.punchOut);
          }
        } else if (day.punchIn) {
          punchOutStr = 'Not Punched Out';
        }

        let lateStr = '—';
        if (day.lateMinutes > 0) {
          lateStr = `${day.lateMinutes} mins late`;
        } else if (day.status === 'Present' || day.status === 'On Duty') {
          lateStr = 'On-Time (0 min)';
        } else if (day.status === 'Late') {
          lateStr = 'Late (Grace exceeded)';
        }

        const punchInLocation = day.locationIn || (day.punchIn ? 'Location Not Captured' : '—');
        const punchOutLocation = day.locationOut || (day.punchOut ? 'Location Not Captured' : (day.punchIn ? 'Shift In Progress / Not Punched Out' : '—'));

        const note = day.holidayTitle
          ? `Holiday: ${day.holidayTitle}`
          : day.leaveReason
          ? `Leave: ${day.leaveReason}`
          : day.forgiven
          ? 'Deduction Waived by Admin'
          : '—';

        const deductionStatus = day.forgiven
          ? 'Forgiven (Waived)'
          : day.deductionAmount > 0
          ? 'Deducted'
          : 'None';

        return [
          day.dayNumber,
          new Date(day.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
          day.dayName,
          day.status,
          punchInStr,
          punchOutStr,
          day.hours || (day.punchIn && !day.punchOut ? 'In Progress' : '—'),
          lateStr,
          punchInLocation,
          punchOutLocation,
          day.deductionAmount || 0,
          deductionStatus,
          note
        ];
      });

      const wsAttendance = XLSX.utils.aoa_to_sheet([
        ...attBannerData,
        attendanceHeaders,
        ...attendanceRows
      ]);
      wsAttendance['!cols'] = [
        { wch: 8 },  // Day #
        { wch: 15 }, // Date
        { wch: 12 }, // Day
        { wch: 18 }, // Attendance Status
        { wch: 22 }, // Punch In Time
        { wch: 24 }, // Punch Out Time
        { wch: 20 }, // Total Working Hours
        { wch: 22 }, // Late Duration
        { wch: 42 }, // Punch In Location
        { wch: 42 }, // Punch Out Location
        { wch: 18 }, // Deduction Amount (₹)
        { wch: 20 }, // Deduction Status
        { wch: 32 }  // Notes / Remarks
      ];
      XLSX.utils.book_append_sheet(wb, wsAttendance, 'Daily Attendance');

      // ----------------------------------------------------
      // Sheet 2: Cycle & Salary Summary
      // ----------------------------------------------------
      const summaryData: any[][] = [
        ['STAFF SALARY & ATTENDANCE CYCLE REPORT'],
        ['Report Generated On', new Date().toLocaleString('en-GB')],
        [],
        ['--- STAFF PROFILE INFORMATION ---', ''],
        ['Staff Name', selectedSalaryStaff.name || '—'],
        ['Employee ID', selectedSalaryStaff.empId || selectedSalaryStaff.employeeId || 'N/A'],
        ['Designation / Role', selectedSalaryStaff.designation || 'Staff'],
        ['Department / Type', selectedSalaryStaff.staffType || selectedSalaryStaff.department || 'General'],
        ['Contact Phone', selectedSalaryStaff.phone || selectedSalaryStaff.phoneNumber || 'N/A'],
        ['Email Address', selectedSalaryStaff.email || 'N/A'],
        ['Shift Timings', `${selectedSalaryStaff.shiftStartTime || '--'} to ${selectedSalaryStaff.shiftEndTime || '--'}`],
        ['Weekly Off', selectedSalaryStaff.weeklyOff || 'Sunday'],
        [],
        ['--- SALARY CYCLE TIMELINE ---', ''],
        ['Cycle Start Date', modalCycleData.cycleStartDate],
        ['Cycle End Date', modalCycleData.cycleEndDate],
        ['Cycle Period', `${new Date(modalCycleData.cycleStartDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} — ${new Date(modalCycleData.cycleEndDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`],
        ['Salary Maturity / Payment Date', new Date(modalCycleData.maturityDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })],
        ['Selected Cycle Type', modalCycleOffset === 0 ? 'Current Active Cycle' : `${modalCycleOffset} Cycle(s) Prior`],
        ['Total Days in Cycle', modalCycleData.totalCycleDays],
        ['Total Working Days', modalCycleData.totalWorkingDays],
        ['Days Elapsed', modalCycleData.daysElapsed],
        [],
        ['--- FINANCIAL & SALARY CALCULATIONS ---', ''],
        ['Base Monthly Salary (₹)', modalCycleData.baseSalary],
        ['Per Day Salary Rate (₹) [÷ 30 Days]', modalCycleData.perDaySalary],
        ['Per Hour Rate (₹) [9 Hrs Shift]', modalCycleData.perHourSalary],
        ['Earned Till Today (₹)', modalCycleData.earnedTillToday],
        ['Total Deductions Amount (₹)', modalCycleData.totalDeductionAmount],
        ['Total Deduction Days Cut', modalCycleData.deductionDays],
        ['Net Payable on Salary Date (₹)', modalCycleData.expectedSalary],
        [],
        ['--- ATTENDANCE SUMMARY COUNTS ---', ''],
        ['Present Days', modalCycleData.stats?.present || 0],
        ['Absent Days', modalCycleData.stats?.absent || 0],
        ['Late Days', modalCycleData.stats?.late || 0],
        ['Half Days', modalCycleData.stats?.halfDay || 0],
        ['Weekly Off Days', modalCycleData.stats?.weeklyOff || 0],
        ['Company Holidays', modalCycleData.stats?.holiday || 0],
        ['Approved Leaves', modalCycleData.stats?.onLeave || 0],
        [],
        ['--- BANK ACCOUNT DETAILS ---', ''],
        ['Account Holder Name', selectedSalaryStaff.bankDetails?.accountHolder || selectedSalaryStaff.name || 'N/A'],
        ['Bank Name', selectedSalaryStaff.bankDetails?.bankName || 'N/A'],
        ['Account Number', selectedSalaryStaff.bankDetails?.accountNumber || 'N/A'],
        ['IFSC Code', selectedSalaryStaff.bankDetails?.ifsc || 'N/A'],
        ['Branch Name', selectedSalaryStaff.bankDetails?.branch || 'N/A']
      ];

      const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
      wsSummary['!cols'] = [{ wch: 34 }, { wch: 40 }];
      XLSX.utils.book_append_sheet(wb, wsSummary, 'Cycle & Salary Summary');

      // ----------------------------------------------------
      // Sheet 3: Deductions Breakdown
      // ----------------------------------------------------
      const deductionHeaders = [
        '#',
        'Deduction Date',
        'Day Name',
        'Reason / Status',
        'Punch In Time',
        'Punch Out Time',
        'Late Minutes',
        'Cut Fraction (Days)',
        'Deduction Amount (₹)',
        'Resolution Status'
      ];

      const deductionRows = (modalCycleData.deductionDetails || []).map((item: any, idx: number) => {
        let punchInTime = '—';
        let punchOutTime = '—';
        if (item.punchIn) {
          try {
            punchInTime = new Date(item.punchIn).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
          } catch {}
        }
        if (item.punchOut) {
          try {
            punchOutTime = new Date(item.punchOut).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
          } catch {}
        }

        return [
          idx + 1,
          new Date(item.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
          item.dayName,
          item.status + (item.status === 'Late' && item.lateMinutes ? ` (${item.lateMinutes}m)` : ''),
          punchInTime,
          punchOutTime,
          item.lateMinutes || 0,
          `${item.deduction} day`,
          item.amount,
          item.forgiven ? 'Forgiven (Refunded)' : 'Active Cut'
        ];
      });

      if (deductionRows.length === 0) {
        deductionRows.push([
          '-', '-', '-', 'No attendance deductions for this salary cycle (100% On-time / Present)', '-', '-', '-', '-', 0, 'Clean Record'
        ]);
      }

      const wsDeductions = XLSX.utils.aoa_to_sheet([deductionHeaders, ...deductionRows]);
      wsDeductions['!cols'] = [
        { wch: 6 },
        { wch: 15 },
        { wch: 12 },
        { wch: 22 },
        { wch: 16 },
        { wch: 16 },
        { wch: 14 },
        { wch: 22 },
        { wch: 22 },
        { wch: 22 }
      ];
      XLSX.utils.book_append_sheet(wb, wsDeductions, 'Deductions Breakdown');

      // Filename formatted with staff name and selected cycle dates
      const safeStaffName = (selectedSalaryStaff.name || 'Staff').trim().replace(/[^a-zA-Z0-9_-]/g, '_');
      const filename = `${safeStaffName}_Salary_Attendance_${modalCycleData.cycleStartDate}_to_${modalCycleData.cycleEndDate}.xlsx`;

      XLSX.writeFile(wb, filename);
    } catch (error) {
      console.error('Failed to export Excel file:', error);
      alert('Failed to export Excel file. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  // Recent payments list
  const recentPayments = payrollData
    .flatMap(p => (p.payments || []).map((pay: any) => ({ ...pay, staffName: p.staffName })))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  return (
    <div className="animate-in fade-in duration-500">
      
      {/* ----- TOP STATS ROW ----- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        
        {/* Total Payroll */}
        <div className="bg-white rounded-[20px] p-5 shadow-sm border border-gray-100 flex flex-col justify-between">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
              <Wallet size={24} strokeWidth={2} />
            </div>
            <div>
              <p className="text-gray-500 text-[11px] font-bold uppercase tracking-wider mb-1">Total Payroll ({currentMonthYear})</p>
              <h3 className="text-2xl font-extrabold text-gray-900 leading-tight">₹ {totalPayable.toLocaleString()}</h3>
            </div>
          </div>
          <div className="flex items-center justify-between text-[11px] text-gray-500 mt-3 pt-2 border-t border-gray-50">
            <span>Base Salary: ₹ {totalBasePayable.toLocaleString()}</span>
            <span className="text-red-500 font-bold">-₹ {totalDeductionsSoFar.toLocaleString()} cut</span>
          </div>
        </div>

        {/* Total Earned So Far in Running Cycle */}
        <div className="bg-white rounded-[20px] p-5 shadow-sm border border-gray-100 flex flex-col justify-between">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
              <TrendingUp size={24} strokeWidth={2} />
            </div>
            <div>
              <p className="text-gray-500 text-[11px] font-bold uppercase tracking-wider mb-1">Earned Till Today</p>
              <h3 className="text-2xl font-extrabold text-emerald-600 leading-tight">₹ {totalEarnedSoFar.toLocaleString()}</h3>
            </div>
          </div>
          <div className="flex items-center justify-between text-[11px] text-gray-500 mt-3 pt-2 border-t border-gray-50">
            <span>Based on live attendance</span>
            <span className="text-emerald-700 font-bold">Active Cycle</span>
          </div>
        </div>

        {/* Matured Pending Amount (Clickable Filter) */}
        <div 
          onClick={() => {
            setFilterMaturedOnly(!filterMaturedOnly);
            setCurrentPage(1);
          }}
          className={`bg-white rounded-[20px] p-5 shadow-sm border ${
            filterMaturedOnly ? 'border-amber-500 ring-2 ring-amber-500/20' : 'border-gray-100'
          } flex flex-col justify-between cursor-pointer hover:shadow-md transition-all duration-200`}
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
              <Hourglass size={24} strokeWidth={2} />
            </div>
            <div>
              <p className="text-gray-500 text-[11px] font-bold uppercase tracking-wider mb-1">Matured Due Amount</p>
              <h3 className="text-2xl font-extrabold text-amber-600 leading-tight">
                ₹ {totalMaturedPendingAmount.toLocaleString()}
              </h3>
            </div>
          </div>
          <div className="flex justify-between items-center text-[11px] mt-3 pt-2 border-t border-gray-50">
            <span className="text-gray-600 font-medium">{maturedPendingStaffCount} staff salary matured</span>
            {filterMaturedOnly ? (
              <span className="text-[9px] font-extrabold text-amber-700 bg-amber-100 px-2 py-0.5 rounded uppercase">
                Filter Active
              </span>
            ) : (
              <span className="text-blue-600 font-bold hover:underline">Click to view</span>
            )}
          </div>
        </div>

        {/* Total Paid / Pending */}
        <div className="bg-white rounded-[20px] p-5 shadow-sm border border-gray-100 flex flex-col justify-between">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
              <CreditCard size={24} strokeWidth={2} />
            </div>
            <div>
              <p className="text-gray-500 text-[11px] font-bold uppercase tracking-wider mb-1">Total Paid This Month</p>
              <h3 className="text-2xl font-extrabold text-gray-900 leading-tight">₹ {paidAmount.toLocaleString()}</h3>
            </div>
          </div>
          <div className="flex items-center justify-between text-[11px] text-gray-500 mt-3 pt-2 border-t border-gray-50">
            <span>Pending: <strong className="text-red-500">₹ {pendingAmount.toLocaleString()}</strong></span>
            <span className="text-blue-600 font-bold">{paidPercentage}% Cleared</span>
          </div>
        </div>

      </div>

      {/* ----- MAIN SECTION ----- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        
        {/* Left Panel: Staff Salary & Attendance Cycle Table */}
        <div className="bg-white rounded-[20px] p-5 shadow-sm border border-gray-100 lg:col-span-2 flex flex-col">
          
          <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-3 mb-5">
            <div>
              <h3 className="text-gray-900 font-bold text-lg shrink-0 flex items-center gap-2">
                Staff Salary & Attendance Cycle
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">Live salary generated in running cycle, deductions breakdown, and maturity dates</p>
            </div>

            {/* Search, Filter & Action controls */}
            <div className="flex flex-wrap items-center gap-2.5 flex-1 lg:justify-end">
              {filterMaturedOnly && (
                <button 
                  onClick={() => setFilterMaturedOnly(false)}
                  className="bg-amber-50 hover:bg-amber-100 text-amber-700 text-[11px] font-bold px-3 py-1.5 rounded-xl border border-amber-200 transition-colors flex items-center gap-1.5 shadow-sm shrink-0"
                >
                  <span>Matured Only</span>
                  <span className="font-extrabold text-xs">×</span>
                </button>
              )}

              {/* Search Bar (Name, ID or Phone) */}
              <div className="relative flex-1 sm:w-56 min-w-[170px]">
                <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                  placeholder="Search name, ID or phone..." 
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-8 pr-3 py-2 text-xs text-gray-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-medium"
                />
                {searchQuery && (
                  <button 
                    onClick={() => { setSearchQuery(''); setCurrentPage(1); }}
                    className="absolute right-2.5 top-2 text-xs text-gray-400 hover:text-gray-600 font-bold"
                  >
                    ×
                  </button>
                )}
              </div>

              {/* Staff Type Filter */}
              <select 
                value={staffTypeFilter}
                onChange={(e) => { setStaffTypeFilter(e.target.value); setCurrentPage(1); }}
                className="bg-gray-50 border border-gray-200 text-gray-800 text-xs font-semibold rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                <option value="all">All Departments</option>
                <option value="Office Staff">Office Staff</option>
                <option value="Field Staff">Field Staff</option>
              </select>

              {/* Process Salaries Button */}
              <button 
                onClick={handleProcessMaturedSalaries}
                disabled={loading || totalPayable === 0}
                className={`flex items-center gap-1.5 ${loading || totalPayable === 0 ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'} text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-colors shadow-sm shadow-blue-200 shrink-0`}
              >
                {loading ? 'Processing...' : <><Play size={13} strokeWidth={2.5} fill="currentColor" /> Process Matured</>}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left min-w-[1000px]">
              <thead>
                <tr className="border-y border-gray-100 bg-gray-50/50">
                  <th className="py-3 px-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Staff Member</th>
                  <th className="py-3 px-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Salary Cycle</th>
                  <th className="py-3 px-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Base Salary</th>
                  <th className="py-3 px-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-emerald-700">Earned Till Today</th>
                  <th className="py-3 px-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-red-600">Deductions</th>
                  <th className="py-3 px-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Net on Salary Date</th>
                  <th className="py-3 px-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Salary Date</th>
                  <th className="py-3 px-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="py-3 px-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedStaffData.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-10 text-center text-gray-400 text-sm">No staff records found matching your filters.</td>
                  </tr>
                ) : (
                  paginatedStaffData.map((row) => (
                    <tr key={row.id} className="border-b border-gray-50 last:border-0 hover:bg-blue-50/20 transition-colors">
                      
                      {/* Staff Name & ID */}
                      <td className="py-3.5 px-4 cursor-pointer" onClick={() => openSalaryModal(row)}>
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs shrink-0 uppercase">
                            {row.name?.charAt(0) || 'S'}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[13px] font-bold text-gray-900 hover:text-blue-600 hover:underline">{row.name}</span>
                              {row.bankDetails?.accountNumber ? (
                                <span className="text-[9px] bg-emerald-50 text-emerald-700 px-1.5 py-0.2 rounded font-bold border border-emerald-200 flex items-center gap-0.5" title={`${row.bankDetails.bankName}: ${row.bankDetails.accountNumber}`}>
                                  <CreditCard size={9} /> Bank
                                </span>
                              ) : null}
                            </div>
                            <p className="text-[10px] text-gray-400 font-medium mt-0.5">
                              {row.empId || 'ID: --'} • {row.staffType || row.department || 'Staff'}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Salary Cycle & Days Elapsed */}
                      <td className="py-3.5 px-3">
                        <div className="text-xs font-semibold text-gray-800">
                          {new Date(row.cycleStartDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} - {new Date(row.cycleEndDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <div className="w-16 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                            <div 
                              className="bg-blue-500 h-full rounded-full" 
                              style={{ width: `${Math.min(100, Math.round((row.daysElapsed / Math.max(1, row.totalCycleDays)) * 100))}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-bold text-gray-500">Day {row.daysElapsed}/{row.totalCycleDays}</span>
                        </div>
                      </td>

                      {/* Monthly Base Salary */}
                      <td className="py-3.5 px-3 text-xs font-bold text-gray-700">
                        ₹ {row.baseSalary.toLocaleString()}
                      </td>

                      {/* Earned Till Today */}
                      <td className="py-3.5 px-3">
                        <div className="text-xs font-extrabold text-emerald-600 flex items-center gap-1">
                          <ArrowUpRight size={13} className="text-emerald-500" />
                          ₹ {row.earnedTillToday.toLocaleString()}
                        </div>
                        <p className="text-[10px] text-gray-400 font-medium">So far in cycle</p>
                      </td>

                      {/* Total Deducted So Far */}
                      <td className="py-3.5 px-3">
                        <div className={`text-xs font-bold ${row.totalDeducted > 0 ? 'text-red-500 flex items-center gap-0.5' : 'text-gray-400'}`}>
                          {row.totalDeducted > 0 && <ArrowDownRight size={13} className="text-red-500" />}
                          {row.totalDeducted > 0 ? `- ₹ ${row.totalDeducted.toLocaleString()}` : '₹ 0'}
                        </div>
                        {row.computedCycle.deductionDays > 0 ? (
                          <span className="text-[10px] text-red-500 font-semibold cursor-pointer hover:underline" onClick={() => openSalaryModal(row)}>
                            {row.computedCycle.deductionDays}d cut (View)
                          </span>
                        ) : (
                          <span className="text-[10px] text-emerald-600 font-medium">No deductions</span>
                        )}
                      </td>

                      {/* Expected Net on Salary Date */}
                      <td className="py-3.5 px-3">
                        <div className="text-xs font-extrabold text-blue-700">
                          ₹ {row.expected.toLocaleString()}
                        </div>
                        {row.paid > 0 && (
                          <p className="text-[10px] text-emerald-600 font-bold">Paid: ₹{row.paid.toLocaleString()}</p>
                        )}
                      </td>

                      {/* Salary Maturity Date */}
                      <td className="py-3.5 px-3">
                        <span className={`text-xs font-bold ${row.isMatured ? 'text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200' : 'text-gray-700'}`}>
                          {new Date(row.maturityDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                        </span>
                        <p className="text-[9px] text-gray-400 mt-0.5">
                          {row.isMatured ? 'Due Now' : 'Upcoming Date'}
                        </p>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-3">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
                          row.status === 'Paid' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 
                          row.status === 'Partial' ? 'bg-amber-100 text-amber-700 border border-amber-200' : 
                          row.status === 'Not Due' ? 'bg-gray-100 text-gray-600 border border-gray-200' :
                          'bg-red-100 text-red-700 border border-red-200'
                        }`}>
                          {row.status === 'Not Due' ? 'Running' : row.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button 
                            onClick={() => openSalaryModal(row)}
                            className="bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1"
                            title="View Daily Attendance & Deductions"
                          >
                            <CalendarDays size={13} />
                            Details
                          </button>
                          <button 
                            onClick={() => openPaymentModal(row)}
                            className="bg-blue-600 text-white hover:bg-blue-700 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm shadow-blue-200"
                          >
                            Pay
                          </button>
                        </div>
                      </td>

                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-4 border-t border-gray-100 mt-4">
            <p className="text-xs text-gray-500 font-medium">
              Showing <span className="font-bold text-gray-900">{filteredStaffData.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0}</span> to <span className="font-bold text-gray-900">{Math.min(currentPage * ITEMS_PER_PAGE, filteredStaffData.length)}</span> of <span className="font-bold text-gray-900">{filteredStaffData.length}</span> staff members
            </p>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
              >
                <ChevronLeft size={14} /> Previous
              </button>

              <span className="text-xs font-bold text-gray-700 px-2">
                Page {currentPage} of {totalPages}
              </span>

              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage >= totalPages}
                className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Right Panel: Side Widgets */}
        <div className="flex flex-col gap-6 lg:col-span-1">
          
          {/* Payroll Overview Chart */}
          <div className="bg-white rounded-[20px] p-5 shadow-sm border border-gray-100 flex flex-col">
            <h3 className="text-gray-900 font-bold text-[15px] mb-5">Payroll Clearance <span className="text-gray-400 font-normal text-xs">({currentMonthYear})</span></h3>
            <div className="flex items-center justify-between gap-3">
              <div className="relative w-28 h-28 rounded-full flex items-center justify-center shrink-0" 
                   style={{ background: `conic-gradient(#10B981 0% ${paidPercentage}%, #EF4444 ${paidPercentage}% 100%)` }}>
                <div className="absolute w-[80px] h-[80px] bg-white rounded-full flex flex-col items-center justify-center shadow-inner">
                  <span className="text-gray-400 text-[9px] font-bold uppercase">Total</span>
                  <span className="text-xs font-extrabold text-gray-900">₹ {totalPayable.toLocaleString()}</span>
                </div>
              </div>
              <div className="flex-1 space-y-2.5 pl-2">
                <div className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div><span className="text-gray-600 font-medium">Paid</span></div>
                  <span className="text-gray-900 font-bold">₹ {paidAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-red-500"></div><span className="text-gray-600 font-medium">Pending</span></div>
                  <span className="text-gray-900 font-bold">₹ {pendingAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-xs pt-1.5 border-t border-gray-100">
                  <span className="text-gray-500 font-medium">Cleared %</span>
                  <span className="text-emerald-600 font-extrabold">{paidPercentage}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Payroll Transactions */}
          <div className="bg-white rounded-[20px] p-5 shadow-sm border border-gray-100 flex-1">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-gray-900 font-bold text-[15px]">Recent Transactions</h3>
              <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-bold">Live</span>
            </div>
            <div className="space-y-3.5">
              {recentPayments.length > 0 ? (
                recentPayments.map((pay, i) => (
                  <div key={i} className="flex justify-between items-start border-b border-gray-50 pb-3 last:border-0 last:pb-0">
                    <div>
                      <p className="text-xs font-bold text-gray-900">{pay.staffName}</p>
                      <p className="text-[10px] text-gray-500 mt-0.5">{new Date(pay.date).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{pay.type} {pay.note ? `• ${pay.note}` : ''}</p>
                    </div>
                    <span className="text-xs font-extrabold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                      + ₹{Number(pay.amount).toLocaleString()}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-center text-gray-400 text-xs py-8">No recent payments recorded.</div>
              )}
            </div>
          </div>

        </div>

      </div>

      {/* ========================================================================= */}
      {/* ----- SALARY & FULL MONTH ATTENDANCE HISTORY MODAL (EXPANDED) ----- */}
      {/* ========================================================================= */}
      {showSalaryModal && selectedSalaryStaff && modalCycleData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-gray-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[92vh] flex flex-col border border-gray-200">
            
            {/* Modal Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-5 sm:p-6 border-b border-gray-100 bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white shrink-0 gap-3">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-lg font-extrabold text-white uppercase">
                  {selectedSalaryStaff.name?.charAt(0) || 'S'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-lg sm:text-xl text-white tracking-tight">{selectedSalaryStaff.name}</h3>
                    <span className="bg-blue-500/30 text-blue-200 border border-blue-400/30 text-[10px] px-2 py-0.5 rounded-full font-bold">
                      {selectedSalaryStaff.empId || 'ID: --'}
                    </span>
                  </div>
                  <p className="text-xs text-blue-200 mt-0.5">
                    {selectedSalaryStaff.designation || selectedSalaryStaff.staffType || 'Staff'} • {selectedSalaryStaff.department || 'General'}
                  </p>
                </div>
              </div>

              {/* Top Right Actions */}
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  onClick={handleExportCycleExcel}
                  disabled={isExporting}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-500 text-xs px-3.5 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 shadow-sm hover:shadow-emerald-500/20 disabled:opacity-50 cursor-pointer"
                  title="Export this cycle's attendance & salary details to Excel"
                >
                  <Download size={13} /> {isExporting ? 'Exporting...' : 'Export to Excel'}
                </button>
                <button
                  onClick={() => setFullViewStaff(selectedSalaryStaff)}
                  className="bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 shadow-sm"
                >
                  <Eye size={13} /> Full Profile
                </button>
                <button 
                  onClick={() => setShowSalaryModal(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Cycle Selector & 5 Metric Summary Cards */}
            <div className="px-5 sm:px-6 pt-5 pb-3 border-b border-gray-100 bg-gray-50/50 shrink-0">
              
              {/* Cycle Dropdown Header */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
                <div className="flex items-center gap-2">
                  <CalendarDays size={18} className="text-blue-600" />
                  <span className="text-xs font-extrabold text-gray-900 uppercase tracking-wider">Salary Cycle:</span>
                  <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100">
                    {new Date(modalCycleData.cycleStartDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} — {new Date(modalCycleData.cycleEndDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </div>

                {/* History Cycle Switcher */}
                <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
                  <span className="text-[11px] font-semibold text-gray-500">View Cycle:</span>
                  <select 
                    value={modalCycleOffset} 
                    onChange={(e) => setModalCycleOffset(Number(e.target.value))}
                    className="bg-white border border-gray-200 text-xs font-bold text-gray-800 rounded-xl px-3 py-1.5 outline-none cursor-pointer focus:border-blue-500 shadow-sm"
                  >
                    {cycleSelectOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>

                  <button
                    onClick={handleExportCycleExcel}
                    disabled={isExporting}
                    className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition-all shadow-sm shadow-emerald-200 disabled:opacity-50 cursor-pointer"
                    title="Export selected cycle to Excel file"
                  >
                    <Download size={13} />
                    {isExporting ? 'Exporting...' : 'Export Excel'}
                  </button>
                </div>
              </div>

              {/* 5 Key Metric Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                
                {/* 1. Base Salary */}
                <div className="bg-white rounded-2xl p-3 border border-gray-200 shadow-xs">
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Base Monthly</p>
                  <p className="text-base sm:text-lg font-extrabold text-gray-900 mt-0.5">
                    ₹ {modalCycleData.baseSalary.toLocaleString()}
                  </p>
                  <p className="text-[9px] text-gray-400 mt-0.5">₹{modalCycleData.perDaySalary}/day (÷30) • ₹{modalCycleData.perHourSalary}/hr (9h)</p>
                </div>

                {/* 2. Days in Cycle */}
                <div className="bg-white rounded-2xl p-3 border border-gray-200 shadow-xs">
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Cycle Duration</p>
                  <p className="text-base sm:text-lg font-extrabold text-blue-600 mt-0.5">
                    {modalCycleData.daysElapsed} <span className="text-xs font-medium text-gray-500">/ {modalCycleData.totalCycleDays} days</span>
                  </p>
                  <p className="text-[9px] text-blue-600 font-semibold mt-0.5">{modalCycleData.totalWorkingDays} working days</p>
                </div>

                {/* 3. Earned So Far */}
                <div className="bg-emerald-50/70 rounded-2xl p-3 border border-emerald-200/80 shadow-xs">
                  <p className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider">Earned Till Today</p>
                  <p className="text-base sm:text-lg font-extrabold text-emerald-700 mt-0.5">
                    ₹ {modalCycleData.earnedTillToday.toLocaleString()}
                  </p>
                  <p className="text-[9px] text-emerald-600 font-semibold mt-0.5">{modalCycleData.stats?.present || 0}d present</p>
                </div>

                {/* 4. Total Deductions */}
                <div className="bg-red-50/70 rounded-2xl p-3 border border-red-200/80 shadow-xs">
                  <p className="text-[10px] text-red-700 font-bold uppercase tracking-wider">Total Deductions</p>
                  <p className="text-base sm:text-lg font-extrabold text-red-600 mt-0.5">
                    - ₹ {modalCycleData.totalDeductionAmount.toLocaleString()}
                  </p>
                  <p className="text-[9px] text-red-500 font-semibold mt-0.5">{modalCycleData.deductionDays}d total cut</p>
                </div>

                {/* 5. Net Payable on Salary Date */}
                <div className="bg-blue-50 rounded-2xl p-3 border border-blue-200 shadow-xs col-span-2 sm:col-span-1">
                  <p className="text-[10px] text-blue-700 font-bold uppercase tracking-wider">Net on Salary Date</p>
                  <p className="text-base sm:text-lg font-extrabold text-blue-800 mt-0.5">
                    ₹ {modalCycleData.expectedSalary.toLocaleString()}
                  </p>
                  <p className="text-[9px] text-blue-600 font-semibold mt-0.5">
                    Date: {new Date(modalCycleData.maturityDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                  </p>
                </div>

              </div>

            </div>

            {/* Navigation Tabs in Modal */}
            <div className="flex items-center gap-2 px-5 sm:px-6 pt-3 border-b border-gray-100 bg-white shrink-0 overflow-x-auto">
              <button
                onClick={() => setModalActiveTab('attendance')}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
                  modalActiveTab === 'attendance'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-900'
                }`}
              >
                <CalendarDays size={14} />
                Full Month Attendance History
                <span className="bg-blue-100 text-blue-700 text-[10px] px-1.5 py-0.2 rounded-full font-extrabold">
                  {modalCycleData.fullCalendar?.length || 0} Days
                </span>
              </button>

              <button
                onClick={() => setModalActiveTab('deductions')}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
                  modalActiveTab === 'deductions'
                    ? 'border-red-600 text-red-600'
                    : 'border-transparent text-gray-500 hover:text-gray-900'
                }`}
              >
                <AlertTriangle size={14} />
                Deductions Breakdown & Dates
                {modalCycleData.deductionDetails?.length > 0 && (
                  <span className="bg-red-100 text-red-700 text-[10px] px-1.5 py-0.2 rounded-full font-extrabold">
                    {modalCycleData.deductionDetails.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setModalActiveTab('bank')}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
                  modalActiveTab === 'bank'
                    ? 'border-slate-800 text-slate-800'
                    : 'border-transparent text-gray-500 hover:text-gray-900'
                }`}
              >
                <Landmark size={14} />
                Bank Account Details
              </button>
            </div>

            {/* Modal Body / Tab Content */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6">
              
              {/* ================= TAB 1: FULL MONTH ATTENDANCE CALENDAR ================= */}
              {modalActiveTab === 'attendance' && (
                <div>
                  
                  {/* Quick Attendance Stats Pills */}
                  <div className="grid grid-cols-3 sm:grid-cols-7 gap-2 mb-4 text-center">
                    <div className="bg-emerald-50 border border-emerald-100 p-2 rounded-xl">
                      <p className="text-xs font-bold text-emerald-800">{modalCycleData.stats?.present || 0}</p>
                      <p className="text-[9px] text-emerald-600 font-bold uppercase">Present</p>
                    </div>
                    <div className="bg-red-50 border border-red-100 p-2 rounded-xl">
                      <p className="text-xs font-bold text-red-800">{modalCycleData.stats?.absent || 0}</p>
                      <p className="text-[9px] text-red-600 font-bold uppercase">Absent</p>
                    </div>
                    <div className="bg-amber-50 border border-amber-100 p-2 rounded-xl">
                      <p className="text-xs font-bold text-amber-800">{modalCycleData.stats?.late || 0}</p>
                      <p className="text-[9px] text-amber-600 font-bold uppercase">Late</p>
                    </div>
                    <div className="bg-orange-50 border border-orange-100 p-2 rounded-xl">
                      <p className="text-xs font-bold text-orange-800">{modalCycleData.stats?.halfDay || 0}</p>
                      <p className="text-[9px] text-orange-600 font-bold uppercase">Half Day</p>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 p-2 rounded-xl">
                      <p className="text-xs font-bold text-slate-800">{modalCycleData.stats?.weeklyOff || 0}</p>
                      <p className="text-[9px] text-slate-600 font-bold uppercase">Weekly Off</p>
                    </div>
                    <div className="bg-purple-50 border border-purple-100 p-2 rounded-xl">
                      <p className="text-xs font-bold text-purple-800">{modalCycleData.stats?.holiday || 0}</p>
                      <p className="text-[9px] text-purple-600 font-bold uppercase">Holiday</p>
                    </div>
                    <div className="bg-cyan-50 border border-cyan-100 p-2 rounded-xl col-span-3 sm:col-span-1">
                      <p className="text-xs font-bold text-cyan-800">{modalCycleData.stats?.onLeave || 0}</p>
                      <p className="text-[9px] text-cyan-600 font-bold uppercase">Approved Leave</p>
                    </div>
                  </div>

                  {/* Day-by-Day Full Month History Table */}
                  <div className="overflow-x-auto border border-gray-100 rounded-2xl">
                    <table className="w-full text-left border-collapse min-w-[750px]">
                      <thead>
                        <tr className="bg-gray-50/80 border-b border-gray-100">
                          <th className="py-2.5 px-3 text-[10px] font-bold text-gray-500 uppercase">Date & Day</th>
                          <th className="py-2.5 px-3 text-[10px] font-bold text-gray-500 uppercase">Status</th>
                          <th className="py-2.5 px-3 text-[10px] font-bold text-gray-500 uppercase">Punch In</th>
                          <th className="py-2.5 px-3 text-[10px] font-bold text-gray-500 uppercase">Punch Out</th>
                          <th className="py-2.5 px-3 text-[10px] font-bold text-gray-500 uppercase">Hours</th>
                          <th className="py-2.5 px-3 text-[10px] font-bold text-gray-500 uppercase text-red-600">Deduction (₹)</th>
                          <th className="py-2.5 px-3 text-[10px] font-bold text-gray-500 uppercase">Location / Note</th>
                        </tr>
                      </thead>
                      <tbody>
                        {modalCycleData.fullCalendar?.map((day: any, idx: number) => {
                          let punchInStr = '—';
                          let punchOutStr = '—';
                          if (day.punchIn) {
                            try {
                              punchInStr = new Date(day.punchIn).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
                            } catch {}
                          }
                          if (day.punchOut) {
                            try {
                              punchOutStr = new Date(day.punchOut).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
                            } catch {}
                          }

                          const statusStyle = 
                            day.status === 'Present' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                            day.status === 'Late' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                            day.status === 'Half Day' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                            day.status === 'Absent' ? 'bg-red-50 text-red-700 border-red-200' :
                            day.status === 'Weekly Off' ? 'bg-slate-100 text-slate-700 border-slate-200' :
                            day.status === 'Holiday' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                            day.status === 'On Leave' ? 'bg-cyan-50 text-cyan-700 border-cyan-200' :
                            'bg-gray-50 text-gray-400 border-gray-100';

                          return (
                            <tr key={idx} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                              
                              {/* Date & Day */}
                              <td className="py-2.5 px-3">
                                <div className="flex items-center gap-2">
                                  <span className="w-6 h-6 rounded-lg bg-gray-100 font-mono font-bold text-xs flex items-center justify-center text-gray-700">
                                    {day.dayNumber}
                                  </span>
                                  <div>
                                    <p className="text-xs font-bold text-gray-900 leading-none">
                                      {new Date(day.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                                    </p>
                                    <p className="text-[10px] text-gray-400 mt-0.5">{day.dayName}</p>
                                  </div>
                                </div>
                              </td>

                              {/* Status Badge */}
                              <td className="py-2.5 px-3">
                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold border inline-flex items-center gap-1 ${statusStyle}`}>
                                  {day.status}
                                  {day.status === 'Late' && day.lateMinutes ? ` (${day.lateMinutes}m)` : ''}
                                  {day.forgiven && <span className="text-[9px] text-emerald-600 font-bold">(Forgiven)</span>}
                                </span>
                              </td>

                              {/* Punch In */}
                              <td className="py-2.5 px-3 text-xs font-medium text-gray-700">
                                {punchInStr}
                              </td>

                              {/* Punch Out */}
                              <td className="py-2.5 px-3 text-xs font-medium text-gray-700">
                                {punchOutStr}
                              </td>

                              {/* Working Hours */}
                              <td className="py-2.5 px-3 text-xs font-bold text-gray-800">
                                {day.hours || '—'}
                              </td>

                              {/* Deduction Amount */}
                              <td className="py-2.5 px-3">
                                {day.deductionAmount > 0 ? (
                                  <span className="text-xs font-extrabold text-red-500">
                                    - ₹ {day.deductionAmount.toLocaleString()}
                                  </span>
                                ) : day.forgiven ? (
                                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                                    Forgiven
                                  </span>
                                ) : (
                                  <span className="text-xs text-gray-400 font-medium">₹ 0</span>
                                )}
                              </td>

                              {/* Note / Location */}
                              <td className="py-2.5 px-3 text-xs text-gray-500">
                                {day.holidayTitle ? (
                                  <span className="text-purple-600 font-semibold">{day.holidayTitle}</span>
                                ) : day.leaveReason ? (
                                  <span className="text-cyan-600 font-semibold">{day.leaveReason}</span>
                                ) : day.location ? (
                                  <VerifiedLocationBadge
                                    location={day.location}
                                    lat={Number(day.latitude || 0)}
                                    lng={Number(day.longitude || 0)}
                                    docId={day.date}
                                    truncateClass="max-w-[150px] truncate"
                                  />
                                ) : (
                                  <span className="text-gray-300">—</span>
                                )}
                              </td>

                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ================= TAB 2: DEDUCTIONS BREAKDOWN & DATES ================= */}
              {modalActiveTab === 'deductions' && (
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <div>
                      <h4 className="text-xs font-extrabold text-gray-900 flex items-center gap-1.5">
                        <AlertTriangle size={15} className="text-red-500" />
                        Exact Deduction Dates & Reasons
                      </h4>
                      <p className="text-[11px] text-gray-500 mt-0.5">Admin can review each deduction date and forgive valid disputes</p>
                    </div>
                    <span className="text-xs font-bold text-red-600 bg-red-50 px-2.5 py-1 rounded-xl border border-red-100">
                      Total Cut: -₹ {modalCycleData.totalDeductionAmount.toLocaleString()}
                    </span>
                  </div>

                  {modalCycleData.deductionDetails?.length === 0 ? (
                    <div className="text-center py-12 text-gray-400 border border-dashed border-gray-200 rounded-2xl bg-gray-50/50">
                      <CheckCircle2 size={36} className="mx-auto mb-2 text-emerald-500" />
                      <p className="font-bold text-sm text-gray-800">No deductions in this cycle!</p>
                      <p className="text-xs text-gray-500 mt-0.5">Full salary is payable without any attendance penalty.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto border border-gray-100 rounded-2xl">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="bg-gray-50/80 border-b border-gray-100">
                            <th className="py-2.5 px-3 text-[10px] font-bold text-gray-500 uppercase">Deduction Date</th>
                            <th className="py-2.5 px-3 text-[10px] font-bold text-gray-500 uppercase">Punch In Time</th>
                            <th className="py-2.5 px-3 text-[10px] font-bold text-gray-500 uppercase">Reason / Status</th>
                            <th className="py-2.5 px-3 text-[10px] font-bold text-gray-500 uppercase text-red-600">Deduction Amount</th>
                            <th className="py-2.5 px-3 text-[10px] font-bold text-gray-500 uppercase text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {modalCycleData.deductionDetails.map((item: any, i: number) => {
                            let punchInTime = '—';
                            if (item.punchIn) {
                              try {
                                punchInTime = new Date(item.punchIn).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
                              } catch {}
                            }

                            return (
                              <tr key={i} className={`border-b border-gray-50 last:border-0 ${item.forgiven ? 'opacity-50 bg-emerald-50/20' : 'hover:bg-gray-50/40'}`}>
                                
                                {/* Date */}
                                <td className="py-3 px-3">
                                  <p className="text-xs font-bold text-gray-900">
                                    {new Date(item.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                  </p>
                                  <p className="text-[10px] text-gray-400">{item.dayName}</p>
                                </td>

                                {/* Punch In */}
                                <td className="py-3 px-3 text-xs font-semibold text-gray-700">
                                  {punchInTime}
                                </td>

                                {/* Status / Reason */}
                                <td className="py-3 px-3">
                                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold border ${
                                    item.status === 'Late' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                    item.status === 'Half Day' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                                    'bg-red-50 text-red-700 border-red-200'
                                  }`}>
                                    {item.status} {item.status === 'Late' && item.lateMinutes ? `(${item.lateMinutes} mins late)` : ''}
                                  </span>
                                </td>

                                {/* Deduction Amount */}
                                <td className="py-3 px-3">
                                  {item.forgiven ? (
                                    <span className="text-xs font-bold text-emerald-600 line-through">
                                      ₹ {item.amount.toLocaleString()}
                                    </span>
                                  ) : (
                                    <span className="text-xs font-extrabold text-red-600">
                                      - ₹ {item.amount.toLocaleString()}
                                    </span>
                                  )}
                                </td>

                                {/* Forgive Button */}
                                <td className="py-3 px-3 text-right">
                                  {item.forgiven ? (
                                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-200">
                                      ✓ Forgiven
                                    </span>
                                  ) : (
                                    <button
                                      onClick={() => handleForgiveDeduction(item, i)}
                                      disabled={forgivingIndex === i}
                                      className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg border border-blue-200 transition-colors disabled:opacity-50"
                                    >
                                      <Undo2 size={12} />
                                      {forgivingIndex === i ? 'Saving...' : 'Forgive Deduction'}
                                    </button>
                                  )}
                                </td>

                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* ================= TAB 3: BANK DETAILS & PAYMENT HISTORY ================= */}
              {modalActiveTab === 'bank' && (
                <div className="space-y-4">
                  {/* Virtual Bank Card */}
                  <div className="bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-950 text-white rounded-2xl p-5 shadow-md border border-slate-700">
                    <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-700">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
                        <Landmark size={15} /> Staff Bank Account
                      </span>
                      <span className="text-[10px] bg-blue-500/30 text-blue-200 px-2 py-0.5 rounded-full font-bold border border-blue-400/30">
                        {selectedSalaryStaff.bankDetails?.bankName || 'No Bank Added'}
                      </span>
                    </div>
                    {selectedSalaryStaff.bankDetails?.accountNumber ? (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
                        <div>
                          <p className="text-[9px] text-slate-400 uppercase font-bold">Account Number</p>
                          <p className="font-mono font-extrabold text-blue-300 text-sm tracking-wider">{selectedSalaryStaff.bankDetails.accountNumber}</p>
                        </div>
                        <div>
                          <p className="text-[9px] text-slate-400 uppercase font-bold">IFSC Code</p>
                          <p className="font-mono font-bold text-white text-sm">{selectedSalaryStaff.bankDetails.ifsc}</p>
                        </div>
                        <div>
                          <p className="text-[9px] text-slate-400 uppercase font-bold">Account Holder</p>
                          <p className="font-semibold text-slate-200 truncate">{selectedSalaryStaff.bankDetails.accountHolder || selectedSalaryStaff.name}</p>
                        </div>
                        <div>
                          <p className="text-[9px] text-slate-400 uppercase font-bold">Branch</p>
                          <p className="font-semibold text-slate-200 truncate">{selectedSalaryStaff.bankDetails.branch || 'N/A'}</p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic py-2">Staff member has not added their bank details yet in the Staff App.</p>
                    )}
                  </div>

                  {/* Pay button trigger */}
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      onClick={() => {
                        setShowSalaryModal(false);
                        openPaymentModal(selectedSalaryStaff);
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-sm"
                    >
                      Record Salary Payment (₹ {modalCycleData.expectedSalary.toLocaleString()})
                    </button>
                  </div>
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-between items-center shrink-0">
              <div className="text-xs text-gray-500">
                <span>Per Day Rate: <strong>₹ {modalCycleData.perDaySalary.toLocaleString()} (÷30)</strong></span>
                <span className="mx-2">•</span>
                <span>Hourly Rate: <strong>₹ {modalCycleData.perHourSalary.toLocaleString()}/hr (9 hrs)</strong></span>
                <span className="mx-2">•</span>
                <span>Working Days: <strong>{modalCycleData.totalWorkingDays}</strong></span>
              </div>
              <button 
                onClick={() => setShowSalaryModal(false)}
                className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-100 font-bold text-xs transition-colors"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && selectedPaymentStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-5 border-b border-gray-100">
              <div>
                <h3 className="font-bold text-lg text-gray-900">Record Payment</h3>
                <p className="text-xs text-gray-500">For {selectedPaymentStaff.name}</p>
              </div>
              <button 
                onClick={() => setShowPaymentModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-50 text-gray-500 hover:bg-gray-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={submitPayment} className="p-5">
              {/* Bank Account Details */}
              <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-xl p-4 mb-4 shadow-sm border border-slate-700">
                <div className="flex justify-between items-center mb-2 pb-2 border-b border-slate-700/80">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
                    <CreditCard size={14} /> Staff Bank Account
                  </span>
                  <span className="text-[10px] bg-blue-500/30 text-blue-200 px-2 py-0.5 rounded-full font-bold border border-blue-400/30">
                    {selectedPaymentStaff.bankDetails?.bankName || 'No Bank Added'}
                  </span>
                </div>
                {selectedPaymentStaff.bankDetails?.accountNumber ? (
                  <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                    <div>
                      <p className="text-[9px] text-slate-400 uppercase font-medium">Account Number</p>
                      <p className="font-mono font-bold text-blue-300 text-sm tracking-wider">{selectedPaymentStaff.bankDetails.accountNumber}</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-slate-400 uppercase font-medium">IFSC Code</p>
                      <p className="font-mono font-bold text-white text-sm">{selectedPaymentStaff.bankDetails.ifsc}</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-slate-400 uppercase font-medium">Account Holder</p>
                      <p className="font-semibold text-slate-200 truncate">{selectedPaymentStaff.bankDetails.accountHolder || selectedPaymentStaff.name}</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-slate-400 uppercase font-medium">Branch</p>
                      <p className="font-semibold text-slate-200 truncate">{selectedPaymentStaff.bankDetails.branch || 'N/A'}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">Staff member has not saved bank details yet.</p>
                )}
              </div>

              <div className="bg-blue-50/50 rounded-xl p-4 mb-5 border border-blue-100">
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-gray-500">Base Salary:</span>
                  <span className="font-semibold text-gray-900">₹ {selectedPaymentStaff.baseSalary.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-red-500">Total Deductions:</span>
                  <span className="font-bold text-red-600">- ₹ {selectedPaymentStaff.totalDeducted.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-gray-500">Net Expected:</span>
                  <span className="font-bold text-blue-700">₹ {selectedPaymentStaff.expected.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm pt-2 border-t border-blue-200/50">
                  <span className="text-gray-700 font-bold">Pending Amount:</span>
                  <span className="font-extrabold text-red-600 text-base">₹ {selectedPaymentStaff.pending.toLocaleString()}</span>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Payment Type</label>
                  <select 
                    value={paymentType}
                    onChange={(e) => setPaymentType(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-blue-500 focus:border-blue-500 block p-3"
                  >
                    <option value="Full">Full Payment</option>
                    <option value="Partial">Partial Payment</option>
                    <option value="Advance">Advance Payment</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Amount (₹)</label>
                  <input 
                    type="number" 
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder="e.g. 5000"
                    className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-blue-500 focus:border-blue-500 block p-3"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Note (Optional)</label>
                  <input 
                    type="text" 
                    value={paymentNote}
                    onChange={(e) => setPaymentNote(e.target.value)}
                    placeholder="e.g. Cleared via UPI / NetBanking"
                    className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-blue-500 focus:border-blue-500 block p-3"
                  />
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="flex-1 px-4 py-3 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={submittingPayment}
                  className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-semibold transition-colors shadow-sm shadow-blue-200 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {submittingPayment ? 'Processing...' : 'Confirm Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Full Staff Master Profile View Modal */}
      <StaffDetailsModal 
        isOpen={!!fullViewStaff} 
        onClose={() => setFullViewStaff(null)} 
        staff={fullViewStaff} 
      />

    </div>
  );
}