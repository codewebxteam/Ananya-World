// components/Header.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, SafeAreaView, Platform } from 'react-native';
import { Bell, Menu, Calendar, Clock } from 'lucide-react-native';

// Firebase integration ke liye interface banaya hai.
// Future mein backend se data aayega toh directly isme pass kar sakte hain.
interface UserData {
  name: string;
  role: string;
  employeeId: string;
  profilePic?: string;
}

interface HeaderProps {
  user?: UserData;
  notificationCount?: number;
}

export default function Header({ 
  user = {
    name: 'Rahul Verma',
    role: 'Field Specimen Collector',
    employeeId: 'AA-1024'
  }, 
  notificationCount = 3 
}: HeaderProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDate(new Date());
    }, 1000); // Update every second to keep time accurate

    return () => clearInterval(timer);
  }, []);

  const getGreeting = () => {
    const hour = currentDate.getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const dayName = currentDate.toLocaleDateString('en-US', { weekday: 'long' });
  const dateString = currentDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  const timeString = currentDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

  return (
    <View className="bg-[#003B95] overflow-hidden rounded-b-[32px] pb-6 pt-12 relative">
      {/* Yellow Curve - clean flowing shape, sized to wrap Date/Time */}
      <View 
        className="absolute -right-6 -bottom-10 w-[200px] h-[200px] bg-[#FFD100] rounded-tl-full opacity-95" 
      />

      <SafeAreaView className="px-5">
        {/* Top Navbar: Logo & Icons */}
        <View className="flex-row justify-between items-center mb-6">
          <Text className="text-white text-2xl font-bold tracking-wide">
            Ananya <Text className="font-semibold">World</Text>
          </Text>
        </View>

        {/* Profile Section */}
        <View className="flex-row justify-between items-end">
          <View className="flex-row items-center flex-1">
            {/* Profile Image */}
            <View className="w-16 h-16 rounded-full border-2 border-white/20 overflow-hidden mr-4">
              <Image 
                source={{ uri: 'https://randomuser.me/api/portraits/men/32.jpg' }} // Temporary placeholder, Firebase se replace kar lenge
                className="w-full h-full"
                resizeMode="cover"
              />
            </View>
            
            {/* User Details */}
            <View>
              <Text className="text-white/80 text-sm font-medium mb-1">
                {getGreeting()}, 👋
              </Text>
              <Text className="text-white text-xl font-bold mb-1">
                {user.name}
              </Text>
              <Text className="text-white/90 text-xs mb-2">
                {user.role}
              </Text>
              <View className="bg-[#002B70] self-start px-3 py-1 rounded-full">
                <Text className="text-white/90 text-[10px] font-medium">
                  Employee ID: {user.employeeId}
                </Text>
              </View>
            </View>
          </View>

          {/* Date & Time Section */}
          <View className="items-end pb-2">
            <View className="flex-row items-center mb-2 gap-2">
              <Calendar color="#000000" size={16} strokeWidth={2.5} />
              <View>
                <Text className="text-black text-xs font-bold">{dayName}</Text>
                <Text className="text-black text-xs font-bold">{dateString}</Text>
              </View>
            </View>
            <View className="flex-row items-center gap-2 mt-1">
              <Clock color="#000000" size={16} strokeWidth={2.5} />
              <Text className="text-black text-sm font-extrabold">{timeString}</Text>
            </View>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}