// app/security.tsx
import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { ChevronLeft, KeyRound, EyeOff, Eye } from 'lucide-react-native';
import { router } from 'expo-router';

export default function SecurityScreen() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleUpdatePassword = () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert("Error", "Please fill in all fields.");
      return;
    }
    
    if (newPassword !== confirmPassword) {
      Alert.alert("Error", "New password and Confirm password do not match.");
      return;
    }

    // Call API / Firebase here to update password
    Alert.alert("Success", "Your password has been updated successfully.", [
      { text: "OK", onPress: () => router.back() }
    ]);
  };

  const PasswordInput = ({ label, value, onChangeText, showPassword, setShowPassword }: any) => (
    <View className="mb-4">
      <Text className="text-gray-500 text-xs font-medium mb-1.5 ml-1">{label}</Text>
      <View className="bg-white border border-gray-100 rounded-xl flex-row items-center px-3 h-14 shadow-sm">
        <KeyRound color="#9CA3AF" size={18} className="mr-2" />
        <TextInput 
          className="flex-1 text-black text-[14px]" 
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={!showPassword}
          placeholder={`Enter ${label.toLowerCase()}`}
          placeholderTextColor="#9CA3AF"
        />
        <TouchableOpacity onPress={() => setShowPassword(!showPassword)} className="p-2">
          {showPassword ? (
            <Eye color="#6B7280" size={18} />
          ) : (
            <EyeOff color="#9CA3AF" size={18} />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1, backgroundColor: '#F5F7FA' }}
      behavior="padding"
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 20}
    >
      {/* Custom Header */}
      <View className="bg-white pt-12 pb-4 px-4 flex-row items-center justify-between border-b border-gray-100 shadow-sm z-10">
        <TouchableOpacity 
          onPress={() => router.back()}
          className="w-10 h-10 bg-gray-50 rounded-full items-center justify-center border border-gray-100"
        >
          <ChevronLeft color="#374151" size={24} strokeWidth={2.5} className="ml-1" />
        </TouchableOpacity>
        <Text className="text-[#1E3A8A] text-lg font-bold">Change Password</Text>
        <View className="w-10 h-10" />
      </View>

      <ScrollView 
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40, paddingTop: 20 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="px-4 mb-6">
          <Text className="text-gray-500 text-sm leading-relaxed mb-4">
            Your password must be at least 8 characters long and include a combination of numbers, letters, and special characters.
          </Text>

          <PasswordInput 
            label="Current Password" 
            value={currentPassword} 
            onChangeText={setCurrentPassword}
            showPassword={showCurrent}
            setShowPassword={setShowCurrent}
          />

          <View className="h-px bg-gray-200 my-2" />

          <PasswordInput 
            label="New Password" 
            value={newPassword} 
            onChangeText={setNewPassword}
            showPassword={showNew}
            setShowPassword={setShowNew}
          />

          <PasswordInput 
            label="Confirm New Password" 
            value={confirmPassword} 
            onChangeText={setConfirmPassword}
            showPassword={showConfirm}
            setShowPassword={setShowConfirm}
          />
        </View>

      </ScrollView>

      {/* Save Button */}
      <View className="bg-white px-4 py-4 border-t border-gray-100 shadow-lg">
        <TouchableOpacity 
          activeOpacity={0.8}
          onPress={handleUpdatePassword}
          className={`rounded-2xl h-14 items-center justify-center shadow-md ${currentPassword && newPassword && confirmPassword ? 'bg-[#208AEF] shadow-blue-200' : 'bg-gray-300 shadow-transparent'}`}
          disabled={!currentPassword || !newPassword || !confirmPassword}
        >
          <Text className="text-white font-bold text-[16px]">Update Password</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
