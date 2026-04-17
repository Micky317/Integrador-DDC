import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Typography, Radius, Shadow, Spacing } from '../../../constants/theme';
import { colorPorDiagnostico, DiagnosticoCategoria } from '../../../types';

interface AngleCardProps {
  label: string;
  value: number;
  dx: DiagnosticoCategoria;
}

const AngleCard = ({ label, value, dx }: AngleCardProps) => (
  <View style={[styles.angleCard, { borderColor: colorPorDiagnostico(dx) + '44' }]}>
    <Text style={styles.angleLabel}>• {label}</Text>
    <Text style={[styles.angleValue, { color: colorPorDiagnostico(dx) }]}>{value}°</Text>
  </View>
);

interface AnalysisResultCardProps {
  diagnostico_izquierda: DiagnosticoCategoria;
  diagnostico_derecha: DiagnosticoCategoria;
  angulo_izquierda: number;
  angulo_derecha: number;
}

export const AnalysisResultCard = ({
  diagnostico_izquierda,
  diagnostico_derecha,
  angulo_izquierda,
  angulo_derecha,
}: AnalysisResultCardProps) => {
  return (
    <>
      <View style={styles.resultCard}>
        <Text style={styles.resultLabel}>CLASIFICACIÓN GENERAL</Text>
        <View style={styles.resultRow}>
          <Text style={styles.resultCategory}>
            Cadera Izquierda:{' '}
            <Text style={[styles.resultCategoryBold, { color: colorPorDiagnostico(diagnostico_izquierda) }]}>
              {diagnostico_izquierda}
            </Text>
          </Text>
        </View>
        <View style={[styles.resultRow, { marginTop: 8 }]}>
          <Text style={styles.resultCategory}>
            Cadera Derecha:{' '}
            <Text style={[styles.resultCategoryBold, { color: colorPorDiagnostico(diagnostico_derecha) }]}>
              {diagnostico_derecha}
            </Text>
          </Text>
        </View>
      </View>

      <View style={styles.angleRow}>
        <AngleCard label="Ángulo Alfa (Izq)" value={angulo_izquierda} dx={diagnostico_izquierda} />
        <AngleCard label="Ángulo Alfa (Der)" value={angulo_derecha} dx={diagnostico_derecha} />
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  resultCard: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderCard,
  },
  resultLabel: {
    color: Colors.textMuted,
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.bold,
    letterSpacing: 1,
    marginBottom: 6,
  },
  resultRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  resultCategory: {
    color: Colors.textSecondary,
    fontSize: Typography.size.xl,
    fontWeight: Typography.weight.regular,
  },
  resultCategoryBold: { color: Colors.textPrimary, fontWeight: Typography.weight.bold },
  
  angleRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  angleCard: {
    flex: 1,
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    ...Shadow.card,
  },
  angleLabel: { color: Colors.textMuted, fontSize: Typography.size.xs, fontWeight: Typography.weight.medium, marginBottom: 4 },
  angleValue: { fontSize: Typography.size.xxl, fontWeight: Typography.weight.extrabold },
});
