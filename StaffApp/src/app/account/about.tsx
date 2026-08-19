// app/about.tsx
import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, Linking } from 'react-native';
import { ChevronLeft, Globe, Shield, FileText, ChevronRight, Info } from 'lucide-react-native';
import { router } from 'expo-router';

export default function AboutScreen() {
  
  const handleLink = (type: string) => {
    // In a real app, this would open WebViews or actual links
    console.log(`Opening ${type}`);
  };

  const LinkRow = ({ icon: Icon, title, color }: any) => (
    <TouchableOpacity 
      activeOpacity={0.7}
      onPress={() => handleLink(title)}
      className="flex-row items-center justify-between p-4 border-b border-gray-50 bg-white"
    >
      <View className="flex-row items-center">
        <View className="w-10 h-10 rounded-full items-center justify-center mr-3" style={{ backgroundColor: `${color}15` }}>
          <Icon color={color} size={20} strokeWidth={2} />
        </View>
        <Text className="text-gray-900 text-[15px] font-bold">{title}</Text>
      </View>
      <ChevronRight color="#9CA3AF" size={20} strokeWidth={2} />
    </TouchableOpacity>
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
        <Text className="text-[#1E3A8A] text-lg font-bold">About</Text>
        <View className="w-10 h-10" />
      </View>

      <ScrollView 
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* App Info Banner */}
        <View className="bg-white items-center pt-8 pb-10 border-b border-gray-100 shadow-sm mb-6">
          <View className="w-24 h-24 bg-blue-50 rounded-3xl items-center justify-center mb-4 shadow-sm border border-blue-100">
            <Info color="#208AEF" size={40} strokeWidth={1.5} />
          </View>
          <Text className="text-2xl font-black text-[#1E3A8A] tracking-wider mb-1">Ananya World</Text>
          <Text className="text-gray-500 font-bold mb-4">Version 1.0.4 (Build 42)</Text>
          <View className="bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
            <Text className="text-emerald-600 text-xs font-bold">Up to date</Text>
          </View>
        </View>

        {/* About CodeWebX & Ananya World */}
        <View className="px-4 mb-6">
          <Text className="text-gray-500 text-sm font-bold ml-1 mb-2 uppercase tracking-wider">Developed By</Text>
          <View className="bg-gradient-to-br from-[#1E3A8A] to-[#208AEF] bg-[#1E3A8A] rounded-3xl p-6 shadow-sm items-center relative overflow-hidden">
            <View className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-8 -mt-8" />
            <Globe color="white" size={32} strokeWidth={1.5} className="mb-3" />
            <Text className="text-white text-2xl font-black tracking-widest mb-1">CodeWebX</Text>
            <View className="bg-white/20 px-3 py-1 rounded-full mb-3">
              <Text className="text-blue-100 text-[11px] font-bold tracking-wider">OFFICIAL DEVELOPER</Text>
            </View>
            <Text className="text-blue-100 text-xs text-center leading-relaxed font-medium">
              Designed & Developed with excellence by <Text className="font-bold text-white">CodeWebX</Text> for Ananya World and Dr. Lal Pathlabs.
            </Text>
          </View>
        </View>

        {/* Legal Links */}
        <View className="px-4 mb-8">
          <Text className="text-gray-500 text-sm font-bold ml-1 mb-2 uppercase tracking-wider">Legal</Text>
          <View className="rounded-2xl overflow-hidden shadow-sm border border-gray-100">
            <LinkRow icon={FileText} title="Terms of Service" color="#208AEF" />
            <LinkRow icon={Shield} title="Privacy Policy" color="#10B981" />
            <TouchableOpacity 
              activeOpacity={0.7}
              onPress={() => handleLink("Open Source Licenses")}
              className="flex-row items-center justify-between p-4 bg-white"
            >
              <View className="flex-row items-center">
                <View className="w-10 h-10 rounded-full items-center justify-center mr-3 bg-gray-50">
                  <Globe color="#6B7280" size={20} strokeWidth={2} />
                </View>
                <Text className="text-gray-900 text-[15px] font-bold">Open Source Licenses</Text>
              </View>
              <ChevronRight color="#9CA3AF" size={20} strokeWidth={2} />
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Footer */}
        <View className="items-center px-8">
          <Text className="text-gray-400 text-[11px] font-semibold text-center leading-relaxed">
            Developed By <Text className="text-[#208AEF] font-bold">CodeWebX</Text> {"\n"}
            © {new Date().getFullYear()} Ananya World & CodeWebX. All rights reserved. {"\n"}
            Dr. Lal Pathlabs name and logo are registered trademarks.
          </Text>
        </View>

      </ScrollView>
    </View>
  );
}
