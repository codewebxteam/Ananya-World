import React, { useState, useEffect } from 'react';
import { 
  Users, ChevronDown, Search, ChevronLeft, ChevronRight,
  Calendar, Wallet, CreditCard, Hourglass, 
  Clock4, Play, FileText, CheckCircle2, FileCheck, Eye, Activity, X, AlertTriangle, Undo2
} from 'lucide-react';
import { collection, query, where, onSnapshot, writeBatch, doc, serverTimestamp, updateDoc, arrayUnion, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';
import StaffDetailsModal from '../components/StaffDetailsModal';

export default function Salaries() {
  const [staffList, setStaffList] = useState<any[]>([]);
  const [payrollData, setPayrollData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Full Staff Profile View State
  const [fullViewStaff, setFullViewStaff] = useState<any>(null);
  
  // Search, Filter & Pagination State
  const [searchQuery, setSearchQuery] = useState('');
  const [staffTypeFilter, setStaffTypeFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  
  // Salary Details Modal Pagination State (5 items per page)
  const [modalPage, setModalPage] = useState(1);
  
  // Payment Modal State
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<any>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentType, setPaymentType] = useState('Full');
  const [paymentNote, setPaymentNote] = useState('');
  const [submittingPayment, setSubmittingPayment] = useState(false);

  // Deduction Details Modal State
  const [showDeductionModal, setShowDeductionModal] = useState(false);
  const [selectedDeductionStaffId, setSelectedDeductionStaffId] = useState<string | null>(null);
  const [forgivingIndex, setForgivingIndex] = useState<number | null>(null);

  const currentMonthYear = new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  const currentMonthKey = `${new Date().getMonth() + 1}_${new Date().getFullYear()}`;

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

    const qPayroll = query(collection(db, 'payroll')); // Fetch all payroll to find current active cycles
    const unsubPayroll = onSnapshot(qPayroll, (snapshot) => {
      const payroll: any[] = [];
      snapshot.forEach(doc => {
        payroll.push({ id: doc.id, ...doc.data() });
      });
      setPayrollData(payroll);
    });

    return () => {
      unsubStaff();
      unsubPayroll();
    };
  }, []);

  // Derived Totals
  const totalEmployees = staffList.length;
  const totalPayable = staffList.reduce((sum, s) => sum + (Number(s.salaryAmount) || 0), 0);
  const paidAmount = payrollData.reduce((sum, p) => sum + (Number(p.paidAmount) || 0), 0);
  const pendingAmount = totalPayable - paidAmount;
  
  const paidPercentage = totalPayable > 0 ? Math.round((paidAmount / totalPayable) * 100) : 0;
  const pendingPercentage = totalPayable > 0 ? Math.round((pendingAmount / totalPayable) * 100) : 0;

  const handleProcessMaturedSalaries = async () => {
    setLoading(true);
    try {
      const batch = writeBatch(db);
      let count = 0;
      const now = new Date();
      now.setHours(0,0,0,0);

      for (const staff of staffList) {
        const nextDateStr = staff.nextSalaryDate;
        if (!nextDateStr) continue;
        
        const nextDate = new Date(nextDateStr);
        nextDate.setHours(0,0,0,0);
        
        if (now >= nextDate) {
          const payrollId = `${staff.id}_${nextDateStr}`;
          const existingRecord = payrollData.find(p => p.id === payrollId);
          
          if (!existingRecord) {
            // Calculate deductions
            const cycleEnd = nextDate;
            const cycleStart = new Date(nextDate);
            cycleStart.setMonth(cycleStart.getMonth() - 1);
            cycleStart.setDate(cycleStart.getDate() + 1);

            const qAtt = query(collection(db, 'attendance'), where('staffId', '==', staff.id), where('date', '>=', cycleStart.toISOString().split('T')[0]), where('date', '<=', cycleEnd.toISOString().split('T')[0]));
            const attSnap = await getDocs(qAtt);
            const attendanceMap = new Map();
            attSnap.forEach(d => attendanceMap.set(d.data().date, d.data().status));

            // Query company holidays in the cycle
            const qHolidays = query(collection(db, 'company_holidays'), where('date', '>=', cycleStart.toISOString().split('T')[0]), where('date', '<=', cycleEnd.toISOString().split('T')[0]));
            const holidaysSnap = await getDocs(qHolidays);
            const holidaysSet = new Set();
            holidaysSnap.forEach(d => holidaysSet.add(d.data().date));

            // Query approved leaves for the staff member
            const qApprovedLeaves = query(collection(db, 'leaves'), where('staffId', '==', staff.id), where('status', '==', 'Approved'));
            const leavesSnap = await getDocs(qApprovedLeaves);
            const leavesList: any[] = [];
            leavesSnap.forEach(d => leavesList.push(d.data()));

            // Query weekly off cancellations for the staff member
            const qOffCancels = query(collection(db, 'weekly_off_cancellations'), where('staffId', '==', staff.id), where('date', '>=', cycleStart.toISOString().split('T')[0]), where('date', '<=', cycleEnd.toISOString().split('T')[0]));
            const offCancelsSnap = await getDocs(qOffCancels);
            const offCancelsSet = new Set();
            offCancelsSnap.forEach(d => offCancelsSet.add(d.data().date));

            let totalWorkingDays = 0;
            let deductionDays = 0;
            const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            const staffWeeklyOff = staff.weeklyOff || 'Sunday';
            const deductionDetails: any[] = [];

            for (let d = new Date(cycleStart); d <= cycleEnd; d.setDate(d.getDate() + 1)) {
              const dateStr = d.toISOString().split('T')[0];
              const dayName = days[d.getDay()];
              const isDefaultOff = dayName === staffWeeklyOff;
              
              const isCompanyHoliday = holidaysSet.has(dateStr);
              const isApprovedLeave = leavesList.some(leave => dateStr >= leave.startDate && dateStr <= leave.endDate);
              const isOffCancelled = offCancelsSet.has(dateStr);

              // Working day is any day that is:
              // - Not a company holiday
              // - Not an approved leave
              // - Not a weekly off (unless cancelled by admin)
              const isWorkingDay = !isCompanyHoliday && !isApprovedLeave && (!isDefaultOff || isOffCancelled);

              if (isWorkingDay) {
                totalWorkingDays++;
                const attStatus = attendanceMap.get(dateStr);
                const attRecord = attSnap.docs.find(doc => doc.data().date === dateStr);
                const punchInTime = attRecord?.data()?.punchIn || null;

                if (!attStatus || attStatus === 'Absent') {
                  deductionDays += 1;
                  deductionDetails.push({ date: dateStr, punchIn: punchInTime, status: attStatus || 'Absent', deduction: 1, forgiven: false });
                }
                else if (attStatus === 'Late' || attStatus === 'Half Day') {
                  deductionDays += 0.5;
                  deductionDetails.push({ date: dateStr, punchIn: punchInTime, status: attStatus, deduction: 0.5, forgiven: false });
                }
              }
            }

            const baseSalary = Number(staff.salaryAmount) || 0;
            const perDaySalary = totalWorkingDays > 0 ? (baseSalary / totalWorkingDays) : 0;
            const netSalary = Math.max(0, Math.round(baseSalary - (deductionDays * perDaySalary)));
            
            const payrollRef = doc(db, 'payroll', payrollId);
            batch.set(payrollRef, {
              staffId: staff.id,
              staffName: staff.name,
              department: staff.staffType || staff.department || 'General',
              maturityDate: nextDateStr,
              baseSalary: baseSalary,
              totalWorkingDays: totalWorkingDays,
              deductionDays: deductionDays,
              perDaySalary: Math.round(perDaySalary),
              deductionDetails: deductionDetails,
              expectedSalary: netSalary,
              paidAmount: 0,
              status: 'Pending',
              payments: [],
              updatedAt: serverTimestamp()
            });
            count++;
          }
        }
      }

      if (count > 0) {
        await batch.commit();
        alert(`Processed ${count} matured salaries and calculated deductions.`);
      } else {
        alert('All matured salaries are already processed.');
      }
    } catch (error: any) {
      alert('Error processing salaries: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const openPaymentModal = (staff: any, record: any, expected: number) => {
    const paid = record ? (Number(record.paidAmount) || 0) : 0;
    const pending = expected - paid;

    setSelectedStaff({
      ...staff,
      payrollRecord: record,
      pendingAmount: pending,
      expectedSalary: expected
    });
    setPaymentAmount(pending > 0 ? pending.toString() : '');
    setPaymentType(pending === expected && expected > 0 ? 'Full' : 'Partial');
    setPaymentNote('');
    setShowPaymentModal(true);
  };

  const submitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaff || !paymentAmount || isNaN(Number(paymentAmount)) || Number(paymentAmount) <= 0) {
      return alert('Please enter a valid amount.');
    }

    setSubmittingPayment(true);
    try {
      const amountToPay = Number(paymentAmount);
      const payrollId = `${selectedStaff.id}_${selectedStaff.nextSalaryDate}`;
      const payrollRef = doc(db, 'payroll', payrollId);
      const staffRef = doc(db, 'users', selectedStaff.id);
      
      const newPayment = {
        id: Date.now().toString(),
        amount: amountToPay,
        type: paymentType,
        note: paymentNote,
        date: new Date().toISOString()
      };

      const expectedSalary = selectedStaff.expectedSalary;
      let newPaidAmount = amountToPay;
      let status = 'Partial';
      let isFullyPaid = false;

      const batch = writeBatch(db);

      if (!selectedStaff.payrollRecord) {
        // Advance Payment (paying before maturity, no existing record)
        newPaidAmount = amountToPay;
        status = newPaidAmount >= expectedSalary ? 'Paid' : 'Partial';
        isFullyPaid = status === 'Paid';

        batch.set(payrollRef, {
          staffId: selectedStaff.id,
          staffName: selectedStaff.name,
          department: selectedStaff.staffType || selectedStaff.department || 'General',
          maturityDate: selectedStaff.nextSalaryDate,
          baseSalary: Number(selectedStaff.salaryAmount) || 0,
          expectedSalary: expectedSalary,
          paidAmount: newPaidAmount,
          status: status,
          payments: [newPayment],
          updatedAt: serverTimestamp()
        });
      } else {
        // Update existing record
        const currentPaid = Number(selectedStaff.payrollRecord.paidAmount) || 0;
        newPaidAmount = currentPaid + amountToPay;
        status = newPaidAmount >= expectedSalary ? 'Paid' : 'Partial';
        isFullyPaid = status === 'Paid';

        batch.update(payrollRef, {
          paidAmount: newPaidAmount,
          status: status,
          payments: arrayUnion(newPayment),
          updatedAt: serverTimestamp()
        });
      }

      if (isFullyPaid) {
        // Auto-increment nextSalaryDate by 1 month
        const currentMaturity = new Date(selectedStaff.nextSalaryDate);
        currentMaturity.setMonth(currentMaturity.getMonth() + 1);
        batch.update(staffRef, {
          nextSalaryDate: currentMaturity.toISOString().split('T')[0]
        });
      }

      await batch.commit();

      setShowPaymentModal(false);
      if (isFullyPaid) alert("Payment cleared! Next Salary Date has been advanced by 1 month.");
    } catch (error: any) {
      alert('Error recording payment: ' + error.message);
    } finally {
      setSubmittingPayment(false);
    }
  };

  const openDeductionModal = (row: any) => {
    setSelectedDeductionStaffId(row.id);
    setModalPage(1);
    setShowDeductionModal(true);
  };

  const handleForgiveDeduction = async (index: number) => {
    const staffObj = staffTableData.find(s => s.id === selectedDeductionStaffId);
    if (!staffObj?.record) return;
    setForgivingIndex(index);
    try {
      const details = [...(staffObj.record.deductionDetails || [])];
      const item = details[index];
      if (!item || item.forgiven) return;

      item.forgiven = true;

      // Recalculate: subtract forgiven deduction from total deduction days
      const forgivenDays = details.filter((d: any) => d.forgiven).reduce((sum: number, d: any) => sum + d.deduction, 0);
      const originalDeductionDays = staffObj.record.deductionDays || 0;
      const newDeductionDays = originalDeductionDays - forgivenDays;
      const perDaySalary = staffObj.record.perDaySalary || 0;
      const baseSalary = staffObj.record.baseSalary || 0;
      const newExpected = Math.max(0, Math.round(baseSalary - (newDeductionDays * perDaySalary)));

      const payrollRef = doc(db, 'payroll', staffObj.record.id);
      await updateDoc(payrollRef, {
        deductionDetails: details,
        deductionDays: newDeductionDays,
        expectedSalary: newExpected,
        updatedAt: serverTimestamp()
      });

      alert(`Deduction for ${item.date} has been forgiven. New expected salary: ₹${newExpected.toLocaleString()}`);
    } catch (error: any) {
      alert('Error: ' + error.message);
    } finally {
      setForgivingIndex(null);
    }
  };

  // Prepare staff-wise table data
  const staffTableData = staffList.map(staff => {
    const nextDateStr = staff.nextSalaryDate || new Date().toISOString().split('T')[0];
    const payrollId = `${staff.id}_${nextDateStr}`;
    const record = payrollData.find(p => p.id === payrollId);
    
    const now = new Date();
    now.setHours(0,0,0,0);
    const nextDate = new Date(nextDateStr);
    nextDate.setHours(0,0,0,0);
    
    const isMatured = now >= nextDate;
    
    // If not matured and no record, expected is base. If matured and record, expected is net.
    const expected = record ? (Number(record.expectedSalary) || 0) : (Number(staff.salaryAmount) || 0);
    const paid = record ? (Number(record.paidAmount) || 0) : 0;
    const pending = expected - paid;
    
    let status = record?.status;
    if (!status) {
      status = isMatured ? 'Pending' : 'Not Due';
    }

    return {
      ...staff,
      record,
      expected,
      paid,
      pending,
      status,
      maturityDate: nextDateStr
    };
  });

  // Search (by Name or Phone) & Filter (by Staff Type / Category)
  const filteredStaffData = staffTableData.filter(s => {
    // 1. Search Query (Name or Phone number)
    const queryLower = searchQuery.toLowerCase().trim();
    const nameMatch = s.name?.toLowerCase().includes(queryLower);
    const phoneMatch = s.phone?.includes(queryLower) || s.phoneNumber?.includes(queryLower);
    const matchesSearch = !queryLower || nameMatch || phoneMatch;

    // 2. Staff Type Filter (Office Staff vs Field Staff vs All)
    const staffType = (s.staffType || s.department || s.roleType || '').toLowerCase();
    let matchesCategory = true;
    if (staffTypeFilter === 'Office Staff') {
      matchesCategory = staffType.includes('office') || staffType.includes('admin') || staffType.includes('reception') || staffType.includes('manager') || staffType.includes('lab');
    } else if (staffTypeFilter === 'Field Staff') {
      matchesCategory = staffType.includes('field') || staffType.includes('phlebo') || staffType.includes('collector') || staffType.includes('rider') || staffType.includes('sample');
    } else if (staffTypeFilter !== 'all') {
      matchesCategory = staffType.includes(staffTypeFilter.toLowerCase());
    }

    return matchesSearch && matchesCategory;
  });

  // Pagination Logic (10 items per page)
  const totalPages = Math.ceil(filteredStaffData.length / ITEMS_PER_PAGE) || 1;
  const paginatedStaffData = filteredStaffData.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const deductionStaff = staffTableData.find(s => s.id === selectedDeductionStaffId);

  // Recent payments list
  const recentPayments = payrollData
    .flatMap(p => (p.payments || []).map((pay: any) => ({ ...pay, staffName: p.staffName })))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  return (
    <div className="animate-in fade-in duration-500">
      {/* ----- TOP STATS ROW ----- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-[20px] p-5 shadow-sm border border-gray-100 flex flex-col justify-between">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-500 shrink-0"><Wallet size={24} strokeWidth={2} /></div>
            <div>
              <p className="text-gray-500 text-[11px] font-medium mb-1">Total Payroll ({currentMonthYear})</p>
              <h3 className="text-xl font-bold text-gray-900 leading-tight tracking-tight">₹ {totalPayable.toLocaleString()}</h3>
            </div>
          </div>
          <p className="text-gray-500 text-[11px] mt-3 ml-[64px] font-medium">Expected Monthly Payable</p>
        </div>

        <div className="bg-white rounded-[20px] p-5 shadow-sm border border-gray-100 flex flex-col justify-between">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center text-green-500 shrink-0"><CreditCard size={24} strokeWidth={2} /></div>
            <div>
              <p className="text-gray-500 text-[11px] font-medium mb-1">Total Paid</p>
              <h3 className="text-xl font-bold text-gray-900 leading-tight tracking-tight">₹ {paidAmount.toLocaleString()}</h3>
            </div>
          </div>
          <p className="text-gray-500 text-[11px] mt-3 ml-[64px] font-medium"><span className="text-green-500 font-bold">{paidPercentage}%</span> of Total</p>
        </div>

        <div className="bg-white rounded-[20px] p-5 shadow-sm border border-gray-100 flex flex-col justify-between">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-red-500 shrink-0"><Clock4 size={24} strokeWidth={2} /></div>
            <div>
              <p className="text-gray-500 text-[11px] font-medium mb-1">Pending Amount</p>
              <h3 className="text-xl font-bold text-gray-900 leading-tight tracking-tight">₹ {pendingAmount.toLocaleString()}</h3>
            </div>
          </div>
          <p className="text-gray-500 text-[11px] mt-3 ml-[64px] font-medium"><span className="text-red-500 font-bold">{pendingPercentage}%</span> of Total</p>
        </div>

        <div className="bg-white rounded-[20px] p-5 shadow-sm border border-gray-100 flex flex-col justify-between">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-500 shrink-0"><Users size={24} strokeWidth={2} /></div>
            <div>
              <p className="text-gray-500 text-[11px] font-medium mb-1">Active Staff</p>
              <h3 className="text-xl font-bold text-gray-900 leading-tight tracking-tight">{totalEmployees}</h3>
            </div>
          </div>
          <p className="text-gray-500 text-[11px] mt-3 ml-[64px] font-medium">Eligible for payroll</p>
        </div>
      </div>

      {/* ----- MAIN SECTION ----- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        
        {/* Left Panel: Payroll Summary Table */}
        <div className="bg-white rounded-[20px] p-5 shadow-sm border border-gray-100 lg:col-span-2 flex flex-col">
          
          <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-3 mb-5">
            <h3 className="text-gray-900 font-bold text-lg shrink-0">
              Staff Payroll <span className="text-gray-400 font-normal text-sm ml-1">({currentMonthYear})</span>
            </h3>

            {/* Search, Filter & Action controls */}
            <div className="flex flex-wrap items-center gap-3.5 flex-1 lg:justify-end">
              {/* Search Bar (Name or Phone) */}
              <div className="relative flex-1 sm:w-60 min-w-[180px]">
                <Search size={15} className="absolute left-3 top-2.5 text-gray-400" />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                  placeholder="Search name or phone..." 
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-3 py-2 text-xs text-gray-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-medium"
                />
                {searchQuery && (
                  <button 
                    onClick={() => { setSearchQuery(''); setCurrentPage(1); }}
                    className="absolute right-2.5 top-2.5 text-xs text-gray-400 hover:text-gray-600 font-bold"
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
                <option value="all">All Staff Types</option>
                <option value="Office Staff">Office Staff</option>
                <option value="Field Staff">Field Staff</option>
              </select>

              {/* Process Salaries Button */}
              <button 
                onClick={handleProcessMaturedSalaries}
                disabled={loading || totalPayable === 0}
                className={`flex items-center gap-2 ${loading || totalPayable === 0 ? 'bg-gray-400' : 'bg-[#2563EB] hover:bg-blue-700'} text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-colors shadow-sm shadow-blue-200 shrink-0`}
              >
                {loading ? 'Processing...' : <><Play size={14} strokeWidth={2.5} fill="currentColor" /> Process Matured</>}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left min-w-[900px]">
              <thead>
                <tr className="border-y border-gray-100 bg-gray-50/50">
                  <th className="py-3 px-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Staff Name</th>
                  <th className="py-3 px-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Department</th>
                  <th className="py-3 px-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Maturity Date</th>
                  <th className="py-3 px-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Expected (₹)</th>
                  <th className="py-3 px-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Paid (₹)</th>
                  <th className="py-3 px-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Pending (₹)</th>
                  <th className="py-3 px-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="py-3 px-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {paginatedStaffData.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-gray-500 text-sm">No staff records found matching your filters.</td>
                  </tr>
                ) : (
                  paginatedStaffData.map((row) => (
                    <tr key={row.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                      <td className="py-3.5 px-4 cursor-pointer" onClick={() => openDeductionModal(row)}>
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] font-semibold text-blue-600 hover:underline">{row.name}</span>
                          {row.bankDetails?.accountNumber ? (
                            <span className="text-[10px] bg-green-50 text-green-700 px-2 py-0.5 rounded-full font-bold border border-green-200 flex items-center gap-1" title={`${row.bankDetails.bankName}: ${row.bankDetails.accountNumber}`}>
                              <CreditCard size={10} /> Bank Info
                            </span>
                          ) : (
                            <span className="text-[10px] bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full font-medium" title="No bank details added">
                              No Bank
                            </span>
                          )}
                        </div>
                        {row.phone && <p className="text-[10px] text-gray-400 font-mono mt-0.5">{row.phone}</p>}
                      </td>
                      <td className="py-3.5 px-4 text-[13px] font-medium text-gray-600">{row.staffType || row.department || 'General'}</td>
                      <td className="py-3.5 px-4 text-[13px] font-bold text-gray-900">{new Date(row.maturityDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                      <td className="py-3.5 px-4 text-[13px] font-semibold text-gray-900">₹ {row.expected.toLocaleString()}</td>
                      <td className="py-3.5 px-4 text-[13px] font-semibold text-green-600">₹ {row.paid.toLocaleString()}</td>
                      <td className="py-3.5 px-4 text-[13px] font-semibold text-red-500">₹ {row.pending.toLocaleString()}</td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          row.status === 'Paid' ? 'bg-green-100 text-green-600' : 
                          row.status === 'Partial' ? 'bg-yellow-100 text-yellow-600' : 
                          row.status === 'Not Due' ? 'bg-gray-100 text-gray-600' :
                          'bg-red-100 text-red-600'
                        }`}>
                          {row.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button 
                          onClick={() => openPaymentModal(row, row.record, row.expected)}
                          className="bg-blue-50 text-blue-600 hover:bg-blue-100 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors border border-blue-100"
                        >
                          Pay
                        </button>
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
            <h3 className="text-gray-900 font-bold text-[15px] mb-6">Overview <span className="text-gray-400 font-normal text-xs">({currentMonthYear})</span></h3>
            <div className="flex items-center justify-between gap-2">
              <div className="relative w-32 h-32 rounded-full flex items-center justify-center shrink-0" 
                   style={{ background: `conic-gradient(#10B981 0% ${paidPercentage}%, #EF4444 ${paidPercentage}% 100%)` }}>
                <div className="absolute w-[90px] h-[90px] bg-white rounded-full flex flex-col items-center justify-center shadow-inner">
                  <span className="text-gray-500 text-[9px] font-medium mb-0.5">Total</span>
                  <span className="text-xs font-bold text-gray-900">₹ {totalPayable.toLocaleString()}</span>
                </div>
              </div>
              <div className="flex-1 space-y-3 pl-2">
                <div className="flex justify-between items-center text-[10px]">
                  <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-green-500"></div><span className="text-gray-600 font-medium">Paid</span></div>
                  <span className="text-gray-900 font-bold">₹ {paidAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-[10px]">
                  <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-red-500"></div><span className="text-gray-600 font-medium">Pending</span></div>
                  <span className="text-gray-900 font-bold">₹ {pendingAmount.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Payroll Activities */}
          <div className="bg-white rounded-[20px] p-5 shadow-sm border border-gray-100 flex-1">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-gray-900 font-bold text-[15px]">Recent Transactions</h3>
            </div>
            <div className="space-y-4">
              {recentPayments.length > 0 ? (
                recentPayments.map((pay, i) => (
                  <div key={i} className="flex justify-between items-start border-b border-gray-50 pb-3 last:border-0 last:pb-0">
                    <div>
                      <p className="text-[12px] font-bold text-gray-900">{pay.staffName}</p>
                      <p className="text-[10px] text-gray-500 mt-0.5">{new Date(pay.date).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{pay.type} {pay.note ? `- ${pay.note}` : ''}</p>
                    </div>
                    <span className="text-[12px] font-bold text-green-600">+ ₹{Number(pay.amount).toLocaleString()}</span>
                  </div>
                ))
              ) : (
                <div className="text-center text-gray-500 text-sm py-4">No recent payments.</div>
              )}
            </div>
          </div>

        </div>

      </div>

      {/* Payment Modal */}
      {showPaymentModal && selectedStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-5 border-b border-gray-100">
              <div>
                <h3 className="font-bold text-lg text-gray-900">Record Payment</h3>
                <p className="text-xs text-gray-500">For {selectedStaff.name}</p>
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
                    {selectedStaff.bankDetails?.bankName || 'No Bank Added'}
                  </span>
                </div>
                {selectedStaff.bankDetails?.accountNumber ? (
                  <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                    <div>
                      <p className="text-[9px] text-slate-400 uppercase font-medium">Account Number</p>
                      <p className="font-mono font-bold text-blue-300 text-sm tracking-wider">{selectedStaff.bankDetails.accountNumber}</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-slate-400 uppercase font-medium">IFSC Code</p>
                      <p className="font-mono font-bold text-white text-sm">{selectedStaff.bankDetails.ifsc}</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-slate-400 uppercase font-medium">Account Holder</p>
                      <p className="font-semibold text-slate-200 truncate">{selectedStaff.bankDetails.accountHolder || selectedStaff.name}</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-slate-400 uppercase font-medium">Branch</p>
                      <p className="font-semibold text-slate-200 truncate">{selectedStaff.bankDetails.branch || 'N/A'}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">Staff member has not saved bank details yet.</p>
                )}
              </div>

              <div className="bg-blue-50/50 rounded-xl p-4 mb-5 border border-blue-100">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-500">Expected Salary:</span>
                  <span className="font-semibold text-gray-900">₹ {Number(selectedStaff.salaryAmount || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-500">Already Paid:</span>
                  <span className="font-semibold text-green-600">₹ {Number(selectedStaff.payrollRecord?.paidAmount || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm pt-2 border-t border-blue-200/50">
                  <span className="text-gray-600 font-medium">Pending Amount:</span>
                  <span className="font-bold text-red-500">₹ {selectedStaff.pendingAmount.toLocaleString()}</span>
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
                    placeholder="e.g. Cleared via UPI"
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
                  className="flex-1 px-4 py-3 bg-[#2563EB] text-white rounded-xl hover:bg-blue-700 font-semibold transition-colors shadow-sm shadow-blue-200 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {submittingPayment ? 'Processing...' : 'Confirm Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Deduction Details Modal */}
      {showDeductionModal && deductionStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center p-5 border-b border-gray-100 shrink-0">
              <div>
                <h3 className="font-bold text-lg text-gray-900">Salary Details</h3>
                <p className="text-xs text-gray-500">{deductionStaff.name} • Maturity: {new Date(deductionStaff.maturityDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setFullViewStaff(deductionStaff)}
                  className="bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 text-xs px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5"
                >
                  <Eye size={14} /> Full Profile
                </button>
                <button 
                  onClick={() => setShowDeductionModal(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-50 text-gray-500 hover:bg-gray-100 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
            
            {/* Summary Cards */}
            <div className="px-5 pt-4 shrink-0">
              {/* Bank Account Details Card */}
              <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-xl p-4 mb-4 shadow-sm border border-slate-700">
                <div className="flex justify-between items-center mb-2 pb-2 border-b border-slate-700">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
                    <CreditCard size={14} /> Staff Bank Details
                  </span>
                  <span className="text-[10px] bg-blue-500/30 text-blue-200 px-2 py-0.5 rounded-full font-bold border border-blue-400/30">
                    {deductionStaff.bankDetails?.bankName || 'No Bank Added'}
                  </span>
                </div>
                {deductionStaff.bankDetails?.accountNumber ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-1">
                    <div>
                      <p className="text-[9px] text-slate-400 uppercase font-medium">Account Number</p>
                      <p className="font-mono font-bold text-blue-300 text-sm tracking-wider">{deductionStaff.bankDetails.accountNumber}</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-slate-400 uppercase font-medium">IFSC Code</p>
                      <p className="font-mono font-bold text-white text-sm">{deductionStaff.bankDetails.ifsc}</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-slate-400 uppercase font-medium">Account Holder</p>
                      <p className="font-semibold text-slate-200 truncate">{deductionStaff.bankDetails.accountHolder || deductionStaff.name}</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-slate-400 uppercase font-medium">Branch</p>
                      <p className="font-semibold text-slate-200 truncate">{deductionStaff.bankDetails.branch || 'N/A'}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">No bank details added by staff member yet.</p>
                )}
              </div>

              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-blue-50 rounded-xl p-3 border border-blue-100">
                  <p className="text-[10px] text-blue-500 font-semibold mb-0.5">Base Salary</p>
                  <p className="text-sm font-bold text-gray-900">₹ {Number(deductionStaff.record?.baseSalary || deductionStaff.salaryAmount || 0).toLocaleString()}</p>
                </div>
                <div className="bg-red-50 rounded-xl p-3 border border-red-100">
                  <p className="text-[10px] text-red-500 font-semibold mb-0.5">Total Deduction</p>
                  <p className="text-sm font-bold text-red-600">
                    - ₹ {((deductionStaff.record?.baseSalary || Number(deductionStaff.salaryAmount) || 0) - (deductionStaff.expected || 0)).toLocaleString()}
                  </p>
                </div>
                <div className="bg-green-50 rounded-xl p-3 border border-green-100">
                  <p className="text-[10px] text-green-500 font-semibold mb-0.5">Net Salary</p>
                  <p className="text-sm font-bold text-green-600">₹ {deductionStaff.expected.toLocaleString()}</p>
                </div>
              </div>

              {deductionStaff.record?.perDaySalary > 0 && (
                <p className="text-xs text-gray-500 mb-3">
                  Per Day Salary: <span className="font-bold text-gray-700">₹ {deductionStaff.record.perDaySalary.toLocaleString()}</span> 
                  &nbsp;•&nbsp; Working Days: <span className="font-bold text-gray-700">{deductionStaff.record.totalWorkingDays}</span>
                </p>
              )}
            </div>

            {/* Deduction Table */}
            <div className="flex-1 overflow-y-auto px-5 pb-5">
              {(() => {
                const deductionList = deductionStaff.record?.deductionDetails || [];
                const MODAL_ITEMS_PER_PAGE = 5;
                const modalTotalPages = Math.ceil(deductionList.length / MODAL_ITEMS_PER_PAGE) || 1;
                const paginatedDeductionList = deductionList.slice(
                  (modalPage - 1) * MODAL_ITEMS_PER_PAGE,
                  modalPage * MODAL_ITEMS_PER_PAGE
                );

                if (deductionList.length === 0) {
                  return (
                    <div className="text-center py-8 text-gray-400 text-sm">
                      <CheckCircle2 size={32} className="mx-auto mb-2 text-green-400" />
                      <p className="font-medium">No deductions this cycle!</p>
                      <p className="text-xs">Full salary will be paid.</p>
                    </div>
                  );
                }

                return (
                  <>
                    <h4 className="text-xs font-bold text-gray-700 mb-2 flex items-center justify-between">
                      <span className="flex items-center gap-1.5"><AlertTriangle size={14} className="text-amber-500" /> Deduction Breakdown</span>
                      <span className="text-[10px] text-gray-400 font-normal">Showing {paginatedDeductionList.length} of {deductionList.length} records</span>
                    </h4>
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-y border-gray-100 bg-gray-50/50">
                          <th className="py-2 px-3 text-[10px] font-bold text-gray-500 uppercase">Date</th>
                          <th className="py-2 px-3 text-[10px] font-bold text-gray-500 uppercase">Punch In</th>
                          <th className="py-2 px-3 text-[10px] font-bold text-gray-500 uppercase">Status</th>
                          <th className="py-2 px-3 text-[10px] font-bold text-gray-500 uppercase">Deduction</th>
                          <th className="py-2 px-3 text-[10px] font-bold text-gray-500 uppercase text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedDeductionList.map((d: any, i: number) => {
                          const realIndex = (modalPage - 1) * MODAL_ITEMS_PER_PAGE + i;
                          return (
                            <tr key={realIndex} className={`border-b border-gray-50 last:border-0 ${d.forgiven ? 'opacity-50 bg-green-50/30' : ''}`}>
                              <td className="py-2.5 px-3 text-xs font-medium text-gray-900">
                                {new Date(d.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                              </td>
                              <td className="py-2.5 px-3 text-xs text-gray-600">
                                {d.punchIn ? new Date(d.punchIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                              </td>
                              <td className="py-2.5 px-3">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  d.status === 'Late' ? 'bg-yellow-100 text-yellow-700' : 
                                  d.status === 'Half Day' ? 'bg-orange-100 text-orange-700' : 
                                  'bg-red-100 text-red-600'
                                }`}>
                                  {d.status}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-xs font-semibold text-red-500">
                                {d.forgiven ? (
                                  <span className="text-green-600 line-through">₹ {Math.round(d.deduction * (deductionStaff.record.perDaySalary || 0)).toLocaleString()}</span>
                                ) : (
                                  <>- ₹ {Math.round(d.deduction * (deductionStaff.record.perDaySalary || 0)).toLocaleString()}</>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                {d.forgiven ? (
                                  <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full">✓ Forgiven</span>
                                ) : (
                                  <button
                                    onClick={() => handleForgiveDeduction(realIndex)}
                                    disabled={forgivingIndex === realIndex}
                                    className="flex items-center gap-1 text-[10px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-full border border-blue-100 transition-colors ml-auto disabled:opacity-50"
                                  >
                                    <Undo2 size={12} />
                                    {forgivingIndex === realIndex ? 'Saving...' : 'Forgive'}
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>

                    {modalTotalPages > 1 && (
                      <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-100">
                        <span className="text-[11px] text-gray-500 font-medium">
                          Page {modalPage} of {modalTotalPages}
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setModalPage(prev => Math.max(prev - 1, 1))}
                            disabled={modalPage === 1}
                            className="px-2.5 py-1 text-[11px] font-semibold border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            Previous
                          </button>
                          <button
                            onClick={() => setModalPage(prev => Math.min(prev + 1, modalTotalPages))}
                            disabled={modalPage >= modalTotalPages}
                            className="px-2.5 py-1 text-[11px] font-semibold border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Full Staff Master Profile View */}
      <StaffDetailsModal 
        isOpen={!!fullViewStaff} 
        onClose={() => setFullViewStaff(null)} 
        staff={fullViewStaff} 
      />

    </div>
  );
}