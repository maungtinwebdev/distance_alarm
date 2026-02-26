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

export const VIBRATION_PATTERNS = {
  LIGHT: { name: 'Light', pattern: [0, 200] },
  MEDIUM: { name: 'Medium', pattern: [0, 400, 200, 400] },
  HEAVY: { name: 'Heavy', pattern: [0, 600, 300, 600] },
  INTENSE: { name: 'Intense', pattern: [0, 500, 100, 500, 100, 500] },
  CUSTOM: { name: 'Custom', pattern: null },
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

// Get stored vibration preference
export const getVibrationPreference = async () => {
  const stored = await AsyncStorage.getItem('vibrationPattern');
  return stored || 'MEDIUM';
};

// Save vibration preference
export const setVibrationPreference = async (pattern) => {
  await AsyncStorage.setItem('vibrationPattern', pattern);
};

// Get custom vibration duration
export const getCustomVibrationDuration = async () => {
  const stored = await AsyncStorage.getItem('customVibrationDuration');
  return stored ? parseInt(stored) : 500;
};

// Save custom vibration duration
export const setCustomVibrationDuration = async (duration) => {
  await AsyncStorage.setItem('customVibrationDuration', duration.toString());
};

// Get vibration pattern array
export const getVibrationArray = (patternKey, customDuration = 500) => {
  if (patternKey === 'CUSTOM') {
    return [0, customDuration];
  }
  return VIBRATION_PATTERNS[patternKey]?.pattern || VIBRATION_PATTERNS.MEDIUM.pattern;
};

// Get all available sounds
export const getAvailableSounds = () => {
  return Object.entries(SOUND_CONFIG).map(([key, config]) => ({
    type: key,
    name: config.name,
  }));
};

// Get all vibration patterns
export const getAvailableVibrations = () => {
  return Object.entries(VIBRATION_PATTERNS).map(([key, config]) => ({
    type: key,
    name: config.name,
  }));
};

// Send alarm notification with custom sound and vibration
export const sendAlarmNotification = async (title, body, soundType = SOUND_TYPES.ALARM, vibrationPattern = 'MEDIUM', customDuration = 500) => {
  try {
    const config = SOUND_CONFIG[soundType];
    const vibrationArray = getVibrationArray(vibrationPattern, customDuration);
    
    await Notifications.scheduleNotificationAsync({
      content: {
        title: title,
        body: body,
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.MAX,
        vibrate: vibrationArray,
        android: {
          sound: 'default',
          channelId: 'alarm_channel',
          vibrate: vibrationArray,
          priority: 'high',
          smallIcon: 'ic_launcher',
        },
      },
      trigger: null,
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
  VIBRATION_PATTERNS,
  getSoundPreference,
  setSoundPreference,
  getVibrationPreference,
  setVibrationPreference,
  getCustomVibrationDuration,
  setCustomVibrationDuration,
  getAvailableSounds,
  getAvailableVibrations,
  getVibrationArray,
  sendAlarmNotification,
  setupNotificationChannels,
};
