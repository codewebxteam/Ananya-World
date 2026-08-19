// components/Header.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, SafeAreaView, Platform, Modal } from 'react-native';
import { Bell, Menu, Calendar, Clock, X } from 'lucide-react-native';

// Firebase integration ke liye interface banaya hai.
// Future mein backend se data aayega toh directly isme pass kar sakte hain.
interface UserData {
  name: string;
  role: string;
  employeeId: string;
  profilePic?: string | null;
}

import AsyncStorage from '@react-native-async-storage/async-storage';

// Global memory cache so Header renders instantly with zero reload when navigating between tabs
let globalHeaderUserCache: UserData | null = null;

export const clearGlobalHeaderCache = () => {
  globalHeaderUserCache = null;
};

export default function Header({ 
  notificationCount = 3 
}: { notificationCount?: number }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [user, setUser] = useState<UserData | null>(globalHeaderUserCache);
  const [isInitialLoading, setIsInitialLoading] = useState(!globalHeaderUserCache);
  const [isImageModalVisible, setIsImageModalVisible] = useState(false);

  useEffect(() => {
    // Fetch time
    const timer = setInterval(() => {
      setCurrentDate(new Date());
    }, 1000);

    // Fetch user data
    AsyncStorage.getItem('userData').then(data => {
      if (data) {
        const parsed = JSON.parse(data);
        const userData: UserData = {
          name: parsed.name || 'User',
          role: parsed.designation || parsed.staffType || 'Staff',
          employeeId: parsed.empId || 'N/A',
          profilePic: parsed.avatar || null
        };
        setUser(userData);
        globalHeaderUserCache = userData;
        setIsInitialLoading(false);
      }
    });

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

  // Skeleton Loader for initial cold load
  if (isInitialLoading && !user) {
    return (
      <View className="bg-[#003B95] overflow-hidden rounded-b-[32px] pb-6 pt-12 relative animate-pulse">
        <SafeAreaView className="px-5">
          <View className="flex-row justify-between items-center mb-6">
            <View className="bg-white/20 h-7 w-36 rounded-md" />
          </View>
          <View className="flex-row justify-between items-end">
            <View className="flex-row items-center flex-1">
              <View className="w-20 h-20 rounded-full bg-white/20 mr-4" />
              <View className="gap-2">
                <View className="bg-white/20 h-3 w-24 rounded" />
                <View className="bg-white/20 h-5 w-32 rounded" />
                <View className="bg-white/20 h-3 w-20 rounded" />
              </View>
            </View>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  const currentUser = user || {
    name: 'User',
    role: 'Staff',
    employeeId: 'N/A',
    profilePic: null
  };

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
            <TouchableOpacity 
              activeOpacity={0.8}
              onPress={() => setIsImageModalVisible(true)}
              className="w-20 h-20 rounded-full border-2 border-white/20 overflow-hidden mr-4 bg-[#002B70] items-center justify-center"
            >
              {currentUser.profilePic ? (
                <Image 
                  source={{ uri: currentUser.profilePic }}
                  className="w-full h-full"
                  resizeMode="cover"
                />
              ) : (
                <Text className="text-white text-3xl font-bold">{currentUser.name.charAt(0).toUpperCase()}</Text>
              )}
            </TouchableOpacity>
            
            {/* User Details */}
            <View>
              <Text className="text-white/80 text-sm font-medium mb-1">
                {getGreeting()}, 👋
              </Text>
              <Text className="text-white text-xl font-bold mb-1">
                {currentUser.name}
              </Text>
              <Text className="text-white/90 text-xs mb-2">
                {currentUser.role}
              </Text>
              <View className="bg-[#002B70] self-start px-3 py-1 rounded-full">
                <Text className="text-white/90 text-[10px] font-medium">
                  Employee ID: {currentUser.employeeId}
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

      <Modal
        visible={isImageModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsImageModalVisible(false)}
      >
        <TouchableOpacity 
          activeOpacity={1} 
          onPress={() => setIsImageModalVisible(false)} 
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center', padding: 20 }}
        >
          {/* Close button at the top right */}
          <TouchableOpacity 
            onPress={() => setIsImageModalVisible(false)} 
            style={{ position: 'absolute', top: Platform.OS === 'ios' ? 60 : 40, right: 24, padding: 10, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 99 }}
          >
            <X color="white" size={24} />
          </TouchableOpacity>

          {/* Large image container */}
          <View style={{ width: 280, height: 280, borderRadius: 140, overflow: 'hidden', backgroundColor: '#002B70', borderWidth: 4, borderColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
            {currentUser.profilePic ? (
              <Image 
                source={{ uri: currentUser.profilePic }}
                style={{ width: '100%', height: '100%' }}
                resizeMode="cover"
              />
            ) : (
              <Text style={{ color: 'white', fontSize: 96, fontWeight: 'bold' }}>{currentUser.name.charAt(0).toUpperCase()}</Text>
            )}
          </View>

          {/* User info at the bottom */}
          <View style={{ marginTop: 24, alignItems: 'center' }}>
            <Text style={{ color: 'white', fontSize: 24, fontWeight: 'bold' }}>{currentUser.name}</Text>
            <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, marginTop: 4 }}>{currentUser.role}</Text>
            <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 2 }}>Employee ID: {currentUser.employeeId}</Text>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}