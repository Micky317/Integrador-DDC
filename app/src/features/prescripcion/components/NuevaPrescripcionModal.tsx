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
import DateTimePicker from '@react-native-community/datetimepicker';

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
  historialAnalisis?: Analisis[];
}

export const NuevaPrescripcionModal: React.FC<NuevaPrescripcionModalProps> = ({
  visible,
  onClose,
  onGuardar,
  isLoading,
  tratamientosActuales,
  historialAnalisis,
}) => {
  const [diagnostico, setDiagnostico] = useState('');
  const [indicaciones, setIndicaciones] = useState('');
  const [proximaRevision, setProximaRevision] = useState('');
  const [tratamientos, setTratamientos] = useState<string[]>([]);
  const [selectedAnalisisId, setSelectedAnalisisId] = useState<string | undefined>(undefined);

  // Estados para el DatePicker nativo
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const preFillDiagnosis = (a: Analisis) => {
    const dx = [
      a.diagnosticoIzq !== 'NORMAL' ? `Cadera izq: ${a.diagnosticoIzq}` : '',
      a.diagnosticoDer !== 'NORMAL' ? `Cadera der: ${a.diagnosticoDer}` : '',
    ].filter(Boolean).join(', ');
    const graf = a.categoriaGraf?.replace('GRAF_', 'Graf ') ?? '';
    setDiagnostico(dx ? `${dx} — ${graf}` : graf);
  };

  useEffect(() => {
    if (visible) {
      setTratamientos(tratamientosActuales);
      setIndicaciones('');
      setProximaRevision('');
      setSelectedDate(null);

      // Pre-llenar con el último análisis por defecto si existe
      if (historialAnalisis && historialAnalisis.length > 0) {
        const latest = historialAnalisis[historialAnalisis.length - 1];
        setSelectedAnalisisId(latest.id);
        preFillDiagnosis(latest);
      } else {
        setSelectedAnalisisId(undefined);
        setDiagnostico('');
      }
    }
  }, [visible]);

  // Actualizar diagnóstico dinámicamente al cambiar de análisis seleccionado
  useEffect(() => {
    if (selectedAnalisisId && historialAnalisis) {
      const match = historialAnalisis.find(a => a.id === selectedAnalisisId);
      if (match) {
        preFillDiagnosis(match);
      }
    }
  }, [selectedAnalisisId]);

  const handleDateChange = (event: any, date?: Date) => {
    if (Platform.OS === 'android') {
      if (event.type === 'set') {
        setShowDatePicker(false);
        if (date) {
          setSelectedDate(date);
          setProximaRevision(date.toISOString().split('T')[0]);
        }
      } else if (event.type === 'dismissed') {
        setShowDatePicker(false);
      }
    } else {
      if (date) {
        setSelectedDate(date);
        setProximaRevision(date.toISOString().split('T')[0]);
      }
    }
  };

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
      analisisId: selectedAnalisisId,
    });
  };

  const isValid = diagnostico.trim().length > 0;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={styles.modalContainer}>
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
            <Text style={styles.label}>Próxima revisión</Text>
            <TouchableOpacity
              style={styles.datePickerButton}
              onPress={() => setShowDatePicker(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="calendar-outline" size={18} color={Colors.primary} />
              <Text style={[
                styles.datePickerText,
                !selectedDate && { color: Colors.textMuted }
              ]}>
                {selectedDate 
                  ? selectedDate.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
                  : 'Seleccionar fecha de revisión'
                }
              </Text>
              {selectedDate && (
                <TouchableOpacity 
                  onPress={(e) => {
                    e.stopPropagation();
                    setSelectedDate(null);
                    setProximaRevision('');
                  }}
                  style={styles.clearDateBtn}
                >
                  <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
                </TouchableOpacity>
              )}
            </TouchableOpacity>

            {showDatePicker && (
              <DateTimePicker
                value={selectedDate || new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                minimumDate={new Date()}
                onChange={handleDateChange}
              />
            )}

            {/* Vincular análisis */}
            {historialAnalisis && historialAnalisis.length > 0 && (
              <View style={{ marginTop: Spacing.md }}>
                <Text style={styles.label}>Vincular Análisis Radiográfico</Text>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.analisisSelector}
                >
                  <TouchableOpacity
                    style={[
                      styles.analisisOption,
                      !selectedAnalisisId && styles.analisisOptionActive
                    ]}
                    onPress={() => setSelectedAnalisisId(undefined)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="close-circle-outline" size={14} color={!selectedAnalisisId ? '#FFF' : Colors.textMuted} />
                    <Text style={[styles.analisisOptionText, !selectedAnalisisId && styles.analisisOptionTextActive]}>
                      Ninguno
                    </Text>
                  </TouchableOpacity>
                  
                  {[...historialAnalisis].reverse().map(a => {
                    const isSelected = selectedAnalisisId === a.id;
                    const dateStr = a.fechaRadiografia 
                      ? new Date(a.fechaRadiografia + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })
                      : new Date(a.creadoEn).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });
                    return (
                      <TouchableOpacity
                        key={a.id}
                        style={[
                          styles.analisisOption,
                          isSelected && styles.analisisOptionActive
                        ]}
                        onPress={() => setSelectedAnalisisId(a.id)}
                        activeOpacity={0.7}
                      >
                        <Ionicons 
                          name="image-outline" 
                          size={14} 
                          color={isSelected ? '#FFF' : Colors.primary} 
                        />
                        <Text style={[styles.analisisOptionText, isSelected && styles.analisisOptionTextActive]}>
                          Placa: {dateStr} ({a.anguloIzq.toFixed(0)}° / {a.anguloDer.toFixed(0)}°)
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
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
      </View>
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
  analisisSelector: {
    gap: 8,
    paddingVertical: 4,
    flexDirection: 'row',
  },
  analisisOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: Colors.borderDefault,
    borderRadius: Radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  analisisOptionActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  analisisOptionText: {
    color: Colors.textMuted,
    fontSize: Typography.size.xs,
    fontFamily: Typography.fonts.medium,
  },
  analisisOptionTextActive: {
    color: '#FFF',
  },
  btn: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: Colors.borderDefault,
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  datePickerText: {
    color: Colors.textPrimary,
    fontSize: Typography.size.sm,
    fontFamily: Typography.fonts.regular,
    flex: 1,
  },
  clearDateBtn: {
    padding: 2,
  },
});
