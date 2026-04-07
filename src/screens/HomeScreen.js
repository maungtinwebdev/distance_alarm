import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  StyleSheet, View, Alert, Platform, Linking, Animated, Dimensions,
  ScrollView, TouchableOpacity, PanResponder,
} from 'react-native';
import MapView from '../components/MapComponent';
import * as Location from 'expo-location';
import { useKeepAwake } from 'expo-keep-awake';
import {
  TextInput, Button, Text, Surface, useTheme, IconButton, ActivityIndicator,
} from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getDistance } from '../utils/location';
import { predictNextStop } from '../utils/direction';
import { LOCATION_TASK_NAME } from '../services/LocationTask';
import {
  configureNotificationHandler, getAvailableSounds, getSoundPreference, setSoundPreference,
  setupNotificationChannels, getAvailableVibrations, getVibrationPreference, setVibrationPreference,
  getCustomVibrationDuration, setCustomVibrationDuration as saveCustomVibrationDuration,
  playAlarmSong, stopAlarmSong, SOUND_TYPES, sendAlarmNotification,
} from '../services/SoundService';
import { isExpoGo } from '../utils/runtime';
import { searchBusStopByName, resetBusStopCache, fetchNearbyBusStops } from '../services/BusStopService';
import SettingsModal from '../components/SettingsModal';
import ModeSelector from '../components/ModeSelector';
import { PALETTE, SHADOWS, RADIUS, SPACING, FONT_WEIGHT } from '../theme/colors';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// Panel height constraints (fractions of screen)
const PANEL_MIN_RATIO = 1 / 3;   // default: 1/3 of screen
const PANEL_MAX_RATIO = 1 / 2;   // max drag up: 50% of screen

const HomeScreen = ({ onThemeChange, isDarkMode: initialDarkMode }) => {
  useKeepAwake();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const isDark = theme.dark;
  const mapRef = useRef(null);
  const arrivalHandledRef = useRef(false);
  const foregroundSubRef = useRef(null);
  const destinationRef = useRef(null);
  const alarmRadiusRef = useRef('500');
  const selectedSoundRef = useRef('alarm');
  const activeModeRef = useRef('alarm');
  const prevLocationRef = useRef(null);
  const supportsBackgroundTracking = Platform.OS !== 'web' && !isExpoGo;

  // ── Shared State ──
  const [location, setLocation] = useState(null);
  const [activeMode, setActiveMode] = useState('alarm');
  const [isTracking, setIsTracking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [locationUpdates, setLocationUpdates] = useState(0);
  const [isDarkMode, setIsDarkMode] = useState(initialDarkMode || false);

  // ── Settings State ──
  const [settingsVisible, setSettingsVisible] = useState(false);
  const settingsSlideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const [selectedSound, setSelectedSound] = useState('alarm');
  const [availableSounds, setAvailableSounds] = useState([]);
  const [selectedVibration, setSelectedVibration] = useState('MEDIUM');
  const [availableVibrations, setAvailableVibrations] = useState([]);
  const [customVibrationDuration, setCustomVibrationDuration] = useState('500');
  const [busStopNotifyRadius, setBusStopNotifyRadius] = useState('150');

  // ── Alarm Mode State ──
  const [destination, setDestination] = useState(null);
  const [alarmRadius, setAlarmRadius] = useState('500');
  const [radiusPreset, setRadiusPreset] = useState('500');
  const [distanceToDest, setDistanceToDest] = useState(null);
  const [selectedBusStop, setSelectedBusStop] = useState(null);
  const [alarmSearch, setAlarmSearch] = useState('');
  const [alarmResults, setAlarmResults] = useState([]);
  const [isAlarmSearching, setIsAlarmSearching] = useState(false);
  const alarmSearchTimeout = useRef(null);

  // ── Notification Mode State ──
  const [nearestStop, setNearestStop] = useState(null);
  const [nextStop, setNextStop] = useState(null);
  const [notifRefStop, setNotifRefStop] = useState(null);
  const [notifSearch, setNotifSearch] = useState('');
  const [notifResults, setNotifResults] = useState([]);
  const [isNotifSearching, setIsNotifSearching] = useState(false);
  const notifSearchTimeout = useRef(null);
  const notifiedStopsRef = useRef(new Set());

  // ── Animations ──
  const panelFadeAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const headerGlowAnim = useRef(new Animated.Value(0)).current;

  // ── Draggable panel ──
  const panelMinH = SCREEN_HEIGHT * PANEL_MIN_RATIO;
  const panelMaxH = SCREEN_HEIGHT * PANEL_MAX_RATIO;
  const panelHeightAnim = useRef(new Animated.Value(panelMinH)).current;
  const panelHeightRef = useRef(panelMinH);

  const panelPanResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 4,
    onPanResponderGrant: () => {
      panelHeightAnim.stopAnimation();
    },
    onPanResponderMove: (_, gestureState) => {
      // dragging up = negative dy = increase height
      const newH = Math.max(panelMinH, Math.min(panelMaxH, panelHeightRef.current - gestureState.dy));
      panelHeightAnim.setValue(newH);
    },
    onPanResponderRelease: (_, gestureState) => {
      const newH = Math.max(panelMinH, Math.min(panelMaxH, panelHeightRef.current - gestureState.dy));
      // Snap to closest position
      const mid = (panelMinH + panelMaxH) / 2;
      const snapTo = newH > mid ? panelMaxH : panelMinH;
      panelHeightRef.current = snapTo;
      Animated.spring(panelHeightAnim, {
        toValue: snapTo,
        useNativeDriver: false,
        tension: 80,
        friction: 12,
      }).start();
    },
  }), [panelMinH, panelMaxH]);

  // ── Sync refs ──
  useEffect(() => { destinationRef.current = destination; }, [destination]);
  useEffect(() => { alarmRadiusRef.current = alarmRadius; }, [alarmRadius]);
  useEffect(() => { selectedSoundRef.current = selectedSound; }, [selectedSound]);
  useEffect(() => { activeModeRef.current = activeMode; }, [activeMode]);

  // ── Pulse animation for tracking dot ──
  useEffect(() => {
    if (isTracking) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.6, duration: 1000, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        ])
      );
      loop.start();
      // Header glow
      Animated.timing(headerGlowAnim, { toValue: 1, duration: 600, useNativeDriver: false }).start();
      return () => {
        loop.stop();
        Animated.timing(headerGlowAnim, { toValue: 0, duration: 300, useNativeDriver: false }).start();
      };
    }
  }, [isTracking]);

  // ── Init ──
  useEffect(() => {
    (async () => {
      if (!isExpoGo) {
        configureNotificationHandler();
        await setupNotificationChannels();
      }

      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Permission to access location was denied'); return; }

      if (supportsBackgroundTracking) {
        let { status: bg } = await Location.requestBackgroundPermissionsAsync();
        if (bg !== 'granted') {
          Alert.alert('Background Location Required',
            'Please select "Allow all the time" in settings.',
            [{ text: 'Cancel', style: 'cancel' }, { text: 'Open Settings', onPress: () => Linking.openSettings() }]);
        }
      }

      if (!isExpoGo) {
        const N = require('expo-notifications');
        let { status: ns } = await N.requestPermissionsAsync();
        if (ns !== 'granted') Alert.alert('Permission to send notifications was denied');
      }

      let cur = await Location.getCurrentPositionAsync({});
      setLocation(cur.coords);

      const saved = await getSoundPreference(); setSelectedSound(saved);
      setAvailableSounds(getAvailableSounds());
      const sv = await getVibrationPreference(); setSelectedVibration(sv);
      setAvailableVibrations(getAvailableVibrations());
      const sd = await getCustomVibrationDuration();
      setCustomVibrationDuration(sd ? sd.toString() : '500');
      const dm = await AsyncStorage.getItem('darkMode');
      if (dm !== null) setIsDarkMode(dm === 'true');
      const nr = await AsyncStorage.getItem('busStopNotifyRadius');
      if (nr !== null) setBusStopNotifyRadius(nr);
      const sm = await AsyncStorage.getItem('activeMode');
      if (sm) { setActiveMode(sm); activeModeRef.current = sm; }

      if (supportsBackgroundTracking) {
        const hasStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
        setIsTracking(hasStarted);
        if (hasStarted) {
          const st = await AsyncStorage.getItem('targetLocation');
          const sr = await AsyncStorage.getItem('alarmRadius');
          if (st) setDestination(JSON.parse(st));
          if (sr) setAlarmRadius(sr);
          startForegroundTracking();
        }
      }
    })();

    let notifSub = null;
    if (!isExpoGo) {
      const N = require('expo-notifications');
      notifSub = N.addNotificationResponseReceivedListener(() => stopTracking());
    }
    return () => { if (foregroundSubRef.current) foregroundSubRef.current.remove(); if (notifSub) notifSub.remove(); };
  }, []);

  // ── Distance calc ──
  useEffect(() => {
    if (location && destination) {
      setDistanceToDest(getDistance(location.latitude, location.longitude, destination.latitude, destination.longitude));
    }
  }, [location, destination]);

  // ── Notification mode: auto-detect bus stops ──
  useEffect(() => {
    if (!location || !isTracking || activeMode !== 'notification') return;
    const detect = async () => {
      try {
        const radius = parseFloat(busStopNotifyRadius) || 150;
        const stops = await fetchNearbyBusStops(location.latitude, location.longitude, Math.max(radius * 2, 800));
        if (stops && stops.length > 0) {
          setNearestStop(stops[0]);
          const predicted = predictNextStop(prevLocationRef.current, location, stops);
          setNextStop(predicted);
          const inRadius = stops.filter(s => s.distance <= radius);
          for (const stop of inRadius) {
            if (!notifiedStopsRef.current.has(stop.id)) {
              notifiedStopsRef.current.add(stop.id);
              const nextForStop = predictNextStop(prevLocationRef.current, location, stops.filter(s => s.id !== stop.id));
              await sendAlarmNotification(
                '🚏 Bus Stop Nearby',
                `${stop.name} (${Math.round(stop.distance)}m)\nNext: ${nextForStop ? nextForStop.name : 'N/A'}`,
                SOUND_TYPES.CHIME, 'LIGHT'
              );
            }
          }
        }
      } catch (e) { console.warn('Bus stop detect error:', e); }
    };
    detect();
  }, [location, isTracking, activeMode, busStopNotifyRadius]);

  // ── Foreground tracking ──
  const startForegroundTracking = async () => {
    const sub = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.High, timeInterval: 1000, distanceInterval: 5 },
      (newLoc) => {
        prevLocationRef.current = location;
        setLocation(newLoc.coords);
        setLocationUpdates(p => p + 1);
        if (activeModeRef.current === 'alarm' && !supportsBackgroundTracking) {
          const dest = destinationRef.current;
          if (dest && !arrivalHandledRef.current) {
            const d = getDistance(newLoc.coords.latitude, newLoc.coords.longitude, dest.latitude, dest.longitude);
            if (d <= (parseFloat(alarmRadiusRef.current) || 0)) {
              arrivalHandledRef.current = true;
              playAlarmSong();
              Alert.alert('🔔 Arrived!', `You are within ${Math.round(d)}m of your destination.`,
                [{ text: 'Stop Alarm', onPress: () => stopTracking() }], { cancelable: false });
            }
          }
        }
      }
    );
    foregroundSubRef.current = sub;
  };

  // ── Search handlers ──
  const handleAlarmSearch = useCallback((text) => {
    setAlarmSearch(text); setAlarmResults([]);
    if (alarmSearchTimeout.current) clearTimeout(alarmSearchTimeout.current);
    if (text.trim().length < 2) { setIsAlarmSearching(false); return; }
    setIsAlarmSearching(true);
    alarmSearchTimeout.current = setTimeout(async () => {
      const r = await searchBusStopByName(text); setAlarmResults(r); setIsAlarmSearching(false);
    }, 800);
  }, []);

  const handleNotifSearch = useCallback((text) => {
    setNotifSearch(text); setNotifResults([]);
    if (notifSearchTimeout.current) clearTimeout(notifSearchTimeout.current);
    if (text.trim().length < 2) { setIsNotifSearching(false); return; }
    setIsNotifSearching(true);
    notifSearchTimeout.current = setTimeout(async () => {
      const r = await searchBusStopByName(text); setNotifResults(r); setIsNotifSearching(false);
    }, 800);
  }, []);

  const handleAlarmSelectStop = (stop) => {
    setSelectedBusStop(stop);
    setDestination({ latitude: stop.lat, longitude: stop.lon });
    setAlarmSearch(stop.name); setAlarmResults([]);
  };

  const handleNotifSelectStop = (stop) => {
    setNotifRefStop(stop);
    setDestination({ latitude: stop.lat, longitude: stop.lon });
    setNotifSearch(stop.name); setNotifResults([]);
  };

  // ── Start tracking ──
  const startTracking = async () => {
    if (activeMode === 'alarm' && !destination) {
      Alert.alert('Select Destination', 'Tap the map or search a bus stop to set destination.');
      return;
    }
    const radius = activeMode === 'alarm' ? parseFloat(alarmRadius) : parseFloat(busStopNotifyRadius);
    if (activeMode === 'alarm' && (isNaN(radius) || radius <= 0)) {
      Alert.alert('Invalid Radius', 'Please enter a radius greater than 0'); return;
    }
    setIsLoading(true);
    try {
      arrivalHandledRef.current = false;
      await AsyncStorage.setItem('activeMode', activeMode);
      if (activeMode === 'alarm') {
        await AsyncStorage.setItem('targetLocation', JSON.stringify(destination));
        await AsyncStorage.setItem('alarmRadius', alarmRadius);
      }
      await AsyncStorage.setItem('isTracking', 'true');
      await setSoundPreference(selectedSound);
      await setVibrationPreference(selectedVibration);
      if (supportsBackgroundTracking) {
        await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
          accuracy: Location.Accuracy.Highest, timeInterval: 5000, distanceInterval: 10,
          pausesUpdatesAutomatically: false, activityType: Location.ActivityType.OtherNavigation,
          showsBackgroundLocationIndicator: true,
          foregroundService: {
            notificationTitle: activeMode === 'alarm' ? '🔔 Alarm Active' : '📢 Monitoring Stops',
            notificationBody: activeMode === 'alarm' ? 'Tracking distance to destination...' : 'Watching for nearby bus stops...',
            notificationColor: theme.colors.primary,
          },
        });
      }
      await startForegroundTracking();
      setIsTracking(true);
    } catch (e) {
      console.error(e); Alert.alert('Error', 'Failed to start: ' + e.message);
    } finally { setIsLoading(false); }
  };

  // ── Stop tracking ──
  const stopTracking = async () => {
    arrivalHandledRef.current = true;
    destinationRef.current = null;
    try {
      await stopAlarmSong();
      if (foregroundSubRef.current) { foregroundSubRef.current.remove(); foregroundSubRef.current = null; }
      if (supportsBackgroundTracking) {
        const has = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
        if (has) await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
      }
      await AsyncStorage.multiRemove(['isTracking', 'targetLocation', 'alarmRadius', 'activeMode']);
      if (!isExpoGo) {
        try { const N = require('expo-notifications'); await N.dismissAllNotificationsAsync(); await N.cancelAllScheduledNotificationsAsync(); } catch (e) {}
      }
      setIsTracking(false); setIsLoading(false); setDistanceToDest(null);
      setDestination(null); setLocationUpdates(0);
      setNearestStop(null); setNextStop(null);
      setSelectedBusStop(null); setAlarmSearch(''); setAlarmResults([]);
      setNotifRefStop(null); setNotifSearch(''); setNotifResults([]);
      notifiedStopsRef.current.clear(); resetBusStopCache();
      prevLocationRef.current = null;
    } catch (e) { console.error('Stop error:', e); }
  };

  // ── Map press ──
  const handleMapPress = (e) => {
    if (!isTracking && activeMode === 'alarm') {
      setDestination(e.nativeEvent.coordinate);
      setSelectedBusStop(null); setAlarmSearch('');
    }
  };

  // ── Mode change ──
  const handleModeChange = (mode) => {
    if (isTracking) return;
    Animated.sequence([
      Animated.timing(panelFadeAnim, { toValue: 0, duration: 100, useNativeDriver: false }),
      Animated.timing(panelFadeAnim, { toValue: 1, duration: 250, useNativeDriver: false }),
    ]).start();
    setActiveMode(mode);
    setDestination(null); setSelectedBusStop(null); setAlarmSearch('');
    setNotifRefStop(null); setNotifSearch('');
  };

  // ── Settings modal ──
  const openSettings = () => {
    setSettingsVisible(true);
    Animated.spring(settingsSlideAnim, { toValue: 0, useNativeDriver: true, tension: 60, friction: 12 }).start();
  };
  const closeSettings = () => {
    Animated.timing(settingsSlideAnim, { toValue: SCREEN_HEIGHT, duration: 280, useNativeDriver: true })
      .start(() => setSettingsVisible(false));
  };
  const handleThemeToggle = async () => {
    const n = !isDarkMode; setIsDarkMode(n);
    await AsyncStorage.setItem('darkMode', n.toString());
    if (onThemeChange) onThemeChange(n);
  };

  // ── Colors based on active mode ──
  const modeColor = activeMode === 'alarm' ? theme.colors.primary : (theme.colors.secondary || '#43A047');
  const modeColorLight = activeMode === 'alarm'
    ? (isDark ? 'rgba(43, 138, 255, 0.12)' : 'rgba(43, 138, 255, 0.08)')
    : (isDark ? 'rgba(67, 160, 71, 0.12)' : 'rgba(67, 160, 71, 0.08)');

  // ── Render: Search section ──
  const renderBusStopSearch = (search, results, isSearchingState, onSearch, onSelect, label) => (
    <View style={styles.searchSection}>
      <Text variant="labelMedium" style={[styles.sectionLabel, { color: theme.colors.onSurfaceVariant }]}>
        {label}
      </Text>
      <TextInput
        mode="outlined"
        label="Bus stop name"
        value={search}
        onChangeText={onSearch}
        placeholder="e.g. Sule, Hledan..."
        style={styles.input}
        outlineStyle={{ borderRadius: RADIUS.sm }}
        left={<TextInput.Icon icon="bus-stop" />}
        right={isSearchingState ? <TextInput.Icon icon={() => <ActivityIndicator size={18} />} /> : null}
      />
      {results.length > 0 && (
        <Surface
          style={[
            styles.searchResults,
            { backgroundColor: isDark ? PALETTE.gray800 : PALETTE.white },
          ]}
          elevation={4}
        >
          <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 180 }}>
            {results.map((item, i) => (
              <View key={`${item.lat}-${item.lon}-${i}`}>
                <TouchableOpacity
                  style={[
                    styles.searchItem,
                    { backgroundColor: isDark ? 'transparent' : 'transparent' },
                  ]}
                  onPress={() => onSelect(item)}
                  activeOpacity={0.6}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={[styles.searchDot, { backgroundColor: modeColor }]} />
                    <View style={{ flex: 1, marginLeft: SPACING.md }}>
                      <Text
                        variant="bodyMedium"
                        style={{ fontWeight: FONT_WEIGHT.semibold, color: theme.colors.onSurface }}
                        numberOfLines={1}
                      >
                        {item.name}
                      </Text>
                      <Text
                        variant="bodySmall"
                        style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}
                        numberOfLines={1}
                      >
                        {item.displayName}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
                {i < results.length - 1 && (
                  <View style={[styles.resultDivider, { backgroundColor: isDark ? PALETTE.gray700 : PALETTE.gray200 }]} />
                )}
              </View>
            ))}
          </ScrollView>
        </Surface>
      )}
    </View>
  );

  // ── Distance display helper ──
  const formatDistance = (d) => {
    if (d > 1000) return { value: (d / 1000).toFixed(1), unit: 'km' };
    return { value: Math.round(d), unit: 'm' };
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>

      {/* ═══════════════════ HEADER ═══════════════════ */}
      <Animated.View
        style={[
          styles.header,
          {
            paddingTop: insets.top + SPACING.sm,
            backgroundColor: isDark ? PALETTE.gray900 : PALETTE.white,
            borderBottomColor: isDark ? 'rgba(77,166,255,0.06)' : PALETTE.gray200,
          },
        ]}
      >
        <View style={styles.headerRow}>
          <View>
            <Text
              variant="titleLarge"
              style={[styles.headerTitle, { color: theme.colors.onSurface }]}
            >
              Distance Alarm
            </Text>
            {isTracking && (
              <View style={styles.trackingBadge}>
                <View style={styles.pulseDotWrap}>
                  <Animated.View
                    style={[
                      styles.pulseRing,
                      {
                        backgroundColor: modeColor,
                        opacity: pulseAnim.interpolate({ inputRange: [1, 1.6], outputRange: [0.3, 0] }),
                        transform: [{ scale: pulseAnim }],
                      },
                    ]}
                  />
                  <View style={[styles.pulseDot, { backgroundColor: modeColor }]} />
                </View>
                <Text
                  variant="labelSmall"
                  style={[styles.statusText, { color: modeColor }]}
                >
                  {activeMode === 'alarm' ? 'ALARM ACTIVE' : 'MONITORING'}
                </Text>
              </View>
            )}
          </View>
          <TouchableOpacity
            onPress={openSettings}
            style={[
              styles.settingsBtn,
              {
                backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
              },
            ]}
            activeOpacity={0.6}
          >
            <Text style={{ fontSize: 20 }}>⚙️</Text>
          </TouchableOpacity>
        </View>

        {/* Mode Selector */}
        <ModeSelector
          activeMode={activeMode}
          onModeChange={handleModeChange}
          disabled={isTracking}
        />
      </Animated.View>

      {/* ═══════════════════ MAP ═══════════════════ */}
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
            alarmRadius={activeMode === 'alarm' ? (parseFloat(alarmRadius) || 0) : (parseFloat(busStopNotifyRadius) || 0)}
            onPress={handleMapPress}
          />
        )}
      </View>

      {/* ═══════════════════ BOTTOM PANEL ═══════════════════ */}
      <Animated.View
        style={[
          styles.panel,
          {
            height: panelHeightAnim,
            paddingBottom: Math.max(SPACING.lg, insets.bottom),
            backgroundColor: isDark ? PALETTE.gray850 : PALETTE.white,
            borderTopColor: isDark ? 'rgba(77,166,255,0.06)' : PALETTE.gray200,
            opacity: panelFadeAnim,
          },
          SHADOWS.lg,
        ]}
      >
          {/* Drag Handle */}
          <View {...panelPanResponder.panHandlers} style={styles.panelHandleWrap}>
            <View style={[styles.panelHandle, { backgroundColor: isDark ? PALETTE.gray600 : PALETTE.gray300 }]} />
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ flex: 1 }}>

            {/* ══════ ALARM MODE ══════ */}
            {activeMode === 'alarm' && (
              <>
                {/* Distance card while tracking */}
                {isTracking && distanceToDest !== null && (() => {
                  const dist = formatDistance(distanceToDest);
                  const inZone = distanceToDest <= parseFloat(alarmRadius);
                  return (
                    <View
                      style={[
                        styles.liveCard,
                        {
                          backgroundColor: isDark ? 'rgba(43, 138, 255, 0.10)' : 'rgba(43, 138, 255, 0.06)',
                          borderColor: isDark ? 'rgba(43, 138, 255, 0.2)' : 'rgba(43, 138, 255, 0.15)',
                        },
                      ]}
                    >
                      <Text
                        variant="labelSmall"
                        style={[styles.cardLabel, { color: theme.colors.primary }]}
                      >
                        DISTANCE TO DESTINATION
                      </Text>
                      <View style={styles.distanceRow}>
                        <Text
                          style={[styles.distanceValue, { color: theme.colors.primary }]}
                        >
                          {dist.value}
                        </Text>
                        <Text
                          style={[styles.distanceUnit, { color: theme.colors.primary }]}
                        >
                          {dist.unit}
                        </Text>
                      </View>
                      {selectedBusStop && (
                        <Text variant="bodySmall" style={{ color: theme.colors.primary, marginTop: SPACING.xs }}>
                          🚏 {selectedBusStop.name}
                        </Text>
                      )}
                      {inZone && (
                        <View style={[styles.zoneBadge, { backgroundColor: '#43A047' }]}>
                          <Text style={styles.zoneBadgeText}>✓ Within Alarm Zone</Text>
                        </View>
                      )}
                    </View>
                  );
                })()}

                {/* Selected destination (not tracking) */}
                {!isTracking && destination && (
                  <View
                    style={[
                      styles.infoCard,
                      {
                        backgroundColor: isDark
                          ? 'rgba(43, 138, 255, 0.06)'
                          : 'rgba(43, 138, 255, 0.04)',
                        borderColor: isDark
                          ? 'rgba(43, 138, 255, 0.12)'
                          : 'rgba(43, 138, 255, 0.1)',
                      },
                    ]}
                  >
                    <View style={styles.infoCardHeader}>
                      <View style={[styles.infoCardDot, { backgroundColor: theme.colors.primary }]} />
                      <Text style={[styles.infoCardLabel, { color: theme.colors.onSurfaceVariant }]}>
                        SELECTED DESTINATION
                      </Text>
                    </View>
                    {selectedBusStop && (
                      <Text
                        variant="bodyMedium"
                        style={{ fontWeight: FONT_WEIGHT.bold, marginTop: SPACING.sm, color: theme.colors.onSurface }}
                      >
                        🚏 {selectedBusStop.name}
                      </Text>
                    )}
                    <Text
                      variant="bodySmall"
                      style={{ marginTop: SPACING.xs, color: theme.colors.onSurfaceVariant }}
                    >
                      {destination.latitude.toFixed(4)}°, {destination.longitude.toFixed(4)}°
                    </Text>
                    {distanceToDest !== null && (() => {
                      const dist = formatDistance(distanceToDest);
                      return (
                        <View style={[styles.distChip, { backgroundColor: modeColorLight }]}>
                          <Text style={{ color: modeColor, fontSize: 12, fontWeight: FONT_WEIGHT.semibold }}>
                            📍 {dist.value} {dist.unit}
                          </Text>
                        </View>
                      );
                    })()}
                  </View>
                )}

                {/* Bus stop search */}
                {!isTracking && renderBusStopSearch(alarmSearch, alarmResults, isAlarmSearching, handleAlarmSearch, handleAlarmSelectStop, '🔍 Search Bus Stop Destination')}

                {/* Radius */}
                {!isTracking && (
                  <View style={styles.section}>
                    <Text variant="labelMedium" style={[styles.sectionLabel, { color: theme.colors.onSurfaceVariant }]}>
                      📏 Alarm Radius
                    </Text>
                    <View style={styles.presetRow}>
                      {['100', '500', '1000', '5000'].map((p) => (
                        <TouchableOpacity
                          key={p}
                          style={[
                            styles.presetChip,
                            {
                              backgroundColor: radiusPreset === p
                                ? modeColor
                                : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'),
                              borderColor: radiusPreset === p
                                ? modeColor
                                : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'),
                            },
                            radiusPreset === p && SHADOWS.sm,
                            radiusPreset === p && { shadowColor: modeColor, shadowOpacity: 0.3 },
                          ]}
                          onPress={() => { setRadiusPreset(p); setAlarmRadius(p); }}
                          activeOpacity={0.7}
                        >
                          <Text
                            style={{
                              color: radiusPreset === p ? '#fff' : theme.colors.onSurface,
                              fontWeight: radiusPreset === p ? FONT_WEIGHT.bold : FONT_WEIGHT.medium,
                              fontSize: 13,
                            }}
                          >
                            {p}m
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    <TextInput
                      mode="outlined"
                      label="Custom (meters)"
                      value={alarmRadius}
                      onChangeText={(t) => { setAlarmRadius(t); setRadiusPreset(''); }}
                      keyboardType="numeric"
                      style={[styles.input, { marginTop: SPACING.sm }]}
                      outlineStyle={{ borderRadius: RADIUS.sm }}
                      left={<TextInput.Icon icon="ruler" />}
                    />
                  </View>
                )}

                {/* Action Button */}
                <TouchableOpacity
                  style={[
                    styles.actionBtn,
                    {
                      backgroundColor: isTracking ? theme.colors.error : modeColor,
                      opacity: (isLoading || !location) ? 0.5 : 1,
                    },
                    SHADOWS.md,
                    { shadowColor: isTracking ? theme.colors.error : modeColor, shadowOpacity: 0.3 },
                  ]}
                  onPress={isTracking ? stopTracking : startTracking}
                  disabled={isLoading || !location}
                  activeOpacity={0.8}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#fff" size={20} />
                  ) : (
                    <Text style={styles.actionBtnText}>
                      {isTracking ? '■  Stop Alarm' : '🔔  Start Alarm'}
                    </Text>
                  )}
                </TouchableOpacity>

                {isTracking && (
                  <View style={[styles.footer, { borderTopColor: isDark ? PALETTE.gray700 : PALETTE.gray200 }]}>
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>
                      ⚡ Song + Vibration will trigger on arrival
                    </Text>
                    <View style={[styles.gpsChip, { backgroundColor: modeColorLight }]}>
                      <Text style={{ color: modeColor, fontSize: 11, fontWeight: FONT_WEIGHT.semibold }}>
                        📡 GPS: {locationUpdates}
                      </Text>
                    </View>
                  </View>
                )}
              </>
            )}

            {/* ══════ NOTIFICATION MODE ══════ */}
            {activeMode === 'notification' && (
              <>
                {/* Nearest stop card */}
                {isTracking && nearestStop && (
                  <View
                    style={[
                      styles.liveCard,
                      {
                        backgroundColor: isDark ? 'rgba(67, 160, 71, 0.10)' : 'rgba(67, 160, 71, 0.06)',
                        borderColor: isDark ? 'rgba(67, 160, 71, 0.2)' : 'rgba(67, 160, 71, 0.15)',
                      },
                    ]}
                  >
                    <Text
                      variant="labelSmall"
                      style={[styles.cardLabel, { color: '#43A047' }]}
                    >
                      🚏 NEAREST BUS STOP
                    </Text>
                    <Text
                      variant="headlineSmall"
                      style={{ color: theme.colors.onSurface, marginTop: SPACING.sm, fontWeight: FONT_WEIGHT.bold }}
                    >
                      {nearestStop.name}
                    </Text>
                    <View style={[styles.distChip, { backgroundColor: isDark ? 'rgba(67,160,71,0.15)' : 'rgba(67,160,71,0.1)' }]}>
                      <Text style={{ color: '#43A047', fontSize: 12, fontWeight: FONT_WEIGHT.semibold }}>
                        📍 {Math.round(nearestStop.distance)}m away
                      </Text>
                    </View>
                  </View>
                )}

                {/* Predicted next stop */}
                {isTracking && nextStop && (
                  <View
                    style={[
                      styles.liveCard,
                      {
                        backgroundColor: isDark ? 'rgba(43, 138, 255, 0.10)' : 'rgba(43, 138, 255, 0.06)',
                        borderColor: isDark ? 'rgba(43, 138, 255, 0.2)' : 'rgba(43, 138, 255, 0.15)',
                      },
                    ]}
                  >
                    <Text
                      variant="labelSmall"
                      style={[styles.cardLabel, { color: theme.colors.primary }]}
                    >
                      🔮 PREDICTED NEXT STOP
                    </Text>
                    <Text
                      variant="headlineSmall"
                      style={{ color: theme.colors.onSurface, marginTop: SPACING.sm, fontWeight: FONT_WEIGHT.bold }}
                    >
                      {nextStop.name}
                    </Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm }}>
                      <View style={[styles.distChip, { backgroundColor: isDark ? 'rgba(43,138,255,0.15)' : 'rgba(43,138,255,0.1)' }]}>
                        <Text style={{ color: theme.colors.primary, fontSize: 12, fontWeight: FONT_WEIGHT.semibold }}>
                          📍 {Math.round(nextStop.distance)}m
                        </Text>
                      </View>
                    </View>
                  </View>
                )}

                {/* Scanning indicator */}
                {isTracking && !nearestStop && (
                  <View
                    style={[
                      styles.infoCard,
                      {
                        backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
                        borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                      },
                    ]}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                      <ActivityIndicator size={20} color={modeColor} />
                      <Text
                        variant="bodyMedium"
                        style={{ color: theme.colors.onSurfaceVariant, marginLeft: SPACING.md }}
                      >
                        Scanning for bus stops...
                      </Text>
                    </View>
                  </View>
                )}

                {/* Search reference stop */}
                {!isTracking && renderBusStopSearch(notifSearch, notifResults, isNotifSearching, handleNotifSearch, handleNotifSelectStop, '🔍 Choose Reference Bus Stop')}

                {/* Selected ref stop */}
                {!isTracking && notifRefStop && (
                  <View
                    style={[
                      styles.infoCard,
                      {
                        backgroundColor: isDark ? 'rgba(67, 160, 71, 0.06)' : 'rgba(67, 160, 71, 0.04)',
                        borderColor: isDark ? 'rgba(67, 160, 71, 0.12)' : 'rgba(67, 160, 71, 0.1)',
                      },
                    ]}
                  >
                    <View style={styles.infoCardHeader}>
                      <View style={[styles.infoCardDot, { backgroundColor: '#43A047' }]} />
                      <Text style={[styles.infoCardLabel, { color: theme.colors.onSurfaceVariant }]}>
                        REFERENCE STOP
                      </Text>
                    </View>
                    <Text
                      variant="bodyMedium"
                      style={{ fontWeight: FONT_WEIGHT.bold, marginTop: SPACING.sm, color: theme.colors.onSurface }}
                    >
                      🚏 {notifRefStop.name}
                    </Text>
                    <Text
                      variant="bodySmall"
                      style={{ marginTop: SPACING.xs, color: theme.colors.onSurfaceVariant }}
                    >
                      Notify radius: {busStopNotifyRadius}m
                    </Text>
                  </View>
                )}

                {/* Action */}
                <TouchableOpacity
                  style={[
                    styles.actionBtn,
                    {
                      backgroundColor: isTracking ? theme.colors.error : modeColor,
                      opacity: (isLoading || !location) ? 0.5 : 1,
                    },
                    SHADOWS.md,
                    { shadowColor: isTracking ? theme.colors.error : modeColor, shadowOpacity: 0.3 },
                  ]}
                  onPress={isTracking ? stopTracking : startTracking}
                  disabled={isLoading || !location}
                  activeOpacity={0.8}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#fff" size={20} />
                  ) : (
                    <Text style={styles.actionBtnText}>
                      {isTracking ? '■  Stop Monitoring' : '📢  Start Monitoring'}
                    </Text>
                  )}
                </TouchableOpacity>

                {isTracking && (
                  <View style={[styles.footer, { borderTopColor: isDark ? PALETTE.gray700 : PALETTE.gray200 }]}>
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>
                      📢 Notification only — no alarm sound
                    </Text>
                    <View style={[styles.gpsChip, { backgroundColor: modeColorLight }]}>
                      <Text style={{ color: modeColor, fontSize: 11, fontWeight: FONT_WEIGHT.semibold }}>
                        📡 GPS: {locationUpdates}
                      </Text>
                    </View>
                  </View>
                )}
              </>
            )}
          </ScrollView>
      </Animated.View>

      {/* ═══════════════════ SETTINGS ═══════════════════ */}
      <SettingsModal
        visible={settingsVisible}
        onClose={closeSettings}
        slideAnim={settingsSlideAnim}
        selectedSound={selectedSound}
        availableSounds={availableSounds}
        onSoundChange={async (s) => { setSelectedSound(s); await setSoundPreference(s); }}
        selectedVibration={selectedVibration}
        availableVibrations={availableVibrations}
        onVibrationChange={async (v) => { setSelectedVibration(v); await setVibrationPreference(v); }}
        customVibrationDuration={customVibrationDuration}
        onCustomVibrationChange={async (d) => { setCustomVibrationDuration(d); await saveCustomVibrationDuration(parseInt(d) || 500); }}
        busStopNotifyRadius={busStopNotifyRadius}
        onNotifyRadiusChange={(r) => { setBusStopNotifyRadius(r); AsyncStorage.setItem('busStopNotifyRadius', r); }}
        isDarkMode={isDarkMode}
        onThemeToggle={handleThemeToggle}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // ── Header ──
  header: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.sm,
    borderBottomWidth: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontWeight: FONT_WEIGHT.extrabold,
    letterSpacing: -0.3,
    fontSize: 22,
  },
  settingsBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trackingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.xs,
  },
  pulseDotWrap: {
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    marginLeft: SPACING.xs,
    fontWeight: FONT_WEIGHT.bold,
    letterSpacing: 1.2,
    fontSize: 11,
  },

  // ── Map ──
  mapContainer: {
    flex: 1,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },

  // ── Panel ──
  panel: {
    paddingHorizontal: SPACING.lg,
    borderTopLeftRadius: RADIUS.xxl,
    borderTopRightRadius: RADIUS.xxl,
    borderTopWidth: 1,
  },
  panelHandleWrap: {
    alignItems: 'center',
    paddingVertical: SPACING.md,
  },
  panelHandle: {
    width: 48,
    height: 5,
    borderRadius: 3,
  },

  // ── Cards ──
  liveCard: {
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.md,
    borderWidth: 1,
  },
  infoCard: {
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.md,
    borderWidth: 1,
  },
  infoCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoCardDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: SPACING.sm,
  },
  infoCardLabel: {
    fontSize: 11,
    fontWeight: FONT_WEIGHT.semibold,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  cardLabel: {
    fontWeight: FONT_WEIGHT.semibold,
    letterSpacing: 1.2,
    fontSize: 11,
  },

  // ── Distance ──
  distanceRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: SPACING.sm,
  },
  distanceValue: {
    fontSize: 42,
    fontWeight: FONT_WEIGHT.extrabold,
    letterSpacing: -1,
    lineHeight: 46,
  },
  distanceUnit: {
    fontSize: 18,
    fontWeight: FONT_WEIGHT.semibold,
    marginLeft: SPACING.sm,
    marginBottom: SPACING.xs + 2,
  },
  distChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
    borderRadius: RADIUS.pill,
    marginTop: SPACING.sm,
  },
  zoneBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
    borderRadius: RADIUS.pill,
    marginTop: SPACING.md,
  },
  zoneBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: FONT_WEIGHT.bold,
  },

  // ── Search ──
  searchSection: {
    marginBottom: SPACING.md,
  },
  sectionLabel: {
    marginBottom: SPACING.sm,
    fontWeight: FONT_WEIGHT.medium,
  },
  input: {
    backgroundColor: 'transparent',
  },
  searchResults: {
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    marginTop: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  searchItem: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
  },
  searchDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  resultDivider: {
    height: 1,
    marginHorizontal: SPACING.lg,
  },

  // ── Radius presets ──
  section: {
    marginBottom: SPACING.md,
  },
  presetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  presetChip: {
    flex: 1,
    paddingVertical: SPACING.sm + 2,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Action button ──
  actionBtn: {
    paddingVertical: SPACING.lg,
    borderRadius: RADIUS.md,
    marginTop: SPACING.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: FONT_WEIGHT.bold,
    letterSpacing: 0.5,
  },

  // ── Footer ──
  footer: {
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    alignItems: 'center',
  },
  gpsChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.pill,
    marginTop: SPACING.sm,
  },
});

export default HomeScreen;
