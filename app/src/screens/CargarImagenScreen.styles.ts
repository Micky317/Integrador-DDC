import { StyleSheet, Platform } from 'react-native';
import { Colors, Typography, Spacing, Radius } from '../constants/theme';

export const styles = StyleSheet.create({
  gradient: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingTop: 58,
    paddingBottom: Spacing.md,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  backText: { color: Colors.textPrimary, fontSize: Typography.size.base },
  headerTitle: {
    color: Colors.textPrimary,
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.bold,
  },

  container: { flex: 1 },
  scrollContent: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xl, gap: Spacing.md },

  patientBanner: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  patientBannerRapido: {
    borderLeftColor: '#FFB400',
    backgroundColor: 'rgba(255, 180, 0, 0.06)',
  },
  patientBannerLeft: { flex: 1 },
  patientBannerLabel: {
    color: Colors.primary,
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.bold,
    letterSpacing: 1,
  },
  patientBannerName: {
    color: Colors.textPrimary,
    fontSize: Typography.size.base,
    fontWeight: Typography.weight.semibold,
    marginTop: 2,
  },
  patientBannerBar: { width: 2, height: 30, backgroundColor: Colors.primary, opacity: 0 },

  dropZone: {
    height: 160,
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.lg,
    borderWidth: 2,
    borderColor: Colors.borderDefault,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  dropTitle: {
    color: Colors.textPrimary,
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.semibold,
  },
  dropSub: { color: Colors.textMuted, fontSize: Typography.size.sm },

  imagePreviewContainer: {
    height: 220,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    paddingTop: Spacing.xl,
    gap: 8,
  },
  imageOverlayText: {
    color: Colors.textPrimary,
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.bold,
  },

  optionsCard: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.borderCard,
    overflow: 'hidden',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: 12,
  },
  optionRowSelected: { backgroundColor: Colors.primaryGlow },
  optionIcon: {
    width: 36,
    height: 36,
    borderRadius: Radius.sm,
    backgroundColor: Colors.bgCardLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionIconSelected: { backgroundColor: Colors.primary },
  optionText: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: Typography.size.base,
  },
  optionTextSelected: { color: Colors.primary, fontWeight: Typography.weight.semibold },
  optionDivider: { height: 1, backgroundColor: Colors.borderDefault, marginLeft: 64 },

  guideCard: {
    flexDirection: 'row',
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderCard,
    gap: 10,
    alignItems: 'flex-start',
  },
  guideText: { flex: 1, color: Colors.textSecondary, fontSize: Typography.size.sm, lineHeight: 18 },
  guideBold: { color: Colors.textPrimary, fontWeight: Typography.weight.semibold },

  bottomBar: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? 110 : 90,
    paddingTop: Spacing.md,
    backgroundColor: Colors.bgDeep + 'EE',
  },
});
