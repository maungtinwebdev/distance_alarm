import { useState, useRef, useEffect } from 'react';
import { View, TouchableOpacity, Animated, StyleSheet, Platform } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { PALETTE, SHADOWS, RADIUS, SPACING } from '../theme/colors';

const MODES = [
  { key: 'alarm', icon: '🔔', label: 'Alarm' },
  { key: 'notification', icon: '📢', label: 'Notify' },
];

const ModeSelector = ({ activeMode, onModeChange, disabled }) => {
  const theme = useTheme();
  const [containerWidth, setContainerWidth] = useState(0);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const isDark = theme.dark;

  useEffect(() => {
    // Bounce + slide animation
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: activeMode === 'alarm' ? 0 : 1,
        useNativeDriver: true,
        tension: 68,
        friction: 10,
      }),
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 0.96,
          duration: 80,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 120,
          friction: 8,
        }),
      ]),
    ]).start();
  }, [activeMode]);

  const tabWidth = containerWidth > 0 ? containerWidth / 2 : 0;
  const indicatorPad = 4;

  const modeColors = {
    alarm: theme.colors.primary,
    notification: theme.colors.secondary || '#43A047',
  };

  return (
    <View
      style={styles.wrapper}
      onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
    >
      <Animated.View
        style={[
          styles.container,
          {
            backgroundColor: isDark
              ? 'rgba(38, 46, 62, 0.85)'
              : 'rgba(238, 241, 246, 0.9)',
            borderColor: isDark
              ? 'rgba(77, 166, 255, 0.08)'
              : 'rgba(0, 0, 0, 0.04)',
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {/* ── Animated Pill Indicator ── */}
        {containerWidth > 0 && (
          <Animated.View
            style={[
              styles.indicator,
              {
                width: tabWidth - indicatorPad * 2,
                backgroundColor: modeColors[activeMode],
                transform: [
                  {
                    translateX: slideAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [indicatorPad, tabWidth + indicatorPad],
                    }),
                  },
                ],
              },
              SHADOWS.md,
              {
                shadowColor: modeColors[activeMode],
                shadowOpacity: 0.3,
              },
            ]}
          />
        )}

        {/* ── Tabs ── */}
        {MODES.map((mode) => {
          const isActive = activeMode === mode.key;
          return (
            <TouchableOpacity
              key={mode.key}
              style={styles.tab}
              onPress={() => !disabled && onModeChange(mode.key)}
              activeOpacity={disabled ? 1 : 0.7}
            >
              <Text
                style={[
                  styles.tabLabel,
                  {
                    color: isActive
                      ? '#FFFFFF'
                      : isDark
                        ? PALETTE.gray400
                        : PALETTE.gray600,
                    fontWeight: isActive ? '700' : '500',
                  },
                ]}
              >
                {mode.icon}  {mode.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 0,
    paddingVertical: SPACING.sm,
  },
  container: {
    flexDirection: 'row',
    borderRadius: RADIUS.lg,
    padding: 4,
    position: 'relative',
    height: 52,
    borderWidth: 1,
    ...Platform.select({
      ios: {
        // backdrop blur effect on iOS
      },
      android: {},
    }),
  },
  indicator: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    borderRadius: RADIUS.md,
  },
  tab: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  tabLabel: {
    fontSize: 15,
    letterSpacing: 0.3,
  },
});

export default ModeSelector;
