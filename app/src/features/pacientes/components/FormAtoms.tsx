import React from 'react';
import { View, Text, StyleSheet, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing } from '../../../constants/theme';

export const SectionTitle = ({ icon, title }: { icon: keyof typeof Ionicons.glyphMap; title: string }) => (
  <View style={styles.sectionTitle}>
    <Ionicons name={icon} size={14} color={Colors.primary} />
    <Text style={styles.sectionTitleText}>{title}</Text>
  </View>
);

export const AntecedentRow = ({
  label,
  sub,
  value,
  onToggle,
}: {
  label: string;
  sub?: string;
  value: boolean;
  onToggle: (v: boolean) => void;
}) => (
  <View style={styles.antecedentRow}>
    <View style={styles.antecedentInfo}>
      <Text style={styles.antecedentLabel}>{label}</Text>
      {sub && <Text style={styles.antecedentSub}>{sub}</Text>}
    </View>
    <Switch
      value={value}
      onValueChange={onToggle}
      trackColor={{ false: Colors.bgCardLight, true: Colors.primaryGlow }}
      thumbColor={value ? Colors.primary : Colors.textMuted}
    />
  </View>
);

const styles = StyleSheet.create({
  sectionTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  sectionTitleText: {
    color: Colors.primary,
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.bold,
    letterSpacing: 1.5,
  },
  antecedentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    gap: 12,
  },
  antecedentInfo: { flex: 1 },
  antecedentLabel: { color: Colors.textPrimary, fontSize: Typography.size.base },
  antecedentSub: { color: Colors.textMuted, fontSize: Typography.size.xs, marginTop: 2 },
});
