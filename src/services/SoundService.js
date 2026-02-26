import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

export const SOUND_TYPES = {
  BELL: 'bell',
  ALARM: 'alarm',
  CHIME: 'chime',
  BEEP: 'beep',
  SIREN: 'siren',
};

// Sound configuration for each type
const SOUND_CONFIG = {
  [SOUND_TYPES.BELL]: {
    name: 'Bell Ring',
    iosSound: 'notification_bell.wav',
    androidId: 'bell',
  },
  [SOUND_TYPES.ALARM]: {
    name: 'Alarm Clock',
    iosSound: 'notification_alarm.wav',
    androidId: 'alarm',
  },
  [SOUND_TYPES.CHIME]: {
    name: 'Chime',
    iosSound: 'notification_chime.wav',
    androidId: 'chime',
  },
  [SOUND_TYPES.BEEP]: {
    name: 'Beep',
    iosSound: 'notification_beep.wav',
    androidId: 'beep',
  },
  [SOUND_TYPES.SIREN]: {
    name: 'Siren',
    iosSound: 'notification_siren.wav',
    androidId: 'siren',
  },
};

// Get stored sound preference
export const getSoundPreference = async () => {
  const stored = await AsyncStorage.getItem('alarmSound');
  return stored || SOUND_TYPES.ALARM;
};

// Save sound preference
export const setSoundPreference = async (soundType) => {
  await AsyncStorage.setItem('alarmSound', soundType);
};

// Get all available sounds
export const getAvailableSounds = () => {
  return Object.entries(SOUND_CONFIG).map(([key, config]) => ({
    type: key,
    name: config.name,
  }));
};

// Send alarm notification with custom sound
export const sendAlarmNotification = async (title, body, soundType = SOUND_TYPES.ALARM) => {
  try {
    const config = SOUND_CONFIG[soundType];
    
    await Notifications.scheduleNotificationAsync({
      content: {
        title: title,
        body: body,
        sound: config.androidId,
        priority: Notifications.AndroidNotificationPriority.MAX,
        vibrate: [0, 500, 250, 500],
        // iOS specific
        ios: {
          sound: config.iosSound,
          badge: 1,
          launchImageName: 'LaunchScreen',
        },
        // Android specific
        android: {
          sound: config.androidId,
          channelId: 'alarm_channel',
          vibrate: true,
          priority: 'high',
          smallIcon: 'ic_launcher',
        },
      },
      trigger: null, // Send immediately
    });
  } catch (error) {
    console.error('Error sending notification:', error);
  }
};

// Setup notification channels for Android
export const setupNotificationChannels = async () => {
  if (Platform.OS === 'android') {
    try {
      // Create alarm channel with high priority
      await Notifications.setNotificationChannelAsync('alarm_channel', {
        name: 'Alarm Notifications',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 500, 250, 500],
        lightColor: '#FF00FF',
        sound: 'alarm',
        bypassDnd: true,
        enableVibrate: true,
        enableLights: true,
      });

      // Create default channel
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default Notifications',
        importance: Notifications.AndroidImportance.DEFAULT,
        enableVibrate: true,
      });
    } catch (error) {
      console.error('Error setting up notification channels:', error);
    }
  }
};

export default {
  SOUND_TYPES,
  getSoundPreference,
  setSoundPreference,
  getAvailableSounds,
  sendAlarmNotification,
  setupNotificationChannels,
};
