/**
 * Design Tokens — Distance Alarm
 * Premium color palette, gradients, shadows, spacing, and typography.
 */

export const PALETTE = {
  // ── Core Blues ──
  blue50:  '#EBF5FF',
  blue100: '#CCE5FF',
  blue200: '#99CBFF',
  blue400: '#4DA6FF',
  blue500: '#2B8AFF',
  blue600: '#1A6FE0',
  blue700: '#0D52B3',
  blue800: '#003D8F',
  blue900: '#001F4D',

  // ── Greens (Notification mode) ──
  green50:  '#E8F5E9',
  green100: '#C8E6C9',
  green400: '#66BB6A',
  green500: '#43A047',
  green600: '#2E7D32',
  green700: '#1B5E20',
  green800: '#114411',

  // ── Reds / Errors ──
  red400: '#EF5350',
  red500: '#E53935',
  red600: '#D32F2F',

  // ── Warm Accents ──
  amber400: '#FFCA28',
  amber500: '#FFC107',
  orange500: '#FF9800',

  // ── Neutrals ──
  white:    '#FFFFFF',
  gray50:   '#FAFBFC',
  gray100:  '#F0F2F5',
  gray150:  '#E8ECF0',
  gray200:  '#DEE2E8',
  gray300:  '#C4CCD6',
  gray400:  '#A0AAB8',
  gray500:  '#78839A',
  gray600:  '#5A6478',
  gray700:  '#3D4558',
  gray800:  '#262E3E',
  gray850:  '#1E2433',
  gray900:  '#151A26',
  gray950:  '#0E1219',
  black:    '#000000',
};

// ── Gradient Presets ──
export const GRADIENTS = {
  alarmCard:       [PALETTE.blue600, PALETTE.blue800],
  notifyCard:      [PALETTE.green600, PALETTE.green800],
  dangerCard:      [PALETTE.red500, PALETTE.red600],
  headerLight:     [PALETTE.white, PALETTE.gray50],
  headerDark:      [PALETTE.gray900, PALETTE.gray950],
  panelLight:      [PALETTE.white, PALETTE.gray50],
  panelDark:       [PALETTE.gray850, PALETTE.gray900],
  modeAlarm:       ['#2B8AFF', '#1A6FE0'],
  modeNotify:      ['#43A047', '#2E7D32'],
};

// ── Shadows ──
export const SHADOWS = {
  sm: {
    shadowColor: PALETTE.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: PALETTE.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 5,
  },
  lg: {
    shadowColor: PALETTE.black,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 10,
  },
  glow: (color) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  }),
};

// ── Spacing & Radius ──
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const RADIUS = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  xxl: 32,
  pill: 999,
};

// ── Typography weights ──
export const FONT_WEIGHT = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  extrabold: '800',
};
