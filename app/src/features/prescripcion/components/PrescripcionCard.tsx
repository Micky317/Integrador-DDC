import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlassContainer } from '../../../components/GlassContainer';
import { Colors, Typography, Spacing, Radius } from '../../../constants/theme';
import { PrescripcionMedica, Paciente, Analisis } from '../../../types';
import { pdfService } from '../../../services/pdf.service';

const TRATAMIENTO_META: Record<string, { label: string; color: string }> = {
  cirugia:     { label: 'Evaluación Quirúrgica', color: Colors.statusUrgent ?? '#FF4757' },
  yeso:        { label: 'Yeso Pélvico',          color: Colors.statusDanger },
  arnes:       { label: 'Arnés de Pavlik',        color: Colors.statusWarning },
  ejercicios:  { label: 'Ejercicios',             color: Colors.statusNormal },
  observacion: { label: 'Observación',            color: Colors.textMuted },
};

interface PrescripcionCardProps {
  prescripcion: PrescripcionMedica;
  paciente?: Paciente;
  analisis?: Analisis | null;
}

export const PrescripcionCard: React.FC<PrescripcionCardProps> = ({
  prescripcion,
  paciente,
  analisis,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  const fecha = new Date(prescripcion.creadoEn).toLocaleDateString('es-AR', {
    day: '2-digit', month: 'short', year: 'numeric',
  });

  const proximaRevision = prescripcion.proximaRevision
    ? new Date(prescripcion.proximaRevision + 'T00:00:00').toLocaleDateString('es-AR', {
        day: '2-digit', month: 'short', year: 'numeric',
      })
    : null;

  const handleSharePDF = async () => {
    if (!paciente) {
      Alert.alert('Error', 'No se pudieron cargar los datos del paciente para generar el PDF.');
      return;
    }

    setGeneratingPdf(true);
    try {
      await pdfService.generarYCompartirPrescripcion(prescripcion, paciente, analisis);
    } catch (e: any) {
      Alert.alert('Error al generar PDF', e.message || 'Ocurrió un error inesperado al intentar compartir el PDF.');
    } finally {
      setGeneratingPdf(false);
    }
  };

  return (
    <GlassContainer style={styles.card}>
      <TouchableOpacity onPress={() => setExpanded(e => !e)} activeOpacity={0.85}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.iconBadge}>
              <Ionicons name="document-text" size={16} color={Colors.primary} />
            </View>
            <View>
              <Text style={styles.fecha}>{fecha}</Text>
              <Text style={styles.diagnostico} numberOfLines={expanded ? undefined : 1}>
                {prescripcion.diagnosticoResumen}
              </Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <Ionicons
              name={expanded ? 'chevron-up' : 'chevron-down'}
              size={16}
              color={Colors.textMuted}
            />
          </View>
        </View>

        {/* Tratamientos (siempre visibles) */}
        {prescripcion.tratamientos.length > 0 && (
          <View style={styles.chips}>
            {prescripcion.tratamientos.map(t => {
              const meta = TRATAMIENTO_META[t];
              return (
                <View key={t} style={[styles.chip, { borderColor: meta?.color ?? Colors.borderDefault }]}>
                  <Text style={[styles.chipText, { color: meta?.color ?? Colors.textMuted }]}>
                    {meta?.label ?? t}
                  </Text>
                </View>
              );
            })}
          </View>
        )}
      </TouchableOpacity>

      {/* Detalle expandido */}
      {expanded && (
        <View style={styles.detail}>
          {prescripcion.indicaciones ? (
            <View style={styles.detailRow}>
              <Ionicons name="clipboard-outline" size={14} color={Colors.textMuted} />
              <Text style={styles.detailText}>{prescripcion.indicaciones}</Text>
            </View>
          ) : null}
          {proximaRevision && (
            <View style={styles.detailRow}>
              <Ionicons name="calendar-outline" size={14} color={Colors.primary} />
              <Text style={[styles.detailText, { color: Colors.primary }]}>
                Próxima revisión: {proximaRevision}
              </Text>
            </View>
          )}

          {/* Botón de Compartir PDF */}
          <TouchableOpacity
            style={styles.pdfButton}
            onPress={handleSharePDF}
            disabled={generatingPdf}
            activeOpacity={0.7}
          >
            {generatingPdf ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <>
                <Ionicons name="share-social-outline" size={16} color="#FFF" />
                <Text style={styles.pdfButtonText}>Compartir PDF Clínico</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </GlassContainer>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: Spacing.sm,
    padding: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    gap: Spacing.sm,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: Radius.sm,
    backgroundColor: 'rgba(99,102,241,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fecha: {
    color: Colors.textMuted,
    fontSize: Typography.size.xs,
    fontFamily: Typography.fonts.regular,
    marginBottom: 2,
  },
  diagnostico: {
    color: Colors.textPrimary,
    fontSize: Typography.size.sm,
    fontFamily: Typography.fonts.medium,
    maxWidth: 220,
  },
  deleteBtn: {
    padding: 4,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: Spacing.sm,
  },
  chip: {
    borderWidth: 1,
    borderRadius: Radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  chipText: {
    fontSize: Typography.size.xs,
    fontFamily: Typography.fonts.medium,
  },
  detail: {
    marginTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.borderDefault,
    paddingTop: Spacing.sm,
    gap: Spacing.xs,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  detailText: {
    color: Colors.textSecondary,
    fontSize: Typography.size.sm,
    fontFamily: Typography.fonts.regular,
    flex: 1,
  },
  pdfButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 10,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    marginTop: Spacing.md,
    gap: 8,
  },
  pdfButtonText: {
    color: '#FFF',
    fontSize: Typography.size.sm,
    fontFamily: Typography.fonts.semibold,
  },
});
