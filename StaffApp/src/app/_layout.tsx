// app/_layout.tsx
import React from 'react';
import { View } from 'react-native';
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
        if (isLoggedIn !== 'true' && pathname !== '/login') {
          // If not logged in and not on login page, send to login
          router.replace('/login');
        } else if (isLoggedIn === 'true' && pathname === '/login') {
          // If logged in but on login page, send to home
          router.replace('/');
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
      // If we are on login screen, back should exit without asking
      if (pathname === '/login') {
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
  const hideGlobalHeader = pathname.startsWith('/account/') && pathname !== '/account/index' || pathname === '/login';

  if (!isReady) {
    return (
      <View className="flex-1 bg-[#003B95] items-center justify-center">
        <Animated.View style={{ opacity: fadeAnim, alignItems: 'center' }}>
          <View className="w-20 h-20 bg-white rounded-[24px] items-center justify-center shadow-lg mb-5">
            <Briefcase color="#003B95" size={40} strokeWidth={2} />
          </View>
          <Text className="text-3xl font-black text-white tracking-wide mb-1">
            Ananya World
          </Text>
          <Text className="text-[#FFD100] text-xs font-bold tracking-widest uppercase mt-1">
            Staff Portal Loading...
          </Text>
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
        </Stack>
      </View>

      {/* Global Bottom Navigation */}
      {pathname !== '/login' && !isKeyboardOpen && (
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
