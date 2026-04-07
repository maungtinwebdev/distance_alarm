import { View, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Text, TextInput, Button, Surface, Chip, Divider, ActivityIndicator, useTheme } from 'react-native-paper';
import { getDirectionLabel, getBearing } from '../utils/direction';

const NotificationPanel = ({
  isTracking, isLoading, location, nearestStop, nextStop,
  busStopNotifyRadius, selectedRefStop,
  busStopSearch, busStopResults, isSearching, locationUpdates,
  onBusStopSearch, onSelectRefStop, onStartTracking, onStopTracking,
}) => {
  const theme = useTheme();

  const getDirectionText = () => {
    if (!location || !nextStop) return null;
    const bearing = getBearing(location.latitude, location.longitude, nextStop.lat, nextStop.lon);
    return getDirectionLabel(bearing);
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      {/* Tracking: Nearest Stop Card */}
      {isTracking && nearestStop && (
        <Surface style={[styles.card, { backgroundColor: '#1B5E20', borderLeftColor: '#4CAF50' }]} elevation={3}>
          <Text variant="labelSmall" style={{ color: '#A5D6A7', letterSpacing: 1 }}>🚏 NEAREST BUS STOP</Text>
          <Text variant="headlineSmall" style={{ color: '#fff', marginTop: 8, fontWeight: 'bold' }}>
            {nearestStop.name}
          </Text>
          <Chip icon="map-marker-distance"
            style={{ backgroundColor: '#2E7D32', marginTop: 10, alignSelf: 'flex-start' }}
            textStyle={{ color: '#fff', fontSize: 12 }}>
            {Math.round(nearestStop.distance)}m away
          </Chip>
        </Surface>
      )}

      {/* Tracking: Predicted Next Stop */}
      {isTracking && nextStop && (
        <Surface style={[styles.card, { backgroundColor: '#0D47A1', borderLeftColor: '#42A5F5' }]} elevation={3}>
          <Text variant="labelSmall" style={{ color: '#90CAF9', letterSpacing: 1 }}>🔮 PREDICTED NEXT STOP</Text>
          <Text variant="headlineSmall" style={{ color: '#fff', marginTop: 8, fontWeight: 'bold' }}>
            {nextStop.name}
          </Text>
          <View style={styles.chipRow}>
            <Chip icon="map-marker-distance"
              style={{ backgroundColor: '#1565C0', marginTop: 10, marginRight: 8 }}
              textStyle={{ color: '#fff', fontSize: 12 }}>
              {Math.round(nextStop.distance)}m
            </Chip>
            {getDirectionText() && (
              <Chip icon="compass"
                style={{ backgroundColor: '#1565C0', marginTop: 10 }}
                textStyle={{ color: '#fff', fontSize: 12 }}>
                {getDirectionText()}
              </Chip>
            )}
          </View>
        </Surface>
      )}

      {/* Tracking: No stops found */}
      {isTracking && !nearestStop && (
        <Surface style={[styles.card, { backgroundColor: theme.colors.surfaceVariant, borderLeftColor: theme.colors.outline }]} elevation={1}>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>
            📡 Scanning for nearby bus stops...
          </Text>
        </Surface>
      )}

      {/* Not tracking: Search bus stop */}
      {!isTracking && (
        <View style={styles.section}>
          <Text variant="labelMedium" style={{ marginBottom: 8, color: theme.colors.onSurfaceVariant }}>
            🔍 Choose Bus Stop (reference)
          </Text>
          <TextInput mode="outlined" label="Bus stop name" value={busStopSearch}
            onChangeText={onBusStopSearch} placeholder="e.g. Sule, Hledan..."
            style={styles.input} left={<TextInput.Icon icon="bus-stop" />}
            right={isSearching ? <TextInput.Icon icon={() => <ActivityIndicator size={18} />} /> : null} />
          {busStopResults.length > 0 && (
            <Surface style={styles.results} elevation={3}>
              <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 180 }}>
                {busStopResults.map((item, i) => (
                  <View key={`${item.lat}-${item.lon}-${i}`}>
                    <TouchableOpacity style={styles.resultItem} onPress={() => onSelectRefStop(item)}>
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

      {/* Selected reference stop (not tracking) */}
      {!isTracking && selectedRefStop && (
        <Surface style={[styles.card, { backgroundColor: theme.colors.inverseOnSurface, borderLeftColor: '#4CAF50' }]} elevation={2}>
          <Text variant="labelSmall" style={{ letterSpacing: 1 }}>SELECTED REFERENCE STOP</Text>
          <Text variant="bodyMedium" style={{ marginTop: 8, fontWeight: 'bold' }}>🚏 {selectedRefStop.name}</Text>
          <Text variant="bodySmall" style={{ marginTop: 4, color: theme.colors.outline }}>
            Notify radius: {busStopNotifyRadius}m
          </Text>
        </Surface>
      )}

      {/* Action Button */}
      <Button mode="contained" onPress={isTracking ? onStopTracking : onStartTracking}
        style={styles.actionBtn}
        buttonColor={isTracking ? theme.colors.error : '#2E7D32'}
        loading={isLoading} disabled={isLoading || !location}
        labelStyle={{ fontSize: 16, fontWeight: 'bold' }}>
        {isLoading ? 'Processing...' : isTracking ? '■ Stop Monitoring' : '📢 Start Monitoring'}
      </Button>

      {/* Info while tracking */}
      {isTracking && (
        <View style={styles.footer}>
          <Text variant="bodySmall" style={{ color: theme.colors.outline, textAlign: 'center' }}>
            📢 Notification mode: System notifications only (no alarm)
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
  chipRow: { flexDirection: 'row', flexWrap: 'wrap' },
  section: { marginBottom: 16 },
  input: { backgroundColor: '#f9f9f9', borderRadius: 8 },
  results: { borderRadius: 12, overflow: 'hidden', marginTop: 4, marginBottom: 8 },
  resultItem: { paddingVertical: 12, paddingHorizontal: 16 },
  actionBtn: { paddingVertical: 8, borderRadius: 12, marginTop: 8 },
  footer: { marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#e0e0e0' },
});

export default NotificationPanel;
