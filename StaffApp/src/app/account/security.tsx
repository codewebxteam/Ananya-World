// app/security.tsx
import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, Alert, ActivityIndicator } from 'react-native';
import { ChevronLeft, KeyRound, EyeOff, Eye, Mail, Lock } from 'lucide-react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { sendPasswordResetEmail, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { auth } from '../../config/firebase';

export default function SecurityScreen() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);
  
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleUpdatePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert("Error", "Please fill in all fields.");
      return;
    }
    
    if (newPassword !== confirmPassword) {
      Alert.alert("Error", "New password and Confirm password do not match.");
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert("Error", "New password must be at least 6 characters long.");
      return;
    }

    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user || !user.email) {
        throw new Error("User session expired. Please re-login.");
      }

      // Re-authenticate user with current password
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);

      // Update password in Firebase Auth
      await updatePassword(user, newPassword);

      Alert.alert("Success 🔒", "Your password has been updated successfully.", [
        { text: "OK", onPress: () => router.back() }
      ]);
    } catch (error: any) {
      let msg = error.message || "Failed to update password.";
      if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        msg = "Incorrect current password. Please check and try again.";
      }
      Alert.alert("Update Failed", msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSendResetEmail = async () => {
    setSendingReset(true);
    try {
      let userEmail = auth.currentUser?.email;
      if (!userEmail) {
        const data = await AsyncStorage.getItem('userData');
        if (data) {
          const parsed = JSON.parse(data);
          userEmail = parsed.email;
        }
      }

      if (!userEmail) {
        throw new Error("Registered email not found. Please contact HR.");
      }

      await sendPasswordResetEmail(auth, userEmail);
      Alert.alert(
        "Reset Email Sent 📩",
        `A password reset link has been sent to your email (${userEmail}). Please check your inbox to reset your password.`
      );
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to send reset email.");
    } finally {
      setSendingReset(false);
    }
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
            Your password must be at least 6 characters long and include a combination of numbers and letters.
          </Text>

          <PasswordInput 
            label="Current Password" 
            value={currentPassword} 
            onChangeText={setCurrentPassword}
            showPassword={showCurrent}
            setShowPassword={setShowCurrent}
          />

          {/* Forgot Current Password Option */}
          <TouchableOpacity 
            onPress={handleSendResetEmail}
            disabled={sendingReset}
            className="self-end mb-4 flex-row items-center"
          >
            {sendingReset ? (
              <ActivityIndicator size="small" color="#208AEF" />
            ) : (
              <Text className="text-[#208AEF] font-bold text-xs">Forgot Current Password? Send Link to Email</Text>
            )}
          </TouchableOpacity>

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

        {/* Alternative Reset Option Banner */}
        <View className="mx-4 bg-blue-50 p-4 rounded-2xl border border-blue-100 flex-row items-center justify-between">
          <View className="flex-1 mr-3">
            <Text className="text-[#1E3A8A] font-bold text-xs">Forgot your password?</Text>
            <Text className="text-blue-600/70 text-[11px] mt-0.5">Send a password reset link directly to your registered email address.</Text>
          </View>
          <TouchableOpacity 
            onPress={handleSendResetEmail}
            disabled={sendingReset}
            className="bg-[#208AEF] px-3 py-2 rounded-xl"
          >
            <Text className="text-white font-bold text-xs">Send Link</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>

      {/* Save Button */}
      <View className="bg-white px-4 py-4 border-t border-gray-100 shadow-lg">
        <TouchableOpacity 
          activeOpacity={0.8}
          onPress={handleUpdatePassword}
          className={`rounded-2xl h-14 items-center justify-center shadow-md ${currentPassword && newPassword && confirmPassword && !loading ? 'bg-[#208AEF] shadow-blue-200' : 'bg-gray-300 shadow-transparent'}`}
          disabled={!currentPassword || !newPassword || !confirmPassword || loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Text className="text-white font-bold text-[16px]">Update Password</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
