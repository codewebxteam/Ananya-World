// app/login.tsx
import React, { useState } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, 
  KeyboardAvoidingView, Platform, Alert, 
  ScrollView, StatusBar, SafeAreaView 
} from 'react-native';
import { Eye, EyeOff, Lock, User, Briefcase, ArrowRight } from 'lucide-react-native';
import { router } from 'expo-router';

import AsyncStorage from '@react-native-async-storage/async-storage';

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert("Error", "Please enter both Employee ID and Password.");
      return;
    }
    // Save login state
    await AsyncStorage.setItem('isLoggedIn', 'true');
    // Navigate to home and prevent going back to login
    router.replace('/');
  };

  const handleForgotPassword = () => {
    Alert.alert(
      "Reset Password",
      "Please contact your Admin or HR at support@aapartners.com to reset your password.",
      [{ text: "OK" }]
    );
  };

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1, backgroundColor: '#F5F7FA' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="light-content" />
      
      <ScrollView 
        contentContainerStyle={{ flexGrow: 1 }}
        bounces={false}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* A&A Partners Signature Top Background */}
        <View 
          className="absolute top-0 w-full bg-[#003B95] overflow-hidden shadow-lg"
          style={{ height: 380, borderBottomLeftRadius: 40, borderBottomRightRadius: 40 }}
        >
          {/* Yellow Curve matching the Header theme */}
          <View className="absolute -right-10 -bottom-10 w-80 h-80 bg-[#FFD100] rounded-tl-full opacity-95" />
          <View className="absolute top-20 -left-10 w-40 h-40 bg-white/5 rounded-full" />
        </View>

        {/* Content */}
        <View className="flex-1 px-5 pt-20">
          
          {/* Brand Header */}
          <View className="items-center mb-8 mt-4">
            <View className="w-20 h-20 bg-white rounded-[24px] items-center justify-center shadow-lg mb-5">
              <Briefcase color="#003B95" size={40} strokeWidth={2} />
            </View>
            <Text className="text-3xl font-black text-white tracking-wide mb-1">
              Ananya World
            </Text>
            <Text className="text-white/80 text-sm font-bold tracking-widest uppercase mt-1">
              Staff Portal
            </Text>
          </View>

          {/* Login Card */}
          <View className="bg-white rounded-[32px] p-6 shadow-xl border border-gray-100 mb-8 mt-2">
            <Text className="text-[#003B95] text-2xl font-black mb-1">Welcome Back, 👋</Text>
            <Text className="text-gray-500 text-xs font-medium mb-8">Sign in to your account to continue</Text>

            {/* Input 1: Employee ID */}
            <View className="mb-5">
              <Text className="text-gray-400 text-[11px] font-bold uppercase tracking-wider mb-2 ml-1">Employee ID / Email</Text>
              <View className="bg-[#F8FAFC] border border-gray-100 rounded-[20px] flex-row items-center px-4 h-16 shadow-sm">
                <View className="w-10 h-10 rounded-full bg-[#EEF5FF] items-center justify-center mr-3">
                  <User color="#208AEF" size={20} strokeWidth={2.5} />
                </View>
                <TextInput 
                  className="flex-1 text-black text-[15px] font-medium"
                  placeholder="e.g. AA-1024"
                  placeholderTextColor="#9CA3AF"
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>
            </View>

            {/* Input 2: Password */}
            <View className="mb-2">
              <Text className="text-gray-400 text-[11px] font-bold uppercase tracking-wider mb-2 ml-1">Password</Text>
              <View className="bg-[#F8FAFC] border border-gray-100 rounded-[20px] flex-row items-center px-4 h-16 shadow-sm">
                <View className="w-10 h-10 rounded-full bg-[#EEF5FF] items-center justify-center mr-3">
                  <Lock color="#208AEF" size={20} strokeWidth={2.5} />
                </View>
                <TextInput 
                  className="flex-1 text-black text-[15px] font-medium"
                  placeholder="Enter your password"
                  placeholderTextColor="#9CA3AF"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} className="p-2 -mr-2">
                  {showPassword ? (
                    <Eye color="#208AEF" size={22} strokeWidth={2} />
                  ) : (
                    <EyeOff color="#9CA3AF" size={22} strokeWidth={2} />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Forgot Password */}
            <TouchableOpacity 
              className="self-end mt-4 mb-8"
              onPress={handleForgotPassword}
            >
              <Text className="text-[#208AEF] font-bold text-[13px]">Forgot Password?</Text>
            </TouchableOpacity>

            {/* Login Button */}
            <TouchableOpacity 
              activeOpacity={0.8}
              onPress={handleLogin}
              className="bg-[#003B95] rounded-[20px] h-16 flex-row items-center justify-center shadow-lg"
            >
              <Text className="text-white font-bold text-lg mr-2 tracking-wide">Secure Login</Text>
              <ArrowRight color="white" size={20} strokeWidth={3} />
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <SafeAreaView>
            <View className="items-center pb-8 mt-auto">
              <Text className="text-gray-400 text-[11px] font-medium text-center leading-relaxed">
                Protected by Enterprise Security.{"\n"}
                © 2025 Ananya World Ltd.
              </Text>
            </View>
          </SafeAreaView>

        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}