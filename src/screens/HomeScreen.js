
import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Alert, Platform, KeyboardAvoidingView } from 'react-native';
import MapView, { Marker, Circle, PROVIDER_DEFAULT } from '../components/MapComponent';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { useKeepAwake } from 'expo-keep-awake';
import { TextInput, Button, Text, Appbar, Surface, useTheme } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getDistance } from '../utils/location';
import { LOCATION_TASK_NAME } from '../services/LocationTask';

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

  const [location, setLocation] = useState(null);
  const [destination, setDestination] = useState(null);
  const [alarmRadius, setAlarmRadius] = useState('500'); // meters
  const [isTracking, setIsTracking] = useState(false);
  const [distanceToDest, setDistanceToDest] = useState(null);
  
  // Foreground subscription for UI updates
  const [foregroundSub, setForegroundSub] = useState(null);

  useEffect(() => {
    (async () => {
      let { status: locationStatus } = await Location.requestForegroundPermissionsAsync();
      if (locationStatus !== 'granted') {
        Alert.alert('Permission to access location was denied');
        return;
      }
      
      if (Platform.OS !== 'web') {
        let { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
        if (bgStatus !== 'granted') {
           console.log('Background location permission not granted');
        }
      }

      let { status: notificationStatus } = await Notifications.requestPermissionsAsync();
      if (notificationStatus !== 'granted') {
        Alert.alert('Permission to send notifications was denied');
      }

      let currentLocation = await Location.getCurrentPositionAsync({});
      setLocation(currentLocation.coords);

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
        timeInterval: 2000,
        distanceInterval: 5,
      },
      (newLocation) => {
        setLocation(newLocation.coords);
      }
    );
    setForegroundSub(sub);
  };

  const startTracking = async () => {
    if (!destination) {
      Alert.alert('Please select a destination on the map');
      return;
    }

    const radius = parseFloat(alarmRadius);
    if (isNaN(radius) || radius <= 0) {
      Alert.alert('Please enter a valid alarm radius');
      return;
    }

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
            notificationBody: "Tracking your location to alert you.",
            notificationColor: theme.colors.primary,
          },
        });
      }

      // Start foreground tracking for UI
      await startForegroundTracking();
      
      setIsTracking(true);
      Alert.alert('Alarm Set', 'You will be notified when you reach the destination area.');
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to start tracking: ' + e.message);
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
      <Appbar.Header elevated>
        <Appbar.Content title="Distance Alarm" />
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
                  strokeColor="rgba(255, 0, 0, 0.5)"
                  fillColor="rgba(255, 0, 0, 0.2)"
                />
              </>
            )}
          </MapView>
        )}
      </View>

      <Surface style={[styles.controls, { paddingBottom: Math.max(16, insets.bottom) }]} elevation={4}>
        <View style={styles.inputRow}>
          <TextInput
            mode="outlined"
            label="Alarm Radius (meters)"
            value={alarmRadius}
            onChangeText={setAlarmRadius}
            keyboardType="numeric"
            style={styles.input}
            disabled={isTracking}
          />
        </View>

        {distanceToDest !== null && (
          <View style={styles.infoRow}>
            <Text variant="titleMedium" style={{color: theme.colors.primary}}>
              Distance: {Math.round(distanceToDest)}m
            </Text>
          </View>
        )}

        <Button
          mode="contained"
          onPress={isTracking ? stopTracking : startTracking}
          style={styles.button}
          buttonColor={isTracking ? theme.colors.error : theme.colors.primary}
        >
          {isTracking ? 'Stop Alarm' : 'Set Alarm'}
        </Button>
      </Surface>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  mapContainer: {
    flex: 1,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  controls: {
    padding: 16,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    backgroundColor: '#fff',
  },
  inputRow: {
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#fff',
  },
  infoRow: {
    alignItems: 'center',
    marginBottom: 12,
  },
  button: {
    marginTop: 4,
  },
});

export default HomeScreen;
