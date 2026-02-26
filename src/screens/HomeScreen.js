
import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Alert, Platform, KeyboardAvoidingView, Linking, Animated, Dimensions, Modal, PanResponder } from 'react-native';
import MapView, { Marker, Circle, PROVIDER_DEFAULT } from '../components/MapComponent';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { useKeepAwake } from 'expo-keep-awake';
import { TextInput, Button, Text, Appbar, Surface, useTheme, FAB, Chip, SegmentedButtons, ActivityIndicator, Menu, Divider, IconButton } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getDistance } from '../utils/location';
import { LOCATION_TASK_NAME } from '../services/LocationTask';
import { getAvailableSounds, getSoundPreference, setSoundPreference, setupNotificationChannels, getAvailableVibrations, getVibrationPreference, setVibrationPreference, getCustomVibrationDuration, setCustomVibrationDuration } from '../services/SoundService';

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
  const [selectedVibration, setSelectedVibration] = useState('MEDIUM');
  const [availableVibrations, setAvailableVibrations] = useState([]);
  const [vibrationMenuVisible, setVibrationMenuVisible] = useState(false);
  const [customVibrationDuration, setCustomVibrationDuration] = useState('500');
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(Dimensions.get('window').height)).current;
  const settingsPan = useRef(new Animated.ValueXY({ x: Dimensions.get('window').width - 70, y: Dimensions.get('window').height - 200 })).current;
  const settingsScale = useRef(new Animated.Value(1)).current;
  const panResponder = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    (async () => {
      // Setup notification channels
      await setupNotificationChannels();

      // Setup pan responder for draggable settings icon
      panResponder.current = PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          setIsDragging(true);
          Animated.spring(settingsScale, {
            toValue: 1.15,
            useNativeDriver: true,
          }).start();
        },
        onPanResponderMove: Animated.event(
          [null, { dx: settingsPan.x, dy: settingsPan.y }],
          { useNativeDriver: false }
        ),
        onPanResponderRelease: (evt, { dx, dy, vx, vy }) => {
          setIsDragging(false);
          const windowWidth = Dimensions.get('window').width;
          const windowHeight = Dimensions.get('window').height;
          const buttonSize = 64;
          const padding = 16;
          
          // Get current position
          let currentX = dx;
          let currentY = dy;
          
          // Constrain to screen bounds
          currentX = Math.max(padding, Math.min(currentX, windowWidth - buttonSize - padding));
          currentY = Math.max(80, Math.min(currentY, windowHeight - buttonSize - padding));
          
          // Calculate snap positions (corners and edges)
          const snapPositions = [
            { x: padding, y: Math.max(80, currentY), label: 'left' },
            { x: windowWidth - buttonSize - padding, y: Math.max(80, currentY), label: 'right' },
            { x: Math.max(padding, Math.min(currentX, windowWidth - buttonSize - padding)), y: 80, label: 'top' },
            { x: Math.max(padding, Math.min(currentX, windowWidth - buttonSize - padding)), y: windowHeight - buttonSize - padding, label: 'bottom' },
            // Corners
            { x: padding, y: 80, label: 'topLeft' },
            { x: windowWidth - buttonSize - padding, y: 80, label: 'topRight' },
            { x: padding, y: windowHeight - buttonSize - padding, label: 'bottomLeft' },
            { x: windowWidth - buttonSize - padding, y: windowHeight - buttonSize - padding, label: 'bottomRight' },
          ];
          
          // Find nearest snap position (with magnetic range of 60px)
          const snapRange = 60;
          let nearestSnap = { x: currentX, y: currentY, distance: Infinity };
          
          snapPositions.forEach((pos) => {
            const distance = Math.sqrt(
              Math.pow(pos.x - currentX, 2) + Math.pow(pos.y - currentY, 2)
            );
            if (distance < nearestSnap.distance && distance < snapRange) {
              nearestSnap = { ...pos, distance };
            }
          });
          
          const finalX = nearestSnap.distance < snapRange ? nearestSnap.x : currentX;
          const finalY = nearestSnap.distance < snapRange ? nearestSnap.y : currentY;
          
          // Add velocity for inertia
          Animated.parallel([
            Animated.spring(settingsPan.x, {
              toValue: finalX,
              velocity: vx * 2,
              friction: 6,
              useNativeDriver: false,
            }),
            Animated.spring(settingsPan.y, {
              toValue: finalY,
              velocity: vy * 2,
              friction: 6,
              useNativeDriver: false,
            }),
            Animated.spring(settingsScale, {
              toValue: 1,
              useNativeDriver: true,
            }),
          ]).start();

          // Save position to storage
          saveSettingsIconPosition(finalX, finalY);
        },
      });

      // Load saved position
      await loadSettingsIconPosition();

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
      
      // Load vibration preference and available vibrations
      const savedVibration = await getVibrationPreference();
      setSelectedVibration(savedVibration);
      const vibrations = getAvailableVibrations();
      setAvailableVibrations(vibrations);
      
      // Load custom vibration duration
      const savedDuration = await getCustomVibrationDuration();
      setCustomVibrationDuration(savedDuration.toString());

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

  const handleVibrationChange = async (vibrationPattern) => {
    setSelectedVibration(vibrationPattern);
    await setVibrationPreference(vibrationPattern);
    setVibrationMenuVisible(false);
  };

  const handleCustomVibrationChange = async (duration) => {
    setCustomVibrationDuration(duration);
    const numDuration = parseInt(duration) || 500;
    await setCustomVibrationDuration(numDuration);
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

  const saveSettingsIconPosition = async (x, y) => {
    await AsyncStorage.setItem('settingsIconPosition', JSON.stringify({ x, y }));
  };

  const loadSettingsIconPosition = async () => {
    const stored = await AsyncStorage.getItem('settingsIconPosition');
    if (stored) {
      const { x, y } = JSON.parse(stored);
      settingsPan.x.setValue(x);
      settingsPan.y.setValue(y);
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
      </Appbar.Header>

      {/* Draggable Settings Button */}
      <Animated.View
        style={[
          styles.draggableButton,
          {
            transform: [
              { translateX: settingsPan.x },
              { translateY: settingsPan.y },
              { scale: settingsScale },
            ],
          },
        ]}
        {...panResponder.current?.panHandlers}
      >
        <Surface 
          style={[
            styles.settingsButtonSurface,
            isDragging && { elevation: 12 }
          ]} 
          elevation={isDragging ? 12 : 6}
        >
          <IconButton
            icon="cog"
            iconColor={theme.colors.primary}
            size={28}
            onPress={openSettingsModal}
          />
        </Surface>
      </Animated.View>

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
  draggableButton: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 10,
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsButtonSurface: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});

export default HomeScreen;
