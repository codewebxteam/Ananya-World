// app/bank-details.tsx
import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { ChevronLeft, Landmark, CreditCard, Hash, FileText, Lock, CircleAlert, Building } from 'lucide-react-native';
import { router } from 'expo-router';

export default function BankDetailsScreen() {
  
  // Dummy Bank Data
  const bankInfo = {
    bankName: "HDFC Bank Ltd.",
    accountHolder: "John Doe",
    accountNumber: "50100239485721",
    ifsc: "HDFC0001234",
    branch: "Sector 62, Noida",
    pan: "ABCDE1234F",
    aadhar: "XXXX-XXXX-1234"
  };

  const InfoRow = ({ icon: Icon, title, value, obscure = false }: any) => (
    <View className="flex-row items-center justify-between py-4 border-b border-gray-50">
      <View className="flex-row items-center flex-1">
        <View className="w-10 h-10 rounded-full bg-[#F5F7FA] items-center justify-center mr-3">
          <Icon color="#6B7280" size={18} strokeWidth={2} />
        </View>
        <View className="flex-1">
          <Text className="text-gray-500 text-[11px] font-medium mb-1 uppercase tracking-wider">{title}</Text>
          <Text className="text-gray-900 text-[14px] font-bold">
            {obscure ? `•••• ${value.slice(-4)}` : value}
          </Text>
        </View>
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
        <Text className="text-[#1E3A8A] text-lg font-bold">Bank Details</Text>
        <View className="w-10 h-10" />
      </View>

      <ScrollView 
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40, paddingTop: 16 }}
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
                <Text className="text-white text-lg font-bold tracking-wider">{bankInfo.bankName}</Text>
              </View>
              <CreditCard color="rgba(255,255,255,0.7)" size={28} strokeWidth={1.5} />
            </View>

            <View className="mb-6 z-10">
              <Text className="text-blue-100 text-[10px] uppercase tracking-[2px] mb-1">Account Number</Text>
              <Text className="text-white text-2xl font-bold tracking-[3px]">
                {bankInfo.accountNumber.replace(/(\d{4})/g, '$1 ').trim()}
              </Text>
            </View>

            <View className="flex-row justify-between items-end z-10">
              <View>
                <Text className="text-blue-100 text-[10px] uppercase tracking-[2px] mb-1">Account Holder</Text>
                <Text className="text-white text-base font-bold tracking-wider uppercase">{bankInfo.accountHolder}</Text>
              </View>
              <View className="items-end">
                <Text className="text-blue-100 text-[10px] uppercase tracking-[2px] mb-1">IFSC</Text>
                <Text className="text-white text-sm font-bold tracking-wider">{bankInfo.ifsc}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* KYC & Branch Info */}
        <View className="px-4">
          <View className="bg-white rounded-[20px] px-4 shadow-sm border border-gray-100 mb-4">
            <InfoRow icon={Building} title="Branch Name" value={bankInfo.branch} />
            <InfoRow icon={Hash} title="IFSC Code" value={bankInfo.ifsc} />
            <InfoRow icon={CreditCard} title="PAN Card" value={bankInfo.pan} />
            <View className="flex-row items-center justify-between py-4">
              <View className="flex-row items-center flex-1">
                <View className="w-10 h-10 rounded-full bg-[#F5F7FA] items-center justify-center mr-3">
                  <FileText color="#6B7280" size={18} strokeWidth={2} />
                </View>
                <View className="flex-1">
                  <Text className="text-gray-500 text-[11px] font-medium mb-1 uppercase tracking-wider">Aadhar Card</Text>
                  <Text className="text-gray-900 text-[14px] font-bold">
                    •••• •••• {bankInfo.aadhar.slice(-4)}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>
        
        {/* Security Notice */}
        <View className="mx-4 mt-2 bg-[#FFFBEB] p-4 rounded-xl border border-[#FDE68A] flex-row items-start">
          <CircleAlert color="#F59E0B" size={20} className="mr-3 mt-0.5" />
          <Text className="flex-1 text-[#D97706] text-xs leading-relaxed font-medium">
            For security reasons, your full bank details and Aadhar number are masked. To update these details, please contact HR with valid proof.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
