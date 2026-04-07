import { View, Modal, Animated, ScrollView, StyleSheet } from 'react-native';
import { Text, TextInput, Surface, Chip, Divider, IconButton, useTheme } from 'react-native-paper';

const SettingsModal = ({
  visible, onClose, slideAnim,
  selectedSound, availableSounds, onSoundChange,
  selectedVibration, availableVibrations, onVibrationChange,
  customVibrationDuration, onCustomVibrationChange,
  busStopNotifyRadius, onNotifyRadiusChange,
  isDarkMode, onThemeToggle,
}) => {
  const theme = useTheme();

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Animated.View style={[styles.content, { backgroundColor: theme.colors.surface, transform: [{ translateY: slideAnim }] }]}>
          <Surface style={[styles.header, { backgroundColor: theme.colors.surface }]} elevation={4}>
            <View style={styles.headerRow}>
              <Text variant="headlineSmall" style={{ fontWeight: 'bold' }}>⚙️ Settings</Text>
              <IconButton icon="close" onPress={onClose} />
            </View>
          </Surface>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* Sound */}
            <View style={styles.section}>
              <Text variant="labelMedium" style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>🔔 Alarm Sound</Text>
              <View style={styles.chips}>
                {availableSounds.map((s) => (
                  <Chip key={s.type} selected={selectedSound === s.type} onPress={() => onSoundChange(s.type)}
                    style={[styles.chip, selectedSound === s.type && { backgroundColor: theme.colors.primary }]}
                    textStyle={{ color: selectedSound === s.type ? '#fff' : theme.colors.onSurface, fontSize: 12 }}
                  >{s.name}</Chip>
                ))}
              </View>
            </View>

            <Divider style={styles.divider} />

            {/* Vibration */}
            <View style={styles.section}>
              <Text variant="labelMedium" style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>📳 Vibration Pattern</Text>
              <View style={styles.chips}>
                {availableVibrations.map((v) => (
                  <Chip key={v.type} selected={selectedVibration === v.type} onPress={() => onVibrationChange(v.type)}
                    style={[styles.chip, selectedVibration === v.type && { backgroundColor: theme.colors.primary }]}
                    textStyle={{ color: selectedVibration === v.type ? '#fff' : theme.colors.onSurface, fontSize: 12 }}
                  >{v.name}</Chip>
                ))}
              </View>
            </View>

            {selectedVibration === 'CUSTOM' && (
              <>
                <Divider style={styles.divider} />
                <TextInput mode="outlined" label="Custom Duration (ms)" value={customVibrationDuration}
                  onChangeText={onCustomVibrationChange} keyboardType="numeric" left={<TextInput.Icon icon="timer" />} />
              </>
            )}

            <Divider style={styles.divider} />

            {/* Bus Stop Notify Radius */}
            <View style={styles.section}>
              <Text variant="labelMedium" style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>🚏 Bus Stop Notify Radius (m)</Text>
              <TextInput mode="outlined" value={String(busStopNotifyRadius)} onChangeText={onNotifyRadiusChange}
                keyboardType="numeric" left={<TextInput.Icon icon="map-marker-radius" />} />
            </View>

            <Divider style={styles.divider} />

            {/* Theme */}
            <View style={styles.section}>
              <View style={[styles.themeRow, { backgroundColor: theme.colors.surfaceVariant || '#f5f5f5' }]}>
                <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                  {isDarkMode ? '🌙 Dark Mode' : '☀️ Light Mode'}
                </Text>
                <IconButton icon={isDarkMode ? 'moon-waning-crescent' : 'white-balance-sunny'}
                  iconColor={isDarkMode ? '#FFD700' : '#FFA500'} size={28} onPress={onThemeToggle} />
              </View>
            </View>

            <View style={{ height: 40 }} />
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  content: { borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%', elevation: 10 },
  header: { paddingHorizontal: 16, paddingVertical: 12, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  body: { padding: 16 },
  section: { marginBottom: 8 },
  label: { marginBottom: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { marginBottom: 4 },
  divider: { marginVertical: 16 },
  themeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 12, borderRadius: 12 },
});

export default SettingsModal;
