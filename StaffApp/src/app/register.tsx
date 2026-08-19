// app/register.tsx
import React, { useState } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, 
  KeyboardAvoidingView, Platform, Alert, 
  ScrollView, StatusBar, Image 
} from 'react-native';
import { Eye, EyeOff, Lock, User, Briefcase, ArrowRight, Phone, MapPin, Mail } from 'lucide-react-native';
import { router } from 'expo-router';

import { auth, db } from '../config/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

export default function RegisterScreen() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    parentPhone: '',
    address: '',
    staffType: 'Field Staff'
  });
  
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleRegister = async () => {
    if (!formData.name || !formData.email || !formData.password || !formData.phone || !formData.parentPhone || !formData.address) {
      Alert.alert('Error', 'Please fill in all details, including Parent\'s Number');
      return;
    }
    
    setLoading(true);
    try {
      // 1. Create Auth Account
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email.trim(), formData.password);
      const user = userCredential.user;
      
      // 2. Create User Document as Pending
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        parentPhone: formData.parentPhone,
        address: formData.address,
        staffType: formData.staffType,
        role: 'staff',
        status: 'Pending', // Crucial for approval flow
        department: formData.staffType === 'Field Staff' ? 'Field Operations' : 'Office',
        createdAt: new Date().toISOString()
      });
      
      // 3. Instead of logging them in to the main app, redirect to pending
      router.replace('/pending');
      
    } catch (error: any) {
      let errorMessage = error.message || "Registration failed. Please try again.";
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = "An account with this email already exists.";
      } else if (error.code === 'auth/weak-password') {
        errorMessage = "Password should be at least 6 characters.";
      }
      Alert.alert("Registration Failed", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1, backgroundColor: '#F5F7FA' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="light-content" />
      
      <ScrollView 
        contentContainerStyle={{ flexGrow: 1, paddingBottom: Platform.OS === 'ios' ? 40 : 100 }}
        bounces={false}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header Background */}
        <View 
          className="absolute top-0 w-full bg-[#003B95] overflow-hidden shadow-lg"
          style={{ height: 320, borderBottomLeftRadius: 40, borderBottomRightRadius: 40 }}
        >
          <View className="absolute -right-10 -bottom-10 w-80 h-80 bg-[#FFD100] rounded-tl-full opacity-95" />
          <View className="absolute top-20 -left-10 w-40 h-40 bg-white/5 rounded-full" />
        </View>

        {/* Content */}
        <View className="flex-1 px-5 pt-16">
          {/* Brand Header */}
          <View className="items-center mb-6 mt-2">
            <View className="w-28 h-28 bg-white rounded-full items-center justify-center shadow-2xl mb-3 p-1">
              <Image 
                source={require('../../assets/images/DrLogo.png')} 
                style={{ width: '96%', height: '96%' }} 
                resizeMode="contain" 
              />
            </View>
            <Text className="text-2xl font-black text-white tracking-wide mb-1">
              Join Ananya World
            </Text>
            <Text className="text-white/80 text-xs font-bold tracking-widest uppercase mt-0.5">
              Staff Registration
            </Text>
          </View>

          {/* Form Card */}
          <View className="bg-white rounded-[32px] p-6 shadow-xl border border-gray-100 mb-8">
            <Text className="text-[#003B95] text-xl font-black mb-1">Create Account</Text>
            <Text className="text-gray-500 text-xs font-medium mb-6">Fill in your details for admin approval</Text>

            {/* Input: Name */}
            <View className="mb-4">
              <Text className="text-gray-400 text-[11px] font-bold uppercase tracking-wider mb-2 ml-1">Full Name</Text>
              <View className="bg-[#F8FAFC] border border-gray-100 rounded-[20px] flex-row items-center px-4 h-14 shadow-sm">
                <View className="w-8 h-8 rounded-full bg-[#EEF5FF] items-center justify-center mr-3">
                  <User color="#208AEF" size={16} strokeWidth={2.5} />
                </View>
                <TextInput 
                  className="flex-1 text-black text-[14px] font-medium"
                  placeholder="e.g. John Doe"
                  placeholderTextColor="#9CA3AF"
                  value={formData.name}
                  onChangeText={(val) => handleChange('name', val)}
                />
              </View>
            </View>

            {/* Input: Email */}
            <View className="mb-4">
              <Text className="text-gray-400 text-[11px] font-bold uppercase tracking-wider mb-2 ml-1">Email ID</Text>
              <View className="bg-[#F8FAFC] border border-gray-100 rounded-[20px] flex-row items-center px-4 h-14 shadow-sm">
                <View className="w-8 h-8 rounded-full bg-[#EEF5FF] items-center justify-center mr-3">
                  <Mail color="#208AEF" size={16} strokeWidth={2.5} />
                </View>
                <TextInput 
                  className="flex-1 text-black text-[14px] font-medium"
                  placeholder="e.g. staff@gmail.com"
                  placeholderTextColor="#9CA3AF"
                  value={formData.email}
                  onChangeText={(val) => handleChange('email', val)}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>
            </View>

            {/* Input: Password */}
            <View className="mb-4">
              <Text className="text-gray-400 text-[11px] font-bold uppercase tracking-wider mb-2 ml-1">Password</Text>
              <View className="bg-[#F8FAFC] border border-gray-100 rounded-[20px] flex-row items-center px-4 h-14 shadow-sm">
                <View className="w-8 h-8 rounded-full bg-[#EEF5FF] items-center justify-center mr-3">
                  <Lock color="#208AEF" size={16} strokeWidth={2.5} />
                </View>
                <TextInput 
                  className="flex-1 text-black text-[14px] font-medium"
                  placeholder="Create a password"
                  placeholderTextColor="#9CA3AF"
                  value={formData.password}
                  onChangeText={(val) => handleChange('password', val)}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} className="p-2 -mr-2">
                  {showPassword ? (
                    <Eye color="#208AEF" size={18} strokeWidth={2} />
                  ) : (
                    <EyeOff color="#9CA3AF" size={18} strokeWidth={2} />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Input: Phone */}
            <View className="mb-4">
              <Text className="text-gray-400 text-[11px] font-bold uppercase tracking-wider mb-2 ml-1">Phone Number</Text>
              <View className="bg-[#F8FAFC] border border-gray-100 rounded-[20px] flex-row items-center px-4 h-14 shadow-sm">
                <View className="w-8 h-8 rounded-full bg-[#EEF5FF] items-center justify-center mr-3">
                  <Phone color="#208AEF" size={16} strokeWidth={2.5} />
                </View>
                <TextInput 
                  className="flex-1 text-black text-[14px] font-medium"
                  placeholder="e.g. 9876543210"
                  placeholderTextColor="#9CA3AF"
                  value={formData.phone}
                  onChangeText={(val) => handleChange('phone', val)}
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            {/* Input: Parent's Phone */}
            <View>
              <Text className="text-gray-400 text-[11px] font-bold uppercase tracking-wider mb-2 ml-1">Parent's Number</Text>
              <View className="flex-row items-center bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl px-4 py-3.5 shadow-sm">
                <View className="w-9 h-9 rounded-xl bg-blue-100/50 items-center justify-center mr-3">
                  <Phone color="#208AEF" size={16} strokeWidth={2.5} />
                </View>
                <TextInput
                  className="flex-1 text-[15px] font-semibold text-gray-800"
                  placeholder="E.g., +91 98765 43210"
                  placeholderTextColor="#94A3B8"
                  value={formData.parentPhone}
                  onChangeText={(val) => handleChange('parentPhone', val)}
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            {/* Input: Address */}
            <View className="mb-6">
              <Text className="text-gray-400 text-[11px] font-bold uppercase tracking-wider mb-2 ml-1">Home Address</Text>
              <View className="bg-[#F8FAFC] border border-gray-100 rounded-[20px] flex-row items-center px-4 h-14 shadow-sm">
                <View className="w-8 h-8 rounded-full bg-[#EEF5FF] items-center justify-center mr-3">
                  <MapPin color="#208AEF" size={16} strokeWidth={2.5} />
                </View>
                <TextInput 
                  className="flex-1 text-black text-[14px] font-medium"
                  placeholder="Enter full address"
                  placeholderTextColor="#9CA3AF"
                  value={formData.address}
                  onChangeText={(val) => handleChange('address', val)}
                />
              </View>
            </View>

            {/* Staff Type Selector */}
            <View className="mb-8">
              <Text className="text-gray-400 text-[11px] font-bold uppercase tracking-wider mb-2 ml-1">Staff Type</Text>
              <View className="flex-row justify-between">
                <TouchableOpacity 
                  onPress={() => handleChange('staffType', 'Field Staff')}
                  className={`flex-1 mr-2 py-3 rounded-[16px] items-center border ${formData.staffType === 'Field Staff' ? 'bg-[#EEF5FF] border-[#208AEF]' : 'bg-[#F8FAFC] border-gray-100'}`}
                >
                  <Text className={`font-bold ${formData.staffType === 'Field Staff' ? 'text-[#208AEF]' : 'text-gray-500'}`}>Field Staff</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={() => handleChange('staffType', 'Office Staff')}
                  className={`flex-1 ml-2 py-3 rounded-[16px] items-center border ${formData.staffType === 'Office Staff' ? 'bg-[#EEF5FF] border-[#208AEF]' : 'bg-[#F8FAFC] border-gray-100'}`}
                >
                  <Text className={`font-bold ${formData.staffType === 'Office Staff' ? 'text-[#208AEF]' : 'text-gray-500'}`}>Office Staff</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Register Button */}
            <TouchableOpacity 
              activeOpacity={0.8}
              onPress={handleRegister}
              disabled={loading}
              className={`bg-[#003B95] rounded-[20px] h-14 flex-row items-center justify-center shadow-lg ${loading ? 'opacity-70' : ''}`}
            >
              <Text className="text-white font-bold text-lg mr-2 tracking-wide">
                {loading ? 'Submitting...' : 'Register Details'}
              </Text>
              {!loading && <ArrowRight color="white" size={20} strokeWidth={3} />}
            </TouchableOpacity>

            {/* Back to Login */}
            <TouchableOpacity 
              className="mt-6 self-center"
              onPress={() => router.replace('/login')}
            >
              <Text className="text-gray-500 font-medium text-[13px]">
                Already have an account? <Text className="text-[#208AEF] font-bold">Sign In</Text>
              </Text>
            </TouchableOpacity>

          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
