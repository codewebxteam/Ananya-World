// app/index.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, SafeAreaView, Alert } from 'react-native';
import { 
  MapPin, LogIn, LogOut, 
  CalendarCheck2, CalendarX2, Clock, Plane,
  ChevronDown, IndianRupee, Calendar, Zap, Users,
  Signal, ShieldAlert, Globe
} from 'lucide-react-native';

export default function HomeScreen() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [punchInTime, setPunchInTime] = useState<Date | null>(null);
  const [punchOutTime, setPunchOutTime] = useState<Date | null>(null);
  
  // States for simulating Office vs Field Staff logic
  const [userRole, setUserRole] = useState<'Office' | 'Field'>('Office');
  const [isNearOffice, setIsNearOffice] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDate(new Date());
    }, 60000); // Update every minute
    return () => clearInterval(timer);
  }, []);

  const handlePunch = () => {
    if (!punchInTime) {
      if (userRole === 'Office' && !isNearOffice) {
        Alert.alert(
          "Punch In Failed",
          "You must be inside the office area to punch in.",
          [{ text: "OK" }]
        );
        return;
      }
      setPunchInTime(new Date());
      if (userRole === 'Field') {
         Alert.alert("Success", "Punch In successful! Live tracking started.");
      }
    } else if (!punchOutTime) {
      setPunchOutTime(new Date());
      if (userRole === 'Field') {
         Alert.alert("Success", "Punch Out successful! Live tracking stopped.");
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

  const currentMonth = currentDate.toLocaleString('default', { month: 'long' });
  const nextSalaryDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 10);
  if (currentDate.getDate() > 10) {
    nextSalaryDate.setMonth(nextSalaryDate.getMonth() + 1);
  }
  const formattedSalaryDate = nextSalaryDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  // Banner details based on role and location state
  const getBannerDetails = () => {
    if (punchOutTime) {
      return {
        bgClass: 'bg-gray-50 border-gray-200',
        iconBgClass: 'bg-gray-400',
        icon: <MapPin color="white" size={20} />,
        title: 'Duty Completed',
        subtitle: 'You have punched out for today.'
      };
    }

    if (userRole === 'Field') {
      return {
        bgClass: 'bg-[#EFF6FF] border-blue-100',
        iconBgClass: 'bg-[#3B82F6]',
        icon: <Globe color="white" size={20} />,
        title: 'Location Acquired',
        subtitle: punchInTime ? 'Live tracking is active.' : 'You can punch in from anywhere.'
      };
    }

    if (userRole === 'Office' && isNearOffice) {
      return {
        bgClass: 'bg-[#F0FDF4] border-green-50',
        iconBgClass: 'bg-[#138A43]',
        icon: <MapPin color="white" size={20} />,
        title: 'You are in office',
        subtitle: 'Office Location Verified.'
      };
    }

    // Office role, but not near office
    return {
      bgClass: 'bg-[#FEF2F2] border-red-100',
      iconBgClass: 'bg-[#EF4444]',
      icon: <ShieldAlert color="white" size={20} />,
      title: 'Outside Office Area',
      subtitle: 'Move closer to office to Punch In.'
    };
  };

  const bannerData = getBannerDetails();

  return (
    <ScrollView 
      bounces={false} 
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 100 }}
    >
      {/* Developer Toggle Panel for Testing */}
      <View className="bg-[#FFFBEB] px-4 py-3 border-b border-amber-200 mb-2">
        <Text className="text-amber-700 text-[10px] font-bold mb-2 tracking-wide uppercase">App Simulator (For Testing Logic)</Text>
        
        <View className="flex-row items-center gap-2 mb-2">
          <Text className="text-gray-700 text-xs font-semibold w-16">Role:</Text>
          <View className="flex-row bg-white rounded-lg border border-gray-200 overflow-hidden">
            <TouchableOpacity 
              onPress={() => setUserRole('Office')}
              className={`px-3 py-1.5 ${userRole === 'Office' ? 'bg-[#208AEF]' : ''}`}
            >
              <Text className={`text-[11px] font-bold ${userRole === 'Office' ? 'text-white' : 'text-gray-600'}`}>Office Staff</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => setUserRole('Field')}
              className={`px-3 py-1.5 ${userRole === 'Field' ? 'bg-[#208AEF]' : ''}`}
            >
              <Text className={`text-[11px] font-bold ${userRole === 'Field' ? 'text-white' : 'text-gray-600'}`}>Field Staff</Text>
            </TouchableOpacity>
          </View>
        </View>

        {userRole === 'Office' && !punchInTime && (
          <View className="flex-row items-center gap-2">
            <Text className="text-gray-700 text-xs font-semibold w-16">Geofence:</Text>
            <View className="flex-row bg-white rounded-lg border border-gray-200 overflow-hidden">
              <TouchableOpacity 
                onPress={() => setIsNearOffice(true)}
                className={`px-3 py-1.5 ${isNearOffice ? 'bg-green-500' : ''}`}
              >
                <Text className={`text-[11px] font-bold ${isNearOffice ? 'text-white' : 'text-gray-600'}`}>In Office</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={() => setIsNearOffice(false)}
                className={`px-3 py-1.5 ${!isNearOffice ? 'bg-red-500' : ''}`}
              >
                <Text className={`text-[11px] font-bold ${!isNearOffice ? 'text-white' : 'text-gray-600'}`}>Far Away</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* Main Body Content */}
      <View className="px-4 pt-2 gap-4">
        
        {/* 1. Duty Status Card */}
        <View className="bg-white rounded-[20px] p-4 shadow-sm border border-gray-100">
          {/* Header */}
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
            {!punchOutTime && (
              <TouchableOpacity 
                activeOpacity={0.8}
                onPress={handlePunch}
                className={`px-4 py-2.5 rounded-xl shadow-sm ${
                  punchInTime 
                    ? 'bg-red-500' 
                    : (userRole === 'Office' && !isNearOffice) 
                      ? 'bg-gray-400' // Disabled look
                      : 'bg-[#138A43]'
                }`}
              >
                <Text className="text-white text-sm font-bold">
                  {punchInTime ? 'Punch Out' : 'Punch In Now'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Today's Punch Stats */}
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
            
            {/* Divider */}
            <View className="h-10 w-[1px] bg-gray-200 mt-6" />

            <View className="mt-6 flex-row items-center gap-2">
              <LogOut color="#EF4444" size={20} strokeWidth={2.5} />
              <View>
                <Text className="text-gray-500 text-[11px]">Punch Out</Text>
                <Text className="text-black text-xs font-bold">{formatTime(punchOutTime)}</Text>
              </View>
            </View>

            {/* Divider */}
            <View className="h-10 w-[1px] bg-gray-200 mt-6" />

            <View className="mt-6 items-end">
              <Text className="text-gray-500 text-[11px] mb-0.5">Total Hours</Text>
              <Text className="text-black text-sm font-bold">{getWorkingHours()}</Text>
            </View>
          </View>
        </View>

        {/* 2. Attendance Overview Card */}
        <View className="bg-white rounded-[20px] p-4 shadow-sm border border-gray-100">
          <View className="flex-row justify-between items-center mb-4">
            <View className="flex-row items-center gap-2">
              <Calendar color="#208AEF" size={20} strokeWidth={2.5} />
              <Text className="text-black text-[16px] font-bold">Attendance Overview</Text>
            </View>
            <View className="flex-row items-center gap-1">
              <Text className="text-gray-500 text-xs font-medium">{currentMonth}</Text>
              <ChevronDown color="#6B7280" size={14} />
            </View>
          </View>

          <View className="flex-row justify-between items-center">
            {/* Box 1 */}
            <View className="bg-[#E6F4EA] w-[23%] aspect-square rounded-2xl items-center justify-center p-2">
              <CalendarCheck2 color="#138A43" size={24} strokeWidth={2.5} className="mb-1" />
              <Text className="text-black text-lg font-bold">{punchInTime ? '22' : '21'}</Text>
              <Text className="text-gray-600 text-[9px] font-medium text-center">Days Present</Text>
            </View>
            {/* Box 2 */}
            <View className="bg-[#FEE2E2] w-[23%] aspect-square rounded-2xl items-center justify-center p-2">
              <CalendarX2 color="#EF4444" size={24} strokeWidth={2.5} className="mb-1" />
              <Text className="text-black text-lg font-bold">2</Text>
              <Text className="text-gray-600 text-[9px] font-medium text-center">Days Absent</Text>
            </View>
            {/* Box 3 */}
            <View className="bg-[#FEF3C7] w-[23%] aspect-square rounded-2xl items-center justify-center p-2">
              <Clock color="#F59E0B" size={24} strokeWidth={2.5} className="mb-1" />
              <Text className="text-black text-lg font-bold">1</Text>
              <Text className="text-gray-600 text-[9px] font-medium text-center">Days Late</Text>
            </View>
            {/* Box 4 */}
            <View className="bg-[#EFF6FF] w-[23%] aspect-square rounded-2xl items-center justify-center p-2">
              <Plane color="#3B82F6" size={24} strokeWidth={2.5} className="mb-1" />
              <Text className="text-black text-lg font-bold">1</Text>
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
            <TouchableOpacity>
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
              <Text className="text-black text-[11px] font-bold">{formattedSalaryDate}</Text>
            </View>
            {/* Item 2 */}
            <View className="w-[24%] items-center bg-[#F8FAFC] py-3 rounded-xl">
              <View className="flex-row items-center gap-1 mb-2">
                <Clock color="#EF4444" size={12} strokeWidth={3} />
                <Text className="text-gray-500 text-[9px] font-medium">Days Late</Text>
              </View>
              <Text className="text-[#EF4444] text-[11px] font-bold">1 Day</Text>
            </View>
            {/* Item 3 */}
            <View className="w-[24%] items-center bg-[#F8FAFC] py-3 rounded-xl">
              <View className="flex-row items-center gap-1 mb-2">
                <Plane color="#3B82F6" size={12} strokeWidth={3} />
                <Text className="text-gray-500 text-[9px] font-medium">Leave Taken</Text>
              </View>
              <Text className="text-gray-600 text-[11px] font-bold">1 Day</Text>
            </View>
            {/* Item 4 */}
            <View className="w-[24%] items-center bg-[#F8FAFC] py-3 rounded-xl">
              <View className="flex-row items-center gap-1 mb-2">
                <IndianRupee color="#10B981" size={12} strokeWidth={3} />
                <Text className="text-gray-500 text-[9px] font-medium">Expected Salary</Text>
              </View>
              <Text className="text-[#10B981] text-[12px] font-bold">₹ 28,650</Text>
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
            {/* Action 1 */}
            <TouchableOpacity className="bg-white border border-[#E0F2FE] w-[23%] aspect-square rounded-2xl items-center justify-center p-2 shadow-sm">
              <MapPin color="#3B82F6" size={24} strokeWidth={2} className="mb-2" />
              <Text className="text-black text-[9px] font-medium text-center leading-tight">Start Field{"\n"}Duty</Text>
            </TouchableOpacity>
            {/* Action 2 */}
            <TouchableOpacity className="bg-white border border-[#DCFCE7] w-[23%] aspect-square rounded-2xl items-center justify-center p-2 shadow-sm">
              <Plane color="#22C55E" size={24} strokeWidth={2} className="mb-2" />
              <Text className="text-black text-[9px] font-medium text-center leading-tight">Leave{"\n"}Request</Text>
            </TouchableOpacity>
            {/* Action 3 */}
            <TouchableOpacity className="bg-white border border-[#F3E8FF] w-[23%] aspect-square rounded-2xl items-center justify-center p-2 shadow-sm">
              <Calendar color="#A855F7" size={24} strokeWidth={2} className="mb-2" />
              <Text className="text-black text-[9px] font-medium text-center leading-tight">View{"\n"}Schedule</Text>
            </TouchableOpacity>
            {/* Action 4 */}
            <TouchableOpacity className="bg-white border border-[#FEF3C7] w-[23%] aspect-square rounded-2xl items-center justify-center p-2 shadow-sm">
              <Users color="#F59E0B" size={24} strokeWidth={2} className="mb-2" />
              <Text className="text-black text-[9px] font-medium text-center leading-tight">Team{"\n"}Directory</Text>
            </TouchableOpacity>
          </View>
        </View>

      </View>
    </ScrollView>
  );
}