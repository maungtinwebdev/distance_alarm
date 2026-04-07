import { View, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Text, TextInput, Button, Surface, Chip, Divider, ActivityIndicator, useTheme } from 'react-native-paper';

const AlarmPanel = ({
  isTracking, isLoading, location, destination, distanceToDest,
  alarmRadius, radiusPreset, selectedBusStop,
  busStopSearch, busStopResults, isSearching, locationUpdates,
  onRadiusChange, onRadiusPresetChange, onBusStopSearch,
  onSelectBusStop, onStartTracking, onStopTracking,
}) => {
  const theme = useTheme();

  return (
    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      {/* Tracking: Distance Card */}
      {isTracking && distanceToDest !== null && (
        <Surface style={[styles.card, { backgroundColor: theme.colors.primaryContainer, borderLeftColor: '#dc3545' }]} elevation={2}>
          <Text variant="labelSmall" style={{ color: theme.colors.primary, letterSpacing: 1 }}>DISTANCE TO DESTINATION</Text>
          <View style={styles.distanceRow}>
            <Text variant="displaySmall" style={{ color: theme.colors.primary, fontWeight: 'bold' }}>
              {distanceToDest > 1000 ? (distanceToDest / 1000).toFixed(2) : Math.round(distanceToDest)}
            </Text>
            <Text variant="headlineSmall" style={{ color: theme.colors.primary, marginLeft: 8, marginTop: 4 }}>
              {distanceToDest > 1000 ? 'km' : 'm'}
            </Text>
          </View>
          {selectedBusStop && (
            <Text variant="bodySmall" style={{ color: theme.colors.primary, marginTop: 4 }}>🚏 {selectedBusStop.name}</Text>
          )}
          {distanceToDest <= parseFloat(alarmRadius) && (
            <Chip icon="check-circle" style={{ backgroundColor: '#4CAF50', marginTop: 8, alignSelf: 'flex-start' }}
              textStyle={{ color: '#fff' }}>Within Alarm Zone!</Chip>
          )}
        </Surface>
      )}

      {/* Not tracking: Selected destination info */}
      {!isTracking && destination && (
        <Surface style={[styles.card, { backgroundColor: theme.colors.inverseOnSurface, borderLeftColor: theme.colors.primary }]} elevation={2}>
          <Text variant="labelSmall" style={{ letterSpacing: 1 }}>SELECTED DESTINATION</Text>
          {selectedBusStop && (
            <Text variant="bodyMedium" style={{ marginTop: 8, fontWeight: 'bold' }}>🚏 {selectedBusStop.name}</Text>
          )}
          <Text variant="bodySmall" style={{ marginTop: 4, color: theme.colors.outline }}>
            {destination.latitude.toFixed(4)}°, {destination.longitude.toFixed(4)}°
          </Text>
          {distanceToDest !== null && (
            <Chip icon="map-marker-distance" style={{ marginTop: 12, backgroundColor: theme.colors.surfaceVariant, alignSelf: 'flex-start' }} compact>
              {distanceToDest > 1000 ? (distanceToDest / 1000).toFixed(2) + ' km' : Math.round(distanceToDest) + ' m'}
            </Chip>
          )}
        </Surface>
      )}

      {/* Bus Stop Search */}
      {!isTracking && (
        <View style={styles.section}>
          <Text variant="labelMedium" style={{ marginBottom: 8, color: theme.colors.onSurfaceVariant }}>🔍 Search Bus Stop</Text>
          <TextInput mode="outlined" label="Bus stop name" value={busStopSearch}
            onChangeText={onBusStopSearch} placeholder="e.g. Sule, Hledan..."
            style={styles.input} left={<TextInput.Icon icon="bus-stop" />}
            right={isSearching ? <TextInput.Icon icon={() => <ActivityIndicator size={18} />} /> : null} />
          {busStopResults.length > 0 && (
            <Surface style={styles.results} elevation={3}>
              <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 180 }}>
                {busStopResults.map((item, i) => (
                  <View key={`${item.lat}-${item.lon}-${i}`}>
                    <TouchableOpacity style={styles.resultItem} onPress={() => onSelectBusStop(item)}>
                      <Text variant="bodyMedium" style={{ fontWeight: 'bold' }} numberOfLines={1}>🚏 {item.name}</Text>
                      <Text variant="bodySmall" style={{ color: theme.colors.outline, marginTop: 2 }} numberOfLines={1}>{item.displayName}</Text>
                    </TouchableOpacity>
                    {i < busStopResults.length - 1 && <Divider />}
                  </View>
                ))}
              </ScrollView>
            </Surface>
          )}
        </View>
      )}

      {/* Radius Presets */}
      {!isTracking && (
        <View style={styles.section}>
          <Text variant="labelMedium" style={{ marginBottom: 8, color: theme.colors.onSurfaceVariant }}>📏 Alarm Radius</Text>
          <View style={styles.presetRow}>
            {['100', '500', '1000', '5000'].map((p) => (
              <Button key={p} mode={radiusPreset === p ? 'contained' : 'outlined'} compact
                onPress={() => onRadiusPresetChange(p)} style={styles.presetBtn}>{p}m</Button>
            ))}
          </View>
          <TextInput mode="outlined" label="Custom Radius (meters)" value={alarmRadius}
            onChangeText={onRadiusChange} keyboardType="numeric" style={[styles.input, { marginTop: 8 }]}
            left={<TextInput.Icon icon="ruler" />} />
        </View>
      )}

      {/* Action Button */}
      <Button mode="contained" onPress={isTracking ? onStopTracking : onStartTracking}
        style={styles.actionBtn} buttonColor={isTracking ? theme.colors.error : theme.colors.primary}
        loading={isLoading} disabled={isLoading || !location}
        labelStyle={{ fontSize: 16, fontWeight: 'bold' }}>
        {isLoading ? 'Processing...' : isTracking ? '■ Stop Alarm' : '🔔 Start Alarm'}
      </Button>

      {/* Info while tracking */}
      {isTracking && (
        <View style={styles.footer}>
          <Text variant="bodySmall" style={{ color: theme.colors.outline, textAlign: 'center' }}>
            ⚡ Alarm mode: Song + Vibration will trigger when you arrive
          </Text>
          <Text variant="labelSmall" style={{ color: theme.colors.outline, textAlign: 'center', marginTop: 4 }}>
            GPS updates: {locationUpdates}
          </Text>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  card: { padding: 16, borderRadius: 16, marginBottom: 16, borderLeftWidth: 4 },
  distanceRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 12 },
  section: { marginBottom: 16 },
  input: { backgroundColor: '#f9f9f9', borderRadius: 8 },
  results: { borderRadius: 12, overflow: 'hidden', marginTop: 4, marginBottom: 8 },
  resultItem: { paddingVertical: 12, paddingHorizontal: 16 },
  presetRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  presetBtn: { flex: 1, borderRadius: 8 },
  actionBtn: { paddingVertical: 8, borderRadius: 12, marginTop: 8 },
  footer: { marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#e0e0e0' },
});

export default AlarmPanel;
