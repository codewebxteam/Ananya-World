// app/_layout.tsx
import React from 'react';
import { View, Image, ActivityIndicator } from 'react-native';
import { Stack, usePathname, router } from 'expo-router';
import '../global.css';

// Shared Components
import Header from '../components/Header';
import BottomNav, { TabName } from '../components/BottomNav';

import { BackHandler, Alert, ToastAndroid, Platform, Keyboard } from 'react-native';
import { useEffect, useRef, useState } from 'react';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Animated, Text } from 'react-native';
import { Briefcase } from 'lucide-react-native';

import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

// Configure foreground notification behavior with sound enabled
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export const LOCATION_TASK_NAME = 'background-location-task';

TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error("Background Location Task Error:", error);
    return;
  }
  if (data) {
    const { locations } = data as { locations: Location.LocationObject[] };
    if (locations && locations.length > 0) {
      const location = locations[0];
      const lat = location.coords.latitude;
      const lng = location.coords.longitude;
      
      try {
        const storedUser = await AsyncStorage.getItem('userData');
        if (!storedUser) return;
        const userData = JSON.parse(storedUser);
        
        const todayStr = new Date().toISOString().split('T')[0];
        const attendanceId = `${userData.empId}_${todayStr}`;
        const attRef = doc(db, 'attendance', attendanceId);

        let currentAddr = 'Location Shared (BG)';
        try {
          const geocode = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
          if (geocode.length > 0) {
            const addr = geocode[0];
            currentAddr = [addr.name, addr.street, addr.city, addr.region].filter(Boolean).join(', ');
          }
        } catch {}

        await updateDoc(attRef, {
          currentLatitude: lat,
          currentLongitude: lng,
          currentLocation: currentAddr,
          lastLocationUpdate: new Date().toISOString()
        });
      } catch (err) {
        console.log("Failed to update background location:", err);
      }
    }
  }
});

function InnerLayout() {
  const pathname = usePathname();
  const tabHistoryRef = useRef<string[]>(['/']);

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

  // Setup Android Notification Channel with sound & vibration
  useEffect(() => {
    async function configureNotifications() {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Default Notifications',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#003B95',
          sound: 'default',
        });
      }
      try {
        const { status } = await Notifications.getPermissionsAsync();
        if (status !== 'granted') {
          await Notifications.requestPermissionsAsync();
        }
      } catch (e) {}
    }
    configureNotifications();
  }, []);

  // Keyboard visibility listener to hide BottomNav when typing
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, () => setIsKeyboardOpen(true));
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
          router.replace('/login');
        } else if (isLoggedIn === 'true') {
          if (status === 'Pending' && pathname !== '/pending') {
            router.replace('/pending');
          } else if (status === 'Inactive' && pathname !== '/inactive') {
            router.replace('/inactive');
          } else if (status !== 'Pending' && status !== 'Inactive' && (isAuthPage || pathname === '/pending' || pathname === '/inactive')) {
            router.replace('/');
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
      <View className="flex-1">
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
  return <InnerLayout />;
}
