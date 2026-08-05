// components/BottomNav.tsx
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Home, CalendarDays, IndianRupee, MessageSquare, User } from 'lucide-react-native';

// Ek custom type banaya taaki error na aaye
export type TabName = 'Home' | 'Attendance' | 'Salary' | 'Chat' | 'Account';

interface BottomNavProps {
  activeTab?: TabName;
  onTabChange?: (tab: TabName) => void;
}

export default function BottomNav({ activeTab = 'Home', onTabChange }: BottomNavProps) {
  
  // Tabs array mein strictly define kiya ki name ka type TabName hoga
  const tabs: { name: TabName; Icon: any }[] = [
    { name: 'Home', Icon: Home },
    { name: 'Attendance', Icon: CalendarDays },
    { name: 'Salary', Icon: IndianRupee }, 
    { name: 'Chat', Icon: MessageSquare },
    { name: 'Account', Icon: User },
  ];

  return (
    <View className="flex-row justify-between items-center bg-white px-2 pt-3 pb-6 border-t border-gray-100 shadow-sm">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.name;
        
        return (
          <TouchableOpacity 
            key={tab.name}
            onPress={() => onTabChange && onTabChange(tab.name)}
            activeOpacity={0.7}
            className={`items-center justify-center py-2 px-3 rounded-2xl ${isActive ? 'bg-[#EEF5FF]' : ''}`}
            style={{ minWidth: 70 }}
          >
            <View className="mb-1 items-center justify-center">
              {/* Salary icon ko match karne ke liye custom styling */}
              {tab.name === 'Salary' ? (
                <View className={`rounded-full border-[1.5px] w-6 h-6 items-center justify-center ${isActive ? 'border-[#208AEF]' : 'border-gray-500'}`}>
                   <IndianRupee 
                     color={isActive ? "#208AEF" : "#6B7280"} 
                     size={14} 
                     strokeWidth={isActive ? 2.5 : 2} 
                   />
                </View>
              ) : (
                <tab.Icon 
                  color={isActive ? "#208AEF" : "#6B7280"} 
                  size={24} 
                  strokeWidth={isActive ? 2.5 : 2} 
                />
              )}
            </View>
            
            <Text 
              className={`text-[10px] font-medium ${isActive ? 'text-[#208AEF] font-bold' : 'text-gray-500'}`}
            >
              {tab.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}