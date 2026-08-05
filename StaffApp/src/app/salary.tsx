// app/salary.tsx
import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { 
  Calendar, Hourglass, Info, FileText, 
  Wallet, Gift, MinusCircle, CalendarCheck2, 
  CalendarX2, Clock, Plane, Lightbulb, 
  ReceiptText, ChevronRight, ArrowRight, ChevronDown
} from 'lucide-react-native';

export default function SalaryScreen() {
  const [showAllHistory, setShowAllHistory] = useState(false);

  const historyData = [
    { month: 'July 2026', date: 'Paid on 10 Aug 2026', amount: '₹ 28,000' },
    { month: 'June 2026', date: 'Paid on 10 Jul 2026', amount: '₹ 27,500' },
    { month: 'May 2026', date: 'Paid on 10 Jun 2026', amount: '₹ 28,100' },
    { month: 'April 2026', date: 'Paid on 10 May 2026', amount: '₹ 28,000' },
    { month: 'March 2026', date: 'Paid on 10 Apr 2026', amount: '₹ 27,800' },
  ];

  const displayedHistory = showAllHistory ? historyData : [historyData[0]];

  return (
    <ScrollView 
      bounces={false} 
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 100 }}
    >
      {/* Main Body Content */}
      <View className="px-4 pt-4 gap-4">
        
        {/* 1. Next Salary Details Card */}
        <View className="bg-white rounded-[20px] p-4 shadow-sm border border-gray-100">
          <Text className="text-black text-[16px] font-bold mb-4">Next Salary Details</Text>
          
          <View className="flex-row justify-between items-center mb-5">
            {/* Salary Date */}
            <View className="items-center flex-1">
              <Text className="text-gray-500 text-[10px] font-medium mb-2">Salary Date</Text>
              <View className="w-10 h-10 bg-[#EFF6FF] rounded-full items-center justify-center mb-2">
                <Calendar color="#208AEF" size={20} strokeWidth={2} />
              </View>
              <Text className="text-[#208AEF] text-sm font-bold">10 Sep 2026</Text>
              <Text className="text-gray-500 text-[10px]">(Thursday)</Text>
            </View>
            
            {/* Divider */}
            <View className="w-[1px] h-12 bg-gray-100" />
            
            {/* Days Remaining */}
            <View className="items-center flex-1">
              <Text className="text-gray-500 text-[10px] font-medium mb-2">Days Remaining</Text>
              <View className="w-10 h-10 bg-[#FEF3C7] rounded-full items-center justify-center mb-2">
                <Hourglass color="#F59E0B" size={20} strokeWidth={2} />
              </View>
              <Text className="text-[#F59E0B] text-sm font-bold">5 Days</Text>
            </View>

            {/* Divider */}
            <View className="w-[1px] h-12 bg-gray-100" />
            
            {/* Expected Salary */}
            <View className="items-center flex-1">
              <Text className="text-gray-500 text-[10px] font-medium mb-2">Expected Salary</Text>
              <View className="w-10 h-10 bg-[#E6F4EA] rounded-full items-center justify-center mb-2">
                <Hourglass color="#10B981" size={20} strokeWidth={2} />
              </View>
              <Text className="text-[#10B981] text-sm font-bold">₹ 28,650</Text>
            </View>
          </View>

          {/* Info Banner */}
          <View className="bg-[#F0F7FF] rounded-xl p-3 flex-row items-center gap-2">
            <Info color="#208AEF" size={16} strokeWidth={2.5} />
            <Text className="text-gray-600 text-[11px] font-medium flex-1">
              Salary will be credited to your bank account on or before 10 Sep 2026
            </Text>
          </View>
        </View>

        {/* 2. Salary Summary Card */}
        <View className="bg-white rounded-[20px] p-4 shadow-sm border border-gray-100">
          <View className="flex-row justify-between items-center mb-6">
            <Text className="text-black text-[16px] font-bold">Salary Summary</Text>
          </View>

          {/* Total Earnings */}
          <View className="items-center mb-6">
            <Text className="text-gray-500 text-xs font-medium mb-1">Total Earnings</Text>
            <Text className="text-[#208AEF] text-3xl font-bold tracking-tight">₹ 28,650</Text>
          </View>

          {/* Breakdowns */}
          <View className="flex-row justify-between items-center">
            {/* Basic Salary */}
            <View className="w-[31%] bg-[#F0FDF4] rounded-xl p-3 items-center">
              <View className="flex-row items-center gap-1.5 mb-2">
                <Wallet color="#10B981" size={14} strokeWidth={2.5} />
                <Text className="text-gray-600 text-[10px] font-medium">Basic Salary</Text>
              </View>
              <Text className="text-black text-xs font-bold">₹ 20,000</Text>
            </View>
            
            {/* Allowances */}
            <View className="w-[31%] bg-[#EFF6FF] rounded-xl p-3 items-center">
              <View className="flex-row items-center gap-1.5 mb-2">
                <Gift color="#3B82F6" size={14} strokeWidth={2.5} />
                <Text className="text-gray-600 text-[10px] font-medium">Allowances</Text>
              </View>
              <Text className="text-black text-xs font-bold">₹ 6,150</Text>
            </View>

            {/* Deductions */}
            <View className="w-[31%] bg-[#FFF1F2] rounded-xl p-3 items-center">
              <View className="flex-row items-center gap-1.5 mb-2">
                <MinusCircle color="#EF4444" size={14} strokeWidth={2.5} />
                <Text className="text-gray-600 text-[10px] font-medium">Deductions</Text>
              </View>
              <Text className="text-black text-xs font-bold">₹ 1,500</Text>
            </View>
          </View>

          {/* Net Pay */}
          <View className="flex-row justify-between items-center pt-4 mt-5 border-t border-gray-100">
            <Text className="text-black text-sm font-bold">Net Pay</Text>
            <Text className="text-[#10B981] text-lg font-bold">₹ 28,650</Text>
          </View>
        </View>

        {/* 3. Attendance & Deductions Overview */}
        <View className="bg-white rounded-[20px] p-4 shadow-sm border border-gray-100">
          <Text className="text-black text-[16px] font-bold mb-4">Attendance & Deductions Overview</Text>
          
          <View className="flex-row justify-between items-center mb-4">
            <View className="bg-[#E6F4EA] w-[23%] aspect-square rounded-2xl items-center justify-center p-2">
              <CalendarCheck2 color="#138A43" size={24} strokeWidth={2.5} className="mb-1" />
              <Text className="text-gray-500 text-[9px] font-medium text-center">Days Present</Text>
              <Text className="text-black text-lg font-bold leading-tight">22</Text>
              <Text className="text-gray-500 text-[9px] font-medium text-center">Days</Text>
            </View>
            <View className="bg-[#FEE2E2] w-[23%] aspect-square rounded-2xl items-center justify-center p-2">
              <CalendarX2 color="#EF4444" size={24} strokeWidth={2.5} className="mb-1" />
              <Text className="text-gray-500 text-[9px] font-medium text-center">Days Absent</Text>
              <Text className="text-black text-lg font-bold leading-tight">2</Text>
              <Text className="text-gray-500 text-[9px] font-medium text-center">Days</Text>
            </View>
            <View className="bg-[#FEF3C7] w-[23%] aspect-square rounded-2xl items-center justify-center p-2">
              <Clock color="#F59E0B" size={24} strokeWidth={2.5} className="mb-1" />
              <Text className="text-gray-500 text-[9px] font-medium text-center">Days Late</Text>
              <Text className="text-black text-lg font-bold leading-tight">1</Text>
              <Text className="text-gray-500 text-[9px] font-medium text-center">Days</Text>
            </View>
            <View className="bg-[#EFF6FF] w-[23%] aspect-square rounded-2xl items-center justify-center p-2">
              <Plane color="#3B82F6" size={24} strokeWidth={2.5} className="mb-1" />
              <Text className="text-gray-500 text-[9px] font-medium text-center">On Leave</Text>
              <Text className="text-black text-lg font-bold leading-tight">1</Text>
              <Text className="text-gray-500 text-[9px] font-medium text-center">Day</Text>
            </View>
          </View>

          {/* Disclaimer */}
          <View className="bg-[#FFFBEB] rounded-xl p-3 flex-row items-center gap-2">
            <Lightbulb color="#F59E0B" size={16} strokeWidth={2.5} />
            <Text className="text-gray-600 text-[10px] font-medium flex-1">
              Your salary may change based on attendance, leaves and other applicable deductions.
            </Text>
          </View>
        </View>

        {/* 4. Salary History */}
        <View className="bg-transparent mb-4">
          <View className="flex-row justify-between items-center mb-3 px-1">
            <Text className="text-black text-[16px] font-bold">Salary History</Text>
            <TouchableOpacity 
              onPress={() => setShowAllHistory(!showAllHistory)}
              className="flex-row items-center gap-1"
            >
              <Text className="text-[#208AEF] text-xs font-bold">
                {showAllHistory ? 'View Less' : 'View All'}
              </Text>
              {showAllHistory ? (
                <ChevronDown color="#208AEF" size={14} strokeWidth={2.5} />
              ) : (
                <ArrowRight color="#208AEF" size={14} strokeWidth={2.5} />
              )}
            </TouchableOpacity>
          </View>

          {/* List Items */}
          <View className="gap-3">
            {displayedHistory.map((item, index) => (
              <TouchableOpacity 
                key={index}
                activeOpacity={0.7}
                className="bg-white p-3 rounded-2xl border border-gray-100 flex-row justify-between items-center shadow-sm"
              >
                <View className="flex-row items-center gap-3">
                  <View className="w-12 h-12 bg-[#EFF6FF] rounded-xl items-center justify-center">
                    <ReceiptText color="#208AEF" size={22} strokeWidth={2} />
                  </View>
                  <View>
                    <Text className="text-black text-sm font-bold mb-1">{item.month} Salary</Text>
                    <Text className="text-gray-500 text-[11px]">{item.date}</Text>
                  </View>
                </View>
                <View className="flex-row items-center gap-2">
                  <Text className="text-[#10B981] text-sm font-bold">{item.amount}</Text>
                  <ChevronRight color="#9CA3AF" size={18} strokeWidth={2} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

      </View>
    </ScrollView>
  );
}