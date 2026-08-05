// app/chat.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity,
    TextInput, KeyboardAvoidingView, Platform, Alert, ActivityIndicator, Keyboard
} from 'react-native';
import {
    Users, Megaphone, ChevronRight,
    Pin, FileText, Download, PlayCircle, Plus, Smile,
    Send, Image as ImageIcon, Camera, File, Video, Mic, MapPin
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as Location from 'expo-location';

const COMMON_EMOJIS = ["😀", "😂", "🥰", "😎", "🤔", "🙌", "👍", "🙏", "🔥", "💯", "🎉", "❤️"];

export default function ChatScreen() {
    const [showAttachments, setShowAttachments] = useState(false);
    const [showEmojis, setShowEmojis] = useState(false);
    const [messageText, setMessageText] = useState("");
    const [isFetchingLocation, setIsFetchingLocation] = useState(false);
    const scrollViewRef = useRef<ScrollView>(null);

    useEffect(() => {
        const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';

        const showSub = Keyboard.addListener(showEvent, () => {
            // Auto scroll to bottom when keyboard opens
            setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
        });

        return () => {
            showSub.remove();
        };
    }, []);

    // Attachment Handlers
    const handlePickPhoto = async () => {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 1,
        });
        if (!result.canceled) {
            Alert.alert("Photo Selected", `URI: ${result.assets[0].uri.substring(0, 50)}...`);
            setShowAttachments(false);
        }
    };

    const handleCamera = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission needed', 'Sorry, we need camera permissions to make this work!');
            return;
        }
        let result = await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 1,
        });
        if (!result.canceled) {
            Alert.alert("Photo Captured", `URI: ${result.assets[0].uri.substring(0, 50)}...`);
            setShowAttachments(false);
        }
    };

    const handleDocument = async () => {
        let result = await DocumentPicker.getDocumentAsync({
            type: '*/*',
            copyToCacheDirectory: true
        });
        if (result.canceled === false && result.assets && result.assets.length > 0) {
            Alert.alert("Document Selected", `File: ${result.assets[0].name}`);
            setShowAttachments(false);
        }
    };

    const handleVideo = async () => {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Videos,
            allowsEditing: true,
            quality: 1,
        });
        if (!result.canceled) {
            Alert.alert("Video Selected", `URI: ${result.assets[0].uri.substring(0, 50)}...`);
            setShowAttachments(false);
        }
    };

    const handleAudio = () => {
        Alert.alert("Audio Recording", "Native audio recorder would open here.");
        setShowAttachments(false);
    };

    const handleLocation = async () => {
        setIsFetchingLocation(true);
        try {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Denied', 'Permission to access location was denied');
                setIsFetchingLocation(false);
                return;
            }
            let location = await Location.getCurrentPositionAsync({});
            Alert.alert("Location Shared", `Lat: ${location.coords.latitude}\nLon: ${location.coords.longitude}`);
            setShowAttachments(false);
        } catch (error) {
            Alert.alert("Error", "Could not fetch location.");
        } finally {
            setIsFetchingLocation(false);
        }
    };

    const onEmojiSelect = (emoji: string) => {
        setMessageText(prev => prev + emoji);
    };

    return (
        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior="padding"
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 125}
        >
            {/* Chat Body */}
            <ScrollView
                ref={scrollViewRef}
                className="flex-1 px-4 pt-4"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 20 }}
                keyboardShouldPersistTaps="handled"
            >
                {/* Announcement Banner */}
                <View className="bg-white border border-[#FFEDD5] rounded-xl p-3 flex-row items-center gap-3 mb-6 shadow-sm">
                    <View className="bg-[#FFF7ED] p-2 rounded-lg">
                        <Megaphone color="#F97316" size={20} strokeWidth={2} />
                    </View>
                    <View className="flex-1">
                        <Text className="text-[#1E3A8A] text-[13px] font-bold mb-0.5">Announcements by Admin</Text>
                        <Text className="text-gray-600 text-[11px]">Kindly check the new field duty guidelines.</Text>
                    </View>
                    <TouchableOpacity className="flex-row items-center">
                        <Text className="text-[#208AEF] text-xs font-bold mr-0.5">View All</Text>
                        <ChevronRight color="#208AEF" size={16} strokeWidth={2.5} />
                    </TouchableOpacity>
                </View>

                {/* Date Separator */}
                <View className="items-center mb-6">
                    <View className="bg-white border border-gray-100 px-4 py-1.5 rounded-full shadow-sm">
                        <Text className="text-gray-500 text-[10px] font-medium">Monday, 5 Aug 2025</Text>
                    </View>
                </View>

                {/* Message 1 (Admin) */}
                <View className="pl-12 mb-5 relative">
                    <View className="absolute left-0 top-0 w-9 h-9 bg-[#FEF3C7] rounded-full items-center justify-center">
                        <Text className="text-[#D97706] font-bold text-sm">A</Text>
                    </View>
                    <View className="bg-white rounded-2xl rounded-tl-sm p-3 shadow-sm border border-gray-100 relative">
                        <View className="flex-row justify-between items-center mb-1.5">
                            <View className="flex-row items-center gap-1.5">
                                <Text className="text-[#1E3A8A] font-bold text-xs">Admin</Text>
                                <View className="bg-[#EFF6FF] px-1.5 py-0.5 rounded">
                                    <Text className="text-[#208AEF] text-[9px] font-bold">Admin</Text>
                                </View>
                            </View>
                            <Pin color="#3B82F6" size={14} strokeWidth={2.5} />
                        </View>
                        <Text className="text-gray-800 text-[13px] leading-5 mb-1">
                            Good morning everyone! 👋{"\n"}Please ensure to mark your attendance on time and follow all the safety protocols.
                        </Text>
                        <Text className="text-gray-400 text-[9px] font-medium">09:00 AM</Text>

                        {/* Reactions */}
                        <View className="absolute -bottom-3 left-2 flex-row gap-1">
                            <View className="bg-white border border-gray-100 rounded-full px-1.5 py-0.5 flex-row items-center gap-1 shadow-sm">
                                <Text className="text-[10px]">👍</Text>
                                <Text className="text-gray-500 text-[10px] font-bold">12</Text>
                            </View>
                            <View className="bg-white border border-gray-100 rounded-full px-1.5 py-0.5 flex-row items-center gap-1 shadow-sm">
                                <Text className="text-[10px]">❤️</Text>
                                <Text className="text-gray-500 text-[10px] font-bold">5</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Message 2 (Ravi) */}
                <View className="pl-12 mb-5 relative mt-2">
                    <View className="absolute left-0 top-0 w-9 h-9 bg-[#DCFCE7] rounded-full items-center justify-center">
                        <Text className="text-[#15803D] font-bold text-sm">RK</Text>
                    </View>
                    <View className="bg-white rounded-2xl rounded-tl-sm p-3 shadow-sm border border-gray-100 relative">
                        <Text className="text-[#15803D] font-bold text-xs mb-1.5">Ravi Kumar</Text>
                        <Text className="text-gray-800 text-[13px] leading-5 mb-1">Good morning team!</Text>
                        <Text className="text-gray-400 text-[9px] font-medium">09:05 AM</Text>

                        <View className="absolute -bottom-3 left-2 flex-row gap-1">
                            <View className="bg-white border border-gray-100 rounded-full px-1.5 py-0.5 flex-row items-center gap-1 shadow-sm">
                                <Text className="text-[10px]">👍</Text>
                                <Text className="text-gray-500 text-[10px] font-bold">3</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Message 3 (Neha - Document) */}
                <View className="pl-12 mb-5 relative mt-2">
                    <View className="absolute left-0 top-0 w-9 h-9 bg-[#F3E8FF] rounded-full items-center justify-center">
                        <Text className="text-[#7E22CE] font-bold text-sm">NS</Text>
                    </View>
                    <View className="bg-white rounded-2xl rounded-tl-sm p-3 shadow-sm border border-gray-100 relative">
                        <Text className="text-[#7E22CE] font-bold text-xs mb-1.5">Neha Sharma</Text>
                        <Text className="text-gray-800 text-[13px] leading-5 mb-2">Sample collection completed at Sector 62. Sharing the report.</Text>
                        <Text className="text-gray-400 text-[9px] font-medium mb-3">09:15 AM</Text>

                        {/* Document Attachment */}
                        <View className="bg-[#F8FAFC] border border-gray-100 rounded-xl p-3 flex-row items-center gap-3">
                            <View className="bg-[#FEE2E2] p-2 rounded-lg">
                                <FileText color="#EF4444" size={20} strokeWidth={2} />
                            </View>
                            <View className="flex-1">
                                <Text className="text-gray-800 text-xs font-bold" numberOfLines={1}>Sample_Report_05Aug2025.pdf</Text>
                                <Text className="text-gray-500 text-[10px] mt-0.5">1.2 MB</Text>
                            </View>
                            <TouchableOpacity className="bg-white p-1.5 rounded-full border border-gray-200">
                                <Download color="#6B7280" size={16} strokeWidth={2} />
                            </TouchableOpacity>
                        </View>

                        <View className="absolute -bottom-3 left-2 flex-row gap-1 mt-3">
                            <View className="bg-white border border-gray-100 rounded-full px-1.5 py-0.5 flex-row items-center gap-1 shadow-sm">
                                <Text className="text-[10px]">👍</Text>
                                <Text className="text-gray-500 text-[10px] font-bold">4</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Message 4 (Amit) */}
                <View className="pl-12 mb-5 relative mt-2">
                    <View className="absolute left-0 top-0 w-9 h-9 bg-[#EFF6FF] rounded-full items-center justify-center">
                        <Text className="text-[#1D4ED8] font-bold text-sm">A</Text>
                    </View>
                    <View className="bg-white rounded-2xl rounded-tl-sm p-3 shadow-sm border border-gray-100 relative">
                        <Text className="text-[#1D4ED8] font-bold text-xs mb-1.5">Amit Kumar</Text>
                        <Text className="text-gray-800 text-[13px] leading-5 mb-1">Team, lunch break is from 1:00 PM to 1:30 PM. Please plan accordingly.</Text>
                        <Text className="text-gray-400 text-[9px] font-medium">10:30 AM</Text>

                        <View className="absolute -bottom-3 left-2 flex-row gap-1">
                            <View className="bg-white border border-gray-100 rounded-full px-1.5 py-0.5 flex-row items-center gap-1 shadow-sm">
                                <Text className="text-[10px]">👍</Text>
                                <Text className="text-gray-500 text-[10px] font-bold">6</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Message 5 (Vikram - Video) */}
                <View className="pl-12 mb-8 relative mt-2">
                    <View className="absolute left-0 top-0 w-9 h-9 bg-[#FFEDD5] rounded-full items-center justify-center">
                        <Text className="text-[#C2410C] font-bold text-sm">VS</Text>
                    </View>
                    <View className="bg-white rounded-2xl rounded-tl-sm p-3 shadow-sm border border-gray-100 relative">
                        <Text className="text-[#C2410C] font-bold text-xs mb-1.5">Vikram Singh</Text>
                        <Text className="text-gray-800 text-[13px] leading-5 mb-2">Equipment maintenance completed. (Video attached)</Text>
                        <Text className="text-gray-400 text-[9px] font-medium mb-3">11:20 AM</Text>

                        {/* Video Attachment */}
                        <View className="bg-[#F8FAFC] border border-gray-100 rounded-xl p-3 flex-row items-center gap-3">
                            <View className="w-12 h-10 bg-gray-300 rounded-lg items-center justify-center relative overflow-hidden">
                                <PlayCircle color="white" size={24} className="z-10" />
                                <View className="absolute inset-0 bg-black/20" />
                            </View>
                            <View className="flex-1">
                                <Text className="text-gray-800 text-xs font-bold" numberOfLines={1}>Maintenance_Video.mp4</Text>
                                <Text className="text-gray-500 text-[10px] mt-0.5">12.4 MB</Text>
                            </View>
                            <TouchableOpacity className="bg-white p-1.5 rounded-full border border-gray-200">
                                <Download color="#6B7280" size={16} strokeWidth={2} />
                            </TouchableOpacity>
                        </View>

                        <View className="absolute -bottom-3 left-2 flex-row gap-1 mt-3">
                            <View className="bg-white border border-gray-100 rounded-full px-1.5 py-0.5 flex-row items-center gap-1 shadow-sm">
                                <Text className="text-[10px]">👍</Text>
                                <Text className="text-gray-500 text-[10px] font-bold">5</Text>
                            </View>
                        </View>
                    </View>
                </View>
            </ScrollView>

            {/* Bottom Input Area */}
            <View className="bg-[#F8FAFC] border-t border-gray-200 pt-2 pb-24 px-3">

                {/* Simple Emoji Picker */}
                {showEmojis && (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-2 bg-white rounded-full py-2 px-3 border border-gray-100 shadow-sm max-h-12">
                        {COMMON_EMOJIS.map((emoji, index) => (
                            <TouchableOpacity
                                key={index}
                                onPress={() => onEmojiSelect(emoji)}
                                className="px-2 items-center justify-center"
                            >
                                <Text className="text-2xl">{emoji}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                )}

                {/* Main Input Row */}
                <View className="flex-row items-end gap-2 mb-2">
                    <TouchableOpacity
                        onPress={() => {
                            setShowAttachments(!showAttachments);
                            setShowEmojis(false);
                        }}
                        className="w-10 h-10 bg-white border border-[#E0E7FF] rounded-full items-center justify-center mb-0.5"
                    >
                        <Plus color="#208AEF" size={24} strokeWidth={2.5} />
                    </TouchableOpacity>

                    <View className="flex-1 bg-white border border-gray-200 rounded-3xl flex-row items-end px-4 py-1 min-h-[44px]">
                        <TextInput
                            placeholder="Type a message..."
                            placeholderTextColor="#9CA3AF"
                            className="flex-1 text-black text-[14px] pt-2 pb-2"
                            multiline
                            style={{ maxHeight: 120, minHeight: 36 }}
                            value={messageText}
                            onChangeText={setMessageText}
                        />
                        <TouchableOpacity
                            className="ml-2 mb-1.5"
                            onPress={() => {
                                setShowEmojis(!showEmojis);
                                setShowAttachments(false);
                            }}
                        >
                            <Smile color={showEmojis ? "#208AEF" : "#9CA3AF"} size={22} strokeWidth={2} />
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity className="w-11 h-11 bg-[#208AEF] rounded-full items-center justify-center mb-0.5 shadow-sm">
                        <Send color="white" size={20} strokeWidth={2.5} className="ml-1" />
                    </TouchableOpacity>
                </View>

                {/* Expandable Attachment Menu */}
                {showAttachments && (
                    <View className="flex-row justify-between items-center px-2 py-4 border-t border-gray-100 mt-2">
                        <TouchableOpacity onPress={handlePickPhoto} className="items-center gap-1.5">
                            <ImageIcon color="#10B981" size={22} strokeWidth={2} />
                            <Text className="text-gray-600 text-[10px] font-medium">Photo</Text>
                        </TouchableOpacity>

                        <TouchableOpacity onPress={handleCamera} className="items-center gap-1.5">
                            <Camera color="#3B82F6" size={22} strokeWidth={2} />
                            <Text className="text-gray-600 text-[10px] font-medium">Camera</Text>
                        </TouchableOpacity>

                        <TouchableOpacity onPress={handleDocument} className="items-center gap-1.5">
                            <File color="#F59E0B" size={22} strokeWidth={2} />
                            <Text className="text-gray-600 text-[10px] font-medium">Document</Text>
                        </TouchableOpacity>

                        <TouchableOpacity onPress={handleVideo} className="items-center gap-1.5">
                            <Video color="#8B5CF6" size={22} strokeWidth={2} />
                            <Text className="text-gray-600 text-[10px] font-medium">Video</Text>
                        </TouchableOpacity>

                        <TouchableOpacity onPress={handleAudio} className="items-center gap-1.5">
                            <Mic color="#EF4444" size={22} strokeWidth={2} />
                            <Text className="text-gray-600 text-[10px] font-medium">Audio</Text>
                        </TouchableOpacity>

                        <TouchableOpacity onPress={handleLocation} disabled={isFetchingLocation} className="items-center gap-1.5">
                            {isFetchingLocation ? (
                                <ActivityIndicator size="small" color="#10B981" />
                            ) : (
                                <MapPin color="#10B981" size={22} strokeWidth={2} />
                            )}
                            <Text className="text-gray-600 text-[10px] font-medium">
                                {isFetchingLocation ? 'Fetching...' : 'Location'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        </KeyboardAvoidingView>
    );
}