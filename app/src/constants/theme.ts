import { moderateScale, scale, verticalScale } from '../utils/responsive';

// DDC Pasitos Firmes — Design Tokens
// Basado en los mockups: dark navy/blue-black con acentos cyan/teal

export const Colors = {
  // Fondos principales (dark theme)
  bgDeep: '#090D1F',       // Fondo más oscuro (gradiente top)
  bgDark: '#0D1225',       // Fondo principal
  bgCard: '#141830',       // Tarjetas y contenedores
  bgCardLight: '#1A1F38',  // Tarjetas con hover / inputs
  bgInput: '#1C2140',      // Inputs de formulario

  // Acento principal — Cyan/Teal (el color primario de los mockups)
  primary: '#00E5CC',      // Cyan brillante (botón principal, resaltes)
  primaryDim: '#00B8A3',   // Cyan oscurecido
  primaryGlow: 'rgba(0, 229, 204, 0.15)', // Glow para bordes activos

  // Acento secundario — Azul índigo
  accent: '#4D6EE3',
  accentDim: '#3A58C4',

  // Semáforo diagnóstico
  statusNormal: '#00C48C',    // Verde — Normal
  statusWarning: '#FFB400',   // Amarillo — Limítrofe
  statusDanger: '#FF4757',    // Rojo — Severo (Yeso)
  statusUrgent: '#9B51E0',    // Púrpura — Crítico (Cirugía)

  // Texto
  textPrimary: '#FFFFFF',
  textSecondary: '#8892B0',
  textMuted: '#4A5568',
  textCyan: '#00E5CC',

  // Bordes
  borderDefault: '#1E2740',
  borderActive: '#00E5CC',
  borderCard: '#212842',

  // Gradientes (definidos como arrays para LinearGradient)
  gradientBg: ['#090D1F', '#0D1B3E'] as [string, string],
  gradientBtn: ['#00E5CC', '#00B8A3'] as [string, string],
  gradientCard: ['#141830', '#1A1F38'] as [string, string],

  // Avatares
  avatarVariants: ['#4D6EE3', '#00C48C', '#FF4757', '#FFB400'] as string[],
};

export const Typography = {
  // Fuentes premium
  fonts: {
    regular: 'Inter_400Regular',
    medium: 'Inter_500Medium',
    semibold: 'Inter_600SemiBold',
    bold: 'Inter_700Bold',
  },
  
  // Tamaños - Escalados moderadamente para que las fuentes no sean absurdas en iPads
  size: {
    xs: moderateScale(10),
    sm: moderateScale(12),
    base: moderateScale(14),
    md: moderateScale(16),
    lg: moderateScale(18),
    xl: moderateScale(22),
    xxl: moderateScale(28),
    hero: moderateScale(34),
  },

  // Pesos (Fallbacks para iOS)
  weight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extrabold: '800' as const,
  },
};

export const Spacing = {
  xs: scale(4),
  sm: scale(8),
  md: scale(16),
  lg: scale(24),
  xl: scale(32),
  xxl: scale(48),
};

export const Radius = {
  sm: scale(8),
  md: scale(12),
  lg: scale(16),
  xl: scale(24),
  round: 9999,
};

export const Shadow = {
  card: {
    shadowColor: '#00E5CC',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
  },
  glow: {
    shadowColor: '#00E5CC',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
};
