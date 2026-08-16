// app/profile.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Image, KeyboardAvoidingView, Platform, Alert, ActivityIndicator } from 'react-native';
import { ChevronLeft, Camera, User, Mail, Phone, MapPin, Droplet, ShieldPlus, Pencil, Check } from 'lucide-react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { uploadToImageKit } from '../../utils/imagekit';

// // Global memory cache for Profile Screen to render instantly with zero reload
let globalProfileCache: any = null;

export default function ProfileScreen() {
  const [profileImage, setProfileImage] = useState<string | null>(globalProfileCache?.avatar || null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [uid, setUid] = useState<string | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(!globalProfileCache);

  const [formData, setFormData] = useState({
    name: globalProfileCache?.name || "",
    email: globalProfileCache?.email || "",
    phone: globalProfileCache?.phone || "",
    address: globalProfileCache?.address || "",
    workLocation: globalProfileCache?.workLocation || "",
    empId: globalProfileCache?.empId || "",
    designation: globalProfileCache?.designation || "",
  });

  const populateForm = (parsed: any, silent = false) => {
    globalProfileCache = parsed;
    if (!silent) {
      setProfileImage(parsed.avatar || null);
      setFormData({
        name: parsed.name || "",
        email: parsed.email || "",
        phone: parsed.phone || "",
        address: parsed.address || "",
        workLocation: parsed.workLocation || "",
        empId: parsed.empId || "",
        designation: parsed.designation || "",
      });
    }
    setIsInitialLoading(false);
  };

  useEffect(() => {
    let isMounted = true;
    const loadProfile = async () => {
      const storedUid = await AsyncStorage.getItem('uid');
      if (isMounted) setUid(storedUid);

      // If we already have memory cache, skip loading state completely
      if (globalProfileCache) {
        setIsInitialLoading(false);
      } else {
        // Fallback to AsyncStorage first for 0ms load
        const data = await AsyncStorage.getItem('userData');
        if (data && isMounted) {
          populateForm(JSON.parse(data));
        }
      }

      // Background silent sync from Firestore without flickering UI
      if (storedUid) {
        try {
          const userDoc = await getDoc(doc(db, 'users', storedUid));
          if (userDoc.exists() && isMounted) {
            const freshData = userDoc.data();
            const hasChanged = JSON.stringify(freshData) !== JSON.stringify(globalProfileCache);
            if (hasChanged || !globalProfileCache) {
              populateForm(freshData, false);
            }
            await AsyncStorage.setItem('userData', JSON.stringify(freshData));
          }
        } catch (e) {
          console.log("Firestore sync skipped");
        }
      }
      if (isMounted) setIsInitialLoading(false);
    };

    loadProfile();
    return () => { isMounted = false; };
  }, []);

  const handlePickImage = async () => {
    if (!isEditing) return;
    
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setProfileImage(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (!uid) return Alert.alert("Error", "User not found.");
    setIsSaving(true);
    
    try {
      let finalAvatarUrl = profileImage;

      // If the image is a local URI (not a http URL), we upload it
      if (profileImage && !profileImage.startsWith('http')) {
        const uploadedUrl = await uploadToImageKit(profileImage, `avatar_${uid}_${Date.now()}.jpg`);
        if (uploadedUrl) {
          finalAvatarUrl = uploadedUrl;
        } else {
          throw new Error("Failed to upload profile picture to ImageKit.");
        }
      }

      // Update Firestore
      await updateDoc(doc(db, 'users', uid), {
        avatar: finalAvatarUrl
      });

      // Update local storage & global memory cache
      const data = await AsyncStorage.getItem('userData');
      if (data) {
        const parsed = JSON.parse(data);
        parsed.avatar = finalAvatarUrl;
        globalProfileCache = parsed;
        await AsyncStorage.setItem('userData', JSON.stringify(parsed));
      }

      Alert.alert("Success", "Profile updated successfully!");
      setIsEditing(false);
    } catch (error: any) {
      Alert.alert("Update Failed", error.message || "An error occurred");
    } finally {
      setIsSaving(false);
    }
  };

  const InputWrapper = ({ icon: Icon, value, multiline = false }: any) => (
    <View className={`flex-row ${multiline ? 'items-start py-3' : 'items-center h-12'} px-3 rounded-xl bg-[#F8FAFC] border border-gray-100`}>
      <Icon color="#6B7280" size={18} className={`mr-2 ${multiline ? 'mt-0.5' : ''}`} />
      <TextInput 
        className="flex-1 text-[14px] text-gray-700 font-medium" 
        value={value}
        editable={false}
        multiline={multiline}
        pointerEvents="none"
      />
    </View>
  );

  // Skeleton Loader for initial cold load
  if (isInitialLoading && !globalProfileCache) {
    return (
      <View style={{ flex: 1, backgroundColor: '#F5F7FA' }}>
        <View className="bg-white pt-12 pb-4 px-4 flex-row items-center justify-between border-b border-gray-100 shadow-sm z-10 animate-pulse">
          <View className="w-10 h-10 bg-gray-200 rounded-full" />
          <View className="h-6 w-28 bg-gray-200 rounded-md" />
          <View className="w-10 h-10 bg-gray-200 rounded-full" />
        </View>
        <View className="px-4 pt-6 gap-4 animate-pulse">
          <View className="items-center mb-4">
            <View className="w-28 h-28 rounded-full bg-gray-200" />
          </View>
          <View className="bg-white rounded-2xl p-4 gap-3">
            <View className="h-4 w-32 bg-gray-200 rounded mb-2" />
            <View className="h-12 bg-gray-100 rounded-xl" />
            <View className="h-12 bg-gray-100 rounded-xl" />
            <View className="h-12 bg-gray-100 rounded-xl" />
          </View>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1, backgroundColor: '#F5F7FA' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Custom Header */}
      <View className="bg-white pt-12 pb-4 px-4 flex-row items-center justify-between border-b border-gray-100 shadow-sm z-10">
        <TouchableOpacity 
          onPress={() => router.back()}
          className="w-10 h-10 bg-gray-50 rounded-full items-center justify-center border border-gray-100"
        >
          <ChevronLeft color="#374151" size={24} strokeWidth={2.5} className="ml-1" />
        </TouchableOpacity>
        <Text className="text-[#1E3A8A] text-lg font-bold">My Profile</Text>
        {isEditing ? (
          <TouchableOpacity onPress={handleSave} disabled={isSaving} className="w-10 h-10 bg-green-50 rounded-full items-center justify-center border border-green-100">
            {isSaving ? <ActivityIndicator size="small" color="#10B981" /> : <Check color="#10B981" size={20} strokeWidth={2.5} />}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={() => setIsEditing(true)} className="w-10 h-10 bg-blue-50 rounded-full items-center justify-center border border-blue-100">
            <Pencil color="#2563EB" size={18} strokeWidth={2.5} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView 
        className="flex-1"
        showsVerticalScrollIndicator={true}
        bounces={true}
        contentContainerStyle={{ paddingBottom: 100, paddingTop: 10 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Profile Image Section */}
        <View className="items-center mt-4 mb-6 relative">
          <View className={`w-28 h-28 rounded-full bg-white p-1 shadow-sm ${isEditing ? 'border-2 border-[#208AEF]' : 'border border-gray-200'}`}>
            {profileImage ? (
              <Image source={{ uri: profileImage }} className="w-full h-full rounded-full" />
            ) : (
              <View className="w-full h-full rounded-full bg-[#EFF6FF] items-center justify-center">
                <Text className="text-[#208AEF] text-4xl font-bold">{formData.name ? formData.name.charAt(0).toUpperCase() : 'U'}</Text>
              </View>
            )}
          </View>
          {isEditing && (
            <TouchableOpacity 
              onPress={handlePickImage}
              className="absolute bottom-0 right-[35%] bg-[#208AEF] w-9 h-9 rounded-full flex items-center justify-center border-2 border-white shadow-md"
            >
              <Camera color="white" size={18} strokeWidth={2.5} />
            </TouchableOpacity>
          )}
        </View>

        {/* Form Fields */}
        <View className="px-4 gap-4">
          
          {/* Personal Information Group */}
          <View className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <Text className="text-gray-800 font-bold text-sm mb-4">Professional Details</Text>
            
            <View className="mb-2">
              <Text className="text-gray-500 text-xs font-medium mb-1 ml-1">Full Name</Text>
              <InputWrapper icon={User} value={formData.name} />
            </View>

            <View className="mb-2">
              <Text className="text-gray-500 text-xs font-medium mb-1 ml-1">Employee ID</Text>
              <InputWrapper icon={User} value={formData.empId} />
            </View>

            <View className="mb-2">
              <Text className="text-gray-500 text-xs font-medium mb-1 ml-1">Designation</Text>
              <InputWrapper icon={User} value={formData.designation} />
            </View>

            <View className="mb-2">
              <Text className="text-gray-500 text-xs font-medium mb-1 ml-1">Email Address</Text>
              <InputWrapper icon={Mail} value={formData.email} />
            </View>

            <View className="mb-2">
              <Text className="text-gray-500 text-xs font-medium mb-1 ml-1">Phone Number</Text>
              <InputWrapper icon={Phone} value={formData.phone} />
            </View>
          </View>

          {/* Location Group */}
          <View className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <Text className="text-gray-800 font-bold text-sm mb-4">Location Details</Text>
            
            <View className="mb-2">
              <Text className="text-gray-500 text-xs font-medium mb-1 ml-1">Work Location</Text>
              <InputWrapper icon={MapPin} value={formData.workLocation} />
            </View>

            <View className="mb-2">
              <Text className="text-gray-500 text-xs font-medium mb-1 ml-1">Home Address</Text>
              <InputWrapper icon={MapPin} value={formData.address} multiline={true} />
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
