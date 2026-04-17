import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Radius, Spacing } from '../../../constants/theme';
import { GlassContainer } from '../../../components/GlassContainer';
import { GrafBadge } from '../../../components/GrafBadge';
import { Analisis, colorPorDiagnostico } from '../../../types';

interface AnalisisHistorialCardProps {
  analisis: Analisis;
  onPress?: () => void;
}

export const AnalisisHistorialCard = ({ analisis, onPress }: AnalisisHistorialCardProps) => {
  const fecha = new Date(analisis.creadoEn).toLocaleDateString('es-BO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={styles.wrapper}>
      <GlassContainer intensity={15} style={styles.card}>
        {/* Header row */}
        <View style={styles.headerRow}>
          <View style={styles.scanRow}>
            <Ionicons name="scan-outline" size={14} color={Colors.primary} />
            <Text style={styles.scanId}>{analisis.scanId || 'SIN ID'}</Text>
          </View>
          <Text style={styles.fecha}>{fecha}</Text>
        </View>

        {/* Angle pills */}
        <View style={styles.anglesRow}>
          <View style={styles.anglePill}>
            <Text style={styles.angleLabel}>Izq</Text>
            <Text style={[styles.angleValue, { color: colorPorDiagnostico(analisis.diagnosticoIzq) }]}>
              {analisis.anguloIzq.toFixed(1)}°
            </Text>
            <Text style={[styles.dxLabel, { color: colorPorDiagnostico(analisis.diagnosticoIzq) }]}>
              {analisis.diagnosticoIzq}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.anglePill}>
            <Text style={styles.angleLabel}>Der</Text>
            <Text style={[styles.angleValue, { color: colorPorDiagnostico(analisis.diagnosticoDer) }]}>
              {analisis.anguloDer.toFixed(1)}°
            </Text>
            <Text style={[styles.dxLabel, { color: colorPorDiagnostico(analisis.diagnosticoDer) }]}>
              {analisis.diagnosticoDer}
            </Text>
          </View>
        </View>

        {/* Footer row */}
        <View style={styles.footerRow}>
          {analisis.categoriaGraf && (
            <GrafBadge estado={analisis.categoriaGraf} />
          )}
          {analisis.validadoPorDoctor && (
            <View style={styles.validadoBadge}>
              <Ionicons name="checkmark-circle" size={12} color={Colors.statusNormal} />
              <Text style={styles.validadoText}>Validado</Text>
            </View>
          )}
          <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} style={styles.chevron} />
        </View>
      </GlassContainer>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 10,
  },
  card: {
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scanRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  scanId: {
    color: Colors.primary,
    fontSize: Typography.size.xs,
    fontFamily: Typography.fonts.semibold,
    letterSpacing: 0.5,
  },
  fecha: {
    color: Colors.textMuted,
    fontSize: Typography.size.xs,
    fontFamily: Typography.fonts.regular,
  },
  anglesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  anglePill: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  angleLabel: {
    color: Colors.textSecondary,
    fontSize: Typography.size.xs,
    fontFamily: Typography.fonts.medium,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  angleValue: {
    fontSize: Typography.size.xl,
    fontFamily: Typography.fonts.bold,
  },
  dxLabel: {
    fontSize: Typography.size.xs,
    fontFamily: Typography.fonts.semibold,
    letterSpacing: 0.5,
  },
  divider: {
    width: 1,
    height: 48,
    backgroundColor: Colors.borderDefault,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  validadoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(0, 196, 140, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.round,
  },
  validadoText: {
    color: Colors.statusNormal,
    fontSize: Typography.size.xs,
    fontFamily: Typography.fonts.medium,
  },
  chevron: {
    marginLeft: 'auto',
  },
});
