// app/_layout.tsx
import React from 'react';
import { View, Image, ActivityIndicator } from 'react-native';
import { Stack, usePathname, router } from 'expo-router';
import '../global.css';
import { configureReanimatedLogger, ReanimatedLogLevel } from 'react-native-reanimated';

// Disable Reanimated strict mode to hide annoying component render warnings
configureReanimatedLogger({
  level: ReanimatedLogLevel.warn,
  strict: false,
});

// Shared Components
import Header from '../components/Header';
import BottomNav, { TabName } from '../components/BottomNav';

import { BackHandler, Alert, ToastAndroid, Platform, Keyboard, AppState } from 'react-native';
import { useEffect, useRef, useState } from 'react';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Animated, Text } from 'react-native';
import { Briefcase } from 'lucide-react-native';

import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import Constants from 'expo-constants';
import { doc, updateDoc, setDoc, collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../config/firebase';
import { SafeAreaProvider } from 'react-native-safe-area-context';

const isExpoGo = Constants.executionEnvironment === 'storeClient';
let Notifications: any = null;
if (!isExpoGo) {
  try {
    Notifications = require('expo-notifications');
    Notifications?.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
  } catch (e) {
    console.log("Failed to load expo-notifications:", e);
  }
}

import { LOCATION_TASK_NAME, startDutyLocationTracking, stopDutyLocationTracking } from '../utils/locationTracking';
import { registerForPushNotificationsAsync } from '../utils/pushNotifications';
export { LOCATION_TASK_NAME, startDutyLocationTracking, stopDutyLocationTracking };

if (Platform.OS === 'android' && Notifications) {
  Notifications.setNotificationChannelAsync('chat-messages', {
    name: 'Chat Messages',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#003B95',
    sound: 'default',
    enableVibrate: true,
    showBadge: true,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    bypassDnd: true,
  }).catch(() => {});
}

function InnerLayout() {
  const pathname = usePathname();
  const tabHistoryRef = useRef<string[]>(['/']);
  const pathnameRef = useRef(pathname);
  const notifiedMsgIdsRef = useRef<Set<string>>(new Set());
  const currentUserRef = useRef<any>(null);

  // Keep pathnameRef in sync for non-reactive access inside listeners
  useEffect(() => { pathnameRef.current = pathname; }, [pathname]);

  const [isReady, setIsReady] = useState(false);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0.3)).current;

  // Blinking/pulsing animation for loader
  useEffect(() => {
    if (!isReady) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 900,
            useNativeDriver: true,
          }),
          Animated.timing(fadeAnim, {
            toValue: 0.3,
            duration: 900,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [isReady]);

  // Setup Android Notification Channel & register Push Token
  useEffect(() => {
    registerForPushNotificationsAsync();
  }, []);

  // Automatically start/resume foreground service location tracking for active duty (Field Staff or Punched In)
  useEffect(() => {
    async function resumeTrackingIfActive(prompt: boolean = true) {
      try {
        const storedUser = await AsyncStorage.getItem('userData');
        if (!storedUser) return;
        const user = JSON.parse(storedUser);
        if (user.status === 'Inactive' || user.status === 'Pending') return;

        const isField = (user.staffType || user.department || '').includes('Field');
        const today = new Date().toISOString().split('T')[0];
        const cachedIn = await AsyncStorage.getItem(`punchIn_${today}`);
        const cachedOut = await AsyncStorage.getItem(`punchOut_${today}`);

        if (isField || (cachedIn && !cachedOut)) {
          const hasStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME).catch(() => false);
          if (!hasStarted) {
            await startDutyLocationTracking(prompt);
          }
        }
      } catch (err) {
        console.log('[Layout] Failed to auto-resume duty location tracking:', err);
      }
    }
    resumeTrackingIfActive(true);

    // Listen for AppState changes (e.g. when user returns from Settings after granting 'Allow all the time')
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        resumeTrackingIfActive(false);
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // ===== GLOBAL CHAT NOTIFICATION LISTENER =====
  // Listens for new messages in Firestore and triggers local notifications
  // on ALL screens EXCEPT the chat screen (chat.tsx handles its own room-level logic)
  useEffect(() => {
    if (!Notifications) return;

    // Load current user data initially
    AsyncStorage.getItem('userData').then(data => {
      if (data) {
        try { currentUserRef.current = JSON.parse(data); } catch {}
      }
    });

    const q = query(
      collection(db, 'communications'),
      orderBy('createdAt', 'desc'),
      limit(20)
    );

    let isInitialLoad = true;

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      // Ensure currentUserRef is populated
      if (!currentUserRef.current) {
        try {
          const stored = await AsyncStorage.getItem('userData');
          if (stored) currentUserRef.current = JSON.parse(stored);
        } catch {}
      }

      const user = currentUserRef.current;
      if (!user) return;

      const myEmpId = String(user.empId || '');
      const myUid = String(user.uid || user.id || '');
      const now = Date.now();

      // On first load, only mark messages older than 25 seconds as already-seen.
      // Any freshly sent message will be processed and notified immediately!
      if (isInitialLoad) {
        snapshot.docs.forEach(d => {
          const dData = d.data();
          let mTime = 0;
          if (dData.createdAt?.toMillis) mTime = dData.createdAt.toMillis();
          else if (dData.createdAt?.seconds) mTime = dData.createdAt.seconds * 1000;
          else if (typeof dData.createdAt === 'string') mTime = new Date(dData.createdAt).getTime();

          if (!mTime || (now - mTime) > 25000) {
            notifiedMsgIdsRef.current.add(d.id);
          }
        });
        isInitialLoad = false;
      }

      snapshot.docChanges().forEach((change) => {
        if (change.type !== 'added') return;

        const msgId = change.doc.id;
        if (notifiedMsgIdsRef.current.has(msgId)) return;
        notifiedMsgIdsRef.current.add(msgId);

        // Skip if user is on the chat screen (chat.tsx handles its own notifications with room-level suppression)
        if (pathnameRef.current === '/chat') return;

        const data = change.doc.data();

        // Skip own messages
        if (data.authorId === myEmpId || data.authorId === myUid || data.author === user.name) return;

        // Check if message is recent (within 120 seconds)
        let msgTime = now;
        if (data.createdAt?.toMillis) {
          msgTime = data.createdAt.toMillis();
        } else if (data.createdAt?.seconds) {
          msgTime = data.createdAt.seconds * 1000;
        } else if (typeof data.createdAt === 'string') {
          msgTime = new Date(data.createdAt).getTime();
        }
        if (Math.abs(now - msgTime) > 120000) return;

        // Check if current user is a participant
        const isGroup = data.roomId === 'group' || !data.roomId;
        const isCustomGroup = data.isCustomGroup || data.roomId?.startsWith('custom_group_');
        const inRoomId = (myEmpId && data.roomId?.includes(myEmpId)) || (myUid && data.roomId?.includes(myUid));
        const inParticipants = Array.isArray(data.participants) && (
          data.participants.includes(myEmpId) ||
          data.participants.includes(myUid) ||
          data.participants.includes('all')
        );

        if (!isGroup && !isCustomGroup && !inRoomId && !inParticipants) return;

        // Fire local notification with sound and channel
        Notifications.scheduleNotificationAsync({
          content: {
            title: data.author ? `${data.author}` : 'Ananya World',
            body: data.text || (data.attachments?.length ? 'Sent an attachment 📎' : 'New message received'),
            sound: 'default',
            priority: 'high',
            channelId: 'chat-messages',
            data: { roomId: data.roomId, type: 'chat' },
          },
          trigger: null,
        }).catch((err: any) => console.log('[GlobalNotif] Schedule error:', err));
      });

      // Prevent memory leak - trim the set if it grows too large
      if (notifiedMsgIdsRef.current.size > 200) {
        const entries = Array.from(notifiedMsgIdsRef.current);
        notifiedMsgIdsRef.current = new Set(entries.slice(-100));
      }
    }, (error) => {
      console.log('[GlobalNotifListener] Snapshot error:', error);
    });

    return () => unsubscribe();
  }, []);

  // Keyboard visibility listener to hide BottomNav when typing
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e) => {
      const height = e?.endCoordinates?.height || 0;
      if (height > 0) {
        setIsKeyboardOpen(true);
      }
    });
    const hideSub = Keyboard.addListener(hideEvent, () => setIsKeyboardOpen(false));

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Handle Authentication Persistence
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const isLoggedIn = await AsyncStorage.getItem('isLoggedIn');
        const userDataStr = await AsyncStorage.getItem('userData');
        let status = 'Active';
        if (userDataStr) {
          try {
            const userData = JSON.parse(userDataStr);
            status = userData.status || 'Active';
          } catch (e) {}
        }

        const authPages = ['/login', '/register'];
        const isAuthPage = authPages.includes(pathname);

        if (isLoggedIn !== 'true' && !isAuthPage) {
          setTimeout(() => {
            router.replace('/login');
          }, 1);
        } else if (isLoggedIn === 'true') {
          if (status === 'Pending' && pathname !== '/pending') {
            setTimeout(() => {
              router.replace('/pending');
            }, 1);
          } else if (status === 'Inactive' && pathname !== '/inactive') {
            setTimeout(() => {
              router.replace('/inactive');
            }, 1);
          } else if (status !== 'Pending' && status !== 'Inactive' && (isAuthPage || pathname === '/pending' || pathname === '/inactive')) {
            setTimeout(() => {
              router.replace('/');
            }, 1);
          }
        }
      } catch (error) {
        console.error('Failed to load auth status', error);
      } finally {
        setIsReady(true);
      }
    };
    
    // Check when pathname changes (or on app load)
    checkAuth();
  }, [pathname]);

  // Handle hardware back press
  useEffect(() => {
    let backPressCount = 0;
    
    const onBackPress = () => {
      // If we are on auth, pending, or inactive screen, back should exit without asking
      if (['/login', '/register', '/pending', '/inactive'].includes(pathname)) {
        BackHandler.exitApp();
        return true;
      }
      
      const mainTabs = ['/', '/attendance', '/salary', '/chat', '/leaves', '/account', '/account/'];
      const isMainTab = mainTabs.includes(pathname);
      
      // If user is on a main tab, use custom tab history logic
      if (isMainTab) {
        // Sync history just in case
        if (tabHistoryRef.current[tabHistoryRef.current.length - 1] !== pathname) {
           let newHistory = tabHistoryRef.current.filter(p => p !== pathname);
           newHistory.push(pathname);
           tabHistoryRef.current = newHistory;
        }

        if (tabHistoryRef.current.length > 1) {
          // Go back to the previous tab in history
          tabHistoryRef.current.pop(); 
          const prevTab = tabHistoryRef.current[tabHistoryRef.current.length - 1];
          router.replace(prevTab as any);
          return true; // Prevent default native back
        } else {
          // At the root of tab history
          if (backPressCount === 0) {
            backPressCount = 1;
            if (Platform.OS === 'android') {
              ToastAndroid.show('Press back again to exit', ToastAndroid.SHORT);
            } else {
              Alert.alert('Exit App', 'Press back again to exit');
            }
            setTimeout(() => { backPressCount = 0; }, 2000);
            return true;
          } else {
            BackHandler.exitApp();
            return true;
          }
        }
      }
      
      // If we are NOT on a main tab (e.g. inside a nested screen)
      if (!router.canGoBack()) {
        if (backPressCount === 0) {
          backPressCount = 1;
          if (Platform.OS === 'android') {
            ToastAndroid.show('Press back again to exit', ToastAndroid.SHORT);
          } else {
            Alert.alert('Exit App', 'Press back again to exit');
          }
          setTimeout(() => { backPressCount = 0; }, 2000);
          return true;
        } else {
          BackHandler.exitApp();
          return true;
        }
      }
      
      return false; // Let default behavior happen (go back in stack natively)
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => {
      if (subscription && typeof subscription.remove === 'function') {
        subscription.remove();
      }
    };
  }, [pathname]);

  // Current active tab determine karo pathname se
  const getActiveTab = (): TabName => {
    if (pathname === '/attendance') return 'Attendance';
    if (pathname === '/salary') return 'Salary';
    if (pathname === '/chat') return 'Chat';
    if (pathname === '/leaves') return 'Leaves';
    if (pathname === '/account' || pathname.startsWith('/account/')) return 'Account';
    return 'Home';
  };

  const handleTabChange = (tab: TabName) => {
    const activeTab = getActiveTab();
    if (tab === activeTab) {
      if (tab === 'Account' && pathname !== '/account' && pathname !== '/account/') {
        // Go back to main account screen if we are in a sub-screen
        router.replace('/account');
      }
      return; 
    }

    let routeTo = '/';
    if (tab === 'Home') routeTo = '/';
    if (tab === 'Attendance') routeTo = '/attendance';
    if (tab === 'Salary') routeTo = '/salary';
    if (tab === 'Chat') routeTo = '/chat';
    if (tab === 'Leaves') routeTo = '/leaves';
    if (tab === 'Account') routeTo = '/account';

    // Update custom tab history (remove if exists to avoid repeats, then push to end)
    let newHistory = tabHistoryRef.current.filter(p => p !== routeTo);
    newHistory.push(routeTo);
    tabHistoryRef.current = newHistory;

    // Use replace for tabs so we don't build a massive back history natively
    router.replace(routeTo as any);
  };

  // Screens that have their own custom headers
  const hideGlobalHeader = pathname.startsWith('/account/') && pathname !== '/account/index' || ['/login', '/register', '/pending', '/chat', '/inactive'].includes(pathname);

  if (!isReady) {
    return (
      <View className="flex-1 bg-[#003B95] items-center justify-center relative overflow-hidden px-4">
        {/* Decorative Brand Accents */}
        <View className="absolute -right-16 -bottom-16 w-80 h-80 bg-[#FFD100] rounded-tl-full opacity-90" />
        <View className="absolute -left-10 top-12 w-44 h-44 bg-white/10 rounded-full" />

        <Animated.View style={{ opacity: fadeAnim, alignItems: 'center', width: '100%', zIndex: 10 }}>
          {/* Large Round White Circle Logo Area with reduced side white space */}
          <View className="bg-white rounded-full p-1 mb-5 items-center justify-center shadow-2xl overflow-hidden" style={{ width: 250, height: 250 }}>
            <Image 
              source={require('../../assets/images/DrLogo.png')} 
              style={{ width: '140%', height: '140%' }} 
              resizeMode="contain" 
            />
          </View>

          {/* Brand Name directly below Logo */}
          <Text className="text-3xl font-black text-white tracking-wider text-center">
            Ananya <Text className="text-[#FFD100]">World</Text>
          </Text>
          <Text className="text-white/70 text-xs font-bold tracking-widest uppercase mt-1">
            Staff Portal
          </Text>

          {/* Active Loading Feedback */}
          <View className="mt-8 items-center">
            <ActivityIndicator size="large" color="#FFD100" />
            <Text className="text-white/80 text-xs font-bold tracking-wide mt-2.5">
              Loading app...
            </Text>
          </View>
        </Animated.View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#F5F7FA]">
      {/* Fixed Header - Same on all screens except custom ones */}
      {!hideGlobalHeader && <Header />}

      {/* Screen Content */}
      <View 
        className="flex-1"
        style={{
          paddingBottom: (!['/login', '/register', '/pending', '/inactive'].includes(pathname) && !isKeyboardOpen) ? 75 : 0
        }}
      >
        <Stack screenOptions={{ headerShown: false, animation: 'none' }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="attendance" />
          <Stack.Screen name="salary" />
          <Stack.Screen name="chat" />
          <Stack.Screen name="leaves" />
          <Stack.Screen name="account/index" />
          <Stack.Screen name="account/profile" />
          <Stack.Screen name="account/job-details" />
          <Stack.Screen name="account/bank-details" />
          <Stack.Screen name="account/documents" />
          <Stack.Screen name="account/security" />
          <Stack.Screen name="account/support" />
          <Stack.Screen name="account/about" />
          <Stack.Screen name="login" />
          <Stack.Screen name="register" />
          <Stack.Screen name="pending" />
          <Stack.Screen name="inactive" />
        </Stack>
      </View>

      {/* Global Bottom Navigation */}
      {!['/login', '/register', '/pending', '/inactive'].includes(pathname) && !isKeyboardOpen && (
        <View className="absolute bottom-0 w-full bg-transparent">
          <BottomNav 
            activeTab={getActiveTab()} 
            onTabChange={handleTabChange} 
          />
        </View>
      )}
    </View>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <InnerLayout />
    </SafeAreaProvider>
  );
}
