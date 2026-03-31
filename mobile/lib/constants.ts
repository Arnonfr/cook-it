export const API_BASE_URL = 'https://cook-it-29ua.onrender.com/api';

export const COLORS = {
  primaryBlue: '#236EFF',
  deepBlue: '#0B52DB',
  accentOrange: '#FF5A37',
  accentYellow: '#FFE600',
  background: '#F0F4F8',
  surface: '#FFFFFF',
  textPrimary: '#262626',
  textSecondary: '#7B8794',
  border: '#E5E5E5',
  skeleton: '#E8EDF2',
  skeletonShimmer: '#F4F7FA',
  overlay: 'rgba(0,0,0,0.5)',
  glassBg: 'rgba(255,255,255,0.92)',
};

export const FONTS = {
  regular: 'NotoSansHebrew_400Regular',
  medium: 'NotoSansHebrew_500Medium',
  semiBold: 'NotoSansHebrew_600SemiBold',
  bold: 'NotoSansHebrew_700Bold',
};

export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const SHADOW = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
  },
  button: {
    shadowColor: '#236EFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
};

export const QUERY_CONFIG = {
  staleTime: 5 * 60 * 1000,   // 5 min — results stay fresh
  gcTime: 30 * 60 * 1000,     // 30 min — keep in memory cache
  retry: 2,
};

export const SEARCH_DEBOUNCE_MS = 280;
