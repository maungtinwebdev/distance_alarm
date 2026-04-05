
import { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Alert, Platform, Linking, Animated, Dimensions, Modal } from 'react-native';
import MapView from '../components/MapComponent';
import * as Location from 'expo-location';

import { useKeepAwake } from 'expo-keep-awake';
import { TextInput, Button, Text, Appbar, Surface, useTheme, Chip, Divider, IconButton } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getDistance } from '../utils/location';
import { LOCATION_TASK_NAME } from '../services/LocationTask';
import { configureNotificationHandler, getAvailableSounds, getSoundPreference, setSoundPreference, setupNotificationChannels, getAvailableVibrations, getVibrationPreference, setVibrationPreference, getCustomVibrationDuration, setCustomVibrationDuration as saveCustomVibrationDuration, playAlarmSong, stopAlarmSong, SOUND_TYPES } from '../services/SoundService';
import { isExpoGo } from '../utils/runtime';

const HomeScreen = ({ onThemeChange, isDarkMode: initialDarkMode }) => {
  useKeepAwake();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const mapRef = useRef(null);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const arrivalHandledRef = useRef(false);
  const foregroundSubRef = useRef(null);
  const destinationRef = useRef(null);
  const alarmRadiusRef = useRef('500');
  const selectedSoundRef = useRef('alarm');
  const supportsBackgroundTracking = Platform.OS !== 'web' && !isExpoGo;

  const [location, setLocation] = useState(null);
  const [destination, setDestination] = useState(null);
  const [alarmRadius, setAlarmRadius] = useState('500');
  const [isTracking, setIsTracking] = useState(false);
  const [distanceToDest, setDistanceToDest] = useState(null);
  const [foregroundSub, setForegroundSub] = useState(null);
  const [radiusPreset, setRadiusPreset] = useState('500');
  const [isLoading, setIsLoading] = useState(false);
  const [locationUpdates, setLocationUpdates] = useState(0);
  const [selectedSound, setSelectedSound] = useState('alarm');
  const [availableSounds, setAvailableSounds] = useState([]);
  const [selectedVibration, setSelectedVibration] = useState('MEDIUM');
  const [availableVibrations, setAvailableVibrations] = useState([]);
  const [customVibrationDuration, setCustomVibrationDuration] = useState('500');
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(Dimensions.get('window').height)).current;
  const [isDarkMode, setIsDarkMode] = useState(initialDarkMode || false);

  useEffect(() => {
    (async () => {
      if (!isExpoGo) {
        configureNotificationHandler();
        await setupNotificationChannels();
      }

      let { status: locationStatus } = await Location.requestForegroundPermissionsAsync();
      if (locationStatus !== 'granted') {
        Alert.alert('Permission to access location was denied');
        return;
      }

      if (supportsBackgroundTracking) {
        let { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
        if (bgStatus !== 'granted') {
          Alert.alert(
            'Background Location Required',
            'This app needs background location access to trigger the alarm when the app is closed. Please select "Allow all the time" in settings.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Open Settings', onPress: () => Linking.openSettings() }
            ]
          );
        }
      }

      if (!isExpoGo) {
        const Notifications = require('expo-notifications');
        let { status: notificationStatus } = await Notifications.requestPermissionsAsync();
        if (notificationStatus !== 'granted') {
          Alert.alert('Permission to send notifications was denied');
        }
      } else {
        Alert.alert(
          'Expo Go Limitation',
          'Notifications and background location are not fully supported in Expo Go. The alarm will only work while the app stays open. Use a development build for full behavior.'
        );
      }

      let currentLocation = await Location.getCurrentPositionAsync({});
      setLocation(currentLocation.coords);

      // Load sound preference and available sounds
      const saved = await getSoundPreference();
      setSelectedSound(saved);
      const sounds = getAvailableSounds();
      setAvailableSounds(sounds);

      // Load vibration preference and available vibrations
      const savedVibration = await getVibrationPreference();
      setSelectedVibration(savedVibration);
      const vibrations = getAvailableVibrations();
      setAvailableVibrations(vibrations);

      // Load custom vibration duration
      const savedDuration = await getCustomVibrationDuration();
      setCustomVibrationDuration(savedDuration ? savedDuration.toString() : '500');

      // Load dark mode preference
      const savedMode = await AsyncStorage.getItem('darkMode');
      if (savedMode !== null) {
        setIsDarkMode(savedMode === 'true');
      }

      // Check if task is already running
      if (supportsBackgroundTracking) {
        const hasStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
        setIsTracking(hasStarted);

        if (hasStarted) {
          // Restore state if tracking
          const storedTarget = await AsyncStorage.getItem('targetLocation');
          const storedRadius = await AsyncStorage.getItem('alarmRadius');
          if (storedTarget) setDestination(JSON.parse(storedTarget));
          if (storedRadius) setAlarmRadius(storedRadius);
          startForegroundTracking();
        } else {
          // Check if alarm triggered in background and stopped tracking
          const isTrackingStored = await AsyncStorage.getItem('isTracking');
          const storedTarget = await AsyncStorage.getItem('targetLocation');
          if (isTrackingStored === 'false' && storedTarget) {
            setDestination(JSON.parse(storedTarget));
            Alert.alert(
              'Arrived!',
              'You have reached your destination!',
              [{ text: 'Stop Alarm', onPress: () => { stopTracking(); } }]
            );
          }
        }
      }
    })();

    // Listen for user tapping the background notification
    let notificationSub = null;
    if (!isExpoGo) {
      const Notifications = require('expo-notifications');
      notificationSub = Notifications.addNotificationResponseReceivedListener(response => {
        // User tapped the "Arrived" notification, stop the alarm and reset
        stopTracking();
      });
    }

    return () => {
      if (foregroundSub) foregroundSub.remove();
      if (notificationSub) notificationSub.remove();
    }
  }, []);

  // Keep refs in sync with state so location callback always has current values
  useEffect(() => { destinationRef.current = destination; }, [destination]);
  useEffect(() => { alarmRadiusRef.current = alarmRadius; }, [alarmRadius]);
  useEffect(() => { selectedSoundRef.current = selectedSound; }, [selectedSound]);

  // Effect to update distance calculation for UI when tracking
  useEffect(() => {
    if (location && destination) {
      const dist = getDistance(
        location.latitude,
        location.longitude,
        destination.latitude,
        destination.longitude
      );
      setDistanceToDest(dist);
    };
  }, [location, destination]);

  const startForegroundTracking = async () => {
    const sub = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 1000,
        distanceInterval: 5,
      },
      (newLocation) => {
        setLocation(newLocation.coords);
        setLocationUpdates(prev => prev + 1);

        // Use refs so the callback always reads the latest values
        const dest = destinationRef.current;
        if (!supportsBackgroundTracking && dest && !arrivalHandledRef.current) {
          const distance = getDistance(
            newLocation.coords.latitude,
            newLocation.coords.longitude,
            dest.latitude,
            dest.longitude
          );

          if (distance <= (parseFloat(alarmRadiusRef.current) || 0)) {
            arrivalHandledRef.current = true;
            if (selectedSoundRef.current === SOUND_TYPES.SONG) {
              playAlarmSong();
            }
            Alert.alert(
              'Arrived!',
              `You are within ${Math.round(distance)}m of your destination.`,
              [{ text: 'Stop Alarm', onPress: () => { stopTracking(); } }],
              { cancelable: false }
            );
          }
        }
      }
    );
    foregroundSubRef.current = sub;
    setForegroundSub(sub);
  };

  const handleSoundChange = async (soundType) => {
    setSelectedSound(soundType);
    await setSoundPreference(soundType);
  };

  const handleVibrationChange = async (vibrationPattern) => {
    setSelectedVibration(vibrationPattern);
    await setVibrationPreference(vibrationPattern);
  };

  const handleCustomVibrationChange = async (duration) => {
    setCustomVibrationDuration(duration);
    const numDuration = parseInt(duration) || 500;
    await saveCustomVibrationDuration(numDuration);
  };

  const openSettingsModal = () => {
    setSettingsModalVisible(true);
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const closeSettingsModal = () => {
    Animated.timing(slideAnim, {
      toValue: Dimensions.get('window').height,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setSettingsModalVisible(false);
    });
  };

  const handleThemeToggle = async () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    await AsyncStorage.setItem('darkMode', newMode.toString());
    if (onThemeChange) {
      onThemeChange(newMode);
    }
  };

  const startTracking = async () => {
    if (!destination) {
      Alert.alert('Select Destination', 'Please tap on the map to select a destination');
      return;
    }

    const radius = parseFloat(alarmRadius);
    if (isNaN(radius) || radius <= 0) {
      Alert.alert('Invalid Radius', 'Please enter a radius greater than 0');
      return;
    }

    setIsLoading(true);
    try {
      arrivalHandledRef.current = false;

      // Save state for background task
      await AsyncStorage.setItem('targetLocation', JSON.stringify(destination));
      await AsyncStorage.setItem('alarmRadius', alarmRadius);
      await AsyncStorage.setItem('isTracking', 'true');

      // Save sound and vibration preferences
      await setSoundPreference(selectedSound);
      await setVibrationPreference(selectedVibration);
      if (selectedVibration === 'CUSTOM') {
        await saveCustomVibrationDuration(parseInt(customVibrationDuration) || 500);
      }

      // Start background task
      if (supportsBackgroundTracking) {
        await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 5000,
          distanceInterval: 10,
          showsBackgroundLocationIndicator: true,
          foregroundService: {
            notificationTitle: "Distance Alarm Active",
            notificationBody: "Tracking your location...",
            notificationColor: theme.colors.primary,
          },
        });
      }

      // Start foreground tracking for UI
      await startForegroundTracking();

      setIsTracking(true);

      // Animate button
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.05,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();

      Alert.alert(
        'Alarm Active',
        supportsBackgroundTracking
          ? 'You will be notified when you reach your destination.'
          : 'Foreground-only tracking started. Keep the app open in Expo Go to receive the arrival alert.'
      );
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to start tracking: ' + e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const stopTracking = async () => {
    // Immediately mark arrival as handled to prevent re-triggers
    arrivalHandledRef.current = true;
    // Clear destination ref so no callback can re-check
    destinationRef.current = null;

    try {
      // 1. Stop alarm sound & vibration FIRST
      await stopAlarmSong();

      // 2. Stop foreground location watcher BEFORE anything else
      // Use the ref to guarantee we have the current subscription
      if (foregroundSubRef.current) {
        foregroundSubRef.current.remove();
        foregroundSubRef.current = null;
        setForegroundSub(null);
      }

      // 3. Stop background location task
      if (supportsBackgroundTracking) {
        const hasStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
        if (hasStarted) {
          await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
        }
      }

      // 4. Clear all persisted alarm data
      await AsyncStorage.multiRemove([
        'isTracking',
        'targetLocation',
        'alarmRadius',
      ]);

      // 5. Cancel any remaining notifications
      if (!isExpoGo) {
        try {
          const Notifications = require('expo-notifications');
          await Notifications.dismissAllNotificationsAsync();
          await Notifications.cancelAllScheduledNotificationsAsync();
        } catch (e) {
          // Ignore notification errors
        }
      }

      // 6. Reset all UI state (do NOT reset arrivalHandledRef here)
      setIsTracking(false);
      setIsLoading(false);
      setDistanceToDest(null);
      setDestination(null);
      setLocationUpdates(0);
    } catch (e) {
      console.error('Error stopping tracking:', e);
    }
  };

  const handleMapPress = (e) => {
    if (!isTracking) {
      setDestination(e.nativeEvent.coordinate);
    }
  };

  return (
    <View style={styles.container}>
      <Appbar.Header elevated style={{ backgroundColor: theme.colors.surface }}>
        <Appbar.Content
          title="Distance Alarm"
          subtitle={isTracking ? "• Tracking Active" : ""}
        />
        <IconButton
          icon="cog"
          onPress={openSettingsModal}
          size={24}
        />
      </Appbar.Header>

      <View style={styles.mapContainer}>
        {location && (
          <MapView
            ref={mapRef}
            style={styles.map}
            initialRegion={{
              latitude: location.latitude,
              longitude: location.longitude,
              latitudeDelta: 0.0922,
              longitudeDelta: 0.0421,
            }}
            currentLocation={location}
            destination={destination}
            alarmRadius={parseFloat(alarmRadius) || 0}
            onPress={handleMapPress}
          />
        )}
      </View>

      <Surface style={[styles.controlsPanel, { paddingBottom: Math.max(16, insets.bottom) }]} elevation={8}>
        {/* Status Card */}
        {isTracking && distanceToDest !== null && (
          <Surface style={[styles.statusCard, { backgroundColor: theme.colors.primaryContainer }]} elevation={2}>
            <View style={styles.statusContent}>
              <Text variant="labelSmall" style={{ color: theme.colors.primary }}>DISTANCE TO DESTINATION</Text>
              <View style={styles.distanceRow}>
                <Text variant="displaySmall" style={{ color: theme.colors.primary, fontWeight: 'bold' }}>
                  {Math.round(distanceToDest)}
                </Text>
                <Text variant="headlineSmall" style={{ color: theme.colors.primary, marginLeft: 8, marginTop: 4 }}>m</Text>
              </View>
              {distanceToDest <= parseFloat(alarmRadius) && (
                <Chip
                  icon="check-circle"
                  style={{ backgroundColor: '#4CAF50', marginTop: 8 }}
                  textStyle={{ color: '#fff' }}
                >
                  Within Alarm Zone
                </Chip>
              )}
            </View>
          </Surface>
        )}

        {!isTracking && destination && (
          <Surface style={[styles.statusCard, { backgroundColor: theme.colors.inverseOnSurface }]} elevation={2}>
            <View style={styles.statusContent}>
              <Text variant="labelSmall">SELECTED DESTINATION</Text>
              <Text variant="bodyMedium" style={{ marginTop: 8 }}>
                {destination.latitude.toFixed(4)}°, {destination.longitude.toFixed(4)}°
              </Text>
            </View>
          </Surface>
        )}

        {/* Radius Preset Buttons */}
        <View style={styles.presetSection}>
          <Text variant="labelMedium" style={{ marginBottom: 8, color: theme.colors.onSurfaceVariant }}>
            Quick Presets
          </Text>
          <View style={styles.presetButtons}>
            {['100', '500', '1000', '5000'].map((preset) => (
              <Button
                key={preset}
                mode={radiusPreset === preset ? 'contained' : 'outlined'}
                compact
                onPress={() => {
                  setRadiusPreset(preset);
                  setAlarmRadius(preset);
                }}
                style={styles.presetButton}
              >
                {preset}m
              </Button>
            ))}
          </View>
        </View>

        {/* Custom Radius Input */}
        <TextInput
          mode="outlined"
          label="Custom Radius (meters)"
          value={alarmRadius}
          onChangeText={(text) => {
            setAlarmRadius(text);
            setRadiusPreset('');
          }}
          keyboardType="numeric"
          style={styles.input}
          disabled={isTracking}
          left={<TextInput.Icon icon="ruler" />}
        />

        {/* Main Action Button */}
        <Button
          mode="contained"
          onPress={isTracking ? stopTracking : startTracking}
          style={[styles.mainButton, { marginTop: 16 }]}
          buttonColor={isTracking ? theme.colors.error : theme.colors.primary}
          loading={isLoading}
          disabled={isLoading || !location}
          labelStyle={{ fontSize: 16, fontWeight: 'bold' }}
        >
          {isLoading ? 'Processing...' : isTracking ? '● Stop Tracking' : '◆ Start Alarm'}
        </Button>

        {isTracking && (
          <View style={styles.infoFooter}>
            <Text variant="labelSmall" style={{ color: theme.colors.outline, textAlign: 'center' }}>
              GPS updates: {locationUpdates}
            </Text>
          </View>
        )}
      </Surface>

      {/* Settings Modal */}
      <Modal
        visible={settingsModalVisible}
        transparent={true}
        animationType="none"
        onRequestClose={closeSettingsModal}
      >
        <View style={styles.modalOverlay}>
          <Animated.View
            style={[
              styles.modalContent,
              {
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <Surface style={styles.modalHeader} elevation={4}>
              <View style={styles.modalHeaderContent}>
                <Text variant="headlineSmall" style={{ fontWeight: 'bold' }}>
                  Alarm Settings
                </Text>
                <IconButton
                  icon="close"
                  onPress={closeSettingsModal}
                />
              </View>
            </Surface>

            <View style={styles.modalBody}>
              {/* Sound Selection */}
              <View style={styles.modalSection}>
                <Text variant="labelMedium" style={{ marginBottom: 12, color: theme.colors.onSurfaceVariant }}>
                  🔔 Alarm Sound
                </Text>
                <View style={styles.soundChips}>
                  {availableSounds.map((sound) => (
                    <Chip
                      key={sound.type}
                      selected={selectedSound === sound.type}
                      onPress={() => handleSoundChange(sound.type)}
                      style={[
                        styles.soundChip,
                        selectedSound === sound.type && { backgroundColor: theme.colors.primary }
                      ]}
                      textStyle={{
                        color: selectedSound === sound.type ? '#fff' : theme.colors.onSurface,
                        fontSize: 12,
                      }}
                    >
                      {sound.name}
                    </Chip>
                  ))}
                </View>
              </View>

              <Divider style={{ marginVertical: 16 }} />

              {/* Vibration Selection */}
              <View style={styles.modalSection}>
                <Text variant="labelMedium" style={{ marginBottom: 12, color: theme.colors.onSurfaceVariant }}>
                  📳 Vibration Pattern
                </Text>
                <View style={styles.vibrationChips}>
                  {availableVibrations.map((vib) => (
                    <Chip
                      key={vib.type}
                      selected={selectedVibration === vib.type}
                      onPress={() => handleVibrationChange(vib.type)}
                      style={[
                        styles.vibrationChip,
                        selectedVibration === vib.type && { backgroundColor: theme.colors.primary }
                      ]}
                      textStyle={{
                        color: selectedVibration === vib.type ? '#fff' : theme.colors.onSurface,
                        fontSize: 12,
                      }}
                    >
                      {vib.name}
                    </Chip>
                  ))}
                </View>
              </View>

              {/* Custom Vibration Duration */}
              {selectedVibration === 'CUSTOM' && (
                <>
                  <Divider style={{ marginVertical: 16 }} />
                  <TextInput
                    mode="outlined"
                    label="Custom Duration (ms)"
                    value={customVibrationDuration}
                    onChangeText={handleCustomVibrationChange}
                    keyboardType="numeric"
                    style={styles.input}
                    left={<TextInput.Icon icon="timer" />}
                  />
                </>
              )}

              <Divider style={{ marginVertical: 16 }} />

              {/* Theme Mode Toggle */}
              <View style={styles.modalSection}>
                <View style={styles.themeToggleContainer}>
                  <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                    {isDarkMode ? '🌙 Dark Mode' : '☀️ Light Mode'}
                  </Text>
                  <IconButton
                    icon={isDarkMode ? "moon-waning-crescent" : "white-balance-sunny"}
                    iconColor={isDarkMode ? '#FFD700' : '#FFA500'}
                    size={28}
                    onPress={handleThemeToggle}
                  />
                </View>
              </View>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  mapContainer: {
    flex: 1,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  controlsPanel: {
    padding: 16,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  statusCard: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#dc3545',
  },
  statusContent: {
    paddingVertical: 8,
  },
  distanceRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 12,
  },
  soundSection: {
    marginBottom: 12,
  },
  soundChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  soundChip: {
    marginBottom: 8,
  },
  vibrationSection: {
    marginBottom: 12,
  },
  vibrationChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  vibrationChip: {
    marginBottom: 8,
  },
  presetSection: {
    marginBottom: 16,
  },
  presetButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  presetButton: {
    flex: 1,
    borderRadius: 8,
  },
  input: {
    backgroundColor: '#f9f9f9',
    marginBottom: 12,
    borderRadius: 8,
  },
  mainButton: {
    paddingVertical: 8,
    borderRadius: 12,
  },
  infoFooter: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },
  modalHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  modalHeaderContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalBody: {
    padding: 16,
  },
  modalSection: {
    marginBottom: 12,
  },
  themeToggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
  },
});

export default HomeScreen;
