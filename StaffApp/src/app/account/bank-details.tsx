// app/bank-details.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { ChevronLeft, Landmark, CreditCard, Hash, Building, Pencil, Check, CircleAlert } from 'lucide-react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';

// Global memory cache for Bank Details Screen to render instantly with zero reload
let globalBankDetailsCache: any = null;

// Standalone InputRow defined outside component to prevent focus loss & keyboard dismiss on re-render
const InputRow = React.memo(({ icon: Icon, title, value, field, isEditing, onChangeText }: any) => (
  <View className="flex-row items-center justify-between py-3 border-b border-gray-50">
    <View className="flex-row items-center flex-1">
      <View className="w-10 h-10 rounded-full bg-[#F5F7FA] items-center justify-center mr-3">
        <Icon color="#6B7280" size={18} strokeWidth={2} />
      </View>
      <View className="flex-1">
        <Text className="text-gray-500 text-[11px] font-medium mb-1 uppercase tracking-wider">{title}</Text>
        {isEditing ? (
          <TextInput
            className="text-gray-900 text-[14px] font-bold p-0 m-0 border-b border-blue-200"
            value={value}
            onChangeText={(text) => onChangeText(field, text)}
            placeholder={`Enter ${title}`}
            autoCorrect={false}
            autoCapitalize={field === 'ifsc' ? 'characters' : 'words'}
          />
        ) : (
          <Text className="text-gray-900 text-[14px] font-bold uppercase">
            {value || 'N/A'}
          </Text>
        )}
      </View>
    </View>
  </View>
));

export default function BankDetailsScreen() {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(!globalBankDetailsCache);
  
  const [formData, setFormData] = useState({
    bankName: globalBankDetailsCache?.bankName || "",
    accountHolder: globalBankDetailsCache?.accountHolder || "",
    accountNumber: globalBankDetailsCache?.accountNumber || "",
    ifsc: globalBankDetailsCache?.ifsc || "",
    branch: globalBankDetailsCache?.branch || "",
  });

  const handleFieldChange = (field: string, text: string) => {
    const formatted = field === 'ifsc' ? text.toUpperCase() : text;
    setFormData(prev => ({ ...prev, [field]: formatted }));
  };

  const updateCacheAndState = (details: any, silent = false) => {
    globalBankDetailsCache = details;
    if (!silent) {
      setFormData({
        bankName: details.bankName || "",
        accountHolder: details.accountHolder || "",
        accountNumber: details.accountNumber || "",
        ifsc: details.ifsc || "",
        branch: details.branch || "",
      });
    }
    setIsInitialLoading(false);
  };

  useEffect(() => {
    let isMounted = true;
    const loadBankDetails = async () => {
      // 1. Instant check memory cache
      if (globalBankDetailsCache) {
        setIsInitialLoading(false);
      } else {
        // 2. Fallback to AsyncStorage for 0ms load
        const data = await AsyncStorage.getItem('userData');
        if (data && isMounted) {
          const parsed = JSON.parse(data);
          if (parsed.bankDetails) {
            updateCacheAndState(parsed.bankDetails);
          }
        }
      }

      // 3. Silent background Firestore sync
      const uid = await AsyncStorage.getItem('uid');
      if (uid) {
        try {
          const userDoc = await getDoc(doc(db, 'users', uid));
          if (userDoc.exists() && userDoc.data().bankDetails && isMounted) {
            const freshBank = userDoc.data().bankDetails;
            const hasChanged = JSON.stringify(freshBank) !== JSON.stringify(globalBankDetailsCache);
            if (hasChanged || !globalBankDetailsCache) {
              updateCacheAndState(freshBank, false);
            }
          }
        } catch (e) {
          console.log("Firestore sync skipped");
        }
      }
      if (isMounted) setIsInitialLoading(false);
    };

    loadBankDetails();
    return () => { isMounted = false; };
  }, []);

  const handleSave = async () => {
    setLoading(true);
    try {
      const uid = await AsyncStorage.getItem('uid');
      if (!uid) throw new Error("User ID not found");

      await updateDoc(doc(db, 'users', uid), {
        bankDetails: formData
      });

      // Update memory cache & local storage
      globalBankDetailsCache = formData;
      const data = await AsyncStorage.getItem('userData');
      if (data) {
        const parsed = JSON.parse(data);
        parsed.bankDetails = formData;
        await AsyncStorage.setItem('userData', JSON.stringify(parsed));
      }

      Alert.alert("Success", "Bank details updated successfully!");
      setIsEditing(false);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to update bank details.");
    } finally {
      setLoading(false);
    }
  };

  // Skeleton Loader for initial cold load
  if (isInitialLoading && !globalBankDetailsCache) {
    return (
      <View className="flex-1 bg-[#F5F7FA]">
        <View className="bg-white pt-12 pb-4 px-4 flex-row items-center justify-between border-b border-gray-100 shadow-sm z-10 animate-pulse">
          <View className="w-10 h-10 bg-gray-200 rounded-full" />
          <View className="h-6 w-28 bg-gray-200 rounded-md" />
          <View className="w-10 h-10 bg-gray-200 rounded-full" />
        </View>
        <View className="px-4 pt-6 gap-4 animate-pulse">
          <View className="h-48 bg-gray-200 rounded-3xl w-full mb-4" />
          <View className="bg-white rounded-[20px] p-4 gap-3">
            <View className="h-10 bg-gray-100 rounded-xl" />
            <View className="h-10 bg-gray-100 rounded-xl" />
            <View className="h-10 bg-gray-100 rounded-xl" />
            <View className="h-10 bg-gray-100 rounded-xl" />
          </View>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1 }} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="bg-[#F5F7FA]"
    >
      {/* Custom Header */}
      <View className="bg-white pt-12 pb-4 px-4 flex-row items-center justify-between border-b border-gray-100 shadow-sm z-10">
        <TouchableOpacity 
          onPress={() => router.back()}
          className="w-10 h-10 bg-gray-50 rounded-full items-center justify-center border border-gray-100"
        >
          <ChevronLeft color="#374151" size={24} strokeWidth={2.5} className="ml-1" />
        </TouchableOpacity>
        <Text className="text-[#1E3A8A] text-lg font-bold">Bank Details</Text>
        <TouchableOpacity 
          onPress={isEditing ? handleSave : () => setIsEditing(true)}
          disabled={loading}
          className="w-10 h-10 bg-[#EFF6FF] rounded-full items-center justify-center"
        >
          {loading ? (
            <ActivityIndicator size="small" color="#208AEF" />
          ) : isEditing ? (
            <Check color="#10B981" size={22} strokeWidth={2.5} />
          ) : (
            <Pencil color="#208AEF" size={20} strokeWidth={2} />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView 
        className="flex-1"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 60, paddingTop: 16 }}
      >
        {/* Virtual ATM Card */}
        <View className="px-4 mb-6">
          <View className="bg-gradient-to-br from-[#1E3A8A] to-[#3B82F6] bg-[#208AEF] rounded-3xl p-6 shadow-lg relative overflow-hidden">
            {/* Background elements for card design */}
            <View className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/10 -mr-10 -mt-10" />
            <View className="absolute bottom-0 left-0 w-24 h-24 rounded-full bg-black/10 -ml-10 -mb-10" />
            
            <View className="flex-row justify-between items-center mb-6 z-10">
              <View className="flex-row items-center">
                <Landmark color="white" size={24} strokeWidth={1.5} className="mr-2" />
                <Text className="text-white text-lg font-bold tracking-wider">{formData.bankName || 'BANK NAME'}</Text>
              </View>
              <CreditCard color="rgba(255,255,255,0.7)" size={28} strokeWidth={1.5} />
            </View>

            <View className="mb-6 z-10">
              <Text className="text-blue-100 text-[10px] uppercase tracking-[2px] mb-1">Account Number</Text>
              <Text className="text-white text-2xl font-bold tracking-[3px]">
                {formData.accountNumber ? formData.accountNumber.replace(/(\d{4})/g, '$1 ').trim() : '0000 0000 0000'}
              </Text>
            </View>

            <View className="flex-row justify-between items-end z-10">
              <View>
                <Text className="text-blue-100 text-[10px] uppercase tracking-[2px] mb-1">Account Holder</Text>
                <Text className="text-white text-base font-bold tracking-wider uppercase">{formData.accountHolder || 'YOUR NAME'}</Text>
              </View>
              <View className="items-end">
                <Text className="text-blue-100 text-[10px] uppercase tracking-[2px] mb-1">IFSC</Text>
                <Text className="text-white text-sm font-bold tracking-wider">{formData.ifsc || 'IFSC CODE'}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* KYC & Branch Info */}
        <View className="px-4">
          <View className="bg-white rounded-[20px] px-4 shadow-sm border border-gray-100 mb-4">
            <InputRow icon={Building} title="Bank Name" value={formData.bankName} field="bankName" isEditing={isEditing} onChangeText={handleFieldChange} />
            <InputRow icon={CreditCard} title="Account Number" value={formData.accountNumber} field="accountNumber" isEditing={isEditing} onChangeText={handleFieldChange} />
            <InputRow icon={Hash} title="Account Holder" value={formData.accountHolder} field="accountHolder" isEditing={isEditing} onChangeText={handleFieldChange} />
            <InputRow icon={Hash} title="IFSC Code" value={formData.ifsc} field="ifsc" isEditing={isEditing} onChangeText={handleFieldChange} />
            <InputRow icon={Building} title="Branch Name" value={formData.branch} field="branch" isEditing={isEditing} onChangeText={handleFieldChange} />
          </View>
        </View>
        
        {/* Notice */}
        <View className="mx-4 mt-2 bg-[#FFFBEB] p-4 rounded-xl border border-[#FDE68A] flex-row items-start">
          <CircleAlert color="#F59E0B" size={20} className="mr-3 mt-0.5" />
          <Text className="flex-1 text-[#D97706] text-xs leading-relaxed font-medium">
            Please double-check your bank details. Incorrect details may result in delayed salary processing. Click the edit icon to update.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
