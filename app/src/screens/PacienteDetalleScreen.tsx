import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal, ActivityIndicator } from 'react-native';
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
import { useVinculosPadre } from '../features/padres/hooks/useVinculos';
import { useRehabilitacion } from '../features/rehabilitacion/hooks/useRehabilitacion';
import { CATALOGO_EJERCICIOS } from '../constants/ejercicios';
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
  const { misBebes } = useVinculosPadre(); 
  
  // Hook de Rehabilitación
  const { 
    prescripciones, 
    isLoading: isRehabLoading, 
    prescribir, 
    eliminarPrescripcion 
  } = useRehabilitacion(id ?? '');

  const { mutate: eliminar } = useEliminarPaciente(id ?? '');
  const { mutate: actualizarTratamiento } = useActualizarTratamiento(id ?? '');
  
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showRehabModal, setShowRehabModal] = useState(false);

  const isMedico = user?.role === 'medico';

  const handleBack = () => user?.role === 'padre' ? router.replace('/(tabs)/progreso') : router.back();

  const handleNuevoAnalisis = () => router.push({ pathname: '/(tabs)/cargar-imagen', params: { pacienteId: id } });

  const handleVerEvolucion = () => router.push({ pathname: '/(tabs)/evolucion', params: { pacienteId: id } });

  const handleSwitchSibling = (siblingId: string) => {
    router.setParams({ id: siblingId }); // Navegación instantánea entre hermanos
  };

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
  const colorBebé = obtenerColorAvatar(paciente.id);

  return (
    <LinearGradient colors={Colors.gradientBg} style={styles.gradient}>
      <StatusBar style="light" />

      {/* Top Bar + Sibling Selector */}
      <View style={styles.headerContainer}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={28} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.topTitle}>{isMedico ? 'Expediente Clínico' : 'Panel de Control'}</Text>
          {isMedico ? (
            <TouchableOpacity onPress={handleDeletePress}><Ionicons name="trash-outline" size={24} color={Colors.statusDanger} /></TouchableOpacity>
          ) : <View style={{ width: 28 }} />}
        </View>

          {/* El Navegador Ingenioso: Solo se ve si el padre tiene varios bebés */}
          {!isMedico && (misBebes || []).length > 1 && (
            <View style={styles.siblingSelector}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.siblingScroll}>
                {(misBebes || []).map((bebe) => {
                  const isActive = bebe.id === id;
                  const bColor = obtenerColorAvatar(bebe.id);
                  return (
                    <TouchableOpacity 
                      key={bebe.id} 
                      onPress={() => handleSwitchSibling(bebe.id)}
                      style={[
                        styles.siblingBubble, 
                        isActive && { borderColor: bColor, borderWidth: 2, transform: [{ scale: 1.1 }] }
                      ]}
                    >
                      <View style={[styles.siblingInner, { backgroundColor: isActive ? bColor : 'rgba(255,255,255,0.05)' }]}>
                        <Text style={[styles.siblingChar, { color: isActive ? '#FFF' : Colors.textMuted }]}>
                          {obtenerIniciales(bebe.nombreCompleto)}
                        </Text>
                      </View>
                      {isActive && <View style={[styles.activeDot, { backgroundColor: bColor }]} />}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Perfil Master (Hero Style para padres) */}
          {!isMedico ? (
            <GlassContainer style={styles.heroProfileCard}>
              <View style={[styles.heroAvatar, { backgroundColor: `${colorBebé}20`, borderColor: colorBebé }]}>
                <Text style={[styles.heroAvatarText, { color: colorBebé }]}>{obtenerIniciales(paciente.nombreCompleto)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.heroTitle}>{paciente.nombreCompleto}</Text>
                <View style={styles.statusRow}>
                  <Ionicons name="checkmark-circle" size={16} color={Colors.statusNormal} />
                  <Text style={styles.heroSub}>Tratamiento en curso</Text>
                </View>
              </View>
              {paciente.estadoGraf && <GrafBadge estado={paciente.estadoGraf} />}
            </GlassContainer>
          ) : (
            <GlassContainer style={styles.profileCard}>
              <View style={[styles.avatar, { backgroundColor: colorBebé }]}>
                <Text style={styles.avatarText}>{obtenerIniciales(paciente.nombreCompleto)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.profileName}>{paciente.nombreCompleto}</Text>
                <Text style={styles.profileMeta}>{calcularMesesDeEdad(paciente.fechaNacimiento)} meses · {paciente.codigoPaciente}</Text>
              </View>
              {paciente.estadoGraf && <GrafBadge estado={paciente.estadoGraf} />}
            </GlassContainer>
          )}

          {/* Sección de Tratamiento */}
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

          {/* Botones de Acción */}
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

          {/* Sección de Rehabilitación Física (Nueva Parte) */}
          <View style={styles.rehabContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Plan de Rehabilitación</Text>
              {isMedico && (
                <TouchableOpacity style={styles.addExerciseBtn} onPress={() => setShowRehabModal(true)}>
                  <Ionicons name="add" size={20} color={Colors.primary} />
                  <Text style={styles.addExerciseText}>Asignar</Text>
                </TouchableOpacity>
              )}
            </View>

            {isRehabLoading ? (
              <ActivityIndicator color={Colors.primary} style={{ marginTop: 10 }} />
            ) : (prescripciones || []).length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rehabScroll}>
                {(prescripciones || []).map((p: any) => (
                  <View key={p.id} style={styles.rehabItem}>
                    <GlassContainer style={styles.rehabCard}>
                      <View style={[styles.rehabIconBg, { backgroundColor: p.ejercicio?.color + '20' }]}>
                        <Ionicons name={p.ejercicio?.icon} size={20} color={p.ejercicio?.color} />
                      </View>
                      <Text style={styles.rehabTitle} numberOfLines={1}>{p.ejercicio?.titulo || 'Ejercicio'}</Text>
                      <Text style={styles.rehabFreq}>{p.frecuencia_diaria} veces/día</Text>
                      {isMedico && (
                        <TouchableOpacity 
                          style={styles.removeBtn}
                          onPress={() => p.id && eliminarPrescripcion(p.id)}
                        >
                          <Ionicons name="close-circle" size={18} color={Colors.statusDanger} />
                        </TouchableOpacity>
                      )}
                    </GlassContainer>
                  </View>
                ))}
              </ScrollView>
            ) : (
              <Text style={styles.emptyRehabText}>No hay ejercicios asignados.</Text>
            )}
          </View>

          {/* Historial */}
          <Text style={styles.sectionTitle}>Análisis Realizados ({(historial || []).length})</Text>
          {(historial || []).length > 0 ? (
            (historial || []).map(a => (
              <AnalisisHistorialCard 
                key={a.id} 
                analisis={a} 
                onPress={() => router.push({ pathname: '/(tabs)/analisis', params: { analisisId: a.id, pacienteId: id } })} 
              />
            ))
          ) : (
            <View style={styles.emptyActivity}>
              <Text style={styles.emptyActivityText}>Aún no hay análisis registrados.</Text>
            </View>
          )}
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
        {/* Modal de Selección de Ejercicio de Rehabilitación */}
        <Modal visible={showRehabModal} transparent animationType="slide" onRequestClose={() => setShowRehabModal(false)}>
          <TouchableOpacity 
            style={styles.modalOverlay} 
            activeOpacity={1} 
            onPress={() => setShowRehabModal(false)}
          >
            <TouchableOpacity activeOpacity={1} style={styles.modalContainerClickStop}>
              <GlassContainer intensity={50} style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Catálogo de Ejercicios</Text>
                  <TouchableOpacity onPress={() => setShowRehabModal(false)} style={styles.closeIcon}>
                    <Ionicons name="close-circle" size={28} color={Colors.textMuted} />
                  </TouchableOpacity>
                </View>
                
                <ScrollView style={{ maxHeight: 500 }} showsVerticalScrollIndicator={false}>
                  {CATALOGO_EJERCICIOS.map(ej => (
                    <TouchableOpacity 
                      key={ej.id} 
                      style={styles.rehabOption} 
                      onPress={() => { 
                        prescribir({ medicoId: user?.id || '', ejercicioId: ej.id, frecuencia: 3 }); 
                        setShowRehabModal(false); 
                      }}
                    >
                      <View style={[styles.planIconBgSmall, { backgroundColor: ej.color + '20' }]}>
                        <Ionicons name={ej.icon} size={20} color={ej.color} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.planOptionLabel, { color: ej.color }]}>{ej.titulo}</Text>
                        <Text style={styles.planOptionDesc} numberOfLines={1}>{ej.descripcion}</Text>
                      </View>
                      <Ionicons name="add-circle" size={24} color={Colors.primary} />
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
  headerContainer: { backgroundColor: 'rgba(9, 13, 31, 0.4)', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)', paddingBottom: Spacing.sm },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingTop: 60, alignItems: 'center', marginBottom: Spacing.md },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)' },
  topTitle: { color: '#FFF', fontSize: Typography.size.lg, fontFamily: Typography.fonts.bold },
  
  // Sibling Navigator Styles
  siblingSelector: { paddingBottom: Spacing.sm },
  siblingScroll: { paddingHorizontal: Spacing.lg, gap: 12, alignItems: 'center' },
  siblingBubble: { alignItems: 'center', justifyContent: 'center' },
  siblingInner: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  siblingChar: { fontSize: 16, fontWeight: 'bold' },
  activeDot: { width: 6, height: 6, borderRadius: 3, marginTop: 4 },

  scroll: { paddingHorizontal: Spacing.lg, paddingBottom: 100, gap: Spacing.md, paddingTop: Spacing.md },
  
  // Hero Detail Card (Padres)
  heroProfileCard: { flexDirection: 'row', alignItems: 'center', padding: Spacing.lg, gap: Spacing.lg },
  heroAvatar: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', borderWidth: 2 },
  heroAvatarText: { fontSize: 24, fontWeight: 'bold' },
  heroTitle: { color: '#FFF', fontSize: 20, fontWeight: 'bold' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  heroSub: { color: Colors.textSecondary, fontSize: 14 },

  // Profile Card (Médicos)
  profileCard: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, gap: Spacing.md },
  avatar: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#FFF', fontSize: Typography.size.lg, fontFamily: Typography.fonts.bold },
  profileName: { color: '#FFF', fontSize: Typography.size.md, fontFamily: Typography.fonts.bold },
  profileMeta: { color: Colors.textSecondary, fontSize: Typography.size.xs },
  
  sectionTitle: { color: '#FFF', fontSize: Typography.size.base, fontFamily: Typography.fonts.semibold, marginTop: Spacing.sm },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  addExerciseBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4, paddingHorizontal: 10, borderRadius: 12, backgroundColor: 'rgba(0, 229, 204, 0.1)' },
  addExerciseText: { color: Colors.primary, fontSize: 13, fontWeight: '600' },
  
  // Rehab Styles
  rehabContainer: { marginVertical: Spacing.xs },
  rehabScroll: { gap: 12, paddingRight: 20, paddingVertical: 8 },
  rehabItem: { width: 160 },
  rehabCard: { padding: 12, borderRadius: Radius.lg, height: 110 },
  rehabIconBg: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  rehabTitle: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  rehabFreq: { color: Colors.textSecondary, fontSize: 12, marginTop: 2 },
  removeBtn: { position: 'absolute', top: 8, right: 8 },
  emptyRehabText: { color: Colors.textMuted, fontSize: 13, marginTop: 8, fontStyle: 'italic', marginLeft: 4 },

  planCard: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, gap: Spacing.md, borderRadius: Radius.lg },
  planIconBg: { width: 44, height: 44, borderRadius: Radius.md, justifyContent: 'center', alignItems: 'center' },
  planLabel: { fontSize: Typography.size.base, fontFamily: Typography.fonts.bold },
  planDesc: { fontSize: Typography.size.xs, color: Colors.textSecondary, marginTop: 2 },
  actionRow: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.xs },
  secondaryBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: Colors.primary, borderRadius: Radius.lg },
  secondaryBtnText: { color: Colors.primary, fontFamily: Typography.fonts.semibold },
  
  emptyActivity: { padding: Spacing.xl, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: Radius.lg, borderStyle: 'dashed', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  emptyActivityText: { color: Colors.textMuted, fontSize: 14 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end', padding: Spacing.md },
  modalContainerClickStop: { width: '100%', marginBottom: 30 },
  modalContent: { padding: Spacing.lg, borderRadius: Radius.xl, paddingBottom: Spacing.xl },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  modalTitle: { color: '#FFF', fontSize: Typography.size.lg, fontFamily: Typography.fonts.bold },
  closeIcon: { padding: 4 },
  planOption: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.md, marginBottom: Spacing.xs, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: Radius.lg },
  rehabOption: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.md, marginBottom: Spacing.sm, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: Radius.lg },
  planIconBgSmall: { width: 36, height: 36, borderRadius: Radius.md, justifyContent: 'center', alignItems: 'center' },
  planOptionLabel: { fontSize: Typography.size.md, fontFamily: Typography.fonts.semibold },
  planOptionDesc: { fontSize: Typography.size.xs, color: Colors.textMuted },
});
