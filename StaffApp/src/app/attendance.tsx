// app/attendance.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { 
  MapPin, LogOut, LogIn, Calendar as CalendarIcon, 
  Clock, History, ChevronLeft, ChevronRight, 
  Check, Info, Timer, BadgeCheck, PieChart, Signal,
  TrendingUp, CalendarX2, AlertCircle
} from 'lucide-react-native';
import * as Location from 'expo-location';

export default function AttendanceScreen() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [punchInTime, setPunchInTime] = useState<Date | null>(null);
  const [punchOutTime, setPunchOutTime] = useState<Date | null>(null);
  const [locationAddress, setLocationAddress] = useState('Not Punched In');
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);
  
  // Tab State: 'Daily' | 'Monthly' | 'History'
  const [activeTab, setActiveTab] = useState<'Daily' | 'Monthly' | 'History'>('Daily');

  // Calendar State
  const [viewMonthDate, setViewMonthDate] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDate(new Date());
    }, 60000); // Update every minute
    return () => clearInterval(timer);
  }, []);

  const handlePunch = async () => {
    if (!punchInTime) {
      setIsFetchingLocation(true);
      setLocationAddress('Fetching Location...');
      
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setLocationAddress('Location Permission Denied');
        } else {
          let location = await Location.getCurrentPositionAsync({});
          let geocode = await Location.reverseGeocodeAsync({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude
          });
          
          if (geocode.length > 0) {
            const addr = geocode[0];
            const addressString = [addr.name, addr.street, addr.city, addr.region].filter(Boolean).join(', ');
            setLocationAddress(addressString || 'Location Acquired');
          } else {
            setLocationAddress('Location Acquired');
          }
        }
      } catch (error) {
        setLocationAddress('Error fetching location');
      }
      
      setIsFetchingLocation(false);
      setPunchInTime(new Date());
    } else if (!punchOutTime) {
      setPunchOutTime(new Date());
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

  // Dummy History Data
  const historyData = [
    { date: '4 Aug 2026', day: 'Monday', in: '09:12 AM', out: '06:30 PM', total: '09h 18m', status: 'Present' },
    { date: '2 Aug 2026', day: 'Saturday', in: '--:-- --', out: '--:-- --', total: '00h 00m', status: 'Absent' },
    { date: '1 Aug 2026', day: 'Friday', in: '09:30 AM', out: '06:00 PM', total: '08h 30m', status: 'Present' },
    { date: '31 Jul 2026', day: 'Thursday', in: '10:15 AM', out: '06:30 PM', total: '08h 15m', status: 'Late' },
    { date: '30 Jul 2026', day: 'Wednesday', in: '--:-- --', out: '--:-- --', total: '00h 00m', status: 'Leave' },
  ];

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
              <View className={`flex-row items-center px-2 py-1 rounded-full gap-1 ${punchInTime && !punchOutTime ? 'bg-[#E6F4EA]' : 'bg-gray-100'}`}>
                <View className={`w-2 h-2 rounded-full ${punchInTime && !punchOutTime ? 'bg-[#138A43]' : 'bg-gray-400'}`} />
                <Text className={`text-xs font-semibold ${punchInTime && !punchOutTime ? 'text-[#138A43]' : 'text-gray-500'}`}>
                  {punchInTime && !punchOutTime ? 'On Duty' : 'Off Duty'}
                </Text>
              </View>
            </View>
            <View className="flex-row items-center gap-1">
              <Text className={`text-xs font-medium ${punchInTime && !punchOutTime ? 'text-[#138A43]' : 'text-gray-500'}`}>
                {punchInTime && !punchOutTime ? 'Live Tracking' : 'Not Tracking'}
              </Text>
              <Signal color={punchInTime && !punchOutTime ? "#138A43" : "#6B7280"} size={14} strokeWidth={3} />
            </View>
          </View>

          <View className={`rounded-2xl p-4 flex-row justify-between items-center mb-4 border ${punchOutTime ? 'bg-gray-50 border-gray-200' : 'bg-[#F0FDF4] border-green-50'}`}>
            <View className="flex-row items-center gap-3">
              <View className={`w-10 h-10 rounded-full items-center justify-center ${punchOutTime ? 'bg-gray-400' : 'bg-[#138A43]'}`}>
                <MapPin color="white" size={20} />
              </View>
              <View>
                <Text className="text-black font-bold text-[15px]">You are in office</Text>
                <Text className="text-gray-500 text-[11px] mt-0.5">Office Location Verified</Text>
              </View>
            </View>
            {!punchOutTime && (
              <TouchableOpacity 
                activeOpacity={0.8}
                onPress={handlePunch}
                disabled={isFetchingLocation}
                className={`px-3 py-2.5 rounded-xl shadow-sm flex-row items-center gap-1 ${punchInTime ? 'bg-red-500' : 'bg-[#138A43]'}`}
              >
                {isFetchingLocation ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <>
                    <Text className="text-white text-sm font-bold">{punchInTime ? 'Punch Out' : 'Punch In'}</Text>
                    {punchInTime ? (
                      <LogOut color="white" size={16} strokeWidth={2.5} />
                    ) : (
                      <LogIn color="white" size={16} strokeWidth={2.5} />
                    )}
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>

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
                  const dateObj = new Date(viewMonthDate.getFullYear(), viewMonthDate.getMonth(), dayNum);
                  const isToday = (dayNum === currentDate.getDate() && viewMonthDate.getMonth() === currentDate.getMonth() && viewMonthDate.getFullYear() === currentDate.getFullYear());
                  const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
                  const isFuture = dateObj.getTime() > currentDate.getTime();
                  
                  let content = null;
                  if (isFuture && !isToday) {
                    content = null;
                  } else if (isToday) {
                    content = <View className="w-1.5 h-1.5 bg-[#FFD100] rounded-full mt-1" />;
                  } else if (isWeekend) {
                    content = <Text className="text-red-500 font-bold text-[10px] mt-0.5">A</Text>;
                  } else {
                    content = <Check color="#10B981" size={12} strokeWidth={4} className="mt-0.5" />;
                  }

                  return (
                    <View key={`day-${dayNum}`} style={{ width: '14.28%' }} className="items-center py-1.5 mb-1">
                      <View className={`w-8 h-8 rounded-full items-center justify-center ${isToday ? 'bg-[#208AEF] shadow-sm' : isWeekend && !isFuture ? 'bg-[#FFF1F2]' : ''}`}>
                        <Text className={`text-[12px] ${isToday ? 'text-white font-bold' : isWeekend && !isFuture ? 'text-gray-800' : 'text-black font-medium'}`}>
                          {dayNum}
                        </Text>
                        {content}
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>

            <View className="flex-row justify-center items-center gap-4 mt-4">
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
                <Text className="text-gray-600 text-[10px] font-medium">Half Day</Text>
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

            {/* Quick Stats */}
            <View className="flex-row flex-wrap justify-between gap-y-3 mb-6">
              <View className="w-[48%] bg-[#E6F4EA] rounded-xl p-3 items-center">
                <Text className="text-[#138A43] text-2xl font-black mb-1">21</Text>
                <Text className="text-gray-600 text-[11px] font-medium">Present</Text>
              </View>
              <View className="w-[48%] bg-[#FEE2E2] rounded-xl p-3 items-center">
                <Text className="text-[#EF4444] text-2xl font-black mb-1">2</Text>
                <Text className="text-gray-600 text-[11px] font-medium">Absent</Text>
              </View>
              <View className="w-[48%] bg-[#FEF3C7] rounded-xl p-3 items-center">
                <Text className="text-[#D97706] text-2xl font-black mb-1">1</Text>
                <Text className="text-gray-600 text-[11px] font-medium">Half Day / Late</Text>
              </View>
              <View className="w-[48%] bg-[#EFF6FF] rounded-xl p-3 items-center">
                <Text className="text-[#208AEF] text-2xl font-black mb-1">1</Text>
                <Text className="text-gray-600 text-[11px] font-medium">Leave</Text>
              </View>
            </View>

            {/* Progress Bar Chart visualization */}
            <Text className="text-black text-sm font-bold mb-3">Attendance Breakdown</Text>
            <View className="w-full h-4 rounded-full flex-row overflow-hidden mb-2">
              <View className="h-full bg-[#10B981]" style={{ width: '84%' }} />
              <View className="h-full bg-[#EF4444]" style={{ width: '8%' }} />
              <View className="h-full bg-[#F59E0B]" style={{ width: '4%' }} />
              <View className="h-full bg-[#3B82F6]" style={{ width: '4%' }} />
            </View>
            
            <View className="flex-row flex-wrap justify-between gap-y-2 px-1">
              <View className="flex-row items-center gap-1.5 w-[48%]">
                <View className="w-2 h-2 rounded-full bg-[#10B981]" />
                <Text className="text-gray-600 text-[10px]">Present (84%)</Text>
              </View>
              <View className="flex-row items-center gap-1.5 w-[48%]">
                <View className="w-2 h-2 rounded-full bg-[#EF4444]" />
                <Text className="text-gray-600 text-[10px]">Absent (8%)</Text>
              </View>
              <View className="flex-row items-center gap-1.5 w-[48%]">
                <View className="w-2 h-2 rounded-full bg-[#F59E0B]" />
                <Text className="text-gray-600 text-[10px]">Late/Half (4%)</Text>
              </View>
              <View className="flex-row items-center gap-1.5 w-[48%]">
                <View className="w-2 h-2 rounded-full bg-[#3B82F6]" />
                <Text className="text-gray-600 text-[10px]">Leave (4%)</Text>
              </View>
            </View>
            
            <View className="h-[1px] bg-gray-100 my-5" />

            {/* Other Insights */}
            <View className="flex-row justify-between items-center mb-3">
              <View className="flex-row items-center gap-2">
                <TrendingUp color="#6B7280" size={16} />
                <Text className="text-gray-700 text-xs font-semibold">Avg. Working Hours</Text>
              </View>
              <Text className="text-black font-bold">08h 15m</Text>
            </View>
            
            <View className="flex-row justify-between items-center">
              <View className="flex-row items-center gap-2">
                <CalendarX2 color="#6B7280" size={16} />
                <Text className="text-gray-700 text-xs font-semibold">Loss of Pay (Expected)</Text>
              </View>
              <Text className="text-red-500 font-bold">2 Days</Text>
            </View>
          </View>
        )}

        {/* ================= HISTORY TAB ================= */}
        {activeTab === 'History' && (
          <View className="bg-transparent">
            <View className="flex-row justify-between items-center mb-4 px-1">
              <Text className="text-black text-[16px] font-bold">Recent History</Text>
              <TouchableOpacity>
                <Text className="text-[#208AEF] text-xs font-bold">Filter</Text>
              </TouchableOpacity>
            </View>

            {historyData.map((item, index) => {
              // Decide styling based on status
              let statusBg = 'bg-[#E6F4EA]';
              let statusText = 'text-[#138A43]';
              if (item.status === 'Absent') {
                statusBg = 'bg-[#FEE2E2]';
                statusText = 'text-[#EF4444]';
              } else if (item.status === 'Late') {
                statusBg = 'bg-[#FEF3C7]';
                statusText = 'text-[#D97706]';
              } else if (item.status === 'Leave') {
                statusBg = 'bg-[#EFF6FF]';
                statusText = 'text-[#208AEF]';
              }

              return (
                <View key={index} className="bg-white rounded-[20px] p-4 shadow-sm border border-gray-100 mb-3">
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
            })}
          </View>
        )}

        {/* 4. Info Message (Only show on Daily tab to reduce clutter) */}
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