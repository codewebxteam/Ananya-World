// app/_layout.tsx
import React from 'react';
import { View } from 'react-native';
import { Stack, usePathname, router } from 'expo-router';
import '../global.css';

// Shared Components
import Header from '../components/Header';
import BottomNav, { TabName } from '../components/BottomNav';

import { BackHandler, Alert, ToastAndroid, Platform } from 'react-native';
import { useEffect, useRef } from 'react';

import AsyncStorage from '@react-native-async-storage/async-storage';

export default function RootLayout() {
  const pathname = usePathname();
  const tabHistoryRef = useRef<string[]>(['/']);

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
      
      const mainTabs = ['/', '/attendance', '/salary', '/chat', '/account', '/account/'];
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
      {pathname !== '/login' && (
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
