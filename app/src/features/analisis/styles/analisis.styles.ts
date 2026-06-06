import { StyleSheet, Dimensions } from 'react-native';
import { Colors, Spacing, Radius, Typography, Shadow } from '../../../constants/theme';

export const analisisStyles = StyleSheet.create({
  gradient: { flex: 1 },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: Spacing.md, 
    paddingTop: 58, 
    paddingBottom: Spacing.sm 
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  backText: { color: Colors.textPrimary, fontSize: Typography.size.base },
  headerTitle: { 
    color: Colors.textPrimary, 
    fontSize: Typography.size.lg, 
    fontFamily: Typography.fonts.bold 
  },
  scroll: { paddingHorizontal: Spacing.lg, paddingBottom: 100 },
  subHeader: { marginBottom: Spacing.md },
  subLabel: { 
    color: Colors.primary, 
    fontSize: Typography.size.xs, 
    fontFamily: Typography.fonts.bold, 
    letterSpacing: 1.5, 
    marginBottom: 4 
  },
  mainTitle: { 
    color: Colors.textSecondary, 
    fontSize: Typography.size.xxl, 
    fontFamily: Typography.fonts.regular 
  },
  mainTitleBold: { 
    color: Colors.textPrimary, 
    fontFamily: Typography.fonts.bold 
  },
  
  // Image Card
  imageCard: { 
    backgroundColor: Colors.bgCard, 
    borderRadius: Radius.lg, 
    overflow: 'hidden', 
    marginBottom: Spacing.md, 
    height: 220, 
    borderWidth: 1, 
    borderColor: Colors.borderCard, 
    ...Shadow.card 
  },
  scanImage: { width: '100%', height: '100%' },
  imagePlaceholder: { 
    flex: 1, 
    alignItems: 'center', 
    justifyContent: 'center', 
    backgroundColor: Colors.bgCardLight 
  },
  scanIdTag: { 
    position: 'absolute', 
    top: 8, 
    left: 10, 
    backgroundColor: Colors.bgDeep + 'CC', 
    borderRadius: 6, 
    paddingHorizontal: 8, 
    paddingVertical: 3 
  },
  scanIdText: { 
    color: Colors.primary, 
    fontSize: 10, 
    fontFamily: Typography.fonts.bold, 
    letterSpacing: 1 
  },
  loadingOverlay: { 
    ...StyleSheet.absoluteFillObject, 
    backgroundColor: Colors.bgDeep + 'CC', 
    alignItems: 'center', 
    justifyContent: 'center', 
    gap: 12 
  },
  loadingText: { color: Colors.textPrimary, fontSize: Typography.size.sm },
  loadingSection: { alignItems: 'center', paddingVertical: Spacing.xl },
  loadingSubText: { 
    color: Colors.textSecondary, 
    fontSize: Typography.size.sm, 
    textAlign: 'center', 
    maxWidth: 280, 
    lineHeight: 20 
  },

  // Banner
  rapidoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255, 180, 0, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 180, 0, 0.25)',
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  rapidoBannerText: {
    flex: 1,
    color: Colors.textSecondary,
    fontSize: Typography.size.sm,
    lineHeight: 18,
  },
  validateBtn: { marginBottom: Spacing.sm },

  // Modals
  modalBg: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.95)', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  closeModalBtn: { position: 'absolute', top: 50, right: 20, zIndex: 10 },
  zoomHint: { 
    position: 'absolute', 
    bottom: 10, 
    right: 12, 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 4, 
    backgroundColor: 'rgba(0,0,0,0.5)', 
    paddingHorizontal: 8, 
    paddingVertical: 4, 
    borderRadius: 12 
  },
  zoomText: { color: Colors.primary, fontSize: 10, fontFamily: Typography.fonts.bold },
  
  historialBadge: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 8, 
    backgroundColor: Colors.bgCard, 
    padding: 12, 
    borderRadius: Radius.md, 
    borderLeftWidth: 3, 
    borderLeftColor: Colors.textMuted 
  },
  historialBadgeText: { color: Colors.textSecondary, fontSize: 12 },
});
