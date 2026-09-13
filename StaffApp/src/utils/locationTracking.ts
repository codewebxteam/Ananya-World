import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Alert, Linking, Platform } from 'react-native';

export const LOCATION_TASK_NAME = 'background-location-task';

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

            await setDoc(attRef, {
              staffId: userData.empId,
              name: userData.name,
              dept: userData.staffType || userData.department || 'General',
              avatar: userData.avatar || null,
              date: todayStr,
              currentLatitude: lat,
              currentLongitude: lng,
              currentLocation: currentAddr,
              lastLocationUpdate: new Date().toISOString()
            }, { merge: true });
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
 * Requests necessary location permissions (foreground and background).
 * Guides the user to Android Settings to enable "Allow all the time"
 * if background permission is not yet granted.
 */
export const requestDutyLocationPermissions = async (promptSettings: boolean = true): Promise<boolean> => {
  try {
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
          "Duty aur attendance tracking ke liye Location permission zaroori hai. Kripya Settings mein jakar permission allow karein.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Open Settings", onPress: () => Linking.openSettings() }
          ]
        );
      }
      return false;
    }

    // 2. Background Permission Check (for Android)
    if (Platform.OS === 'android') {
      let { status: bgStatus } = await Location.getBackgroundPermissionsAsync();
      if (bgStatus !== 'granted') {
        // System dialog on Android 11+ prompts user to choose "Allow in Settings"
        const bgReq = await Location.requestBackgroundPermissionsAsync();
        bgStatus = bgReq.status;

        if (bgStatus !== 'granted') {
          if (promptSettings) {
            Alert.alert(
              "Background Location Required",
              "Duty tracking aur continuous background updates ke liye Location permission ko 'Allow all the time' (Hamesha allow) par set karein.",
              [
                { text: "Later", style: "cancel" },
                { text: "Open Settings", onPress: () => Linking.openSettings() }
              ]
            );
          }
          return false;
        }
      }
    }

    return true;
  } catch (err) {
    console.error('[LocationTracking] Permission request error:', err);
    return false;
  }
};

/**
 * Starts continuous duty location tracking as an Android Foreground Service.
 * This displays the persistent status bar notification on top and
 * continuously delivers background location updates to Firebase.
 */
export const startDutyLocationTracking = async (promptSettings: boolean = true): Promise<boolean> => {
  try {
    // Check if tracking is already running
    const hasStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
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
      distanceInterval: 10,
      deferredUpdatesInterval: 15000,
      deferredUpdatesDistance: 10,
      showsBackgroundLocationIndicator: true,
      pausesUpdatesAutomatically: false,
      activityType: Location.ActivityType.Other,
      foregroundService: {
        notificationTitle: "Ananya World",
        notificationBody: "Ananya World",
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
 */
export const stopDutyLocationTracking = async (): Promise<void> => {
  try {
    const hasStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
    if (hasStarted) {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
      console.log('[LocationTracking] Location updates stopped successfully');
    }
  } catch (err) {
    console.error('[LocationTracking] Failed to stop location updates:', err);
  }
};
