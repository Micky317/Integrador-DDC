import { StyleSheet, Dimensions } from 'react-native';
import { Colors, Spacing, Radius, Typography } from '../../../constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const styles = StyleSheet.create({
  gradient: { flex: 1 },
  center: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: Colors.bgDark 
  },
  topBar: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    paddingHorizontal: Spacing.lg, 
    paddingTop: 60, 
    alignItems: 'center', 
    paddingBottom: Spacing.sm 
  },
  topTitle: { 
    color: '#FFF', 
    fontSize: Typography.size.lg, 
    fontFamily: Typography.fonts.bold 
  },
  backBtn: { 
    width: 40, 
    height: 40, 
    alignItems: 'center', 
    justifyContent: 'center', 
    borderRadius: 20, 
    backgroundColor: 'rgba(255,255,255,0.05)' 
  },
  scroll: { 
    paddingHorizontal: Spacing.xl, 
    paddingTop: Spacing.md, 
    paddingBottom: 120 
  },
  babyHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: Spacing.md, 
    marginBottom: Spacing.xl, 
    backgroundColor: Colors.bgCardLight + '60', 
    padding: Spacing.md, 
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.borderCard
  },
  avatarMini: { 
    width: 44, 
    height: 44, 
    borderRadius: Radius.round, 
    backgroundColor: Colors.primary + '20', 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  avatarMiniText: { 
    color: Colors.primary, 
    fontFamily: Typography.fonts.bold, 
    fontSize: Typography.size.lg 
  },
  babyName: { 
    color: '#FFF', 
    fontSize: 18, 
    fontFamily: Typography.fonts.bold 
  },
  instruction: { 
    color: Colors.textSecondary, 
    fontSize: Typography.size.sm 
  },
  activeHeader: { 
    marginBottom: Spacing.sm, 
    alignItems: 'center' 
  },
  activeTitle: { 
    color: '#FFF', 
    fontSize: Typography.size.xxl, 
    fontFamily: Typography.fonts.bold, 
    textAlign: 'center' 
  },
  activeSub: { 
    fontSize: Typography.size.md, 
    fontFamily: Typography.fonts.semibold, 
    marginTop: Spacing.xs, 
    opacity: 0.9, 
    textAlign: 'center' 
  },
  videoCard: { 
    height: 240, 
    borderRadius: Radius.xl, 
    overflow: 'hidden', 
    backgroundColor: Colors.bgDeep,
    borderWidth: 1,
    borderColor: Colors.borderCard
  },
  timerContainer: { 
    alignItems: 'center', 
    marginBottom: Spacing.xl 
  },
  mainBtn: { 
    width: 180, 
    height: 56, 
    borderRadius: Radius.round 
  },
  controlsRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: Spacing.md,
    marginTop: Spacing.lg
  },
  secondaryBtn: { 
    width: 56, 
    height: 56, 
    borderRadius: Radius.round, 
    borderWidth: 1, 
    borderColor: Colors.borderCard,
    alignItems: 'center', 
    justifyContent: 'center', 
    backgroundColor: Colors.bgCardLight 
  },
  seriesIndicator: { 
    backgroundColor: Colors.primary + '10', 
    paddingHorizontal: Spacing.md, 
    paddingVertical: 6, 
    borderRadius: Radius.round, 
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.primary + '20'
  },
  seriesIndicatorText: { 
    fontSize: Typography.size.sm, 
    fontFamily: Typography.fonts.bold 
  },
  sectionTitle: { 
    color: '#FFF', 
    fontSize: Typography.size.lg, 
    fontFamily: Typography.fonts.bold, 
    marginBottom: Spacing.md 
  },
  instructionCard: { 
    padding: Spacing.lg, 
    gap: Spacing.md 
  },
  step: { 
    flexDirection: 'row', 
    gap: Spacing.md, 
    alignItems: 'flex-start' 
  },
  stepNum: { 
    width: 26, 
    height: 26, 
    borderRadius: Radius.md, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginTop: 2 
  },
  stepNumText: { 
    color: '#FFF', 
    fontSize: Typography.size.sm, 
    fontFamily: Typography.fonts.bold 
  },
  stepText: { 
    flex: 1, 
    color: Colors.textSecondary, 
    fontSize: Typography.size.md, 
    lineHeight: 22 
  },
  modalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.8)', 
    justifyContent: 'flex-end' 
  },
  modalContent: { 
    borderTopLeftRadius: Radius.xl, 
    borderTopRightRadius: Radius.xl, 
    padding: Spacing.xl, 
    paddingBottom: 50, 
    borderTopWidth: 1, 
    borderColor: Colors.borderCard,
    backgroundColor: Colors.bgDark
  },
  modalHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: Spacing.xl 
  },
  modalTitle: { 
    color: '#FFF', 
    fontSize: Typography.size.xl, 
    fontFamily: Typography.fonts.bold 
  },
  sectionLabel: { 
    color: Colors.textMuted, 
    fontSize: Typography.size.sm, 
    fontFamily: Typography.fonts.bold, 
    textTransform: 'uppercase', 
    letterSpacing: 1, 
    marginBottom: Spacing.md 
  },
  seriesRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    marginBottom: Spacing.xl 
  },
  seriesBubble: { 
    width: 50, 
    height: 50, 
    borderRadius: Radius.round, 
    borderWidth: 1, 
    borderColor: Colors.borderDefault, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  seriesText: { 
    color: Colors.textSecondary, 
    fontSize: Typography.size.lg, 
    fontFamily: Typography.fonts.bold 
  },
  wheelsRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    height: 160, 
    marginBottom: Spacing.md 
  },
  wheelSeparator: { 
    color: '#FFF', 
    fontSize: Typography.size.xl, 
    fontFamily: Typography.fonts.bold, 
    marginHorizontal: Spacing.md 
  },
  totalBadge: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    gap: Spacing.sm, 
    backgroundColor: Colors.primary + '15', 
    padding: Spacing.md, 
    borderRadius: Radius.md, 
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.primary + '30'
  },
  totalText: { 
    color: Colors.primary, 
    fontSize: Typography.size.base 
  },
  startBtn: { 
    height: 60, 
    borderRadius: Radius.round 
  },
  dropdownHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    padding: Spacing.md, 
    backgroundColor: Colors.bgCardLight, 
    borderRadius: Radius.lg, 
    borderWidth: 1, 
    borderColor: Colors.borderCard 
  },
  voiceIconCircle: { 
    width: 32, 
    height: 32, 
    borderRadius: Radius.round, 
    backgroundColor: Colors.primary + '15', 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  dropdownLabel: { 
    color: Colors.textMuted, 
    fontSize: Typography.size.xs, 
    textTransform: 'uppercase', 
    letterSpacing: 0.5 
  },
  selectedVoiceName: { 
    color: '#FFF', 
    fontSize: Typography.size.md, 
    fontFamily: Typography.fonts.bold, 
    marginTop: 2 
  },
  dropdownList: { 
    backgroundColor: Colors.bgCard, 
    borderBottomLeftRadius: Radius.lg, 
    borderBottomRightRadius: Radius.lg, 
    borderWidth: 1, 
    borderTopWidth: 0, 
    borderColor: Colors.borderCard, 
    overflow: 'hidden' 
  },
  dropdownItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    padding: Spacing.md, 
    borderTopWidth: 1, 
    borderTopColor: Colors.borderDefault 
  },
  dropdownItemText: { 
    color: Colors.textSecondary, 
    fontSize: Typography.size.base 
  },
  videoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: Colors.primary + '40',
    backgroundColor: Colors.primary + '05'
  },
  videoBtnText: {
    fontSize: Typography.size.md,
    fontFamily: Typography.fonts.bold,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md
  },
  infoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.primary + '10',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.sm
  },
  infoBadgeText: {
    color: Colors.primary,
    fontSize: Typography.size.xs,
    fontFamily: Typography.fonts.bold,
    textTransform: 'uppercase'
  },
  loadingOverlay: {
    flex: 1,
    backgroundColor: 'rgba(9, 13, 31, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContent: {
    padding: Spacing.xl,
    borderRadius: Radius.xl,
    alignItems: 'center',
    width: '80%',
    gap: Spacing.md,
  },
  loadingText: {
    color: '#FFF',
    fontSize: Typography.size.lg,
    fontFamily: Typography.fonts.bold,
    marginTop: Spacing.sm,
  },
  loadingSub: {
    color: Colors.textSecondary,
    fontSize: Typography.size.sm,
    textAlign: 'center',
  }
});
