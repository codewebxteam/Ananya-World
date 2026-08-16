// app/documents.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, Platform, Alert, ActivityIndicator } from 'react-native';
import { ChevronLeft, Camera, FileBadge2, Image as ImageIcon, CreditCard } from 'lucide-react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { uploadToImageKit } from '../../utils/imagekit';

export default function DocumentsScreen() {
  const [aadharFront, setAadharFront] = useState<string | null>(null);
  const [aadharBack, setAadharBack] = useState<string | null>(null);
  const [panCard, setPanCard] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('userData').then(data => {
      if (data) {
        const parsed = JSON.parse(data);
        if (parsed.documents) {
          setAadharFront(parsed.documents.aadharFront || null);
          setAadharBack(parsed.documents.aadharBack || null);
          setPanCard(parsed.documents.panCard || null);
        }
      }
    });
  }, []);

  const pickImage = async (docType: 'aadharFront' | 'aadharBack' | 'panCard', source: 'camera' | 'gallery') => {
    try {
      let result;
      if (source === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') return Alert.alert("Permission needed", "Camera permission is required.");
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.8,
        });
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') return Alert.alert("Permission needed", "Gallery permission is required.");
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.8,
        });
      }

      if (!result.canceled && result.assets && result.assets[0]) {
        handleUpload(result.assets[0].uri, docType);
      }
    } catch (error) {
      Alert.alert("Error", "Could not capture image.");
    }
  };

  const handleUpload = async (uri: string, docType: 'aadharFront' | 'aadharBack' | 'panCard') => {
    setLoading(true);
    try {
      const uid = await AsyncStorage.getItem('uid');
      if (!uid) throw new Error("User ID not found");

      // Upload to ImageKit
      const downloadURL = await uploadToImageKit(uri, `${docType}_${uid}_${Date.now()}.jpg`);
      if (!downloadURL) throw new Error("ImageKit upload failed.");

      // Save to Firestore
      const updateData = { [`documents.${docType}`]: downloadURL };
      await updateDoc(doc(db, 'users', uid), updateData);

      // Update local state
      if (docType === 'aadharFront') setAadharFront(downloadURL);
      else if (docType === 'aadharBack') setAadharBack(downloadURL);
      else if (docType === 'panCard') setPanCard(downloadURL);

      // Update AsyncStorage
      const data = await AsyncStorage.getItem('userData');
      if (data) {
        const parsed = JSON.parse(data);
        parsed.documents = { ...parsed.documents, [docType]: downloadURL };
        await AsyncStorage.setItem('userData', JSON.stringify(parsed));
      }

      Alert.alert("Success", `${docType === 'panCard' ? 'PAN Card' : docType === 'aadharFront' ? 'Aadhaar Front' : 'Aadhaar Back'} uploaded successfully!`);
    } catch (error: any) {
      Alert.alert("Upload Failed", error.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const UploadCard = ({ title, imageUri, docType }: { title: string, imageUri: string | null, docType: 'aadharFront' | 'aadharBack' | 'panCard' }) => (
    <View className="bg-white p-4 mb-4 rounded-2xl shadow-sm border border-gray-100">
      <Text className="text-gray-900 text-[15px] font-bold mb-3">{title}</Text>
      
      {imageUri ? (
        <View className="mb-4 rounded-xl overflow-hidden border border-gray-200">
          <Image source={{ uri: imageUri }} className="w-full h-40" resizeMode="cover" />
        </View>
      ) : (
        <View className="mb-4 h-40 rounded-xl bg-gray-50 border-2 border-dashed border-gray-200 items-center justify-center">
          <FileBadge2 color="#9CA3AF" size={40} className="mb-2" />
          <Text className="text-gray-400 text-sm font-medium">No Image Uploaded</Text>
        </View>
      )}

      <View className="flex-row gap-3">
        <TouchableOpacity 
          disabled={loading}
          onPress={() => pickImage(docType, 'camera')}
          className="flex-1 bg-blue-50 py-3 rounded-xl flex-row items-center justify-center border border-blue-100"
        >
          <Camera color="#2563EB" size={18} className="mr-2" />
          <Text className="text-blue-600 font-semibold text-sm">Take Photo</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          disabled={loading}
          onPress={() => pickImage(docType, 'gallery')}
          className="flex-1 bg-gray-50 py-3 rounded-xl flex-row items-center justify-center border border-gray-200"
        >
          <ImageIcon color="#4B5563" size={18} className="mr-2" />
          <Text className="text-gray-600 font-semibold text-sm">Gallery</Text>
        </TouchableOpacity>
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
        <Text className="text-[#1E3A8A] text-lg font-bold">My Documents</Text>
        <View className="w-10 h-10" />
      </View>

      <ScrollView 
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40, paddingTop: 16 }}
      >
        <View className="px-4 mb-4 flex-row items-center justify-between">
          <View>
            <Text className="text-gray-900 text-base font-bold mb-0.5">Government Identification</Text>
            <Text className="text-gray-400 text-[11px]">Upload clear photos of your ID cards</Text>
          </View>
          {loading && <ActivityIndicator size="small" color="#2563EB" />}
        </View>

        {/* Documents List */}
        <View className="px-4">
          <UploadCard title="Aadhaar Card (Front)" imageUri={aadharFront} docType="aadharFront" />
          <UploadCard title="Aadhaar Card (Back)" imageUri={aadharBack} docType="aadharBack" />
          <UploadCard title="PAN Card" imageUri={panCard} docType="panCard" />
        </View>
        
        <View className="mt-2 px-6 items-center">
          <View className="bg-blue-50 p-4 rounded-xl border border-blue-100 w-full items-center">
            <Text className="text-[#208AEF] font-bold text-sm mb-1">Need help with documents?</Text>
            <Text className="text-blue-600/70 text-xs text-center">To update additional certificates or passport, email HR at hr@lalpathlabs.com</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
