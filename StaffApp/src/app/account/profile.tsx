// app/profile.tsx
import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Image, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { ChevronLeft, Camera, User, Mail, Phone, MapPin, Droplet, ShieldPlus, Pencil, Check } from 'lucide-react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';

export default function ProfileScreen() {
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: "John Doe",
    email: "john.doe@example.com",
    phone: "+91 9876543210",
    bloodGroup: "O+",
    address: "Flat 402, Sunshine Apartments, Sector 62, Noida, UP - 201309",
    emergency: "+91 9988776655"
  });

  const handlePickImage = async () => {
    if (!isEditing) return;
    
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled) {
      setProfileImage(result.assets[0].uri);
    }
  };

  const handleSave = () => {
    // In future, this will save to Firebase
    Alert.alert("Success", "Profile updated successfully!");
    setIsEditing(false);
  };

  const InputWrapper = ({ icon: Icon, value, onChangeText, multiline = false, keyboardType = 'default' }: any) => (
    <View className={`flex-row ${multiline ? 'items-start py-3' : 'items-center h-12'} px-3 rounded-xl ${isEditing ? 'bg-[#F8FAFC] border border-gray-200' : 'bg-transparent border border-transparent'}`}>
      <Icon color={isEditing ? "#9CA3AF" : "#6B7280"} size={18} className={`mr-2 ${multiline ? 'mt-0.5' : ''}`} />
      <TextInput 
        className={`flex-1 text-[14px] ${isEditing ? 'text-black' : 'text-gray-700 font-medium'}`} 
        value={value}
        onChangeText={onChangeText}
        editable={isEditing}
        multiline={multiline}
        keyboardType={keyboardType}
        pointerEvents={isEditing ? 'auto' : 'none'}
      />
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
        <Text className="text-[#1E3A8A] text-lg font-bold">My Profile</Text>
        <TouchableOpacity 
          onPress={isEditing ? handleSave : () => setIsEditing(true)}
          className="w-10 h-10 bg-[#EFF6FF] rounded-full items-center justify-center"
        >
          {isEditing ? (
            <Check color="#10B981" size={22} strokeWidth={2.5} />
          ) : (
            <Pencil color="#208AEF" size={20} strokeWidth={2} />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView 
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Profile Image Section */}
        <View className="items-center mt-6 mb-8 relative">
          <View className={`w-28 h-28 rounded-full bg-white p-1 shadow-sm ${isEditing ? 'border-2 border-[#208AEF]' : 'border border-gray-200'}`}>
            {profileImage ? (
              <Image source={{ uri: profileImage }} className="w-full h-full rounded-full" />
            ) : (
              <View className="w-full h-full rounded-full bg-[#EFF6FF] items-center justify-center">
                <Text className="text-[#208AEF] text-4xl font-bold">JD</Text>
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
            <Text className="text-gray-800 font-bold text-sm mb-4">Personal Information</Text>
            
            <View className="mb-2">
              <Text className="text-gray-500 text-xs font-medium mb-1 ml-1">Full Name</Text>
              <InputWrapper 
                icon={User} 
                value={formData.name} 
                onChangeText={(text: string) => setFormData({...formData, name: text})} 
              />
            </View>

            <View className="mb-2">
              <Text className="text-gray-500 text-xs font-medium mb-1 ml-1">Email Address</Text>
              <InputWrapper 
                icon={Mail} 
                value={formData.email} 
                onChangeText={(text: string) => setFormData({...formData, email: text})} 
                keyboardType="email-address"
              />
            </View>

            <View className="mb-2">
              <Text className="text-gray-500 text-xs font-medium mb-1 ml-1">Phone Number</Text>
              <InputWrapper 
                icon={Phone} 
                value={formData.phone} 
                onChangeText={(text: string) => setFormData({...formData, phone: text})} 
                keyboardType="phone-pad"
              />
            </View>

            <View className="mb-1">
              <Text className="text-gray-500 text-xs font-medium mb-1 ml-1">Blood Group</Text>
              <InputWrapper 
                icon={Droplet} 
                value={formData.bloodGroup} 
                onChangeText={(text: string) => setFormData({...formData, bloodGroup: text})} 
              />
            </View>
          </View>

          {/* Address & Emergency Group */}
          <View className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <Text className="text-gray-800 font-bold text-sm mb-4">Other Details</Text>
            
            <View className="mb-2">
              <Text className="text-gray-500 text-xs font-medium mb-1 ml-1">Current Address</Text>
              <InputWrapper 
                icon={MapPin} 
                value={formData.address} 
                onChangeText={(text: string) => setFormData({...formData, address: text})} 
                multiline={true}
              />
            </View>

            <View className="mb-1">
              <Text className="text-gray-500 text-xs font-medium mb-1 ml-1">Emergency Contact</Text>
              <InputWrapper 
                icon={ShieldPlus} 
                value={formData.emergency} 
                onChangeText={(text: string) => setFormData({...formData, emergency: text})} 
                keyboardType="phone-pad"
              />
            </View>
          </View>
        </View>
      </ScrollView>


    </KeyboardAvoidingView>
  );
}
