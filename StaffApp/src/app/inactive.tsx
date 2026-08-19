// app/inactive.tsx
import React from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, StatusBar } from 'react-native';
import { ShieldAlert, LogOut } from 'lucide-react-native';
import { router } from 'expo-router';
import { auth } from '../config/firebase';
import { signOut } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { clearGlobalHeaderCache } from '../components/Header';

export default function InactiveScreen() {
  const handleLogout = async () => {
    try {
      await signOut(auth);
      await AsyncStorage.clear();
      clearGlobalHeaderCache();
      router.replace('/login');
    } catch (error) {
      console.log('Error logging out:', error);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <StatusBar barStyle="dark-content" />
      <View className="flex-1 items-center justify-center px-6">
        
        <View className="w-24 h-24 bg-red-100 rounded-full items-center justify-center mb-8 shadow-sm">
          <ShieldAlert color="#EF4444" size={48} strokeWidth={2} />
        </View>

        <Text className="text-3xl font-black text-[#0f172a] text-center mb-3">
          Account Inactive
        </Text>
        
        <Text className="text-[15px] font-medium text-gray-500 text-center leading-relaxed px-4 mb-10">
          Your account has been marked as inactive by the Administrator. Please contact your manager or human resources for assistance.
        </Text>

        <TouchableOpacity 
          onPress={handleLogout}
          className="bg-white border border-gray-200 py-4 px-8 rounded-full flex-row items-center shadow-sm"
        >
          <LogOut color="#64748b" size={20} strokeWidth={2} />
          <Text className="text-gray-600 font-bold ml-2 text-base">Return to Login</Text>
        </TouchableOpacity>

      </View>
    </SafeAreaView>
  );
}
