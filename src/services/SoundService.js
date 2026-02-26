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
  LIGHT: { name: 'Light', pattern: [0, 150, 100, 150, 100, 150] },
  MEDIUM: { name: 'Medium', pattern: [0, 300, 150, 300, 150, 300, 150, 300] },
  HEAVY: { name: 'Heavy', pattern: [0, 500, 200, 500, 200, 500, 200, 500, 200, 500] },
  INTENSE: { name: 'Intense', pattern: [0, 400, 100, 400, 100, 400, 100, 400, 100, 400, 100, 400, 100, 400] },
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

// Get vibration pattern array - repeats pattern for longer duration
export const getVibrationArray = (patternKey, customDuration = 500) => {
  if (patternKey === 'CUSTOM') {
    return [0, customDuration];
  }
  
  const basePattern = VIBRATION_PATTERNS[patternKey]?.pattern || VIBRATION_PATTERNS.MEDIUM.pattern;
  
  if (!basePattern || basePattern.length === 0) {
    return [0, 300];
  }
  
  // For LIGHT patterns, repeat 2 times
  if (patternKey === 'LIGHT') {
    return [...basePattern, 100, ...basePattern];
  }
  
  // For other patterns, use as-is (they're already long)
  return basePattern;
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
        ios: {
          sound: true,
          badge: 1,
          vibrate: true,
        },
        android: {
          sound: 'default',
          channelId: 'alarm_channel',
          vibrate: vibrationArray,
          priority: 'high',
          smallIcon: 'ic_launcher',
          vibrationPattern: vibrationArray,
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
      // Create alarm channel with high priority and default vibration pattern
      await Notifications.setNotificationChannelAsync('alarm_channel', {
        name: 'Alarm Notifications',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 500, 200, 500, 200, 500],
        lightColor: '#FF00FF',
        sound: 'default',
        bypassDnd: true,
        enableVibrate: true,
        enableLights: true,
        showBadge: true,
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
