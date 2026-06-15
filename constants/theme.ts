export const Colors = {
  // Primary palette
  black: '#000000',
  gold: '#FFD700',
  goldDark: '#C9A800',
  goldLight: '#FFE74C',

  // Backgrounds
  bgPrimary: '#000000',
  bgSecondary: '#0A0A0A',
  bgCard: '#111111',
  bgElevated: '#1A1A1A',
  bgModal: '#0D0D0D',

  // Surface
  surface1: '#111111',
  surface2: '#1C1C1C',
  surface3: '#252525',

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: '#A0A0A0',
  textMuted: '#555555',
  textInverse: '#000000',

  // Border
  border: '#2A2A2A',
  borderLight: '#333333',
  borderGold: '#FFD70040',

  // Semantic
  success: '#22C55E',
  error: '#EF4444',
  warning: '#F59E0B',
  info: '#3B82F6',

  // Gradients (start, end)
  gradientGold: ['#FFD700', '#C9A800'] as [string, string],
  gradientDark: ['#1A1A1A', '#000000'] as [string, string],
  gradientCard: ['#1A1A1A', '#111111'] as [string, string],
  gradientHero: ['#000000', '#1A1A0A'] as [string, string],
};

export const Typography = {
  // Families
  fontBody: 'Inter_400Regular',
  fontBodyMedium: 'Inter_500Medium',
  fontBodySemiBold: 'Inter_600SemiBold',
  fontBodyBold: 'Inter_700Bold',
  fontHeading: 'Montserrat_700Bold',
  fontHeadingBold: 'Montserrat_800ExtraBold',
  fontHeadingMedium: 'Montserrat_600SemiBold',

  // Sizes
  xs: 11,
  sm: 13,
  base: 15,
  md: 17,
  lg: 20,
  xl: 24,
  '2xl': 28,
  '3xl': 34,
  '4xl': 40,

  // Line heights
  lineHeightTight: 1.2,
  lineHeightNormal: 1.5,
  lineHeightRelaxed: 1.7,
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
  '5xl': 64,
};

export const BorderRadius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  '2xl': 28,
  full: 9999,
};

export const Shadows = {
  gold: {
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 8,
  },
  soft: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
};
