// components/BottomNav.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Home, CalendarDays, IndianRupee, MessageSquare, User } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../config/firebase';

export type TabName = 'Home' | 'Attendance' | 'Salary' | 'Chat' | 'Leaves' | 'Account';

interface BottomNavProps {
  activeTab?: TabName;
  onTabChange?: (tab: TabName) => void;
}

export default function BottomNav({ activeTab = 'Home', onTabChange }: BottomNavProps) {
  const insets = useSafeAreaInsets();
  const [hasUnread, setHasUnread] = useState(false);

  useEffect(() => {
    let unsubscribe: any;
    
    const initListener = async () => {
      try {
        const storedUser = await AsyncStorage.getItem('userData');
        if (!storedUser) return;
        const parsed = JSON.parse(storedUser);
        const empId = parsed.empId;

        const lastReadStr = await AsyncStorage.getItem('lastReadChatTime');
        const lastReadTime = lastReadStr ? new Date(lastReadStr).getTime() : 0;

        const q = query(collection(db, 'communications'), orderBy('createdAt', 'desc'));
        unsubscribe = onSnapshot(q, async (snapshot) => {
          const currentLastRead = await AsyncStorage.getItem('lastReadChatTime');
          const readTime = currentLastRead ? new Date(currentLastRead).getTime() : lastReadTime;

          let foundUnread = false;
          snapshot.forEach((docSnap) => {
            if (foundUnread) return;
            const data = docSnap.data();
            let msgTime = 0;
            if (data.createdAt?.toMillis) {
              msgTime = data.createdAt.toMillis();
            } else if (data.createdAt?.seconds) {
              msgTime = data.createdAt.seconds * 1000;
            } else {
              msgTime = new Date(data.createdAt).getTime();
            }

            const isOther = data.authorId !== empId && data.author !== parsed.name;
            const isParticipant = data.roomId === 'group' || 
                (data.participants && Array.isArray(data.participants) && 
                 (data.participants.includes(empId) || data.participants.includes('all')));

            if (msgTime > readTime && isOther && isParticipant) {
              foundUnread = true;
            }
          });
          setHasUnread(foundUnread);
        });
      } catch (err) {
        console.log("Error inside BottomNav listener", err);
      }
    };

    initListener();
    return () => unsubscribe && unsubscribe();
  }, [activeTab]);
  
  const tabs: { name: TabName; Icon: any }[] = [
    { name: 'Home', Icon: Home },
    { name: 'Attendance', Icon: CalendarDays },
    { name: 'Salary', Icon: IndianRupee }, 
    { name: 'Chat', Icon: MessageSquare },
    { name: 'Account', Icon: User },
  ];

  return (
    <View 
      className="flex-row justify-between items-center bg-white px-2 pt-3 border-t border-gray-100 shadow-sm"
      style={{ paddingBottom: Math.max(insets.bottom + 6, 24) }}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.name;
        
        return (
          <TouchableOpacity 
            key={tab.name}
            onPress={() => onTabChange && onTabChange(tab.name)}
            activeOpacity={0.7}
            className={`items-center justify-center py-2 px-1 rounded-xl ${isActive ? 'bg-[#EEF5FF]' : ''}`}
            style={{ flex: 1 }}
          >
            <View className="mb-1 items-center justify-center relative">
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

              {tab.name === 'Chat' && hasUnread && (
                <View className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-white" />
              )}
            </View>
            
            <Text 
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
              className={`text-[10px] font-medium ${isActive ? 'text-[#208AEF] font-bold' : 'text-gray-500'}`}
              style={{ textAlign: 'center' }}
            >
              {tab.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}