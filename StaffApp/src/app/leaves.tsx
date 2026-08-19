// app/leaves.tsx
import React, { useState, useEffect } from 'react';
import { 
  View, Text, ScrollView, TouchableOpacity, Alert, 
  ActivityIndicator, Modal, TextInput, SafeAreaView
} from 'react-native';
import { 
  Plane, Calendar, ClipboardList, CheckCircle2, 
  AlertCircle, Clock, Plus, X, CalendarDays,
  UserCheck
} from 'lucide-react-native';
import { db } from '../config/firebase';
import { collection, query, where, onSnapshot, addDoc, doc, updateDoc } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function LeavesScreen() {
  const [userData, setUserData] = useState<any>(null);
  const [activeSubTab, setActiveSubTab] = useState<'leaves' | 'offs' | 'extra'>('leaves');
  const [leavesList, setLeavesList] = useState<any[]>([]);
  const [cancelledOffs, setCancelledOffs] = useState<any[]>([]);
  const [extraDuties, setExtraDuties] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Leave Form States
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [leaveType, setLeaveType] = useState<'Single Day' | 'Multi-Day'>('Single Day');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [leaveReason, setLeaveReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Calendar Picker States
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [calendarTarget, setCalendarTarget] = useState<'start' | 'end'>('start');
  const [calendarViewDate, setCalendarViewDate] = useState(new Date());

  const openCalendarPicker = (target: 'start' | 'end') => {
    setCalendarTarget(target);
    const currentDateVal = target === 'start' ? startDate : endDate;
    if (currentDateVal) {
      try {
        const d = new Date(currentDateVal);
        if (!isNaN(d.getTime())) {
          setCalendarViewDate(d);
        }
      } catch {}
    }
    setShowCalendarModal(true);
  };

  const changeCalendarMonth = (offset: number) => {
    const next = new Date(calendarViewDate);
    next.setMonth(next.getMonth() + offset);
    setCalendarViewDate(next);
  };

  const selectCalendarDate = (dateStr: string) => {
    if (calendarTarget === 'start') {
      setStartDate(dateStr);
      if (leaveType === 'Single Day' || endDate < dateStr) {
        setEndDate(dateStr);
      }
    } else {
      setEndDate(dateStr);
    }
    setShowCalendarModal(false);
  };

  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return 'Select Date';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const generateCalendarGrid = (viewDate: Date) => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDayOfWeek = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const grid: ({ day: number; dateStr: string } | null)[] = [];

    for (let i = 0; i < firstDayOfWeek; i++) {
      grid.push(null);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const mStr = String(month + 1).padStart(2, '0');
      const dStr = String(d).padStart(2, '0');
      const dateStr = `${year}-${mStr}-${dStr}`;
      grid.push({ day: d, dateStr });
    }

    return grid;
  };

  useEffect(() => {
    let unsubLeaves: any;
    let unsubOffs: any;
    let unsubDuties: any;

    const initData = async () => {
      try {
        const storedUser = await AsyncStorage.getItem('userData');
        if (storedUser) {
          const parsed = JSON.parse(storedUser);
          setUserData(parsed);

          // 1. Listen for Leaves
          const qLeaves = query(collection(db, 'leaves'), where('staffId', '==', parsed.empId));
          unsubLeaves = onSnapshot(qLeaves, (snapshot) => {
            const leaves: any[] = [];
            snapshot.forEach(docSnap => {
              leaves.push({ id: docSnap.id, ...docSnap.data() });
            });
            leaves.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
            setLeavesList(leaves);
            setIsLoading(false);
          });

          // 2. Listen for Cancelled Weekly Offs
          const qOffs = query(collection(db, 'weekly_off_cancellations'), where('staffId', '==', parsed.empId));
          unsubOffs = onSnapshot(qOffs, (snapshot) => {
            const offs: any[] = [];
            snapshot.forEach(docSnap => {
              offs.push({ id: docSnap.id, ...docSnap.data() });
            });
            offs.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
            setCancelledOffs(offs);
          });

          // 3. Listen for Extra Duties
          const qDuties = query(collection(db, 'extra_duties'), where('staffId', '==', parsed.empId));
          unsubDuties = onSnapshot(qDuties, (snapshot) => {
            const duties: any[] = [];
            snapshot.forEach(docSnap => {
              duties.push({ id: docSnap.id, ...docSnap.data() });
            });
            duties.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
            setExtraDuties(duties);
          });
        }
      } catch (err) {
        console.error("Error loading leaves screen data:", err);
        setIsLoading(false);
      }
    };

    initData();

    return () => {
      if (unsubLeaves) unsubLeaves();
      if (unsubOffs) unsubOffs();
      if (unsubDuties) unsubDuties();
    };
  }, []);

  const handleApplyLeave = async () => {
    if (!leaveReason.trim()) {
      Alert.alert("Validation", "Please enter a reason for your leave request.");
      return;
    }
    if (!userData) return;

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'leaves'), {
        staffId: userData.empId,
        name: userData.name,
        phone: userData.phone || userData.mobile || userData.contact || '+91 98765 43210',
        startDate,
        endDate: leaveType === 'Single Day' ? startDate : endDate,
        leaveType,
        reason: leaveReason.trim(),
        status: 'Pending',
        createdAt: new Date().toISOString()
      });

      Alert.alert("Success", "Leave request submitted successfully!");
      setLeaveReason('');
      setShowApplyModal(false);
    } catch (error: any) {
      Alert.alert("Error", error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    if (status === 'Approved') return 'text-emerald-600 bg-emerald-50 border-emerald-100';
    if (status === 'Rejected') return 'text-red-600 bg-red-50 border-red-100';
    return 'text-amber-600 bg-amber-50 border-amber-100';
  };

  if (isLoading) {
    return (
      <View className="flex-1 bg-[#F5F7FA] items-center justify-center">
        <ActivityIndicator size="large" color="#003B95" />
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F5F7FA' }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 110 }} showsVerticalScrollIndicator={false} className="px-4 pt-4">
        
        {/* Banner Card */}
        <View className="bg-white rounded-[24px] p-5 border border-gray-100 shadow-sm mb-6">
          <View className="flex-row items-center justify-between mb-4">
            <View>
              <Text className="text-black text-xl font-black">Leaves &amp; Offs</Text>
              <Text className="text-gray-400 text-xs font-semibold mt-0.5">Manage leave requests and off duty assignments</Text>
            </View>
            <View className="w-12 h-12 bg-[#EEF5FF] rounded-2xl items-center justify-center">
              <Plane color="#208AEF" size={24} />
            </View>
          </View>

          <TouchableOpacity 
            activeOpacity={0.8}
            onPress={() => setShowApplyModal(true)}
            className="bg-[#003B95] rounded-xl py-3.5 items-center justify-center flex-row gap-2 shadow-md shadow-blue-900/10"
          >
            <Plus color="white" size={18} strokeWidth={2.5} />
            <Text className="text-white font-bold text-sm tracking-wide">Apply for New Leave</Text>
          </TouchableOpacity>
        </View>

        {/* Sub-tabs */}
        <View className="flex-row bg-white rounded-xl p-1.5 border border-gray-100 shadow-sm mb-5">
          <TouchableOpacity
            onPress={() => setActiveSubTab('leaves')}
            className={`flex-1 py-2.5 items-center justify-center rounded-lg ${activeSubTab === 'leaves' ? 'bg-[#EEF5FF]' : ''}`}
          >
            <Text className={`text-[12px] font-bold ${activeSubTab === 'leaves' ? 'text-[#208AEF]' : 'text-gray-500'}`}>My Leaves</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveSubTab('offs')}
            className={`flex-1 py-2.5 items-center justify-center rounded-lg ${activeSubTab === 'offs' ? 'bg-[#EEF5FF]' : ''}`}
          >
            <Text className={`text-[12px] font-bold ${activeSubTab === 'offs' ? 'text-[#208AEF]' : 'text-gray-500'}`}>Cancelled Offs</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveSubTab('extra')}
            className={`flex-1 py-2.5 items-center justify-center rounded-lg ${activeSubTab === 'extra' ? 'bg-[#EEF5FF]' : ''}`}
          >
            <Text className={`text-[12px] font-bold ${activeSubTab === 'extra' ? 'text-[#208AEF]' : 'text-gray-500'}`}>Extra Duty</Text>
          </TouchableOpacity>
        </View>

        {/* SUBTAB CONTENT: My Leaves */}
        {activeSubTab === 'leaves' && (
          <View className="space-y-4">
            {leavesList.length === 0 ? (
              <View className="bg-white rounded-2xl p-8 items-center border border-gray-100">
                <Text className="text-gray-400 font-medium text-sm">No leave requests found.</Text>
              </View>
            ) : (
              leavesList.map((leave) => (
                <View key={leave.id} className="bg-white rounded-[20px] p-4 border border-gray-100 shadow-sm">
                  <View className="flex-row justify-between items-start mb-3">
                    <View>
                      <Text className="text-black font-extrabold text-sm">{leave.leaveType}</Text>
                      <Text className="text-gray-400 text-[10px] font-bold mt-0.5">Applied: {new Date(leave.createdAt).toLocaleDateString('en-GB')}</Text>
                    </View>
                    <View className={`px-2.5 py-1 rounded-full border ${getStatusColor(leave.status)}`}>
                      <Text className="text-[10px] font-bold uppercase">{leave.status}</Text>
                    </View>
                  </View>

                  <View className="flex-row items-center gap-2 bg-gray-50 p-2.5 rounded-xl border border-gray-100 mb-2">
                    <CalendarDays size={16} color="#6B7280" />
                    <Text className="text-gray-700 text-xs font-bold">
                      {leave.startDate === leave.endDate ? leave.startDate : `${leave.startDate} to ${leave.endDate}`}
                    </Text>
                  </View>

                  <Text className="text-gray-600 text-xs mt-1 leading-relaxed"><Text className="font-bold text-gray-800">Reason:</Text> {leave.reason}</Text>
                </View>
              ))
            )}
          </View>
        )}

        {/* SUBTAB CONTENT: Cancelled Offs */}
        {activeSubTab === 'offs' && (
          <View className="space-y-4">
            {cancelledOffs.length === 0 ? (
              <View className="bg-white rounded-2xl p-8 items-center border border-gray-100">
                <Text className="text-gray-400 font-medium text-sm">No weekly off cancellations.</Text>
              </View>
            ) : (
              cancelledOffs.map((off) => (
                <View key={off.id} className="bg-white rounded-[20px] p-4 border border-gray-100 shadow-sm">
                  <View className="flex-row items-center justify-between mb-3">
                    <View className="flex-row items-center gap-1.5 bg-red-50 border border-red-100 rounded-full px-2.5 py-0.5">
                      <AlertCircle size={12} color="#EF4444" />
                      <Text className="text-red-700 text-[10px] font-black uppercase">Off Cancelled</Text>
                    </View>
                    <Text className="text-gray-400 text-[10px] font-bold">Assigned: {new Date(off.createdAt).toLocaleDateString('en-GB')}</Text>
                  </View>

                  <View className="flex-row items-center gap-2 bg-gray-50 p-2.5 rounded-xl border border-gray-100 mb-2">
                    <CalendarDays size={16} color="#EF4444" />
                    <Text className="text-red-600 text-xs font-bold">Must work on: {off.date}</Text>
                  </View>

                  <Text className="text-gray-600 text-xs mt-1 leading-relaxed"><Text className="font-bold text-gray-800">Description:</Text> {off.reason}</Text>
                </View>
              ))
            )}
          </View>
        )}

        {/* SUBTAB CONTENT: Extra Duty */}
        {activeSubTab === 'extra' && (
          <View className="space-y-4">
            {extraDuties.length === 0 ? (
              <View className="bg-white rounded-2xl p-8 items-center border border-gray-100">
                <Text className="text-gray-400 font-medium text-sm">No extra duty records found.</Text>
              </View>
            ) : (
              extraDuties.map((duty) => (
                <View key={duty.id} className="bg-white rounded-[20px] p-4 border border-gray-100 shadow-sm">
                  <View className="flex-row justify-between items-center mb-3">
                    <View className="flex-row items-center gap-1.5 bg-blue-50 border border-blue-100 rounded-full px-2.5 py-0.5">
                      <UserCheck size={12} color="#2563EB" />
                      <Text className="text-blue-700 text-[10px] font-black uppercase">Extra Duty</Text>
                    </View>
                    <View className={`px-2.5 py-0.5 rounded-full border ${
                      duty.status === 'Completed' 
                        ? 'bg-gray-100 border-gray-200 text-gray-600' 
                        : 'bg-green-50 border-green-100 text-green-700'
                    }`}>
                      <Text className="text-[9px] font-bold uppercase">{duty.status || 'Active'}</Text>
                    </View>
                  </View>

                  <View className="flex-row items-center gap-2 bg-gray-50 p-2.5 rounded-xl border border-gray-100 mb-2">
                    <CalendarDays size={16} color="#2563EB" />
                    <Text className="text-blue-600 text-xs font-bold">Duty Date: {duty.date}</Text>
                  </View>

                  <Text className="text-gray-600 text-xs mt-1 leading-relaxed"><Text className="font-bold text-gray-800">Job Description:</Text> {duty.reason}</Text>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>

      {/* Apply Leave Modal */}
      <Modal visible={showApplyModal} transparent={true} animationType="slide" onRequestClose={() => setShowApplyModal(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View className="bg-white rounded-t-[32px] p-6 min-h-[480px]">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-black text-xl font-black">Apply for Leave</Text>
              <TouchableOpacity onPress={() => setShowApplyModal(false)} className="p-1 rounded-full bg-gray-100">
                <X color="#6B7280" size={20} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} className="space-y-4">
              {/* Leave Type selector */}
              <View className="mb-4">
                <Text className="text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">Leave Duration</Text>
                <View className="flex-row gap-2">
                  <TouchableOpacity
                    onPress={() => setLeaveType('Single Day')}
                    className={`flex-1 py-3 items-center justify-center rounded-xl border ${
                      leaveType === 'Single Day' 
                        ? 'border-[#208AEF] bg-blue-50/50' 
                        : 'border-gray-200 bg-white'
                    }`}
                  >
                    <Text className={`text-xs font-bold ${leaveType === 'Single Day' ? 'text-[#208AEF]' : 'text-gray-500'}`}>Single Day</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setLeaveType('Multi-Day')}
                    className={`flex-1 py-3 items-center justify-center rounded-xl border ${
                      leaveType === 'Multi-Day' 
                        ? 'border-[#208AEF] bg-blue-50/50' 
                        : 'border-gray-200 bg-white'
                    }`}
                  >
                    <Text className={`text-xs font-bold ${leaveType === 'Multi-Day' ? 'text-[#208AEF]' : 'text-gray-500'}`}>Multi-Day</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Start Date */}
              <View className="mb-4">
                <Text className="text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Start Date</Text>
                <TouchableOpacity 
                  activeOpacity={0.7}
                  onPress={() => openCalendarPicker('start')}
                  className="bg-[#F8FAFC] border border-gray-200 rounded-xl px-4 py-3 flex-row items-center justify-between shadow-sm"
                >
                  <View className="flex-row items-center gap-2">
                    <Calendar color="#208AEF" size={18} strokeWidth={2} />
                    <Text className="text-black text-sm font-bold">
                      {formatDateDisplay(startDate)}
                    </Text>
                  </View>
                  <Text className="text-[#208AEF] text-xs font-bold bg-blue-50 px-2 py-1 rounded-md">Select Date</Text>
                </TouchableOpacity>
              </View>

              {/* End Date (for Multi-Day) */}
              {leaveType === 'Multi-Day' && (
                <View className="mb-4">
                  <Text className="text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wider">End Date</Text>
                  <TouchableOpacity 
                    activeOpacity={0.7}
                    onPress={() => openCalendarPicker('end')}
                    className="bg-[#F8FAFC] border border-gray-200 rounded-xl px-4 py-3 flex-row items-center justify-between shadow-sm"
                  >
                    <View className="flex-row items-center gap-2">
                      <Calendar color="#208AEF" size={18} strokeWidth={2} />
                      <Text className="text-black text-sm font-bold">
                        {formatDateDisplay(endDate)}
                      </Text>
                    </View>
                    <Text className="text-[#208AEF] text-xs font-bold bg-blue-50 px-2 py-1 rounded-md">Select Date</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Reason */}
              <View className="mb-6">
                <Text className="text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">Reason for Leave</Text>
                <View className="bg-[#F8FAFC] border border-gray-100 rounded-xl px-3 py-2 shadow-sm min-h-[90px]">
                  <TextInput 
                    multiline
                    value={leaveReason}
                    onChangeText={setLeaveReason}
                    placeholder="Provide a reason for the leave request..."
                    placeholderTextColor="#9CA3AF"
                    className="text-black text-sm font-medium"
                    style={{ textAlignVertical: 'top' }}
                  />
                </View>
              </View>

              <TouchableOpacity
                onPress={handleApplyLeave}
                disabled={isSubmitting}
                className="bg-[#003B95] rounded-xl py-4 items-center justify-center shadow-lg"
              >
                {isSubmitting ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Text className="text-white font-bold text-sm">Submit Leave Request</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Calendar Date Picker Modal */}
      <Modal
        visible={showCalendarModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowCalendarModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View style={{ backgroundColor: 'white', borderRadius: 24, padding: 20, width: '100%', maxWidth: 360 }}>
            {/* Header: Month & Navigation */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <TouchableOpacity
                onPress={() => changeCalendarMonth(-1)}
                style={{ backgroundColor: '#F3F4F6', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 }}
              >
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#374151' }}>‹</Text>
              </TouchableOpacity>

              <Text style={{ fontSize: 16, fontWeight: '900', color: '#111827' }}>
                {calendarViewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </Text>

              <TouchableOpacity
                onPress={() => changeCalendarMonth(1)}
                style={{ backgroundColor: '#F3F4F6', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 }}
              >
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#374151' }}>›</Text>
              </TouchableOpacity>
            </View>

            {/* Days of Week Header */}
            <View style={{ flexDirection: 'row', marginBottom: 8 }}>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, i) => (
                <Text key={i} style={{ flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '700', color: '#9CA3AF' }}>
                  {day}
                </Text>
              ))}
            </View>

            {/* Month Grid */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {generateCalendarGrid(calendarViewDate).map((cell, idx) => {
                if (!cell) {
                  return <View key={idx} style={{ width: '14.28%', height: 40 }} />;
                }

                const targetSelected = calendarTarget === 'start' ? startDate : endDate;
                const isSelected = cell.dateStr === targetSelected;
                const isToday = cell.dateStr === new Date().toISOString().split('T')[0];

                return (
                  <TouchableOpacity
                    key={idx}
                    onPress={() => selectCalendarDate(cell.dateStr)}
                    style={{
                      width: '14.28%',
                      height: 40,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <View
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 16,
                        backgroundColor: isSelected ? '#208AEF' : isToday ? '#EFF6FF' : 'transparent',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderWidth: isToday && !isSelected ? 1 : 0,
                        borderColor: '#208AEF'
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: isSelected || isToday ? 'bold' : '500',
                          color: isSelected ? 'white' : isToday ? '#208AEF' : '#1F2937'
                        }}
                      >
                        {cell.day}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Footer Close */}
            <TouchableOpacity
              onPress={() => setShowCalendarModal(false)}
              style={{ backgroundColor: '#F3F4F6', borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginTop: 16 }}
            >
              <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#374151' }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
