import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDistance } from '../utils/location';
import { sendAlarmNotification, getSoundPreference, getVibrationPreference, getCustomVibrationDuration } from './SoundService';
import { Platform } from 'react-native';
import { isExpoGo } from '../utils/runtime';

export const LOCATION_TASK_NAME = 'background-location-task';

const OVERPASS_API = 'https://overpass-api.de/api/interpreter';
const BUS_STOP_BG_NOTIFY_RADIUS = 150; // meters

// Simple in-memory cache for background task
let bgLastNotifiedStopId = null;

/**
 * Fetch nearby bus stops from Overpass API (lightweight version for background).
 */
const fetchNearbyStopsBackground = async (lat, lon) => {
  const query = `
    [out:json][timeout:10];
    (
      node["highway"="bus_stop"](around:1000,${lat},${lon});
      node["public_transport"="platform"]["bus"="yes"](around:1000,${lat},${lon});
    );
    out body;
  `;

  try {
    const response = await fetch(OVERPASS_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(query)}`,
    });

    if (!response.ok) return [];

    const data = await response.json();
    return (data.elements || [])
      .filter(el => el.tags && (el.tags.name || el.tags['name:en']))
      .map(el => ({
        id: el.id,
        name: el.tags.name || el.tags['name:en'] || 'Unknown Stop',
        lat: el.lat,
        lon: el.lon,
        distance: getDistance(lat, lon, el.lat, el.lon),
      }))
      .sort((a, b) => a.distance - b.distance);
  } catch (error) {
    console.error('BG bus stop fetch error:', error);
    return [];
  }
};

if (Platform.OS !== 'web' && !isExpoGo) {
  const TaskManager = require('expo-task-manager');
  const Location = require('expo-location');

  TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
    if (error) {
      console.error(error);
      return;
    }
    if (data) {
      const { locations } = data;
      const location = locations[0]; // Get the latest location

      if (location) {
        const lat = location.coords.latitude;
        const lon = location.coords.longitude;

        try {
          const isTracking = await AsyncStorage.getItem('isTracking');

          // --- Feature 1: Auto-detect bus stops (no user input needed) ---
          if (isTracking === 'true') {
            try {
              const stops = await fetchNearbyStopsBackground(lat, lon);
              if (stops.length > 0 && stops[0].distance <= BUS_STOP_BG_NOTIFY_RADIUS) {
                const nearest = stops[0];
                const next = stops[1] || null;

                // Only notify once per stop
                if (bgLastNotifiedStopId !== nearest.id) {
                  bgLastNotifiedStopId = nearest.id;

                  const soundType = await getSoundPreference();
                  const vibrationPattern = await getVibrationPreference();
                  const customDuration = await getCustomVibrationDuration();

                  await sendAlarmNotification(
                    'Bus Stop Nearby',
                    `- near the bus stop is ${nearest.name}\n- next bus stop is ${next ? next.name : 'N/A'}`,
                    soundType,
                    vibrationPattern,
                    customDuration
                  );
                }
              }
            } catch (busErr) {
              console.warn('BG bus stop detection error:', busErr);
            }
          }

          // --- Feature 2: Destination alarm (user-set bus stop or map tap) ---
          const storedTarget = await AsyncStorage.getItem('targetLocation');
          const storedRadius = await AsyncStorage.getItem('alarmRadius');

          if (isTracking === 'true' && storedTarget && storedRadius) {
            const target = JSON.parse(storedTarget);
            const radius = parseFloat(storedRadius);

            const distance = getDistance(lat, lon, target.latitude, target.longitude);

            console.log(`Current distance: ${distance}m, Target: ${radius}m`);

            if (distance <= radius) {
              // Get user's preferences
              const soundType = await getSoundPreference();
              const vibrationPattern = await getVibrationPreference();
              const customDuration = await getCustomVibrationDuration();

              // Trigger alarm with custom sound and vibration
              await sendAlarmNotification(
                "Arrived!",
                `You are within ${Math.round(distance)}m of your destination! Tap here to stop the alarm.`,
                soundType,
                vibrationPattern,
                customDuration
              );

              // Stop tracking to avoid spamming
              await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
              await AsyncStorage.setItem('isTracking', 'false');
              bgLastNotifiedStopId = null;
            }
          }
        } catch (err) {
          console.error('Error in background task:', err);
        }
      }
    }
  });
}
