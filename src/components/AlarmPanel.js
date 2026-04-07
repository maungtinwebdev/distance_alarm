import { View, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Text, TextInput, Surface, ActivityIndicator, useTheme } from 'react-native-paper';
import { PALETTE, SHADOWS, RADIUS, SPACING, FONT_WEIGHT } from '../theme/colors';

const AlarmPanel = ({
  isTracking, isLoading, location, destination, distanceToDest,
  alarmRadius, radiusPreset, selectedBusStop,
  busStopSearch, busStopResults, isSearching, locationUpdates,
  onRadiusChange, onRadiusPresetChange, onBusStopSearch,
  onSelectBusStop, onStartTracking, onStopTracking,
}) => {
  const theme = useTheme();
  const isDark = theme.dark;
  const modeColor = theme.colors.primary;
  const modeColorLight = isDark ? 'rgba(43, 138, 255, 0.12)' : 'rgba(43, 138, 255, 0.08)';

  const formatDistance = (d) => {
    if (d > 1000) return { value: (d / 1000).toFixed(1), unit: 'km' };
    return { value: Math.round(d), unit: 'm' };
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

      {/* ── Tracking: Distance Card ── */}
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
              style={[styles.cardLabel, { color: modeColor }]}
            >
              DISTANCE TO DESTINATION
            </Text>
            <View style={styles.distanceRow}>
              <Text style={[styles.distanceValue, { color: modeColor }]}>
                {dist.value}
              </Text>
              <Text style={[styles.distanceUnit, { color: modeColor }]}>
                {dist.unit}
              </Text>
            </View>
            {selectedBusStop && (
              <Text variant="bodySmall" style={{ color: modeColor, marginTop: SPACING.xs }}>
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

      {/* ── Not tracking: Selected destination ── */}
      {!isTracking && destination && (
        <View
          style={[
            styles.infoCard,
            {
              backgroundColor: isDark ? 'rgba(43, 138, 255, 0.06)' : 'rgba(43, 138, 255, 0.04)',
              borderColor: isDark ? 'rgba(43, 138, 255, 0.12)' : 'rgba(43, 138, 255, 0.1)',
            },
          ]}
        >
          <View style={styles.infoCardHeader}>
            <View style={[styles.infoCardDot, { backgroundColor: modeColor }]} />
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

      {/* ── Bus Stop Search ── */}
      {!isTracking && (
        <View style={styles.searchSection}>
          <Text variant="labelMedium" style={[styles.sectionLabel, { color: theme.colors.onSurfaceVariant }]}>
            🔍 Search Bus Stop
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
                      onPress={() => onSelectBusStop(item)}
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

      {/* ── Radius Presets ── */}
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
                onPress={() => onRadiusPresetChange(p)}
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
            label="Custom Radius (meters)"
            value={alarmRadius}
            onChangeText={onRadiusChange}
            keyboardType="numeric"
            style={[styles.input, { marginTop: SPACING.sm }]}
            outlineStyle={{ borderRadius: RADIUS.sm }}
            left={<TextInput.Icon icon="ruler" />}
          />
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
            {isTracking ? '■  Stop Alarm' : '🔔  Start Alarm'}
          </Text>
        )}
      </TouchableOpacity>

      {/* ── Footer info ── */}
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

export default AlarmPanel;
