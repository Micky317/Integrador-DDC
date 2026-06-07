import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius } from '../../../constants/theme';
import { PrimaryButton } from '../../../components/PrimaryButton';
import { Analisis } from '../../../types';

const TRATAMIENTOS_CONFIG = [
  { id: 'ejercicios', label: 'Ejercicios y Masajes', color: Colors.statusNormal },
  { id: 'arnes',     label: 'Arnés de Pavlik',       color: Colors.statusWarning },
  { id: 'yeso',      label: 'Yeso Pélvico',          color: Colors.statusDanger },
  { id: 'cirugia',   label: 'Evaluación Quirúrgica', color: '#FF4757' },
  { id: 'observacion', label: 'Observación Controlada', color: Colors.textMuted },
];

interface NuevaPrescripcionModalProps {
  visible: boolean;
  onClose: () => void;
  onGuardar: (payload: {
    diagnosticoResumen: string;
    tratamientos: string[];
    indicaciones?: string;
    proximaRevision?: string;
    analisisId?: string;
  }) => void;
  isLoading: boolean;
  tratamientosActuales: string[];
  ultimoAnalisis?: Analisis | null;
}

export const NuevaPrescripcionModal: React.FC<NuevaPrescripcionModalProps> = ({
  visible,
  onClose,
  onGuardar,
  isLoading,
  tratamientosActuales,
  ultimoAnalisis,
}) => {
  const [diagnostico, setDiagnostico] = useState('');
  const [indicaciones, setIndicaciones] = useState('');
  const [proximaRevision, setProximaRevision] = useState('');
  const [tratamientos, setTratamientos] = useState<string[]>([]);
  const [vincularAnalisis, setVincularAnalisis] = useState(true);

  useEffect(() => {
    if (visible) {
      setTratamientos(tratamientosActuales);

      // Pre-llenar diagnóstico con el último análisis si existe
      if (ultimoAnalisis) {
        const dx = [
          ultimoAnalisis.diagnosticoIzq !== 'NORMAL' ? `Cadera izq: ${ultimoAnalisis.diagnosticoIzq}` : '',
          ultimoAnalisis.diagnosticoDer !== 'NORMAL' ? `Cadera der: ${ultimoAnalisis.diagnosticoDer}` : '',
        ].filter(Boolean).join(', ');
        const graf = ultimoAnalisis.categoriaGraf?.replace('_', ' ') ?? '';
        setDiagnostico(dx ? `${dx} — ${graf}` : graf);
      } else {
        setDiagnostico('');
      }
      setIndicaciones('');
      setProximaRevision('');
      setVincularAnalisis(true);
    }
  }, [visible]);

  const toggleTratamiento = (id: string) => {
    setTratamientos(prev =>
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    );
  };

  const handleGuardar = () => {
    if (!diagnostico.trim()) return;
    onGuardar({
      diagnosticoResumen: diagnostico.trim(),
      tratamientos,
      indicaciones: indicaciones.trim() || undefined,
      proximaRevision: proximaRevision.trim() || undefined,
      analisisId: vincularAnalisis && ultimoAnalisis ? ultimoAnalisis.id : undefined,
    });
  };

  const isValid = diagnostico.trim().length > 0;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalContainer}
      >
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <LinearGradient colors={['#1A2035', '#0D1225']} style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Ionicons name="document-text" size={20} color={Colors.primary} />
              <Text style={styles.title}>Nueva Prescripción</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView 
            showsVerticalScrollIndicator={false} 
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: Spacing.xl }}
          >
            {/* Diagnóstico resumen */}
            <Text style={styles.label}>Diagnóstico *</Text>
            <TextInput
              style={styles.input}
              value={diagnostico}
              onChangeText={setDiagnostico}
              placeholder="Ej: Displasia bilateral — Graf IIb"
              placeholderTextColor={Colors.textMuted}
              multiline
            />

            {/* Tratamientos */}
            <Text style={styles.label}>Plan de tratamiento</Text>
            <View style={styles.chips}>
              {TRATAMIENTOS_CONFIG.map(t => {
                const active = tratamientos.includes(t.id);
                return (
                  <TouchableOpacity
                    key={t.id}
                    onPress={() => toggleTratamiento(t.id)}
                    style={[
                      styles.chip,
                      { borderColor: active ? t.color : Colors.borderDefault },
                      active && { backgroundColor: `${t.color}22` },
                    ]}
                  >
                    {active && <Ionicons name="checkmark-circle" size={12} color={t.color} />}
                    <Text style={[styles.chipText, { color: active ? t.color : Colors.textMuted }]}>
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Indicaciones */}
            <Text style={styles.label}>Indicaciones adicionales</Text>
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              value={indicaciones}
              onChangeText={setIndicaciones}
              placeholder="Instrucciones para el padre, dosis, cuidados especiales..."
              placeholderTextColor={Colors.textMuted}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            {/* Próxima revisión */}
            <Text style={styles.label}>Próxima revisión (AAAA-MM-DD)</Text>
            <TextInput
              style={styles.input}
              value={proximaRevision}
              onChangeText={setProximaRevision}
              placeholder="Ej: 2025-08-15"
              placeholderTextColor={Colors.textMuted}
              keyboardType="numeric"
            />

            {/* Vincular análisis */}
            {ultimoAnalisis && (
              <TouchableOpacity
                style={styles.checkRow}
                onPress={() => setVincularAnalisis(v => !v)}
              >
                <View style={[styles.checkbox, vincularAnalisis && styles.checkboxActive]}>
                  {vincularAnalisis && <Ionicons name="checkmark" size={12} color="#FFF" />}
                </View>
                <Text style={styles.checkLabel}>
                  Vincular al último análisis ({new Date(ultimoAnalisis.creadoEn).toLocaleDateString('es-AR')})
                </Text>
              </TouchableOpacity>
            )}

            <PrimaryButton
              title="Emitir Prescripción"
              onPress={handleGuardar}
              loading={isLoading}
              disabled={!isValid || isLoading}
              style={styles.btn}
              icon="document-text-outline"
            />
          </ScrollView>
        </LinearGradient>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: Spacing.lg,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: Typography.size.lg,
    fontFamily: Typography.fonts.semibold,
  },
  closeBtn: {
    padding: 4,
  },
  label: {
    color: Colors.textSecondary,
    fontSize: Typography.size.sm,
    fontFamily: Typography.fonts.medium,
    marginBottom: 6,
    marginTop: Spacing.md,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: Colors.borderDefault,
    borderRadius: Radius.md,
    padding: Spacing.md,
    color: Colors.textPrimary,
    fontSize: Typography.size.sm,
    fontFamily: Typography.fonts.regular,
  },
  inputMultiline: {
    minHeight: 90,
    textAlignVertical: 'top',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: Radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  chipText: {
    fontSize: Typography.size.xs,
    fontFamily: Typography.fonts.medium,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: Colors.borderDefault,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  checkLabel: {
    color: Colors.textSecondary,
    fontSize: Typography.size.sm,
    fontFamily: Typography.fonts.regular,
    flex: 1,
  },
  btn: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.xl,
  },
});
