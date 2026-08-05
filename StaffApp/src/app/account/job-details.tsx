// app/job-details.tsx
import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { ChevronLeft, Briefcase, Building2, UserCircle, MapPin, Calendar, CreditCard, Clock } from 'lucide-react-native';
import { router } from 'expo-router';

export default function JobDetailsScreen() {
  
  // Dummy Job Data
  const jobInfo = {
    employeeId: "EMP-LAL-4921",
    designation: "Senior Field Executive",
    department: "Sample Collection",
    workLocation: "Delhi NCR Region",
    doj: "12 Oct 2023",
    status: "Active - Full Time",
    supervisor: "Rajesh Kumar (Area Manager)",
    workType: "Field Duty"
  };

  const InfoCard = ({ icon: Icon, title, value, color }: any) => (
    <View className="flex-row items-center bg-white p-4 mb-3 rounded-2xl shadow-sm border border-gray-100">
      <View className="w-12 h-12 rounded-xl items-center justify-center mr-4" style={{ backgroundColor: `${color}15` }}>
        <Icon color={color} size={24} strokeWidth={2} />
      </View>
      <View className="flex-1">
        <Text className="text-gray-500 text-[11px] font-medium mb-1 uppercase tracking-wider">{title}</Text>
        <Text className="text-gray-900 text-[15px] font-bold">{value}</Text>
      </View>
    </View>
  );

  return (
    <View className="flex-1 bg-[#F5F7FA]">
      {/* Custom Header */}
      <View className="bg-white pt-12 pb-4 px-4 flex-row items-center justify-between border-b border-gray-100 shadow-sm z-10">
        <TouchableOpacity 
          onPress={() => router.back()}
          className="w-10 h-10 bg-gray-50 rounded-full items-center justify-center border border-gray-100"
        >
          <ChevronLeft color="#374151" size={24} strokeWidth={2.5} className="ml-1" />
        </TouchableOpacity>
        <Text className="text-[#1E3A8A] text-lg font-bold">Job Details</Text>
        <View className="w-10 h-10" /> {/* Spacer */}
      </View>

      <ScrollView 
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40, paddingTop: 16 }}
      >
        {/* Banner Section */}
        <View className="px-4 mb-6">
          <View className="bg-[#1E3A8A] rounded-[24px] p-6 items-center shadow-md relative overflow-hidden">
            {/* Decorative background circle */}
            <View className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-white/10" />
            <View className="absolute -bottom-10 -left-10 w-24 h-24 rounded-full bg-white/10" />
            
            <View className="w-16 h-16 bg-white/20 rounded-2xl items-center justify-center mb-3">
              <Briefcase color="white" size={32} strokeWidth={1.5} />
            </View>
            <Text className="text-white text-xl font-bold text-center">{jobInfo.designation}</Text>
            <Text className="text-blue-100 text-sm mt-1">{jobInfo.department}</Text>
            
            <View className="bg-white/20 px-3 py-1 rounded-full mt-4">
              <Text className="text-white text-xs font-bold">{jobInfo.employeeId}</Text>
            </View>
          </View>
        </View>

        {/* Details List */}
        <View className="px-4">
          <InfoCard 
            icon={Building2} 
            title="Department" 
            value={jobInfo.department} 
            color="#3B82F6" 
          />
          <InfoCard 
            icon={CreditCard} 
            title="Employee ID" 
            value={jobInfo.employeeId} 
            color="#8B5CF6" 
          />
          <InfoCard 
            icon={MapPin} 
            title="Work Location" 
            value={jobInfo.workLocation} 
            color="#F59E0B" 
          />
          <InfoCard 
            icon={Calendar} 
            title="Date of Joining" 
            value={jobInfo.doj} 
            color="#10B981" 
          />
          <InfoCard 
            icon={UserCircle} 
            title="Reporting Manager" 
            value={jobInfo.supervisor} 
            color="#EC4899" 
          />
          <InfoCard 
            icon={Clock} 
            title="Employment Status" 
            value={jobInfo.status} 
            color="#06B6D4" 
          />
        </View>
        
        <View className="mt-4 px-6 items-center">
          <Text className="text-gray-400 text-[10px] text-center leading-relaxed">
            These details are managed by HR. If you find any discrepancies, please contact the administration department.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
