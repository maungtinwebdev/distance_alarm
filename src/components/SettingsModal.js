import { View, Modal, Animated, ScrollView, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Text, TextInput, Surface, Chip, Divider, IconButton, useTheme } from 'react-native-paper';
import { PALETTE, SHADOWS, RADIUS, SPACING, FONT_WEIGHT } from '../theme/colors';

const SettingsModal = ({
  visible, onClose, slideAnim,
  selectedSound, availableSounds, onSoundChange,
  selectedVibration, availableVibrations, onVibrationChange,
  customVibrationDuration, onCustomVibrationChange,
  busStopNotifyRadius, onNotifyRadiusChange,
  alarmVolume, onAlarmVolumeChange,
  isDarkMode, onThemeToggle,
}) => {
  const theme = useTheme();
  const isDark = theme.dark;

  const sectionBg = isDark ? 'rgba(38, 46, 62, 0.5)' : 'rgba(238, 241, 246, 0.6)';
  const chipActiveBg = isDark ? theme.colors.primary : theme.colors.primary;
  const chipInactiveBg = isDark ? 'rgba(38, 46, 62, 0.9)' : 'rgba(238, 241, 246, 0.95)';

  const renderChipGroup = (items, selected, onSelect) => (
    <View style={styles.chips}>
      {items.map((item) => {
        const isActive = selected === item.type;
        return (
          <TouchableOpacity
            key={item.type}
            style={[
              styles.chipItem,
              {
                backgroundColor: isActive ? chipActiveBg : chipInactiveBg,
                borderColor: isActive
                  ? theme.colors.primary
                  : isDark ? 'rgba(77, 166, 255, 0.1)' : 'rgba(0,0,0,0.06)',
              },
              isActive && SHADOWS.sm,
              isActive && { shadowColor: theme.colors.primary, shadowOpacity: 0.25 },
            ]}
            onPress={() => onSelect(item.type)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.chipText,
                {
                  color: isActive ? '#FFFFFF' : theme.colors.onSurface,
                  fontWeight: isActive ? FONT_WEIGHT.semibold : FONT_WEIGHT.regular,
                },
              ]}
            >
              {item.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.content,
            {
              backgroundColor: isDark ? PALETTE.gray900 : PALETTE.white,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* ── Header ── */}
          <View
            style={[
              styles.header,
              {
                backgroundColor: isDark ? PALETTE.gray850 : PALETTE.gray50,
                borderBottomColor: isDark ? 'rgba(77,166,255,0.08)' : PALETTE.gray200,
              },
            ]}
          >
            <View style={styles.handleBar}>
              <View
                style={[
                  styles.handle,
                  { backgroundColor: isDark ? PALETTE.gray600 : PALETTE.gray300 },
                ]}
              />
            </View>
            <View style={styles.headerRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={[styles.headerIcon]}>⚙️</Text>
                <Text
                  variant="titleLarge"
                  style={[styles.headerTitle, { color: theme.colors.onSurface }]}
                >
                  Settings
                </Text>
              </View>
              <TouchableOpacity
                onPress={onClose}
                style={[
                  styles.closeBtn,
                  { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' },
                ]}
                activeOpacity={0.6}
              >
                <Text style={{ fontSize: 18, color: theme.colors.onSurfaceVariant }}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ── Body ── */}
          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>

            {/* Sound Section */}
            <View style={[styles.section, { backgroundColor: sectionBg }]}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionIcon}>🔔</Text>
                <Text variant="titleSmall" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
                  Alarm Sound
                </Text>
              </View>
              <Text variant="bodySmall" style={[styles.sectionDesc, { color: theme.colors.onSurfaceVariant }]}>
                Choose the sound that plays when you arrive
              </Text>
              {renderChipGroup(availableSounds, selectedSound, onSoundChange)}
            </View>

            {/* Vibration Section */}
            <View style={[styles.section, { backgroundColor: sectionBg }]}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionIcon}>📳</Text>
                <Text variant="titleSmall" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
                  Vibration Pattern
                </Text>
              </View>
              <Text variant="bodySmall" style={[styles.sectionDesc, { color: theme.colors.onSurfaceVariant }]}>
                Set vibration intensity when alarm triggers
              </Text>
              {renderChipGroup(availableVibrations, selectedVibration, onVibrationChange)}

              {selectedVibration === 'CUSTOM' && (
                <TextInput
                  mode="outlined"
                  label="Custom Duration (ms)"
                  value={customVibrationDuration}
                  onChangeText={onCustomVibrationChange}
                  keyboardType="numeric"
                  left={<TextInput.Icon icon="timer" />}
                  style={styles.input}
                  outlineStyle={{ borderRadius: RADIUS.sm }}
                />
              )}
            </View>

            {/* Alarm Volume */}
            <View style={[styles.section, { backgroundColor: sectionBg }]}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionIcon}>🔊</Text>
                <Text variant="titleSmall" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
                  Alarm Volume (%)
                </Text>
              </View>
              <Text variant="bodySmall" style={[styles.sectionDesc, { color: theme.colors.onSurfaceVariant }]}>
                Adjust the volume specifically for the alarm song
              </Text>
              <TextInput
                mode="outlined"
                value={String(alarmVolume)}
                onChangeText={onAlarmVolumeChange}
                keyboardType="numeric"
                left={<TextInput.Icon icon="volume-high" />}
                style={styles.input}
                outlineStyle={{ borderRadius: RADIUS.sm }}
              />
            </View>

            {/* Bus Stop Notify Radius */}
            <View style={[styles.section, { backgroundColor: sectionBg }]}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionIcon}>📍</Text>
                <Text variant="titleSmall" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
                  Bus Stop Alert Radius
                </Text>
              </View>
              <Text variant="bodySmall" style={[styles.sectionDesc, { color: theme.colors.onSurfaceVariant }]}>
                Notify when bus stops are within this distance (meters)
              </Text>
              <TextInput
                mode="outlined"
                value={String(busStopNotifyRadius)}
                onChangeText={onNotifyRadiusChange}
                keyboardType="numeric"
                left={<TextInput.Icon icon="map-marker-radius" />}
                style={styles.input}
                outlineStyle={{ borderRadius: RADIUS.sm }}
              />
            </View>

            {/* Theme Toggle */}
            <TouchableOpacity
              style={[
                styles.themeRow,
                {
                  backgroundColor: sectionBg,
                  borderColor: isDark ? 'rgba(77,166,255,0.08)' : 'rgba(0,0,0,0.04)',
                },
              ]}
              onPress={onThemeToggle}
              activeOpacity={0.7}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View
                  style={[
                    styles.themeIconWrap,
                    {
                      backgroundColor: isDark
                        ? 'rgba(255, 215, 0, 0.15)'
                        : 'rgba(255, 152, 0, 0.12)',
                    },
                  ]}
                >
                  <Text style={{ fontSize: 22 }}>{isDark ? '🌙' : '☀️'}</Text>
                </View>
                <View style={{ marginLeft: SPACING.md }}>
                  <Text
                    variant="titleSmall"
                    style={{ color: theme.colors.onSurface, fontWeight: FONT_WEIGHT.semibold }}
                  >
                    {isDark ? 'Dark Mode' : 'Light Mode'}
                  </Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
                    Tap to switch appearance
                  </Text>
                </View>
              </View>
              <View
                style={[
                  styles.toggleTrack,
                  {
                    backgroundColor: isDark ? theme.colors.primary : PALETTE.gray300,
                  },
                ]}
              >
                <View
                  style={[
                    styles.toggleKnob,
                    {
                      backgroundColor: PALETTE.white,
                      transform: [{ translateX: isDark ? 20 : 0 }],
                    },
                    SHADOWS.sm,
                  ]}
                />
              </View>
            </TouchableOpacity>

            <View style={{ height: 48 }} />
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  content: {
    borderTopLeftRadius: RADIUS.xxl,
    borderTopRightRadius: RADIUS.xxl,
    maxHeight: '92%',
    ...SHADOWS.lg,
  },
  header: {
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.lg,
    borderTopLeftRadius: RADIUS.xxl,
    borderTopRightRadius: RADIUS.xxl,
    borderBottomWidth: 1,
  },
  handleBar: {
    alignItems: 'center',
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerIcon: {
    fontSize: 22,
    marginRight: SPACING.sm,
  },
  headerTitle: {
    fontWeight: FONT_WEIGHT.bold,
    fontSize: 20,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  body: {
    padding: SPACING.lg,
  },
  section: {
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  sectionIcon: {
    fontSize: 18,
    marginRight: SPACING.sm,
  },
  sectionTitle: {
    fontWeight: FONT_WEIGHT.semibold,
  },
  sectionDesc: {
    marginBottom: SPACING.md,
    lineHeight: 18,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  chipItem: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm + 2,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
  },
  input: {
    marginTop: SPACING.md,
    backgroundColor: 'transparent',
  },
  themeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.md,
    borderWidth: 1,
  },
  themeIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toggleTrack: {
    width: 48,
    height: 28,
    borderRadius: 14,
    padding: 4,
    justifyContent: 'center',
  },
  toggleKnob: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  divider: {
    marginVertical: SPACING.lg,
  },
});

export default SettingsModal;
