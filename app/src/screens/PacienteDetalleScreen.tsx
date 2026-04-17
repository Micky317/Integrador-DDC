import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Colors, Typography, Spacing, Radius } from '../constants/theme';
import { GlassContainer } from '../components/GlassContainer';
import { PrimaryButton } from '../components/PrimaryButton';
import { GrafBadge } from '../components/GrafBadge';
import { Skeleton } from '../components/Skeleton';
import { AnalisisHistorialCard } from '../features/pacientes/components/AnalisisHistorialCard';
import { usePacienteDetalle, useEliminarPaciente, useActualizarTratamiento } from '../features/pacientes/hooks/usePacienteDetalle';
import { calcularMesesDeEdad, obtenerIniciales, obtenerColorAvatar } from '../utils/helpers';
import { useAppStore } from '../store/useAppStore';

// Configuración de Planes de Tratamiento (Fuera del componente para orden)
const PLANES_CONFIG = [
  { id: 'ejercicios', label: 'Ejercicios y Masajes', icon: 'fitness-outline' as const, color: Colors.statusNormal, desc: 'Protocolo de abducciones y masajes diarios.' },
  { id: 'arnes', label: 'Arnés de Pavlik', icon: 'ribbon-outline' as const, color: Colors.statusWarning, desc: 'Uso de órtesis dinámica activa.' },
  { id: 'yeso', label: 'Yeso Pélvico', icon: 'construct-outline' as const, color: Colors.statusDanger, desc: 'Inmovilización post-reducción.' },
  { id: 'cirugia', label: 'Evaluación Quirúrgica', icon: 'business-outline' as const, color: Colors.statusUrgent, desc: 'Considerar reducción abierta.' },
  { id: 'observacion', label: 'Observación Controlada', icon: 'eye-outline' as const, color: Colors.textMuted, desc: 'Sin tratamiento activo por ahora.' },
];

export default function PacienteDetalleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAppStore();
  const { paciente, historial, isLoading } = usePacienteDetalle(id ?? '');
  const { mutate: eliminar } = useEliminarPaciente(id ?? '');
  const { mutate: actualizarTratamiento } = useActualizarTratamiento(id ?? '');
  const [showPlanModal, setShowPlanModal] = useState(false);

  const isMedico = user?.role === 'medico';

  const handleBack = () => user?.role === 'padre' ? router.replace('/progreso') : router.back();

  const handleNuevoAnalisis = () => router.push({ pathname: '/(tabs)/cargar-imagen', params: { pacienteId: id } });

  const handleVerEvolucion = () => router.push({ pathname: '/(tabs)/evolucion', params: { pacienteId: id } });

  const handleDeletePress = () => {
    Alert.alert('Eliminar paciente', `¿Confirmas eliminar a ${paciente?.nombreCompleto}?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => eliminar() },
    ]);
  };

  if (isLoading || !paciente) {
    return (
      <LinearGradient colors={Colors.gradientBg} style={styles.gradient}>
        <View style={styles.loadingContainer}><Skeleton height={200} borderRadius={Radius.lg} width="100%" /></View>
      </LinearGradient>
    );
  }

  const planActual = PLANES_CONFIG.find(p => p.id === paciente?.tratamientoAsignado) || PLANES_CONFIG[4];

  return (
    <LinearGradient colors={Colors.gradientBg} style={styles.gradient}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={handleBack}><Ionicons name="arrow-back" size={24} color="#FFF" /></TouchableOpacity>
        <Text style={styles.topTitle}>Expediente Clínico</Text>
        {isMedico ? (
          <TouchableOpacity onPress={handleDeletePress}><Ionicons name="trash-outline" size={24} color={Colors.statusDanger} /></TouchableOpacity>
        ) : <View style={{ width: 24 }} />}
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Perfil */}
        <GlassContainer style={styles.profileCard}>
          <View style={[styles.avatar, { backgroundColor: obtenerColorAvatar(paciente.id) }]}>
            <Text style={styles.avatarText}>{obtenerIniciales(paciente.nombreCompleto)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.profileName}>{paciente.nombreCompleto}</Text>
            <Text style={styles.profileMeta}>{calcularMesesDeEdad(paciente.fechaNacimiento)} meses · {paciente.codigoPaciente}</Text>
          </View>
          {paciente.estadoGraf && <GrafBadge estado={paciente.estadoGraf} />}
        </GlassContainer>

        {/* Sección de Tratamiento (La nueva joya) */}
        <Text style={styles.sectionTitle}>
          {isMedico ? 'Plan de Acción Médico' : 'Indicación Médica'}
        </Text>
        <TouchableOpacity disabled={!isMedico} onPress={() => setShowPlanModal(true)}>
          <GlassContainer intensity={20} style={[styles.planCard, { borderColor: planActual.color + '40', borderWidth: 1 }]}>
            <View style={[styles.planIconBg, { backgroundColor: planActual.color + '20' }]}>
              <Ionicons name={planActual.icon} size={24} color={planActual.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.planLabel, { color: planActual.color }]}>{planActual.label}</Text>
              <Text style={styles.planDesc}>
                {isMedico ? planActual.desc : `Tu médico ha prescrito: ${planActual.desc}`}
              </Text>
            </View>
            {isMedico && <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />}
          </GlassContainer>
        </TouchableOpacity>

        {/* Botones de Acción - Lógica para Padre y Médico */}
        <View style={styles.actionRow}>
          {isMedico ? (
            <PrimaryButton 
              title="Nuevo Análisis" 
              onPress={handleNuevoAnalisis} 
              style={{ flex: 1.5 }} 
            />
          ) : (
            paciente.tratamientoAsignado === 'ejercicios' ? (
              <PrimaryButton 
                title="Rehabilitación" 
                onPress={() => router.push({ pathname: '/(tabs)/rehabilitacion', params: { id: paciente.id } })} 
                icon="play-circle"
                style={{ flex: 2, backgroundColor: Colors.statusNormal }} 
              />
            ) : null
          )}
          <TouchableOpacity onPress={handleVerEvolucion} style={styles.secondaryBtn}>
            <Ionicons name="trending-up" size={20} color={Colors.primary} />
            <Text style={styles.secondaryBtnText}>Evolución</Text>
          </TouchableOpacity>
        </View>

        {/* Historial */}
        <Text style={styles.sectionTitle}>Historial ({historial.length})</Text>
        {historial.map(a => (
          <AnalisisHistorialCard 
            key={a.id} 
            analisis={a} 
            onPress={() => router.push({ pathname: '/(tabs)/analisis', params: { analisisId: a.id, pacienteId: id } })} 
          />
        ))}
      </ScrollView>

        {/* Modal de Selección de Plan */}
        <Modal visible={showPlanModal} transparent animationType="slide" onRequestClose={() => setShowPlanModal(false)}>
          <TouchableOpacity 
            style={styles.modalOverlay} 
            activeOpacity={1} 
            onPress={() => setShowPlanModal(false)}
          >
            <TouchableOpacity activeOpacity={1} style={styles.modalContainerClickStop}>
              <GlassContainer intensity={50} style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Asignar Tratamiento</Text>
                  <TouchableOpacity onPress={() => setShowPlanModal(false)} style={styles.closeIcon}>
                    <Ionicons name="close-circle" size={28} color={Colors.textMuted} />
                  </TouchableOpacity>
                </View>
                
                <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
                  {PLANES_CONFIG.map(plan => (
                    <TouchableOpacity 
                      key={plan.id} 
                      style={styles.planOption} 
                      onPress={() => { actualizarTratamiento(plan.id); setShowPlanModal(false); }}
                    >
                      <View style={[styles.planIconBgSmall, { backgroundColor: plan.color + '20' }]}>
                        <Ionicons name={plan.icon} size={20} color={plan.color} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.planOptionLabel, { color: plan.color }]}>{plan.label}</Text>
                        <Text style={styles.planOptionDesc} numberOfLines={1}>{plan.desc}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </GlassContainer>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', padding: Spacing.xl },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingTop: 60, alignItems: 'center', marginBottom: Spacing.md },
  topTitle: { color: '#FFF', fontSize: Typography.size.lg, fontFamily: Typography.fonts.bold },
  scroll: { paddingHorizontal: Spacing.lg, paddingBottom: 100, gap: Spacing.md },
  profileCard: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, gap: Spacing.md },
  avatar: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#FFF', fontSize: Typography.size.lg, fontFamily: Typography.fonts.bold },
  profileName: { color: '#FFF', fontSize: Typography.size.md, fontFamily: Typography.fonts.bold },
  profileMeta: { color: Colors.textSecondary, fontSize: Typography.size.xs },
  sectionTitle: { color: '#FFF', fontSize: Typography.size.base, fontFamily: Typography.fonts.semibold, marginTop: Spacing.sm },
  planCard: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, gap: Spacing.md, borderRadius: Radius.lg },
  planIconBg: { width: 44, height: 44, borderRadius: Radius.md, justifyContent: 'center', alignItems: 'center' },
  planLabel: { fontSize: Typography.size.base, fontFamily: Typography.fonts.bold },
  planDesc: { fontSize: Typography.size.xs, color: Colors.textSecondary, marginTop: 2 },
  actionRow: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.xs },
  secondaryBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: Colors.primary, borderRadius: Radius.lg },
  secondaryBtnText: { color: Colors.primary, fontFamily: Typography.fonts.semibold },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end', padding: Spacing.md },
  modalContainerClickStop: { width: '100%', marginBottom: 30 },
  modalContent: { padding: Spacing.lg, borderRadius: Radius.xl, paddingBottom: Spacing.xl },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  modalTitle: { color: '#FFF', fontSize: Typography.size.lg, fontFamily: Typography.fonts.bold },
  closeIcon: { padding: 4 },
  planOption: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.md, marginBottom: Spacing.xs, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: Radius.lg },
  planIconBgSmall: { width: 36, height: 36, borderRadius: Radius.md, justifyContent: 'center', alignItems: 'center' },
  planOptionLabel: { fontSize: Typography.size.md, fontFamily: Typography.fonts.semibold },
  planOptionDesc: { fontSize: Typography.size.xs, color: Colors.textMuted },
});
