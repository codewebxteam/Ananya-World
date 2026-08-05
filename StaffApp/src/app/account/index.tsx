// app/account.tsx
import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { 
  Bell, ChevronRight, User, Briefcase, Landmark, 
  FileText, ShieldCheck, CircleHelp, Info, LogOut
} from 'lucide-react-native';
import { router } from 'expo-router';

import AsyncStorage from '@react-native-async-storage/async-storage';

export default function AccountScreen() {

  const menuItems = [
    { 
      id: 1, title: 'My Profile', subtitle: 'View and update your personal information', 
      Icon: User, iconColor: '#208AEF', bg: 'bg-[#EFF6FF]', route: '/account/profile' 
    },
    { 
      id: 2, title: 'Job Details', subtitle: 'View your designation, department and work location', 
      Icon: Briefcase, iconColor: '#10B981', bg: 'bg-[#F0FDF4]', route: '/account/job-details'
    },
    { 
      id: 3, title: 'Bank Details', subtitle: 'View and update your bank account details', 
      Icon: Landmark, iconColor: '#F59E0B', bg: 'bg-[#FFFBEB]', route: '/account/bank-details'
    },
    { 
      id: 4, title: 'Documents', subtitle: 'View your uploaded documents', 
      Icon: FileText, iconColor: '#8B5CF6', bg: 'bg-[#F5F3FF]', route: '/account/documents'
    },
    { 
      id: 5, title: 'Change Password', subtitle: 'Update your account password', 
      Icon: ShieldCheck, iconColor: '#208AEF', bg: 'bg-[#EFF6FF]', route: '/account/security'
    },
    { 
      id: 6, title: 'Help & Support', subtitle: 'FAQs, guides and contact support', 
      Icon: CircleHelp, iconColor: '#EF4444', bg: 'bg-[#FEF2F2]', route: '/account/support'
    },
    { 
      id: 7, title: 'About Ananya World', subtitle: 'App version, terms and privacy policy', 
      Icon: Info, iconColor: '#6B7280', bg: 'bg-[#F3F4F6]', route: '/account/about'
    }
  ];

  const handleMenuPress = (route: string | null, title: string) => {
    if (route) {
      router.push(route as any);
    } else {
      Alert.alert("Coming Soon", `${title} screen will be available soon.`);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      "Log Out",
      "Are you sure you want to log out?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Log Out", 
          style: "destructive",
          onPress: async () => {
            await AsyncStorage.removeItem('isLoggedIn');
            router.replace('/login');
          }
        }
      ]
    );
  };

  return (
    <ScrollView 
      bounces={false} 
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 110 }}
    >
      <View className="px-4 pt-4">
        
        {/* Menu Options Card */}
        <View className="bg-white rounded-[24px] px-2 py-3 shadow-sm border border-gray-100 mb-4">
          {menuItems.map((item, index) => (
            <TouchableOpacity 
              key={item.id}
              activeOpacity={0.7}
              onPress={() => handleMenuPress(item.route, item.title)}
              className={`flex-row items-center p-3 ${index !== menuItems.length - 1 ? 'border-b border-gray-50' : ''}`}
            >
              <View className={`w-11 h-11 rounded-xl items-center justify-center mr-3 ${item.bg}`}>
                <item.Icon color={item.iconColor} size={22} strokeWidth={2} />
              </View>
              <View className="flex-1 pr-2">
                <Text className="text-black text-[15px] font-bold mb-0.5">{item.title}</Text>
                <Text className="text-gray-500 text-[11px] leading-tight">{item.subtitle}</Text>
              </View>
              <ChevronRight color="#9CA3AF" size={20} strokeWidth={2} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Log Out Button Card */}
        <View className="bg-white rounded-[20px] shadow-sm border border-gray-100 mb-4">
          <TouchableOpacity 
            activeOpacity={0.7}
            onPress={handleLogout}
            className="flex-row items-center p-4"
          >
            <View className="w-11 h-11 rounded-xl items-center justify-center mr-3 bg-[#FEF2F2]">
              <LogOut color="#EF4444" size={22} strokeWidth={2.5} />
            </View>
            <View className="flex-1">
              <Text className="text-[#EF4444] text-[15px] font-bold mb-0.5">Log Out</Text>
              <Text className="text-gray-500 text-[11px]">Sign out from your account</Text>
            </View>
            <ChevronRight color="#9CA3AF" size={20} strokeWidth={2} />
          </TouchableOpacity>
        </View>

      </View>
    </ScrollView>
  );
}