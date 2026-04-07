import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, Vibration } from 'react-native';
import { isExpoGo } from '../utils/runtime';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';

export const SOUND_TYPES = {
  BELL: 'bell',
  ALARM: 'alarm',
  CHIME: 'chime',
  BEEP: 'beep',
  SIREN: 'siren',
  SONG: 'song',
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
  [SOUND_TYPES.SONG]: {
    name: 'Song (Music)',
    iosSound: 'default',
    androidId: 'song',
  },
};

let alarmSoundPlayer = null;

export const playAlarmSong = async () => {
  try {
    await stopAlarmSong();

    // Start continuous looping hardware vibration (works everywhere)
    Vibration.vibrate([0, 500, 200, 500, 200], true);

    const volumeStr = await AsyncStorage.getItem('alarmVolume');
    const volume = volumeStr ? parseFloat(volumeStr) : 1.0;

    // expo-audio native module in Expo Go doesn't match the JS version,
    // so only use audio playback in development/production builds.
    if (!isExpoGo) {
      await setAudioModeAsync({
        playsInSilentMode: true,
        shouldPlayInBackground: true,
        interruptionMode: 'doNotMix',
      });

      alarmSoundPlayer = createAudioPlayer('https://www.soundhelix.com/examples/mp3/SoundHelix-Song-14.mp3');
      alarmSoundPlayer.loop = true;
      alarmSoundPlayer.volume = volume;
      alarmSoundPlayer.play();
    }
  } catch (error) {
    console.error('Error playing alarm song:', error);
  }
};

export const stopAlarmSong = async () => {
  Vibration.cancel();

  const Notifications = getNotificationsModule();
  if (Notifications) {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (e) {
      console.error('Error cancelling notifications:', e);
    }
  }

  if (alarmSoundPlayer) {
    try {
      alarmSoundPlayer.pause();
      alarmSoundPlayer.release();
      alarmSoundPlayer = null;
    } catch (error) {
      console.error('Error stopping alarm song:', error);
    }
  }
};


const getNotificationsModule = () => {
  if (isExpoGo) {
    return null;
  }

  try {
    return require('expo-notifications');
  } catch (error) {
    console.error('Error loading notifications module:', error);
    return null;
  }
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
    if (soundType === SOUND_TYPES.SONG) {
      await playAlarmSong();
    }

    const Notifications = getNotificationsModule();
    if (!Notifications) {
      return false;
    }

    const soundConfig = SOUND_CONFIG[soundType] || SOUND_CONFIG[SOUND_TYPES.ALARM];
    const vibrationArray = getVibrationArray(vibrationPattern, customDuration);

    await Notifications.scheduleNotificationAsync({
      content: {
        title: title,
        body: body,
        data: { soundType: soundConfig.androidId },
        sound: 'default',
        categoryIdentifier: 'alarm',
        priority: Notifications.AndroidNotificationPriority.MAX,
        vibrate: vibrationArray,
        ios: {
          sound: true,
          badge: 1,
          vibrate: true,
          categoryIdentifier: 'alarm',
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
    return true;
  } catch (error) {
    console.error('Error sending notification:', error);
    return false;
  }
};

export const configureNotificationHandler = () => {
  const Notifications = getNotificationsModule();

  if (!Notifications) {
    return;
  }

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
};

// Setup notification channels for Android
export const setupNotificationChannels = async () => {
  if (Platform.OS === 'android') {
    try {
      const Notifications = getNotificationsModule();
      if (!Notifications) {
        return;
      }

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

      // Define notification category with "Stop" action
      await Notifications.setNotificationCategoryAsync('alarm', [
        {
          identifier: 'STOP_ALARM',
          buttonTitle: 'Stop Alarm',
          options: {
            opensAppToForeground: false,
          },
        },
      ]);

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
  configureNotificationHandler,
  sendAlarmNotification,
  setupNotificationChannels,
  playAlarmSong,
  stopAlarmSong,
};
