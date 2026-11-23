import type { TextStyle } from 'react-native';

export const colors = {
  background: '#000000',
  surface: '#0A0A0E',
  surfaceElevated: '#111117',
  surfaceHigh: '#18181F',
  card: '#0E0E13',
  border: 'rgba(255,255,255,0.08)',
  borderStrong: 'rgba(255,255,255,0.14)',
  overlay: 'rgba(0,0,0,0.72)',
  primary: '#A855F7',
  primaryDeep: '#7C3AED',
  primarySoft: 'rgba(168,85,247,0.14)',
  primarySofter: 'rgba(168,85,247,0.07)',
  violet: '#C084FC',
  lavender: '#E9D5FF',
  text: '#F7F5FB',
  textSecondary: '#ABA5BA',
  textTertiary: '#716B80',
  textInverse: '#0A0710',
  success: '#34D399',
  successSoft: 'rgba(52,211,153,0.12)',
  danger: '#FB7185',
  dangerSoft: 'rgba(251,113,133,0.12)',
  warning: '#FBBF24',
  warningSoft: 'rgba(251,191,36,0.12)',
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
} as const;

export const gradients = {
  primary: ['#D8B4FE', '#A855F7', '#6D28D9'] as const,
  primarySoft: ['rgba(168,85,247,0.28)', 'rgba(109,40,217,0.04)'] as const,
  player: ['#1C0B33', '#0A070F', '#000000'] as const,
  card: ['rgba(124,58,237,0.18)', 'rgba(10,10,14,0.2)'] as const,
  scrim: ['rgba(0,0,0,0)', 'rgba(0,0,0,0.82)', '#000000'] as const,
  topScrim: ['rgba(0,0,0,0.65)', 'rgba(0,0,0,0)'] as const,
} as const;

export const coverGradients: readonly (readonly [string, string, string])[] = [
  ['#4C1D95', '#7C3AED', '#1E1B4B'],
  ['#831843', '#BE185D', '#1F0715'],
  ['#164E63', '#0891B2', '#082F49'],
  ['#14532D', '#16A34A', '#052E16'],
  ['#7C2D12', '#EA580C', '#1C0A03'],
  ['#312E81', '#6366F1', '#0B0A1F'],
  ['#581C87', '#A855F7', '#1A0729'],
  ['#1E3A8A', '#3B82F6', '#080F24'],
] as const;

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
  massive: 56,
} as const;

export const radii = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  xxl: 32,
  pill: 999,
} as const;

export const fonts = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  extrabold: 'PlusJakartaSans_800ExtraBold',
} as const;

export const typography = {
  display: {
    fontFamily: fonts.extrabold,
    fontSize: 34,
    lineHeight: 40,
    letterSpacing: -1.1,
    color: colors.text,
  },
  h1: {
    fontFamily: fonts.extrabold,
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.7,
    color: colors.text,
  },
  h2: {
    fontFamily: fonts.bold,
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: -0.4,
    color: colors.text,
  },
  h3: {
    fontFamily: fonts.bold,
    fontSize: 18,
    lineHeight: 23,
    letterSpacing: -0.2,
    color: colors.text,
  },
  bodyLarge: {
    fontFamily: fonts.regular,
    fontSize: 16,
    lineHeight: 24,
    color: colors.text,
  },
  body: {
    fontFamily: fonts.regular,
    fontSize: 14.5,
    lineHeight: 21,
    color: colors.text,
  },
  bodyMedium: {
    fontFamily: fonts.medium,
    fontSize: 14.5,
    lineHeight: 21,
    color: colors.text,
  },
  bodyBold: {
    fontFamily: fonts.bold,
    fontSize: 14.5,
    lineHeight: 21,
    color: colors.text,
  },
  small: {
    fontFamily: fonts.medium,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
  },
  smallBold: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    lineHeight: 18,
    color: colors.text,
  },
  caption: {
    fontFamily: fonts.medium,
    fontSize: 12,
    lineHeight: 16,
    color: colors.textSecondary,
  },
  captionBold: {
    fontFamily: fonts.bold,
    fontSize: 11,
    lineHeight: 15,
    color: colors.textSecondary,
    letterSpacing: 0.2,
  },
  label: {
    fontFamily: fonts.bold,
    fontSize: 10.5,
    lineHeight: 14,
    letterSpacing: 1.4,
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
} satisfies Record<string, TextStyle>;

export const shadows = {
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 8,
  },
  floating: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.5,
    shadowRadius: 28,
    elevation: 14,
  },
  glow: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 22,
    elevation: 12,
  },
} as const;

export const layout = {
  screenPadding: 20,
  tabBarHeight: 62,
  miniPlayerHeight: 62,
  maxContentWidth: 720,
  artworkRadius: 14,
} as const;

export const theme = {
  colors,
  gradients,
  coverGradients,
  spacing,
  radii,
  fonts,
  typography,
  shadows,
  layout,
};

export type Theme = typeof theme;
