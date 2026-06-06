import { StyleSheet } from 'react-native';
import { Colors, Spacing, Radius, Typography } from '../../../constants/theme';

export const authStyles = StyleSheet.create({
  flex: { flex: 1 },
  gradient: { flex: 1 },
  container: { flex: 1, backgroundColor: Colors.bgDark },
  scroll: { 
    flexGrow: 1,
    paddingHorizontal: Spacing.xl, 
    paddingTop: 60, 
    paddingBottom: 40 
  },
  
  // Back Button
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.lg,
  },
  backText: {
    color: Colors.textPrimary,
    fontSize: Typography.size.base,
    fontFamily: Typography.fonts.medium,
  },

  // Header
  header: { alignItems: 'center', marginBottom: Spacing.xl },
  iconWrapper: {
    borderRadius: Radius.xl,
    overflow: 'hidden',
    marginBottom: Spacing.md,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 12,
  },
  iconGrad: {
    width: 60,
    height: 60,
    borderRadius: Radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: Colors.textPrimary,
    fontSize: Typography.size.xl,
    fontFamily: Typography.fonts.bold,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: Typography.size.sm,
    fontFamily: Typography.fonts.regular,
    textAlign: 'center',
    marginTop: Spacing.xs,
    lineHeight: 20,
  },

  // Social
  socialRow: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.xl },
  socialBtnWrapper: { flex: 1 },
  socialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    gap: 8,
  },
  socialBtnText: {
    color: '#FFF',
    fontSize: Typography.size.base,
    fontFamily: Typography.fonts.semibold,
  },

  // Divider
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xl,
    gap: Spacing.md,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.borderDefault },
  dividerText: {
    color: Colors.textSecondary,
    fontSize: Typography.size.xs,
    fontFamily: Typography.fonts.medium,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  // Form
  form: { gap: 0 },

  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.primary + '12',
    borderWidth: 1,
    borderColor: Colors.primary + '30',
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: Spacing.sm,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  infoText: {
    flex: 1,
    color: Colors.textSecondary,
    fontSize: Typography.size.sm,
    fontFamily: Typography.fonts.regular,
    lineHeight: 18,
  },

  registerBtn: { marginTop: Spacing.md },

  // Footer
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: Spacing.xl,
    paddingBottom: Spacing.xl,
  },
  footerText: {
    color: Colors.textSecondary,
    fontSize: Typography.size.sm,
    fontFamily: Typography.fonts.regular,
  },
  footerLink: {
    color: Colors.primary,
    fontSize: Typography.size.sm,
    fontFamily: Typography.fonts.semibold,
  },
});
