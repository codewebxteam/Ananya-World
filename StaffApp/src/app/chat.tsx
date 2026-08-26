import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity,
    TextInput, KeyboardAvoidingView, Platform, Alert, ActivityIndicator, Keyboard, Image, Modal, Linking,
    PermissionsAndroid, SafeAreaView, StatusBar
} from 'react-native';
import {
    Users, Megaphone, ChevronRight, ArrowLeft, Search,
    Pin, FileText, Download, PlayCircle, Plus, Smile,
    Send, Image as ImageIcon, Camera, File, Video as VideoIcon, Mic, MapPin, ThumbsUp,
    Square, Play, Pause, Lock
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as Location from 'expo-location';
import * as WebBrowser from 'expo-web-browser';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library/legacy';
import * as Sharing from 'expo-sharing';
import Constants from 'expo-constants';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Only load expo-notifications in production/dev builds (NOT in Expo Go)
const isExpoGo = Constants.executionEnvironment === 'storeClient';
const Notifications: any = !isExpoGo ? require('expo-notifications') : null;

import * as ExpoAudio from 'expo-audio';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, updateDoc, doc, increment, deleteDoc, setDoc } from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import { uploadToImageKitWithDetails, uploadBase64ToImageKit, deleteFromImageKit } from '../utils/imagekit';

const COMMON_EMOJIS = ["😀", "😂", "🥰", "😎", "🤔", "🙌", "👍", "🙏", "🔥", "💯", "🎉", "❤️"];

// Module-level global memory cache to guarantee zero reload/skeleton when navigating between tabs
let globalChatCache: {
  isLoaded: boolean;
  userData: any;
  messages: any[];
} = {
  isLoaded: false,
  userData: null,
  messages: []
};

export default function ChatScreen() {
    const insets = useSafeAreaInsets();
    const [showAttachments, setShowAttachments] = useState(false);
    const [showEmojis, setShowEmojis] = useState(false);
    const [messageText, setMessageText] = useState("");
    const [isFetchingLocation, setIsFetchingLocation] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [downloadingUrl, setDownloadingUrl] = useState<string | null>(null);

    // Voice recording states and hook
    const recorder = ExpoAudio.useAudioRecorder(ExpoAudio.RecordingPresets.HIGH_QUALITY);
    const [isRecording, setIsRecording] = useState(false);
    const [recordingDuration, setRecordingDuration] = useState(0);
    const recordingTimer = useRef<ReturnType<typeof setInterval> | null>(null);

    // Voice playback states
    const [playingUrl, setPlayingUrl] = useState<string | null>(null);
    const [playbackSound, setPlaybackSound] = useState<any>(null);
    const [playbackProgress, setPlaybackProgress] = useState(0);
    const [playbackDuration, setPlaybackDuration] = useState(0);
    
    // State initialized from global memory cache for instant render with zero reload
    const [userData, setUserData] = useState<any>(globalChatCache.userData);
    const [messages, setMessages] = useState<any[]>(globalChatCache.messages);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [staffList, setStaffList] = useState<any[]>([]);
    const [branchesList, setBranchesList] = useState<any[]>([]);
    const [isInputFocused, setIsInputFocused] = useState(false);

    const getBranchDisplayName = (name?: string, id?: string) => {
        if (name && name.trim()) return name;
        if (id && id.trim()) {
            const found = branchesList.find(b => b.id === id);
            if (found && found.name) return found.name;
            if (id.length === 20 && /^[a-zA-Z0-9]+$/.test(id)) {
                return 'Other Branch';
            }
            return id;
        }
        return 'Other Branch';
    };
    const [customGroups, setCustomGroups] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
    const [activePartner, setActivePartner] = useState<any | null>(null);
    const activeRoomIdRef = useRef<string | null>(null);

    const [lastReadTimes, setLastReadTimes] = useState<Record<string, number>>({});

    const getUnreadCount = (roomId: string) => {
        if (activeRoomId === roomId) return 0;
        const lastRead = lastReadTimes[roomId] || 0;
        const roomMsgs = messages.filter(m => m.roomId === roomId);
        return roomMsgs.filter(m => {
            let msgTime = 0;
            if (m.createdAt?.toMillis) {
                msgTime = m.createdAt.toMillis();
            } else if (m.createdAt?.seconds) {
                msgTime = m.createdAt.seconds * 1000;
            } else {
                msgTime = new Date(m.createdAt).getTime();
            }
            const isOther = m.authorId !== userData?.empId;
            return isOther && msgTime > lastRead;
        }).length;
    };

    useEffect(() => {
        if (activeRoomId) {
            const updateRead = () => {
                const now = Date.now();
                setLastReadTimes(prev => {
                    const updated = { ...prev, [activeRoomId]: now };
                    AsyncStorage.setItem('chat_last_read_times', JSON.stringify(updated));
                    return updated;
                });
            };
            updateRead();
            const timer = setInterval(updateRead, 5000);
            return () => clearInterval(timer);
        }
    }, [activeRoomId]);

    useEffect(() => {
        activeRoomIdRef.current = activeRoomId;
    }, [activeRoomId]);

    // Skeleton / Initial loading state (false if memory cache is loaded)
    const [isInitialLoading, setIsInitialLoading] = useState(!globalChatCache.isLoaded);
    
    const scrollViewRef = useRef<ScrollView>(null);
    const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

    // Release player resources when component unmounts to prevent leaks
    useEffect(() => {
        return () => {
            if (playbackSound) {
                try {
                    playbackSound.release();
                } catch (_) {}
            }
        };
    }, [playbackSound]);

    useEffect(() => {
        const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
        const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

        const showListener = Keyboard.addListener(showEvent, (e) => {
            const height = e?.endCoordinates?.height || 0;
            if (height > 0) {
                setIsKeyboardVisible(true);
                setTimeout(() => {
                    scrollViewRef.current?.scrollToEnd({ animated: true });
                }, 50);
            }
        });

        const hideListener = Keyboard.addListener(hideEvent, () => {
            setIsKeyboardVisible(false);
        });

        return () => {
            showListener.remove();
            hideListener.remove();
        };
    }, []);

    useEffect(() => {
        // Clear unread message count on opening chat screen
        AsyncStorage.setItem('lastReadChatTime', new Date().toISOString());

        // Fetch User Data
        AsyncStorage.getItem('userData').then(data => {
            if (data) {
              const parsed = JSON.parse(data);
              setUserData(parsed);
              globalChatCache.userData = parsed;
            }
        });

        // Fetch lastReadTimes from AsyncStorage
        AsyncStorage.getItem('chat_last_read_times').then(val => {
            if (val) {
                try {
                    setLastReadTimes(JSON.parse(val));
                } catch (e) {
                    console.log("Error parsing chat_last_read_times", e);
                }
            }
        });

        // Listen to Messages & Auto-Vanish messages older than 5 days
        const q = query(collection(db, 'communications'), orderBy('createdAt', 'asc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const msgs: any[] = [];
            const FIVE_DAYS_MS = 5 * 24 * 60 * 60 * 1000;
            const now = Date.now();

            // Trigger notification with sound for new incoming messages from other users
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    const data = change.doc.data();
                    let msgTime = now;
                    if (data.createdAt?.toMillis) {
                        msgTime = data.createdAt.toMillis();
                    } else if (data.createdAt?.seconds) {
                        msgTime = data.createdAt.seconds * 1000;
                    }
                    
                    const isRecent = Math.abs(now - msgTime) < 20000;
                    const storedEmpId = globalChatCache.userData?.empId || userData?.empId;
                    const isOtherUser = data.authorId !== storedEmpId && data.author !== (globalChatCache.userData?.name || userData?.name);

                    // Check if current user is a participant of this message
                    const isParticipant = data.roomId === 'group' || 
                        (data.participants && Array.isArray(data.participants) && 
                         (data.participants.includes(storedEmpId) || data.participants.includes('all')));

                    // Check if the chat room is NOT currently open
                    const isRoomNotOpen = activeRoomIdRef.current !== data.roomId;

                    if (isRecent && isOtherUser && isParticipant && isRoomNotOpen) {
                        Notifications?.scheduleNotificationAsync({
                            content: {
                                title: data.author ? `Message from ${data.author}` : "New Message",
                                body: data.text || (data.attachments?.length ? "Sent an attachment 📎" : "New message received"),
                                sound: true,
                                data: { roomId: data.roomId },
                            },
                            trigger: null,
                        }).catch(() => {});
                    }
                }
            });

            snapshot.forEach((docSnap) => {
                const data = docSnap.data();
                let msgTime = 0;
                if (data.createdAt?.toMillis) {
                    msgTime = data.createdAt.toMillis();
                } else if (data.createdAt?.seconds) {
                    msgTime = data.createdAt.seconds * 1000;
                }

                // If message is older than 5 days (432,000,000 ms), filter out from client view (Admin app/backend handles physical deletion)
                if (msgTime && (now - msgTime > FIVE_DAYS_MS)) {
                    // Skip old messages on the staff app since staff does not have delete permission
                } else {
                    msgs.push({ id: docSnap.id, ...data });
                }
            });
            setMessages(msgs);
            globalChatCache.messages = msgs;
            globalChatCache.isLoaded = true;
            setIsInitialLoading(false);
            setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
        }, (error) => {
            console.error("Communications snapshot error:", error);
        });

        return () => {
            unsubscribe();
        };
    }, []);

    useEffect(() => {
        if (!userData) return;
        const qUsers = collection(db, 'users');
        const unsubscribeUsers = onSnapshot(qUsers, (snapshot) => {
            const list: any[] = [];
            snapshot.forEach(docSnap => {
                const u = docSnap.data();
                if (u.empId && u.empId !== userData.empId) {
                    list.push({ uid: docSnap.id, ...u });
                }
            });
            setStaffList(list);
        }, (err) => {
            console.error("Error listening to users:", err);
        });
        return () => unsubscribeUsers();
    }, [userData]);

    useEffect(() => {
        if (!userData || !userData.empId) return;
        const qGroups = query(collection(db, 'custom_groups'), orderBy('createdAt', 'desc'));
        const unsubscribeGroups = onSnapshot(qGroups, (snapshot) => {
            const groups: any[] = [];
            snapshot.forEach(docSnap => {
                const data = docSnap.data();
                if (data.members && Array.isArray(data.members) && data.members.includes(userData.empId)) {
                    groups.push({ id: docSnap.id, ...data });
                }
            });
            setCustomGroups(groups);
        }, (err) => {
            console.error("Error listening to custom_groups:", err);
        });
        return () => unsubscribeGroups();
    }, [userData]);

    useEffect(() => {
        const qBranches = collection(db, 'branches');
        const unsubscribeBranches = onSnapshot(qBranches, (snapshot) => {
            const list: any[] = [];
            snapshot.forEach(docSnap => {
                list.push({ id: docSnap.id, ...docSnap.data() });
            });
            setBranchesList(list);
        }, (err) => {
            console.error("Error listening to branches:", err);
        });
        return () => unsubscribeBranches();
    }, []);

    const sendMessage = async (text: string = "", attachments: any[] = []) => {
        if ((!text.trim() && attachments.length === 0) || !userData) return;
        
        const msgText = text;
        setMessageText(""); // Clear immediately for UX
        setShowAttachments(false);
        setShowEmojis(false);
        
        const isRoomPrivate = activeRoomId !== 'group' && !activeRoomId?.startsWith('custom_group_') && activeRoomId !== null;
        const isCustomGroup = activeRoomId?.startsWith('custom_group_') || false;
        const msgDoc: any = {
            type: 'normal',
            text: msgText,
            author: userData.name,
            authorId: userData.empId,
            authorType: userData.staffType || null,
            avatar: userData.avatar || null,
            attachments: attachments,
            likes: 0,
            createdAt: serverTimestamp(),
            pinned: false,
            roomId: activeRoomId || 'group',
            isPrivate: isRoomPrivate,
            isCustomGroup: isCustomGroup,
            groupId: isCustomGroup ? activeRoomId?.replace('custom_group_', '') : null,
            participants: isRoomPrivate ? [userData.empId, activePartner?.empId] : (activePartner?.members || ['all'])
        };

        try {
            await addDoc(collection(db, 'communications'), msgDoc);
            
            if (isRoomPrivate && activePartner && activeRoomId) {
                const roomRef = doc(db, 'private_rooms', activeRoomId);
                await setDoc(roomRef, {
                    roomId: activeRoomId,
                    userA: userData.empId,
                    userB: activePartner.empId,
                    userAName: userData.name,
                    userBName: activePartner.name,
                    userAAvatar: userData.avatar || null,
                    userBAvatar: activePartner.avatar || null,
                    userABranch: userData.branchName || userData.branchId || null,
                    userBBranch: activePartner.branchName || activePartner.branchId || null,
                    lastMessage: msgText || '[Attachment]',
                    lastMessageAt: serverTimestamp()
                }, { merge: true });
            }
            
            setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
        } catch (error: any) {
            Alert.alert("Error", error.message);
        }
    };

    const handleSendText = () => sendMessage(messageText);

    const handleAvatarPress = (msg: any) => {
        if (!msg.authorId || (userData && msg.authorId === userData.empId)) return;
        
        // Find staff details by msg.authorId
        const staff = staffList.find(s => s.empId === msg.authorId);
        if (staff) {
            const roomId = 'private_' + [userData.empId, staff.empId].sort().join('_');
            setActiveRoomId(roomId);
            setActivePartner(staff);
        } else {
            // Fallback if not found in staffList
            const fallbackStaff = {
                empId: msg.authorId,
                name: msg.author || 'Staff Member',
                avatar: msg.avatar || '',
                designation: 'Staff',
                branchName: 'Branch'
            };
            const roomId = 'private_' + [userData.empId, msg.authorId].sort().join('_');
            setActiveRoomId(roomId);
            setActivePartner(fallbackStaff);
        }
    };

    const handleFileUpload = async (uri: string, name: string, type: string) => {
        setIsUploading(true);
        setShowAttachments(false);
        const result = await uploadToImageKitWithDetails(uri, name);
        if (result && result.url) {
            await sendMessage("", [{ url: result.url, fileId: result.fileId, fileType: type, name }]);
        } else {
            Alert.alert("Upload Failed", "Could not upload file. Please try again.");
        }
        setIsUploading(false);
    };

    // Direct base64 upload handler - bypasses all file system reads
    const handleBase64Upload = async (base64: string, name: string, type: string, mime: string) => {
        setIsUploading(true);
        setShowAttachments(false);
        const result = await uploadBase64ToImageKit(base64, name, mime);
        if (result && result.url) {
            await sendMessage("", [{ url: result.url, fileId: result.fileId, fileType: type, name }]);
        } else {
            Alert.alert("Upload Failed", "Could not upload file. Please try again.");
        }
        setIsUploading(false);
    };

    // Attachment Handlers
    const handlePickPhoto = async () => {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.8,
            base64: true,
        });
        if (!result.canceled && result.assets && result.assets[0]) {
            const asset = result.assets[0];
            if (asset.base64) {
                // Direct base64 upload - zero file system access needed
                handleBase64Upload(asset.base64, `photo_${Date.now()}.jpg`, 'image', asset.mimeType || 'image/jpeg');
            } else {
                // Fallback to URI-based upload
                handleFileUpload(asset.uri, `photo_${Date.now()}.jpg`, 'image');
            }
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
            quality: 0.8,
            base64: true,
        });
        if (!result.canceled && result.assets && result.assets[0]) {
            const asset = result.assets[0];
            if (asset.base64) {
                handleBase64Upload(asset.base64, `camera_${Date.now()}.jpg`, 'image', asset.mimeType || 'image/jpeg');
            } else {
                handleFileUpload(asset.uri, `camera_${Date.now()}.jpg`, 'image');
            }
        }
    };

    const handleDocument = async () => {
        let result = await DocumentPicker.getDocumentAsync({
            type: '*/*',
            copyToCacheDirectory: true
        });
        if (result.canceled === false && result.assets && result.assets.length > 0) {
            handleFileUpload(result.assets[0].uri, result.assets[0].name || `doc_${Date.now()}`, 'document');
        }
    };

    const handleVideo = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert("Permission needed", "Media library access is required to pick videos.");
            return;
        }
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Videos,
            allowsEditing: false, // Disabling editing allows reliable video picking on iOS & Android
            quality: 1,
        });
        if (!result.canceled && result.assets && result.assets[0]) {
            const asset = result.assets[0];
            handleFileUpload(asset.uri, asset.fileName || `video_${Date.now()}.mp4`, 'video');
        }
    };

    const handleLike = async (msgId: string) => {
        try {
            await updateDoc(doc(db, 'communications', msgId), {
                likes: increment(1)
            });
        } catch (error) {
            console.log(error);
        }
    };

    // Voice Recording
    const handleVoiceRecord = async () => {
        if (isRecording) {
            // Stop recording
            try {
                if (recordingTimer.current) {
                    clearInterval(recordingTimer.current);
                    recordingTimer.current = null;
                }
                await recorder.stop();
                await ExpoAudio.AudioModule.setAudioModeAsync({ allowsRecording: false });
                const uri = recorder.uri;
                setIsRecording(false);
                const duration = recordingDuration;
                setRecordingDuration(0);

                if (uri && duration >= 1) {
                    setIsUploading(true);
                    const voiceName = `voice_${Date.now()}.m4a`;
                    const result = await uploadToImageKitWithDetails(uri, voiceName);
                    if (result && result.url) {
                        await sendMessage("", [{ url: result.url, fileId: result.fileId, fileType: 'voice', name: voiceName, duration }]);
                    } else {
                        Alert.alert("Upload Failed", "Could not upload voice message.");
                    }
                    setIsUploading(false);
                } else if (duration < 1) {
                    Alert.alert("Too Short", "Hold the mic button longer to record.");
                }
            } catch (err) {
                console.error("Stop recording error:", err);
                setIsRecording(false);
                setRecordingDuration(0);
                if (recordingTimer.current) clearInterval(recordingTimer.current);
            }
        } else {
            // Start recording
            try {
                const { status } = await ExpoAudio.AudioModule.requestRecordingPermissionsAsync();
                if (status !== 'granted') {
                    Alert.alert("Permission Required", "Microphone permission is needed to record voice messages.");
                    return;
                }
                await ExpoAudio.AudioModule.setAudioModeAsync({
                    allowsRecording: true,
                    playsInSilentMode: true,
                });
                await recorder.record();
                setIsRecording(true);
                setRecordingDuration(0);
                setShowAttachments(false);
                setShowEmojis(false);

                recordingTimer.current = setInterval(() => {
                    setRecordingDuration(prev => prev + 1);
                }, 1000);
            } catch (err) {
                console.error("Start recording error:", err);
                Alert.alert("Error", "Could not start recording. Please try again.");
            }
        }
    };

    const cancelRecording = async () => {
        try {
            if (recordingTimer.current) {
                clearInterval(recordingTimer.current);
                recordingTimer.current = null;
            }
            await recorder.stop();
            await ExpoAudio.AudioModule.setAudioModeAsync({ allowsRecording: false });
        } catch (_) {}
        setIsRecording(false);
        setRecordingDuration(0);
    };

    // Voice Playback
    const handlePlayVoice = async (url: string) => {
        try {
            // If already playing this URL, toggle pause/play
            if (playingUrl === url && playbackSound) {
                if (playbackSound.playing) {
                    playbackSound.pause();
                    return;
                } else {
                    playbackSound.play();
                    return;
                }
            }

            // Stop and release any currently playing sound
            if (playbackSound) {
                playbackSound.release();
                setPlaybackSound(null);
                setPlayingUrl(null);
                setPlaybackProgress(0);
            }

            await ExpoAudio.AudioModule.setAudioModeAsync({
                allowsRecording: false,
                playsInSilentMode: true,
            });

            // Create modern player using createAudioPlayer
            const player = ExpoAudio.createAudioPlayer(url);
            
            // Add progress listener
            player.addListener('playbackStatusUpdate', (status) => {
                setPlaybackProgress((status.currentTime || 0) * 1000);
                setPlaybackDuration((status.duration || 0) * 1000);
                if (status.didJustFinish) {
                    setPlayingUrl(null);
                    setPlaybackProgress(0);
                    player.release();
                    setPlaybackSound(null);
                }
            });

            player.play();
            setPlaybackSound(player);
            setPlayingUrl(url);
        } catch (err) {
            console.error("Playback error:", err);
            Alert.alert("Playback Error", "Could not play voice message.");
        }
    };

    const formatDuration = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const openMediaLink = (url: string) => {
        if (!url) return;
        WebBrowser.openBrowserAsync(url).catch(() => {
            Linking.openURL(url).catch(console.error);
        });
    };

    const handleDownloadFile = async (url: string, fileName?: string) => {
        if (!url) return;
        try {
            setDownloadingUrl(url);

            const urlClean = url.split('?')[0];
            const fileExt = urlClean.split('.').pop() || 'file';
            const cleanName = fileName ? (fileName.includes('.') ? fileName : `${fileName}.${fileExt}`) : `file_${Date.now()}.${fileExt}`;
            const localUri = `${FileSystem.cacheDirectory}${cleanName}`;

            const downloadRes = await FileSystem.downloadAsync(url, localUri);
            const isMedia = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'mp4', 'mov', 'm4v'].includes(fileExt.toLowerCase());

            if (isMedia) {
                // For media files, save directly to gallery
                if (Platform.OS === 'android') {
                    // On Android 10+, MediaLibrary handles scoped storage automatically
                    // On Android <10, we need WRITE_EXTERNAL_STORAGE
                    const androidVersion = Platform.Version;
                    if (typeof androidVersion === 'number' && androidVersion < 29) {
                        const granted = await PermissionsAndroid.request(
                            PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
                            {
                                title: 'Storage Permission',
                                message: 'App needs storage permission to save files to your phone.',
                                buttonPositive: 'Allow',
                                buttonNegative: 'Cancel',
                            }
                        );
                        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
                            Alert.alert('Permission Denied', 'Storage permission is required to save files.');
                            setDownloadingUrl(null);
                            return;
                        }
                    }
                }

                try {
                    await MediaLibrary.saveToLibraryAsync(downloadRes.uri);
                    Alert.alert('Saved! 📥', 'File saved to your Gallery / Photos.');
                } catch (mediaErr) {
                    // Fallback: try createAssetAsync
                    try {
                        await MediaLibrary.createAssetAsync(downloadRes.uri);
                        Alert.alert('Saved! 📥', 'File saved to your Gallery / Photos.');
                    } catch (_) {
                        // Final fallback: use sharing
                        if (await Sharing.isAvailableAsync()) {
                            await Sharing.shareAsync(downloadRes.uri);
                        } else {
                            Alert.alert('Downloaded ✅', 'File downloaded to app cache.');
                        }
                    }
                }
            } else {
                // For documents on Android, save to Downloads using SAF
                if (Platform.OS === 'android') {
                    try {
                        const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
                        if (permissions.granted) {
                            const mimeType = cleanName.endsWith('.pdf') ? 'application/pdf' 
                                : cleanName.endsWith('.doc') || cleanName.endsWith('.docx') ? 'application/msword'
                                : 'application/octet-stream';
                            const fileNameNoExt = cleanName.replace(/\.[^.]+$/, '');
                            const createdUri = await FileSystem.StorageAccessFramework.createFileAsync(
                                permissions.directoryUri,
                                fileNameNoExt,
                                mimeType
                            );
                            const fileContent = await FileSystem.readAsStringAsync(downloadRes.uri, {
                                encoding: FileSystem.EncodingType.Base64,
                            });
                            await FileSystem.StorageAccessFramework.writeAsStringAsync(createdUri, fileContent, {
                                encoding: FileSystem.EncodingType.Base64,
                            });
                            Alert.alert('Saved! 📥', 'Document saved to the selected folder.');
                        } else {
                            // User denied folder selection, fall back to share
                            if (await Sharing.isAvailableAsync()) {
                                await Sharing.shareAsync(downloadRes.uri);
                            }
                        }
                    } catch (safErr) {
                        // SAF failed, fallback to sharing
                        if (await Sharing.isAvailableAsync()) {
                            await Sharing.shareAsync(downloadRes.uri);
                        }
                    }
                } else {
                    // iOS - use share sheet for documents
                    if (await Sharing.isAvailableAsync()) {
                        await Sharing.shareAsync(downloadRes.uri);
                    } else {
                        Alert.alert('Downloaded ✅', 'File downloaded.');
                    }
                }
            }
        } catch (error: any) {
            console.error('Download Error:', error);
            openMediaLink(url);
        } finally {
            setDownloadingUrl(null);
        }
    };

    const renderAvatar = (avatarUrl?: string, authorName?: string) => {
        const displayName = (authorName || 'User').trim();
        const firstWord = displayName.split(' ')[0] || displayName;
        const initial = firstWord.charAt(0).toUpperCase() || 'U';

        return (
            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#2563EB', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                {/* Always show initial as base layer */}
                <Text style={{ color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 }}>
                    {initial}
                </Text>
                {/* Overlay the image on top if URL exists — if it fails to load, initial shows through */}
                {avatarUrl ? (
                    <Image 
                        source={{ uri: avatarUrl }} 
                        style={{ width: 36, height: 36, borderRadius: 18, position: 'absolute', top: 0, left: 0 }} 
                    />
                ) : null}
            </View>
        );
    };

    // Skeleton Loader Component
    if (isInitialLoading) {
        return (
            <View className="flex-1 px-4 pt-4 gap-4 animate-pulse">
                <View className="bg-gray-200 rounded-2xl h-16 w-3/4 self-start" />
                <View className="bg-gray-200 rounded-2xl h-20 w-3/4 self-end" />
                <View className="bg-gray-200 rounded-2xl h-16 w-2/3 self-start" />
                <View className="bg-gray-200 rounded-2xl h-24 w-4/5 self-end" />
            </View>
        );
    }

    const renderMessage = (msg: any) => {
        const isMe = userData && msg.authorId === userData.empId;
        const time = msg.createdAt ? new Date(msg.createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

        // Anonymization rules: Office Staff should see Field Staff as "Private User" and not click/chat
        const isCurrentUserOffice = userData?.staffType === 'Office Staff';
        const senderStaff = staffList.find(s => s.empId === msg.authorId);
        const isSenderFieldStaff = msg.authorType === 'Field Staff' || senderStaff?.staffType === 'Field Staff';
        const shouldAnonymize = !isMe && isCurrentUserOffice && isSenderFieldStaff;

        const displayAvatar = shouldAnonymize ? null : msg.avatar;
        const displayAuthor = shouldAnonymize ? 'Private User' : (msg.author || 'Staff');

        if (msg.type !== 'normal') {
            // Admin Announcements/Notices
            const isNotice = msg.type === 'notice' || msg.type === 'holiday';
            return (
                <View key={msg.id} className={`mb-4 p-4 rounded-xl border ${isNotice ? 'bg-[#FFFBEB] border-[#FDE68A]' : 'bg-[#FDF4FF] border-[#F5D0FE]'} shadow-sm`}>
                    <View className="flex-row items-center gap-2 mb-2">
                        <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: isNotice ? '#D97706' : '#9333EA', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                            <Megaphone size={14} color="#FFFFFF" />
                            {displayAvatar ? (
                                <Image source={{ uri: displayAvatar }} style={{ width: 28, height: 28, borderRadius: 14, position: 'absolute', top: 0, left: 0 }} />
                            ) : null}
                        </View>
                        <Text className={`font-bold text-[13px] uppercase ${isNotice ? 'text-[#D97706]' : 'text-[#9333EA]'}`}>
                            {msg.title || msg.type}
                        </Text>
                    </View>
                    <Text className="text-gray-800 text-[15px] mb-2">{msg.text}</Text>
                    
                    {msg.attachments?.map((att: any, i: number) => (
                        <View key={i} className="mt-2 mb-2">
                            {att.fileType === 'image' && (
                                <TouchableOpacity onPress={() => setSelectedImage(att.url)}>
                                    <Image source={{ uri: att.url }} style={{ width: '100%', height: 150, borderRadius: 8 }} resizeMode="cover" />
                                </TouchableOpacity>
                            )}
                            {att.fileType === 'video' && (
                                <TouchableOpacity 
                                    onPress={() => openMediaLink(att.url)}
                                    className="flex-row items-center gap-3 bg-[#0F172A] p-3.5 rounded-2xl border border-slate-700 w-full"
                                >
                                    <View className="w-10 h-10 rounded-full bg-blue-600/30 items-center justify-center border border-blue-500/40">
                                        <PlayCircle size={22} color="#60A5FA" />
                                    </View>
                                    <View className="flex-1">
                                        <Text className="text-xs font-bold text-white" numberOfLines={1}>{att.name || "Notice Video"}</Text>
                                        <Text className="text-[10px] text-blue-300 font-medium">Tap to Play Video 🎬</Text>
                                    </View>
                                </TouchableOpacity>
                            )}
                            {att.fileType === 'document' && (
                                <TouchableOpacity 
                                    onPress={() => openMediaLink(att.url)}
                                    className="flex-row items-center gap-2 bg-white/60 p-3 rounded-xl border border-amber-200"
                                >
                                    <FileText size={18} color="#D97706" />
                                    <Text className="text-xs text-gray-800 font-bold flex-1" numberOfLines={1}>{att.name || "Attachment Document"}</Text>
                                    <Download size={16} color="#4B5563" />
                                </TouchableOpacity>
                            )}
                        </View>
                    ))}

                    <View className="flex-row justify-between items-center mt-1">
                        <Text className="text-gray-500 text-xs font-medium">By {displayAuthor} • {time}</Text>
                    </View>
                </View>
            );
        }
        return (
            <View key={msg.id} className={`flex-row gap-2 mb-4 items-end ${isMe ? 'justify-end' : 'justify-start'}`}>
                {!isMe && (
                    <TouchableOpacity 
                        onPress={() => !shouldAnonymize && handleAvatarPress(msg)} 
                        activeOpacity={shouldAnonymize ? 1 : 0.7}
                        disabled={shouldAnonymize}
                    >
                        {renderAvatar(displayAvatar, displayAuthor)}
                    </TouchableOpacity>
                )}
                
                <View className={`flex-1 ${isMe ? 'items-end' : 'items-start'}`}>
                    {!isMe && <Text className="font-bold text-gray-900 text-xs mb-1 ml-1">{displayAuthor}</Text>}
                    
                    <View className={`${isMe ? 'bg-[#2563EB]' : 'bg-white border border-gray-200'} px-4 py-2.5 rounded-2xl ${isMe ? 'rounded-tr-xs' : 'rounded-tl-xs'} max-w-[85%]`}>
                        {msg.text ? (
                            <Text className={`${isMe ? 'text-white' : 'text-gray-800'} text-[15px] leading-relaxed`}>{msg.text}</Text>
                        ) : null}
                        
                        {msg.attachments?.map((att: any, i: number) => (
                            <View key={i} className="mt-1 mb-1">
                                {att.fileType === 'image' && (
                                    <View className="relative my-1">
                                        <TouchableOpacity onPress={() => setSelectedImage(att.url)}>
                                            <Image source={{ uri: att.url }} style={{ width: 200, height: 150, borderRadius: 10 }} resizeMode="cover" />
                                        </TouchableOpacity>
                                        <TouchableOpacity 
                                            onPress={() => handleDownloadFile(att.url, att.name || 'photo.jpg')}
                                            className="absolute top-2 right-2 bg-black/70 px-2.5 py-1 rounded-full flex-row items-center gap-1"
                                            activeOpacity={0.8}
                                        >
                                            {downloadingUrl === att.url ? (
                                                <ActivityIndicator size="small" color="#FFFFFF" />
                                            ) : (
                                                <>
                                                    <Download size={12} color="#FFFFFF" />
                                                    <Text className="text-white text-[10px] font-semibold">Save</Text>
                                                </>
                                            )}
                                        </TouchableOpacity>
                                    </View>
                                )}
                                {att.fileType === 'video' && (
                                    <View className="flex-row items-center gap-2 bg-[#0F172A] p-3 rounded-2xl border border-slate-700 w-56 my-1">
                                        <TouchableOpacity 
                                            onPress={() => openMediaLink(att.url)}
                                            className="flex-row items-center gap-2.5 flex-1"
                                        >
                                            <View className="w-9 h-9 rounded-full bg-blue-600/30 items-center justify-center border border-blue-500/40">
                                                <PlayCircle size={20} color="#60A5FA" />
                                            </View>
                                            <View className="flex-1">
                                                <Text className="text-xs font-bold text-white" numberOfLines={1}>{att.name || "Video Attachment"}</Text>
                                                <Text className="text-[10px] text-blue-300 font-medium">Tap to Play 🎬</Text>
                                            </View>
                                        </TouchableOpacity>
                                        <TouchableOpacity 
                                            onPress={() => handleDownloadFile(att.url, att.name || 'video.mp4')}
                                            className="w-8 h-8 rounded-full bg-slate-800 items-center justify-center border border-slate-600"
                                            activeOpacity={0.8}
                                        >
                                            {downloadingUrl === att.url ? (
                                                <ActivityIndicator size="small" color="#60A5FA" />
                                            ) : (
                                                <Download size={14} color="#60A5FA" />
                                            )}
                                        </TouchableOpacity>
                                    </View>
                                )}
                                {att.fileType === 'document' && (
                                    <View className="flex-row items-center gap-2 bg-gray-50 p-2.5 rounded-xl border border-gray-200 w-56 my-1">
                                        <TouchableOpacity 
                                            onPress={() => openMediaLink(att.url)}
                                            className="flex-row items-center gap-2 flex-1"
                                        >
                                            <FileText size={18} color="#2563EB" />
                                            <View className="flex-1">
                                                <Text className="text-xs text-gray-800 font-semibold" numberOfLines={1}>{att.name || "Document"}</Text>
                                                <Text className="text-[10px] text-gray-500 font-medium">PDF / File</Text>
                                            </View>
                                        </TouchableOpacity>
                                        <TouchableOpacity 
                                            onPress={() => handleDownloadFile(att.url, att.name || 'document.pdf')}
                                            className="w-8 h-8 rounded-full bg-blue-50 items-center justify-center border border-blue-100"
                                            activeOpacity={0.8}
                                        >
                                            {downloadingUrl === att.url ? (
                                                <ActivityIndicator size="small" color="#2563EB" />
                                            ) : (
                                                <Download size={14} color="#2563EB" />
                                            )}
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>
                        ))}
                        {msg.attachments?.filter((att: any) => att.fileType === 'voice').map((att: any, i: number) => (
                            <TouchableOpacity
                                key={`voice-${i}`}
                                onPress={() => handlePlayVoice(att.url)}
                                style={{
                                    flexDirection: 'row', alignItems: 'center', gap: 10,
                                    backgroundColor: isMe ? 'rgba(255,255,255,0.15)' : '#F0F4FF',
                                    paddingHorizontal: 12, paddingVertical: 10, borderRadius: 16,
                                    marginTop: 4, minWidth: 160,
                                }}
                            >
                                <View style={{
                                    width: 32, height: 32, borderRadius: 16,
                                    backgroundColor: isMe ? 'rgba(255,255,255,0.25)' : '#2563EB',
                                    alignItems: 'center', justifyContent: 'center'
                                }}>
                                    {playingUrl === att.url ? (
                                        <Pause size={14} color={isMe ? '#2563EB' : '#FFFFFF'} />
                                    ) : (
                                        <Play size={14} color={isMe ? '#2563EB' : '#FFFFFF'} style={{ marginLeft: 2 }} />
                                    )}
                                </View>
                                <View style={{ flex: 1 }}>
                                    <View style={{
                                        height: 4, backgroundColor: isMe ? 'rgba(255,255,255,0.3)' : '#D1D5DB',
                                        borderRadius: 2, overflow: 'hidden'
                                    }}>
                                        <View style={{
                                            height: 4, borderRadius: 2,
                                            backgroundColor: isMe ? '#FFFFFF' : '#2563EB',
                                            width: playingUrl === att.url && playbackDuration > 0
                                                ? `${Math.min((playbackProgress / playbackDuration) * 100, 100)}%`
                                                : '0%'
                                        }} />
                                    </View>
                                    <Text style={{
                                        fontSize: 10, marginTop: 3, fontWeight: '600',
                                        color: isMe ? 'rgba(255,255,255,0.7)' : '#6B7280'
                                    }}>
                                        🎙 {att.duration ? formatDuration(att.duration) : '0:00'}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>
                    
                    <View className="flex-row items-center gap-2 mt-1">
                        <Text className="text-gray-400 text-[10px]">{time}</Text>
                    </View>
                </View>

                {isMe && renderAvatar(userData?.avatar || msg.avatar, userData?.name || msg.author)}
            </View>
        );
    };

    const roomMessages = messages.filter(msg => {
        if (activeRoomId === 'group') {
            return msg.roomId === 'group' || !msg.roomId;
        } else {
            return msg.roomId === activeRoomId;
        }
    });

    if (activeRoomId === null) {
        const isCurrentUserOffice = userData?.staffType === 'Office Staff';
        const filteredStaff = staffList.filter(s => {
            // Filter out Field Staff if logged in user is Office Staff
            if (isCurrentUserOffice && s.staffType === 'Field Staff') {
                return false;
            }
            const queryLower = searchQuery.toLowerCase();
            return (s.name || '').toLowerCase().includes(queryLower) ||
                   (s.empId || '').toLowerCase().includes(queryLower);
        });

        const myBranchStaff = filteredStaff.filter(s => s.branchId && s.branchId === userData?.branchId)
            .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
            
        const otherBranchStaff = filteredStaff.filter(s => !s.branchId || s.branchId !== userData?.branchId)
            .sort((a, b) => (a.name || '').localeCompare(b.name || ''));

        const adminRoomId = `private_admin_${userData?.empId}`;
        const adminUnreadCount = getUnreadCount(adminRoomId);
        const teamUnreadCount = getUnreadCount('group');
        
        let totalUnread = adminUnreadCount + teamUnreadCount;
        customGroups.forEach(group => {
            totalUnread += getUnreadCount(`custom_group_${group.id}`);
        });
        filteredStaff.forEach(staff => {
            const roomId = 'private_' + [userData?.empId, staff.empId].sort().join('_');
            totalUnread += getUnreadCount(roomId);
        });

        return (
            <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
                <StatusBar backgroundColor="#FFFFFF" barStyle="dark-content" />
                <View className="px-5 py-4 border-b border-gray-100 bg-white flex-row justify-between items-center" style={{ paddingTop: Math.max(insets.top, 12) }}>
                    <View>
                        <View className="flex-row items-center gap-2">
                            <Text className="text-2xl font-black text-gray-900">Messages</Text>
                            {totalUnread > 0 && (
                                <View className="bg-red-500 rounded-full px-2 py-0.5 min-w-[20px] items-center justify-center">
                                    <Text className="text-white text-[11px] font-black">{totalUnread}</Text>
                                </View>
                            )}
                        </View>
                        <Text className="text-gray-400 text-[10px] font-bold mt-0.5">Select a staff member or group chat to message</Text>
                    </View>
                </View>

                {/* Search Bar */}
                <View className="px-4 py-3 bg-white border-b border-gray-100">
                    <View className="bg-gray-100 rounded-xl px-3 py-2 flex-row items-center gap-2">
                        <Search size={16} color="#9CA3AF" />
                        <TextInput 
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            placeholder="Search by Name or Employee ID..."
                            placeholderTextColor="#9CA3AF"
                            className="flex-1 text-black text-xs font-semibold py-1.5"
                        />
                        {searchQuery ? (
                            <TouchableOpacity onPress={() => setSearchQuery("")}>
                                <Text style={{ color: '#9CA3AF', fontSize: 12, fontWeight: 'bold' }}>Clear</Text>
                            </TouchableOpacity>
                        ) : null}
                    </View>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 85 }} className="px-4 pt-4">
                    {/* Pinned Group Chat */}
                    <View className="mb-6">
                        <Text className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Pinned</Text>
                        <TouchableOpacity
                            activeOpacity={0.8}
                            onPress={() => {
                                setActiveRoomId('group');
                                setActivePartner(null);
                            }}
                            className="flex-row items-center bg-blue-50 border border-blue-100 rounded-2xl p-4 gap-3 shadow-sm shadow-blue-900/5"
                        >
                            <View className="w-12 h-12 rounded-2xl bg-blue-600 items-center justify-center">
                                <Users color="white" size={24} />
                            </View>
                            <View className="flex-1">
                                <View className="flex-row justify-between items-center">
                                    <Text className="text-[#1E3A8A] font-extrabold text-base">Team Group Chat</Text>
                                    <View className="flex-row items-center gap-1">
                                        {teamUnreadCount > 0 && (
                                            <View className="bg-red-500 rounded-full px-1.5 py-0.5 min-w-[16px] items-center justify-center mr-1">
                                                <Text className="text-white text-[9px] font-black">{teamUnreadCount}</Text>
                                            </View>
                                        )}
                                        <View className="flex-row items-center gap-1 bg-blue-100/50 px-2 py-0.5 rounded-full">
                                            <Pin color="#2563EB" size={10} />
                                            <Text className="text-[8px] font-extrabold text-blue-600 uppercase">PINNED</Text>
                                        </View>
                                    </View>
                                </View>
                                <Text className="text-blue-700/80 text-xs mt-0.5" numberOfLines={1}>Broadcast and normal messages with all staff</Text>
                            </View>
                        </TouchableOpacity>

                        {/* Personal Admin Chat */}
                        <TouchableOpacity
                            activeOpacity={0.8}
                            onPress={() => {
                                const roomId = `private_admin_${userData?.empId}`;
                                setActiveRoomId(roomId);
                                setActivePartner({
                                    empId: 'admin',
                                    name: 'Admin',
                                    avatar: '',
                                    designation: 'Administrator',
                                    branchName: 'Headquarters'
                                });
                            }}
                            className="flex-row items-center bg-[#FDF4FF] border border-[#F5D0FE] rounded-2xl p-4 gap-3 shadow-sm shadow-purple-900/5 mt-3"
                        >
                            <View className="w-12 h-12 rounded-2xl bg-[#9333EA] items-center justify-center">
                                <Users color="white" size={24} />
                            </View>
                            <View className="flex-1">
                                <View className="flex-row justify-between items-center">
                                    <Text className="text-[#581C87] font-extrabold text-base">Chat with Admin</Text>
                                    <View className="flex-row items-center gap-1">
                                        {adminUnreadCount > 0 && (
                                            <View className="bg-red-500 rounded-full px-1.5 py-0.5 min-w-[16px] items-center justify-center mr-1">
                                                <Text className="text-white text-[9px] font-black">{adminUnreadCount}</Text>
                                            </View>
                                        )}
                                        <View className="flex-row items-center gap-1 bg-purple-100 px-2 py-0.5 rounded-full">
                                            <Lock color="#9333EA" size={10} />
                                            <Text className="text-[8px] font-extrabold text-purple-700 uppercase">Personal</Text>
                                        </View>
                                    </View>
                                </View>
                                <Text className="text-purple-700/80 text-xs mt-0.5" numberOfLines={1}>Direct 1-to-1 conversation with Administrator</Text>
                            </View>
                        </TouchableOpacity>
                    </View>

                    {/* Custom Groups Section */}
                    {customGroups.length > 0 && (
                        <View className="mb-6">
                            <Text className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider mb-2">
                                Custom Groups ({customGroups.length})
                            </Text>
                            <View className="bg-white rounded-2xl p-2 border border-indigo-50 shadow-sm">
                                {customGroups.map((group, idx) => {
                                    const lastMsg = messages.filter(m => m.roomId === `custom_group_${group.id}`).slice(-1)[0];
                                    return (
                                        <TouchableOpacity
                                            key={group.id}
                                            activeOpacity={0.7}
                                            onPress={() => {
                                                setActiveRoomId(`custom_group_${group.id}`);
                                                setActivePartner({
                                                    name: group.name,
                                                    members: group.members,
                                                    isCustomGroup: true
                                                });
                                            }}
                                            className={`flex-row items-center p-3 rounded-xl gap-3 ${idx < customGroups.length - 1 ? 'border-b border-gray-50' : ''}`}
                                        >
                                            <View className="w-11 h-11 rounded-2xl bg-indigo-600 items-center justify-center">
                                                <Users color="white" size={22} />
                                            </View>
                                            <View className="flex-1">
                                                <View className="flex-row justify-between items-center">
                                                    <Text className="text-gray-900 font-extrabold text-sm">{group.name}</Text>
                                                    <View className="flex-row items-center gap-2">
                                                        {getUnreadCount(`custom_group_${group.id}`) > 0 && (
                                                            <View className="bg-red-500 rounded-full px-1.5 py-0.5 min-w-[16px] items-center justify-center">
                                                                <Text className="text-white text-[9px] font-black">{getUnreadCount(`custom_group_${group.id}`)}</Text>
                                                            </View>
                                                        )}
                                                        <Text className="text-[9px] text-gray-400 font-bold">{group.members?.length || 0} members</Text>
                                                    </View>
                                                </View>
                                                <Text className="text-gray-500 text-[11px] mt-0.5" numberOfLines={1}>
                                                    {lastMsg?.text || (lastMsg?.attachments?.length ? '[Attachment]' : 'No messages yet')}
                                                </Text>
                                            </View>
                                            <ChevronRight size={18} color="#9CA3AF" />
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </View>
                    )}

                    {/* My Branch Staff */}
                    {myBranchStaff.length > 0 && (
                        <View className="mb-6">
                            <Text className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-2">
                                📍 My Branch Staff ({getBranchDisplayName(userData?.branchName, userData?.branchId) || 'Same Branch'})
                            </Text>
                            <View className="bg-white rounded-2xl p-2 border border-gray-100 shadow-sm">
                                {myBranchStaff.map((staff, idx) => (
                                    <TouchableOpacity
                                        key={staff.uid}
                                        activeOpacity={0.7}
                                        onPress={() => {
                                            const roomId = 'private_' + [userData.empId, staff.empId].sort().join('_');
                                            setActiveRoomId(roomId);
                                            setActivePartner(staff);
                                        }}
                                        className={`flex-row items-center p-3 rounded-xl gap-3 ${idx < myBranchStaff.length - 1 ? 'border-b border-gray-50' : ''}`}
                                    >
                                        <View className="w-11 h-11 rounded-full bg-emerald-50 border border-emerald-100 items-center justify-center">
                                            {staff.avatar ? (
                                                <Image source={{ uri: staff.avatar }} className="w-full h-full rounded-full" resizeMode="cover" />
                                            ) : (
                                                <Text className="text-emerald-600 font-bold text-lg uppercase">{staff.name?.charAt(0)}</Text>
                                            )}
                                        </View>
                                        <View className="flex-1">
                                            <Text className="text-gray-900 font-extrabold text-sm">{staff.name}</Text>
                                            <Text className="text-gray-500 text-[10px] mt-0.5">{staff.designation || staff.staffType || 'Staff'}</Text>
                                        </View>
                                        {getUnreadCount('private_' + [userData.empId, staff.empId].sort().join('_')) > 0 && (
                                            <View className="bg-red-500 rounded-full px-1.5 py-0.5 min-w-[16px] items-center justify-center mr-1">
                                                <Text className="text-white text-[9px] font-black">
                                                    {getUnreadCount('private_' + [userData.empId, staff.empId].sort().join('_'))}
                                                </Text>
                                            </View>
                                        )}
                                        <ChevronRight size={18} color="#9CA3AF" />
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    )}

                    {/* Other Branches Staff */}
                    {otherBranchStaff.length > 0 && (
                        <View className="mb-6">
                            <Text className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                                Other Branches Staff
                            </Text>
                            <View className="bg-white rounded-2xl p-2 border border-gray-100 shadow-sm">
                                {otherBranchStaff.map((staff, idx) => (
                                    <TouchableOpacity
                                        key={staff.uid}
                                        activeOpacity={0.7}
                                        onPress={() => {
                                            const roomId = 'private_' + [userData.empId, staff.empId].sort().join('_');
                                            setActiveRoomId(roomId);
                                            setActivePartner(staff);
                                        }}
                                        className={`flex-row items-center p-3 rounded-xl gap-3 ${idx < otherBranchStaff.length - 1 ? 'border-b border-gray-50' : ''}`}
                                    >
                                        <View className="w-11 h-11 rounded-full bg-blue-50 border border-blue-100 items-center justify-center">
                                            {staff.avatar ? (
                                                <Image source={{ uri: staff.avatar }} className="w-full h-full rounded-full" resizeMode="cover" />
                                            ) : (
                                                <Text className="text-blue-600 font-bold text-lg uppercase">{staff.name?.charAt(0)}</Text>
                                            )}
                                        </View>
                                        <View className="flex-1">
                                            <Text className="text-gray-900 font-extrabold text-sm">{staff.name}</Text>
                                            <Text className="text-gray-500 text-[10px] mt-0.5">
                                                {staff.designation || staff.staffType || 'Staff'} ({getBranchDisplayName(staff.branchName, staff.branchId)})
                                            </Text>
                                        </View>
                                        {getUnreadCount('private_' + [userData.empId, staff.empId].sort().join('_')) > 0 && (
                                            <View className="bg-red-500 rounded-full px-1.5 py-0.5 min-w-[16px] items-center justify-center mr-1">
                                                <Text className="text-white text-[9px] font-black">
                                                    {getUnreadCount('private_' + [userData.empId, staff.empId].sort().join('_'))}
                                                </Text>
                                            </View>
                                        )}
                                        <ChevronRight size={18} color="#9CA3AF" />
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    )}

                    {filteredStaff.length === 0 && (
                        <View className="bg-white rounded-2xl p-8 items-center border border-gray-100 shadow-sm">
                            <Text className="text-gray-400 font-medium text-xs">No staff members found.</Text>
                        </View>
                    )}
                </ScrollView>
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
            {/* Active Chat Header */}
            <View style={{ backgroundColor: '#003B95', paddingTop: Math.max(insets.top, 8) }}>
                <StatusBar backgroundColor="#003B95" barStyle="light-content" />
                <View className="flex-row items-center px-4 py-3 gap-3 border-b border-white/10">
                    <TouchableOpacity 
                        onPress={() => {
                            setActiveRoomId(null);
                            setActivePartner(null);
                        }} 
                        className="p-2 rounded-xl bg-white/10 flex-row items-center gap-1"
                    >
                        <ArrowLeft color="white" size={16} strokeWidth={2.5} />
                        <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>Back</Text>
                    </TouchableOpacity>
                    
                    <View className="w-10 h-10 rounded-full bg-white/10 items-center justify-center">
                        {activeRoomId === 'group' || activePartner?.isCustomGroup ? (
                            <Users color="white" size={20} />
                        ) : activePartner?.avatar ? (
                            <Image source={{ uri: activePartner.avatar }} className="w-full h-full rounded-full" resizeMode="cover" />
                        ) : (
                            <Text className="text-white font-bold text-base uppercase">{activePartner?.name?.charAt(0) || 'P'}</Text>
                        )}
                    </View>

                    <View className="flex-1">
                        <Text className="text-white font-black text-sm" numberOfLines={1}>
                            {activeRoomId === 'group' ? 'Team Group Chat' : activePartner?.name}
                        </Text>
                        <Text className="text-white/70 text-[9px] font-semibold mt-0.5" numberOfLines={1}>
                            {activeRoomId === 'group' 
                                ? 'Broadcast and team announcements' 
                                : activePartner?.isCustomGroup 
                                    ? `Custom Group • ${activePartner?.members?.length || 0} members`
                                    : `${activePartner?.designation || activePartner?.staffType || 'Staff'} • ${getBranchDisplayName(activePartner?.branchName, activePartner?.branchId)}`
                            }
                        </Text>
                    </View>
                </View>
            </View>

            <KeyboardAvoidingView 
                style={{ flex: 1 }}
                behavior="padding"
                keyboardVerticalOffset={Platform.OS === 'ios' ? 47 : 0}
            >
                {/* Chat Body */}
                <ScrollView
                    ref={scrollViewRef}
                    className="flex-1 px-4 pt-4"
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 20 }}
                    keyboardShouldPersistTaps="handled"
                    onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
                    onLayout={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
                >
                    {roomMessages.length === 0 ? (
                        <View className="flex-1 items-center justify-center mt-20">
                            <Text className="text-gray-400 font-medium text-sm">No communications yet.</Text>
                        </View>
                    ) : (() => {
                        let lastDateStr = '';
                        return roomMessages.map((msg, index) => {
                            let msgDate = new Date();
                            if (msg.createdAt) {
                                if (msg.createdAt.toMillis) {
                                    msgDate = msg.createdAt.toDate();
                                } else if (msg.createdAt.seconds) {
                                    msgDate = new Date(msg.createdAt.seconds * 1000);
                                } else {
                                    msgDate = new Date(msg.createdAt);
                                }
                            }
                            
                            const dateStr = msgDate.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                            const isNewDate = dateStr !== lastDateStr;
                            lastDateStr = dateStr;
                            
                            const today = new Date();
                            const yesterday = new Date();
                            yesterday.setDate(today.getDate() - 1);
                            
                            let displayDate = dateStr;
                            if (msgDate.toDateString() === today.toDateString()) {
                                displayDate = 'Today';
                            } else if (msgDate.toDateString() === yesterday.toDateString()) {
                                displayDate = 'Yesterday';
                            }

                            return (
                                <React.Fragment key={msg.id || index}>
                                    {isNewDate && (
                                        <View className="items-center my-3">
                                            <View className="bg-gray-200/50 px-3.5 py-1.5 rounded-full border border-gray-300/10 shadow-sm">
                                                <Text className="text-gray-500 text-[10px] font-extrabold uppercase tracking-widest">{displayDate}</Text>
                                            </View>
                                        </View>
                                    )}
                                    {renderMessage(msg)}
                                </React.Fragment>
                            );
                        });
                    })()}
                </ScrollView>

                {isUploading && (
                    <View className="bg-blue-50 py-2 items-center border-t border-blue-100">
                        <Text className="text-blue-600 text-xs font-medium">Uploading attachment...</Text>
                    </View>
                )}

                {/* Bottom Input Area */}
                <View style={{ backgroundColor: '#F8FAFC', borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingTop: 8, paddingHorizontal: 12, paddingBottom: (isKeyboardVisible && isInputFocused) ? 12 : 140 }}>
                    {/* Removed voice recording indicator */}
                    {/* Simple Emoji Picker */}
                    {showEmojis && (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-2 bg-white rounded-full py-2 px-3 border border-gray-100 shadow-sm max-h-12">
                            {COMMON_EMOJIS.map((emoji, index) => (
                                <TouchableOpacity
                                    key={index}
                                    onPress={() => setMessageText(prev => prev + emoji)}
                                    className="px-2 items-center justify-center"
                                >
                                    <Text className="text-2xl">{emoji}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    )}

                    {/* Main Input Row */}
                    <View className="flex-row items-end gap-2 mb-1">
                        <TouchableOpacity
                            onPress={() => {
                                setShowAttachments(!showAttachments);
                                setShowEmojis(false);
                            }}
                            className="w-10 h-10 bg-white border border-[#E0E7FF] rounded-full items-center justify-center mb-0.5"
                        >
                            <Plus color="#2563EB" size={24} strokeWidth={2.5} />
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
                                onFocus={() => {
                                  setIsInputFocused(true);
                                  setShowAttachments(false);
                                  setShowEmojis(false);
                                  setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
                                }}
                                onBlur={() => {
                                  setIsInputFocused(false);
                                }}
                            />
                            <TouchableOpacity
                                className="ml-2 mb-1.5"
                                onPress={() => {
                                    setShowEmojis(!showEmojis);
                                    setShowAttachments(false);
                                }}
                            >
                                <Smile color={showEmojis ? "#2563EB" : "#9CA3AF"} size={22} strokeWidth={2} />
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity 
                            onPress={handleSendText}
                            disabled={!messageText.trim()}
                            className={`w-11 h-11 rounded-full items-center justify-center mb-0.5 shadow-sm ${messageText.trim() ? 'bg-[#2563EB]' : 'bg-gray-300'}`}
                        >
                            <Send color="white" size={20} strokeWidth={2.5} className="ml-0.5" />
                        </TouchableOpacity>
                    </View>

                    {/* Expandable Attachment Menu */}
                    {showAttachments && (
                        <View className="flex-row justify-between items-center px-2 py-3 border-t border-gray-100 mt-2">
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
                                <VideoIcon color="#8B5CF6" size={22} strokeWidth={2} />
                                <Text className="text-gray-600 text-[10px] font-medium">Video</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
                
                {/* Full Image Preview Modal */}
                <Modal visible={!!selectedImage} transparent={true} animationType="fade" onRequestClose={() => setSelectedImage(null)}>
                    <TouchableOpacity 
                        activeOpacity={1} 
                        onPress={() => setSelectedImage(null)} 
                        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', justifyContent: 'center', alignItems: 'center', padding: 20 }}
                    >
                        <View style={{ position: 'absolute', top: 50, right: 20, zIndex: 10, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                            <TouchableOpacity 
                                onPress={() => selectedImage && handleDownloadFile(selectedImage, 'image.jpg')} 
                                style={{ backgroundColor: 'rgba(37,99,235,0.9)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 6 }}
                            >
                                {downloadingUrl === selectedImage ? (
                                    <ActivityIndicator size="small" color="white" />
                                ) : (
                                    <>
                                        <Download size={16} color="white" />
                                        <Text style={{ color: 'white', fontSize: 13, fontWeight: 'bold' }}>Save to Phone</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                            <TouchableOpacity 
                                onPress={() => setSelectedImage(null)} 
                                style={{ backgroundColor: 'rgba(255,255,255,0.25)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 }}
                            >
                                <Text style={{ color: 'white', fontSize: 13, fontWeight: 'bold' }}>Close</Text>
                            </TouchableOpacity>
                        </View>
                        {selectedImage && (
                            <Image 
                                source={{ uri: selectedImage }} 
                                style={{ width: '100%', height: '80%' }} 
                                resizeMode="contain" 
                            />
                        )}
                    </TouchableOpacity>
                </Modal>
            </KeyboardAvoidingView>
        </View>
    );
}