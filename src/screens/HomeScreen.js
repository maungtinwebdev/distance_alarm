
import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Alert, Platform, KeyboardAvoidingView, Linking, Animated, Dimensions } from 'react-native';
import MapView, { Marker, Circle, PROVIDER_DEFAULT } from '../components/MapComponent';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { useKeepAwake } from 'expo-keep-awake';
import { TextInput, Button, Text, Appbar, Surface, useTheme, FAB, Chip, SegmentedButtons, ActivityIndicator, Menu, Divider } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getDistance } from '../utils/location';
import { LOCATION_TASK_NAME } from '../services/LocationTask';
import { getAvailableSounds, getSoundPreference, setSoundPreference, setupNotificationChannels } from '../services/SoundService';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const HomeScreen = () => {
  useKeepAwake();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const mapRef = useRef(null);
  const scaleAnim = useRef(new Animated.Value(1)).current;

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
  const [soundMenuVisible, setSoundMenuVisible] = useState(false);

  useEffect(() => {
    (async () => {
      // Setup notification channels
      await setupNotificationChannels();

      let { status: locationStatus } = await Location.requestForegroundPermissionsAsync();
      if (locationStatus !== 'granted') {
        Alert.alert('Permission to access location was denied');
        return;
      }
      
      if (Platform.OS !== 'web') {
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

      let { status: notificationStatus } = await Notifications.requestPermissionsAsync();
      if (notificationStatus !== 'granted') {
        Alert.alert('Permission to send notifications was denied');
      }

      let currentLocation = await Location.getCurrentPositionAsync({});
      setLocation(currentLocation.coords);

      // Load sound preference and available sounds
      const saved = await getSoundPreference();
      setSelectedSound(saved);
      const sounds = getAvailableSounds();
      setAvailableSounds(sounds);

      // Check if task is already running
      if (Platform.OS !== 'web') {
        const hasStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
        setIsTracking(hasStarted);
        
        if (hasStarted) {
          // Restore state if tracking
          const storedTarget = await AsyncStorage.getItem('targetLocation');
          const storedRadius = await AsyncStorage.getItem('alarmRadius');
          if (storedTarget) setDestination(JSON.parse(storedTarget));
          if (storedRadius) setAlarmRadius(storedRadius);
          startForegroundTracking();
        }
      }
    })();
    
    return () => {
       if (foregroundSub) foregroundSub.remove();
    }
  }, []);

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
    }
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
      }
    );
    setForegroundSub(sub);
  };

  const handleSoundChange = async (soundType) => {
    setSelectedSound(soundType);
    await setSoundPreference(soundType);
    setSoundMenuVisible(false);
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
      // Save state for background task
      await AsyncStorage.setItem('targetLocation', JSON.stringify(destination));
      await AsyncStorage.setItem('alarmRadius', alarmRadius);
      await AsyncStorage.setItem('isTracking', 'true');

      // Start background task
      if (Platform.OS !== 'web') {
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
      
      Alert.alert('Alarm Active', 'You will be notified when you reach your destination');
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to start tracking: ' + e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const stopTracking = async () => {
    try {
      if (Platform.OS !== 'web') {
        const hasStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
        if (hasStarted) {
          await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
        }
      }
      
      if (foregroundSub) {
        foregroundSub.remove();
        setForegroundSub(null);
      }
      
      await AsyncStorage.setItem('isTracking', 'false');
      setIsTracking(false);
      setDistanceToDest(null);
    } catch (e) {
      console.error(e);
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
        <Menu
          visible={soundMenuVisible}
          onDismiss={() => setSoundMenuVisible(false)}
          anchor={
            <Button 
              compact 
              icon="volume-high"
              onPress={() => setSoundMenuVisible(true)}
              mode="text"
            >
              {selectedSound}
            </Button>
          }
        >
          {availableSounds.map((sound) => (
            <Menu.Item 
              key={sound.type}
              onPress={() => handleSoundChange(sound.type)}
              title={sound.name}
              leadingIcon={selectedSound === sound.type ? "check" : undefined}
            />
          ))}
        </Menu>
      </Appbar.Header>

      <View style={styles.mapContainer}>
        {location && (
          <MapView
            ref={mapRef}
            style={styles.map}
            provider={PROVIDER_DEFAULT}
            initialRegion={{
              latitude: location.latitude,
              longitude: location.longitude,
              latitudeDelta: 0.0922,
              longitudeDelta: 0.0421,
            }}
            showsUserLocation={true}
            onPress={handleMapPress}
          >
            {destination && (
              <>
                <Marker coordinate={destination} title="Destination" pinColor="red" />
                <Circle
                  center={destination}
                  radius={parseFloat(alarmRadius) || 0}
                  strokeColor="rgba(220, 53, 69, 0.8)"
                  fillColor="rgba(220, 53, 69, 0.15)"
                  strokeWidth={2}
                />
              </>
            )}
          </MapView>
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

        {/* Sound Selection */}
        <View style={styles.soundSection}>
          <Text variant="labelMedium" style={{ marginBottom: 8, color: theme.colors.onSurfaceVariant }}>
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

        <Divider style={{ marginVertical: 12 }} />

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
});

export default HomeScreen;
