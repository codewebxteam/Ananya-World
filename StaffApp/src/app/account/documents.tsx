// app/documents.tsx
import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { ChevronLeft, FileText, Download, CheckCircle2, AlertCircle, FileBadge2 } from 'lucide-react-native';
import { router } from 'expo-router';

export default function DocumentsScreen() {
  
  // Dummy Documents Data
  const documents = [
    { id: 1, name: "Aadhar Card", type: "Identity Proof", status: "Verified", date: "12 Oct 2023", icon: FileText, color: "#208AEF" },
    { id: 2, name: "PAN Card", type: "Identity Proof", status: "Verified", date: "12 Oct 2023", icon: FileText, color: "#8B5CF6" },
    { id: 3, name: "Offer Letter", type: "Employment", status: "Verified", date: "10 Oct 2023", icon: FileBadge2, color: "#10B981" },
    { id: 4, name: "10th Marksheet", type: "Education", status: "Verified", date: "12 Oct 2023", icon: FileText, color: "#F59E0B" },
    { id: 5, name: "Previous Experience Letter", type: "Employment", status: "Pending", date: "-", icon: FileBadge2, color: "#EF4444" },
  ];

  const DocumentCard = ({ doc }: any) => (
    <View className="bg-white p-4 mb-3 rounded-2xl shadow-sm border border-gray-100 flex-row items-center">
      <View className="w-12 h-12 rounded-xl items-center justify-center mr-4" style={{ backgroundColor: `${doc.color}15` }}>
        <doc.icon color={doc.color} size={24} strokeWidth={2} />
      </View>
      
      <View className="flex-1 pr-2">
        <Text className="text-gray-900 text-[15px] font-bold mb-0.5">{doc.name}</Text>
        <Text className="text-gray-500 text-[11px] mb-1.5">{doc.type}</Text>
        
        <View className="flex-row items-center">
          {doc.status === "Verified" ? (
            <CheckCircle2 color="#10B981" size={12} className="mr-1" />
          ) : (
            <AlertCircle color="#EF4444" size={12} className="mr-1" />
          )}
          <Text className={`text-[10px] font-medium ${doc.status === "Verified" ? "text-[#10B981]" : "text-[#EF4444]"}`}>
            {doc.status}
          </Text>
          {doc.status === "Verified" && (
            <Text className="text-gray-400 text-[10px] ml-2">• {doc.date}</Text>
          )}
        </View>
      </View>

      <TouchableOpacity 
        className="w-10 h-10 rounded-full bg-gray-50 items-center justify-center border border-gray-100"
        onPress={() => {}}
      >
        <Download color="#6B7280" size={18} strokeWidth={2} />
      </TouchableOpacity>
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
        <View className="px-4 mb-4">
          <Text className="text-gray-500 text-sm font-medium mb-1">Uploaded Documents</Text>
          <Text className="text-gray-400 text-[11px]">Download or view your submitted documents</Text>
        </View>

        {/* Documents List */}
        <View className="px-4">
          {documents.map(doc => (
            <DocumentCard key={doc.id} doc={doc} />
          ))}
        </View>
        
        <View className="mt-6 px-6 items-center">
          <View className="bg-blue-50 p-4 rounded-xl border border-blue-100 w-full items-center">
            <Text className="text-[#208AEF] font-bold text-sm mb-1">Need to upload a new document?</Text>
            <Text className="text-blue-600/70 text-xs text-center">Please email HR directly at hr@lalpathlabs.com with your Employee ID.</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
