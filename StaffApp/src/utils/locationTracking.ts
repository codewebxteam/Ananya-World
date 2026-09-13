import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, setDoc, updateDoc, collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Alert, Linking, Platform } from 'react-native';
import Constants from 'expo-constants';

export const LOCATION_TASK_NAME = 'background-location-task';

const isExpoGo = Constants.executionEnvironment === 'storeClient';
let Notifications: any = null;
if (!isExpoGo) {
  try {
    Notifications = require('expo-notifications');
    if (Platform.OS === 'android') {
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
  } catch (e) {
    console.log('[LocationTracking] expo-notifications load skipped:', e);
  }
}

// Define the background location task if not already defined
try {
  if (!TaskManager.isTaskDefined(LOCATION_TASK_NAME)) {
    TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
      if (error) {
        console.error("[LocationTask] Background Location Error:", error);
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
            
            const isField = (userData.staffType || userData.department || '').includes('Field');
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

            const nowIso = new Date().toISOString();
            const attPayload: any = {
              staffId: userData.empId,
              name: userData.name,
              dept: userData.staffType || userData.department || 'Field Staff',
              avatar: userData.avatar || null,
              date: todayStr,
              currentLatitude: lat,
              currentLongitude: lng,
              currentLocation: currentAddr,
              lastLocationUpdate: nowIso,
            };

            // Field staff is 24/7 continuous duty: ensure punchIn is active and punchOut is null
            if (isField) {
              attPayload.status = 'Present';
              attPayload.punchIn = nowIso;
              attPayload.punchOut = null;
            }

            await setDoc(attRef, attPayload, { merge: true });

            // Also mirror real-time coordinates to user profile for instant admin tracking
            const userLocPayload = {
              currentLatitude: lat,
              currentLongitude: lng,
              currentLocation: currentAddr,
              lastLocationUpdate: nowIso,
            };
            if (userData.uid) {
              await updateDoc(doc(db, 'users', userData.uid), userLocPayload).catch(() => {});
            }
            if (userData.empId) {
              await updateDoc(doc(db, 'users', userData.empId), userLocPayload).catch(() => {});
              await updateDoc(doc(db, 'staff', userData.empId), userLocPayload).catch(() => {});
            }

            // --- Real-time Background Chat Message Checker ---
            // Checks for new messages in Firestore while app is backgrounded with Foreground Service
            try {
              const qRecentMsgs = query(
                collection(db, 'communications'),
                orderBy('createdAt', 'desc'),
                limit(5)
              );
              const msgsSnap = await getDocs(qRecentMsgs);
              const notifiedRaw = await AsyncStorage.getItem('notified_chat_msg_ids');
              const notifiedMsgIds = new Set<string>(notifiedRaw ? JSON.parse(notifiedRaw) : []);
              const myEmpId = String(userData.empId || '');
              const myUid = String(userData.uid || userData.id || '');
              const nowTime = Date.now();

              for (const mDoc of msgsSnap.docs) {
                const mId = mDoc.id;
                if (notifiedMsgIds.has(mId)) continue;

                const mData = mDoc.data();
                // Skip if author is current user
                if (mData.authorId === myEmpId || mData.authorId === myUid) {
                  notifiedMsgIds.add(mId);
                  continue;
                }

                // Check message time (within last 120 seconds)
                let mTime = nowTime;
                if (mData.createdAt?.toMillis) mTime = mData.createdAt.toMillis();
                else if (mData.createdAt?.seconds) mTime = mData.createdAt.seconds * 1000;
                else if (typeof mData.createdAt === 'string') mTime = new Date(mData.createdAt).getTime();

                if (Math.abs(nowTime - mTime) > 120000) {
                  notifiedMsgIds.add(mId);
                  continue;
                }

                // Check recipient relevance (group, custom group, or direct chat)
                const isGroup = mData.roomId === 'group';
                const isCustomGroup = mData.isCustomGroup || mData.roomId?.startsWith('custom_group_');
                const isDirect = (myEmpId && mData.roomId?.includes(myEmpId)) || (myUid && mData.roomId?.includes(myUid));
                const inParts = Array.isArray(mData.participants) && (
                  mData.participants.includes(myEmpId) ||
                  mData.participants.includes(myUid) ||
                  mData.participants.includes('all')
                );

                if (isGroup || isCustomGroup || isDirect || inParts) {
                  notifiedMsgIds.add(mId);
                  if (Notifications) {
                    await Notifications.scheduleNotificationAsync({
                      content: {
                        title: mData.author ? `${mData.author}` : 'Ananya World',
                        body: mData.text || (mData.attachments?.length ? 'Sent an attachment 📎' : 'New message received'),
                        sound: 'default',
                        priority: 'high',
                        channelId: 'chat-messages',
                        data: { roomId: mData.roomId, type: 'chat' },
                      },
                      trigger: null,
                    }).catch(() => {});
                  }
                }
              }

              // Keep set trimmed to last 60 entries
              const trimmedIds = Array.from(notifiedMsgIds).slice(-60);
              await AsyncStorage.setItem('notified_chat_msg_ids', JSON.stringify(trimmedIds));
            } catch (bgMsgErr) {
              console.log('[LocationTask] Background chat check error:', bgMsgErr);
            }
          } catch (err) {
            console.log("[LocationTask] Failed to update background location:", err);
          }
        }
      }
    });
  }
} catch (taskDefErr) {
  console.log("[LocationTask] Task definition error:", taskDefErr);
}

/**
 * Requests necessary location & notification permissions.
 * As soon as foreground location is granted, returns true so Foreground Service
 * starts immediately and displays the persistent status bar notification on Android.
 * If background permission ("Allow all the time") is not granted, prompts user with Settings.
 */
export const requestDutyLocationPermissions = async (promptSettings: boolean = true): Promise<boolean> => {
  try {
    // 0. Notification Permission Check (Required on Android 13+ to display Foreground Service notification)
    if (Platform.OS === 'android' && Notifications) {
      try {
        const { status: notifStatus } = await Notifications.getPermissionsAsync();
        if (notifStatus !== 'granted') {
          await Notifications.requestPermissionsAsync();
        }
      } catch (e) {
        console.log('[LocationTracking] Notification permission check error:', e);
      }
    }

    // 1. Foreground Permission Check
    let { status: fgStatus } = await Location.getForegroundPermissionsAsync();
    if (fgStatus !== 'granted') {
      const fgReq = await Location.requestForegroundPermissionsAsync();
      fgStatus = fgReq.status;
    }

    if (fgStatus !== 'granted') {
      if (promptSettings) {
        Alert.alert(
          "Location Permission Required",
          "Live tracking aur attendance ke liye Location permission zaroori hai. Kripya Settings mein jakar permission allow karein.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Open Settings", onPress: () => Linking.openSettings() }
          ]
        );
      }
      return false;
    }

    // 2. Background Permission Check (for Android "Allow all the time")
    if (Platform.OS === 'android') {
      try {
        let { status: bgStatus } = await Location.getBackgroundPermissionsAsync();
        if (bgStatus !== 'granted') {
          const bgReq = await Location.requestBackgroundPermissionsAsync();
          bgStatus = bgReq.status;

          if (bgStatus !== 'granted' && promptSettings) {
            Alert.alert(
              "Background Location Required",
              "24/7 live tracking aur app background se kill na ho iske liye Settings mein jakar Location permission ko 'Allow all the time' (Hamesha allow) par set karein.",
              [
                { text: "Later", style: "cancel" },
                { text: "Open Settings", onPress: () => Linking.openSettings() }
              ]
            );
          }
        }
      } catch (bgErr) {
        console.log('[LocationTracking] Background location check error:', bgErr);
      }
    }

    // Return true once foreground is granted so Foreground Service can launch immediately!
    return true;
  } catch (err) {
    console.error('[LocationTracking] Permission request error:', err);
    return false;
  }
};

/**
 * Starts continuous duty location tracking as an Android Foreground Service.
 * Displays the persistent, un-dismissible status bar notification on top
 * and continuously delivers background location updates 24/7.
 */
export const startDutyLocationTracking = async (promptSettings: boolean = true): Promise<boolean> => {
  try {
    // Check if tracking is already running
    const hasStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME).catch(() => false);
    if (hasStarted) {
      console.log('[LocationTracking] Location updates already running');
      return true;
    }

    // Ensure permissions are granted
    const permitted = await requestDutyLocationPermissions(promptSettings);
    if (!permitted) {
      console.log('[LocationTracking] Permissions not granted yet');
      return false;
    }

    // Start location updates with foreground service (sticky notification)
    await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
      accuracy: Location.Accuracy.High,
      timeInterval: 15000,
      distanceInterval: 0,
      showsBackgroundLocationIndicator: true,
      pausesUpdatesAutomatically: false,
      activityType: Location.ActivityType.Other,
      foregroundService: {
        notificationTitle: "Ananya World",
        notificationBody: "Live Tracking Active",
        notificationColor: "#003B95",
        killServiceOnDestroy: false,
      },
    });

    console.log('[LocationTracking] Foreground service location updates started successfully');
    return true;
  } catch (err) {
    console.error('[LocationTracking] Failed to start duty location tracking:', err);
    return false;
  }
};

/**
 * Stops background location updates when duty ends or user punches out.
 * FIELD STAFF tracking CANNOT BE STOPPED unless forced (e.g. user logs out).
 */
export const stopDutyLocationTracking = async (force: boolean = false): Promise<void> => {
  try {
    if (!force) {
      const storedUser = await AsyncStorage.getItem('userData');
      if (storedUser) {
        const u = JSON.parse(storedUser);
        const isField = (u.staffType || u.department || '').includes('Field');
        if (isField) {
          console.log('[LocationTracking] Field Staff tracking cannot be stopped - 24/7 active');
          return;
        }
      }
    }

    const hasStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME).catch(() => false);
    if (hasStarted) {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
      console.log('[LocationTracking] Location updates stopped successfully');
    }
  } catch (err) {
    console.error('[LocationTracking] Failed to stop location updates:', err);
  }
};
