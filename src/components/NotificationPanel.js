import { View, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Text, TextInput, Surface, ActivityIndicator, useTheme } from 'react-native-paper';
import { getDirectionLabel, getBearing } from '../utils/direction';
import { PALETTE, SHADOWS, RADIUS, SPACING, FONT_WEIGHT } from '../theme/colors';

const NotificationPanel = ({
  isTracking, isLoading, location, nearestStop, nextStop,
  busStopNotifyRadius, selectedRefStop,
  busStopSearch, busStopResults, isSearching, locationUpdates,
  onBusStopSearch, onSelectRefStop, onStartTracking, onStopTracking,
}) => {
  const theme = useTheme();
  const isDark = theme.dark;
  const modeColor = theme.colors.secondary || '#43A047';
  const modeColorLight = isDark ? 'rgba(67, 160, 71, 0.12)' : 'rgba(67, 160, 71, 0.08)';

  const getDirectionText = () => {
    if (!location || !nextStop) return null;
    const bearing = getBearing(location.latitude, location.longitude, nextStop.lat, nextStop.lon);
    return getDirectionLabel(bearing);
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

      {/* ── Tracking: Nearest Stop Card ── */}
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
          <Text variant="labelSmall" style={[styles.cardLabel, { color: '#43A047' }]}>
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

      {/* ── Tracking: Predicted Next Stop ── */}
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
          <Text variant="labelSmall" style={[styles.cardLabel, { color: theme.colors.primary }]}>
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
            {getDirectionText() && (
              <View style={[styles.distChip, { backgroundColor: isDark ? 'rgba(43,138,255,0.15)' : 'rgba(43,138,255,0.1)' }]}>
                <Text style={{ color: theme.colors.primary, fontSize: 12, fontWeight: FONT_WEIGHT.semibold }}>
                  🧭 {getDirectionText()}
                </Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* ── Tracking: Scanning ── */}
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
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginLeft: SPACING.md }}>
              Scanning for bus stops...
            </Text>
          </View>
        </View>
      )}

      {/* ── Not tracking: Search bus stop ── */}
      {!isTracking && (
        <View style={styles.searchSection}>
          <Text variant="labelMedium" style={[styles.sectionLabel, { color: theme.colors.onSurfaceVariant }]}>
            🔍 Choose Reference Bus Stop
          </Text>
          <TextInput
            mode="outlined"
            label="Bus stop name"
            value={busStopSearch}
            onChangeText={onBusStopSearch}
            placeholder="e.g. Sule, Hledan..."
            style={styles.input}
            outlineStyle={{ borderRadius: RADIUS.sm }}
            left={<TextInput.Icon icon="bus-stop" />}
            right={isSearching ? <TextInput.Icon icon={() => <ActivityIndicator size={18} />} /> : null}
          />
          {busStopResults.length > 0 && (
            <Surface
              style={[styles.searchResults, { backgroundColor: isDark ? PALETTE.gray800 : PALETTE.white }]}
              elevation={4}
            >
              <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 180 }}>
                {busStopResults.map((item, i) => (
                  <View key={`${item.lat}-${item.lon}-${i}`}>
                    <TouchableOpacity
                      style={styles.searchItem}
                      onPress={() => onSelectRefStop(item)}
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
                    {i < busStopResults.length - 1 && (
                      <View style={[styles.resultDivider, { backgroundColor: isDark ? PALETTE.gray700 : PALETTE.gray200 }]} />
                    )}
                  </View>
                ))}
              </ScrollView>
            </Surface>
          )}
        </View>
      )}

      {/* ── Selected reference stop ── */}
      {!isTracking && selectedRefStop && (
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
            🚏 {selectedRefStop.name}
          </Text>
          <Text variant="bodySmall" style={{ marginTop: SPACING.xs, color: theme.colors.onSurfaceVariant }}>
            Notify radius: {busStopNotifyRadius}m
          </Text>
        </View>
      )}

      {/* ── Action Button ── */}
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
        onPress={isTracking ? onStopTracking : onStartTracking}
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

      {/* ── Footer info ── */}
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
    </ScrollView>
  );
};

const styles = StyleSheet.create({
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
  distChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
    borderRadius: RADIUS.pill,
    marginTop: SPACING.sm,
  },
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

export default NotificationPanel;
