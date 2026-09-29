import { Platform } from 'react-native';

/** XpressU design tokens. Dark-only, one vibrant accent. */
export const colors = {
  bg: '#0A0A0B',
  bgElevated: '#121214',
  card: '#17171A',
  cardHigh: '#1E1E22',
  border: '#26262B',
  borderStrong: '#34343B',
  text: '#FFFFFF',
  textSecondary: '#A1A1AA',
  textMuted: '#6B6B74',
  accent: '#FF3D71',
  accentPressed: '#E0305F',
  accentSoft: 'rgba(255, 61, 113, 0.14)',
  accentBorder: 'rgba(255, 61, 113, 0.4)',
  success: '#34D399',
  warning: '#FBBF24',
  danger: '#F87171',
  overlay: 'rgba(0,0,0,0.6)',
} as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28, xxxl: 40 } as const;

export const radius = { sm: 10, md: 14, lg: 20, xl: 28, pill: 999 } as const;

export const fontFamily = Platform.select({
  ios: 'System',
  android: 'sans-serif',
  default: 'System',
});

export const type = {
  display: { fontSize: 40, lineHeight: 44, fontWeight: '800', letterSpacing: -1.2 },
  title: { fontSize: 28, lineHeight: 34, fontWeight: '800', letterSpacing: -0.6 },
  heading: { fontSize: 20, lineHeight: 26, fontWeight: '700', letterSpacing: -0.3 },
  body: { fontSize: 16, lineHeight: 23, fontWeight: '400' },
  bodyStrong: { fontSize: 16, lineHeight: 23, fontWeight: '600' },
  reply: { fontSize: 18, lineHeight: 26, fontWeight: '500', letterSpacing: -0.1 },
  small: { fontSize: 14, lineHeight: 20, fontWeight: '400' },
  label: { fontSize: 12, lineHeight: 16, fontWeight: '800', letterSpacing: 1.4 },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '500' },
} as const;

export const layout = {
  /** Keep content readable on tablets / large Android phones. */
  maxContentWidth: 560,
  gutter: 20,
} as const;
