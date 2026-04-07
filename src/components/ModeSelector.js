import { useState, useRef, useEffect } from 'react';
import { View, TouchableOpacity, Animated, StyleSheet } from 'react-native';
import { Text, useTheme } from 'react-native-paper';

const MODES = [
  { key: 'alarm', label: '🔔 Alarm' },
  { key: 'notification', label: '📢 Notify' },
];

const ModeSelector = ({ activeMode, onModeChange, disabled }) => {
  const theme = useTheme();
  const [containerWidth, setContainerWidth] = useState(0);
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: activeMode === 'alarm' ? 0 : 1,
      useNativeDriver: true,
      tension: 80,
      friction: 12,
    }).start();
  }, [activeMode]);

  const tabWidth = containerWidth / 2;

  return (
    <View
      style={styles.wrapper}
      onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
    >
      <View style={[styles.container, { backgroundColor: theme.colors.surfaceVariant || '#e0e0e0' }]}>  
        {containerWidth > 0 && (
          <Animated.View
            style={[
              styles.indicator,
              {
                width: tabWidth - 6,
                backgroundColor: theme.colors.primary,
                transform: [{
                  translateX: slideAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [3, tabWidth + 3],
                  }),
                }],
              },
            ]}
          />
        )}
        {MODES.map((mode) => (
          <TouchableOpacity
            key={mode.key}
            style={styles.tab}
            onPress={() => !disabled && onModeChange(mode.key)}
            activeOpacity={disabled ? 1 : 0.7}
          >
            <Text
              variant="labelLarge"
              style={{
                color: activeMode === mode.key ? '#ffffff' : (theme.colors.onSurfaceVariant || '#666'),
                fontWeight: activeMode === mode.key ? 'bold' : '500',
                fontSize: 14,
              }}
            >
              {mode.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  container: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 3,
    position: 'relative',
    height: 48,
  },
  indicator: {
    position: 'absolute',
    top: 3,
    bottom: 3,
    borderRadius: 13,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  tab: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
});

export default ModeSelector;
