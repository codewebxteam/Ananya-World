// app/support.tsx
import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Linking, Platform } from 'react-native';
import { ChevronLeft, Mail, Phone, MessageCircle, ChevronDown, ChevronUp, LifeBuoy } from 'lucide-react-native';
import { router } from 'expo-router';

export default function SupportScreen() {
  const [expandedFaq, setExpandedFaq] = useState<number | null>(1);

  const faqs = [
    {
      id: 1,
      question: "How do I mark my attendance if I'm on field duty?",
      answer: "Field staff can mark their attendance from anywhere using the 'Punch In' button on the Attendance screen. Your location will be recorded automatically."
    },
    {
      id: 2,
      question: "Why is my salary slip not visible for this month?",
      answer: "Salary slips are usually generated and uploaded by the 5th of every month. If you still don't see it after the 5th, please contact HR."
    },
    {
      id: 3,
      question: "How do I apply for a leave?",
      answer: "Currently, you can apply for leaves by messaging your manager directly through the Chat section. A dedicated leave management portal will be added soon."
    },
    {
      id: 4,
      question: "I forgot my password, how do I reset it?",
      answer: "You can ask your manager or HR to trigger a password reset link to your registered email address, or use the 'Change Password' option in the Account tab if you know your current password."
    }
  ];

  const handleContact = (type: 'phone' | 'email' | 'whatsapp') => {
    let url = '';
    if (type === 'phone') url = 'tel:+911234567890';
    if (type === 'email') url = 'mailto:hrsupport@lalpathlabs.com';
    if (type === 'whatsapp') url = 'https://wa.me/911234567890';
    
    Linking.canOpenURL(url).then(supported => {
      if (supported) {
        Linking.openURL(url);
      }
    });
  };

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
        <Text className="text-[#1E3A8A] text-lg font-bold">Help & Support</Text>
        <View className="w-10 h-10" />
      </View>

      <ScrollView 
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40, paddingTop: 16 }}
      >
        {/* Top Banner */}
        <View className="px-4 mb-6">
          <View className="bg-gradient-to-br from-[#208AEF] to-[#1E3A8A] bg-[#208AEF] rounded-3xl p-6 shadow-sm items-center">
            <View className="bg-white/20 w-16 h-16 rounded-full items-center justify-center mb-3">
              <LifeBuoy color="white" size={32} strokeWidth={2} />
            </View>
            <Text className="text-white text-lg font-bold mb-1">How can we help you?</Text>
            <Text className="text-blue-100 text-xs text-center px-4 leading-relaxed">
              Find answers in our FAQ section or contact the support team directly.
            </Text>
          </View>
        </View>

        {/* Contact Options */}
        <View className="px-4 mb-8 flex-row justify-between">
          <TouchableOpacity 
            onPress={() => handleContact('phone')}
            activeOpacity={0.7}
            className="bg-white rounded-2xl p-4 items-center shadow-sm border border-gray-100 flex-1 mr-2"
          >
            <View className="w-12 h-12 rounded-full bg-emerald-50 items-center justify-center mb-2">
              <Phone color="#10B981" size={24} strokeWidth={2} />
            </View>
            <Text className="text-gray-900 font-bold text-sm">Call Us</Text>
            <Text className="text-gray-400 text-[10px] mt-1">9 AM - 6 PM</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => handleContact('whatsapp')}
            activeOpacity={0.7}
            className="bg-white rounded-2xl p-4 items-center shadow-sm border border-gray-100 flex-1 mx-1"
          >
            <View className="w-12 h-12 rounded-full bg-green-50 items-center justify-center mb-2">
              <MessageCircle color="#22C55E" size={24} strokeWidth={2} />
            </View>
            <Text className="text-gray-900 font-bold text-sm">WhatsApp</Text>
            <Text className="text-gray-400 text-[10px] mt-1">Quick Reply</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => handleContact('email')}
            activeOpacity={0.7}
            className="bg-white rounded-2xl p-4 items-center shadow-sm border border-gray-100 flex-1 ml-2"
          >
            <View className="w-12 h-12 rounded-full bg-blue-50 items-center justify-center mb-2">
              <Mail color="#208AEF" size={24} strokeWidth={2} />
            </View>
            <Text className="text-gray-900 font-bold text-sm">Email</Text>
            <Text className="text-gray-400 text-[10px] mt-1">24/7 Support</Text>
          </TouchableOpacity>
        </View>

        {/* FAQs */}
        <View className="px-4">
          <Text className="text-gray-500 text-sm font-bold ml-1 mb-3 uppercase tracking-wider">Frequently Asked Questions</Text>
          
          <View className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {faqs.map((faq, index) => {
              const isExpanded = expandedFaq === faq.id;
              
              return (
                <View 
                  key={faq.id} 
                  className={`${index !== faqs.length - 1 ? 'border-b border-gray-50' : ''}`}
                >
                  <TouchableOpacity 
                    activeOpacity={0.7}
                    onPress={() => setExpandedFaq(isExpanded ? null : faq.id)}
                    className="flex-row items-center justify-between p-4"
                  >
                    <Text className={`flex-1 text-[14px] pr-4 leading-relaxed ${isExpanded ? 'text-[#208AEF] font-bold' : 'text-gray-800 font-medium'}`}>
                      {faq.question}
                    </Text>
                    <View className={`w-8 h-8 rounded-full items-center justify-center ${isExpanded ? 'bg-blue-50' : 'bg-gray-50'}`}>
                      {isExpanded ? (
                        <ChevronUp color="#208AEF" size={18} strokeWidth={2.5} />
                      ) : (
                        <ChevronDown color="#9CA3AF" size={18} strokeWidth={2.5} />
                      )}
                    </View>
                  </TouchableOpacity>
                  
                  {isExpanded && (
                    <View className="px-4 pb-4 pt-1">
                      <Text className="text-gray-500 text-xs leading-relaxed">
                        {faq.answer}
                      </Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </View>

      </ScrollView>
    </View>
  );
}
