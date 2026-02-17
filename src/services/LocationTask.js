
import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDistance } from '../utils/location';

import { Platform } from 'react-native';

export const LOCATION_TASK_NAME = 'background-location-task';

if (Platform.OS !== 'web') {
  TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error(error);
    return;
  }
  if (data) {
    const { locations } = data;
    const location = locations[0]; // Get the latest location

    if (location) {
      try {
        const storedTarget = await AsyncStorage.getItem('targetLocation');
        const storedRadius = await AsyncStorage.getItem('alarmRadius');
        const isTracking = await AsyncStorage.getItem('isTracking');

        if (isTracking === 'true' && storedTarget && storedRadius) {
          const target = JSON.parse(storedTarget);
          const radius = parseFloat(storedRadius);

          const distance = getDistance(
            location.coords.latitude,
            location.coords.longitude,
            target.latitude,
            target.longitude
          );

          console.log(`Current distance: ${distance}m, Target: ${radius}m`);

          if (distance <= radius) {
            // Trigger alarm
            await Notifications.scheduleNotificationAsync({
              content: {
                title: "Arrived!",
                body: `You are within ${Math.round(distance)}m of your destination!`,
                sound: true,
                priority: Notifications.AndroidNotificationPriority.HIGH,
              },
              trigger: null,
            });

            // Stop tracking to avoid spamming
            await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
            await AsyncStorage.setItem('isTracking', 'false');
          }
        }
      } catch (err) {
        console.error('Error in background task:', err);
      }
    }
  }
});
}
