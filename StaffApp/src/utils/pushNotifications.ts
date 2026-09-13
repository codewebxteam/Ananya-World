import Constants from 'expo-constants';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, setDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';

const isExpoGo = Constants.executionEnvironment === 'storeClient';
let Notifications: any = null;
if (!isExpoGo) {
  try {
    Notifications = require('expo-notifications');
  } catch (e) {
    console.log("Failed to load expo-notifications in pushNotifications.ts:", e);
  }
}

/**
 * Saves the Expo push token to Firestore across all relevant user documents
 */
export const savePushTokenToFirestore = async (pushToken: string, user: any) => {
  if (!pushToken || !user) return;
  const tokenPayload = { pushToken, tokenUpdatedAt: new Date().toISOString() };

  try {
    const promises: Promise<any>[] = [];

    if (user.id) {
      promises.push(setDoc(doc(db, 'users', user.id), tokenPayload, { merge: true }).catch(() => {}));
    }
    if (user.uid) {
      promises.push(setDoc(doc(db, 'users', user.uid), tokenPayload, { merge: true }).catch(() => {}));
    }
    if (user.empId) {
      promises.push(setDoc(doc(db, 'users', user.empId), tokenPayload, { merge: true }).catch(() => {}));
      promises.push(setDoc(doc(db, 'staff', user.empId), tokenPayload, { merge: true }).catch(() => {}));

      // Query users collection to find any document matching this empId
      promises.push((async () => {
        try {
          const qEmp = query(collection(db, 'users'), where('empId', '==', user.empId));
          const snap = await getDocs(qEmp);
          snap.forEach(d => {
            updateDoc(d.ref, tokenPayload).catch(() => {});
          });
        } catch {}
      })());
    }

    await Promise.all(promises);
    console.log('[Push] Successfully synced push token to Firestore for user:', user.empId || user.name);
  } catch (err) {
    console.warn('[Push] Error saving push token to Firestore:', err);
  }
};

/**
 * Registers device for push notifications, creates notification channel,
 * requests OS permissions, and retrieves the Expo Push Token.
 */
export const registerForPushNotificationsAsync = async (userParam?: any): Promise<string | null> => {
  if (!Notifications) {
    console.log('[Push] expo-notifications not available');
    return null;
  }

  try {
    // 1. Android Notification Channel configuration
    if (Platform.OS === 'android') {
      const channelConfig = {
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#003B95',
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        bypassDnd: true,
      };

      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default Notifications',
        ...channelConfig,
      });

      await Notifications.setNotificationChannelAsync('chat-messages', {
        name: 'Chat Messages',
        ...channelConfig,
      });
    }

    // 2. Permissions check and request
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status: reqStatus } = await Notifications.requestPermissionsAsync();
      finalStatus = reqStatus;
    }

    if (finalStatus !== 'granted') {
      console.log('[Push] Notification permission not granted. Status:', finalStatus);
      return null;
    }

    // 3. Obtain Expo Push Token
    const projectId = Constants.expoConfig?.extra?.eas?.projectId || 'f4f9c5f5-fbb0-4058-a9a9-659e6c04bf1e';
    const tokenRes = await Notifications.getExpoPushTokenAsync({ projectId });
    const pushToken = tokenRes.data;

    if (pushToken) {
      console.log('[Push] Expo Push Token obtained:', pushToken);
      await AsyncStorage.setItem('pushToken', pushToken);

      // 4. Determine user and persist to Firestore
      let targetUser = userParam;
      if (!targetUser) {
        const storedStr = await AsyncStorage.getItem('userData');
        if (storedStr) {
          try { targetUser = JSON.parse(storedStr); } catch {}
        }
      }

      if (targetUser) {
        await savePushTokenToFirestore(pushToken, targetUser);
      }
      return pushToken;
    }

    return null;
  } catch (err) {
    console.error('[Push] Failed to register for push notifications:', err);
    return null;
  }
};

/**
 * Sends a push notification via Expo Push API to a specific device token
 */
export const sendExpoPushNotification = async (pushToken: string, title: string, body: string, extraData: any = {}) => {
  if (!pushToken || typeof pushToken !== 'string') return;
  const cleanToken = pushToken.trim();
  if (!cleanToken.startsWith('ExponentPushToken') && !cleanToken.startsWith('ExpoPushToken')) {
    console.warn('[PushNotification] Invalid push token format:', cleanToken);
    return;
  }
  try {
    const message = {
      to: cleanToken,
      sound: 'default',
      title: title || 'Ananya World',
      body: body || 'New Message',
      data: extraData,
      priority: 'high',
      channelId: 'chat-messages',
      _displayInForeground: true,
    };

    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });
    const resData = await res.json();
    console.log('[PushNotification Result]:', resData);
  } catch (e) {
    console.error('Push notification error:', e);
  }
};
