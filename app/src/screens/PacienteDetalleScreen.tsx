import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal, ActivityIndicator, Animated, PanResponder } from 'react-native';
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
import { RevisionVideoModal } from '../features/rehabilitacion/components/RevisionVideoModal';
import { PrescripcionCard } from '../features/prescripcion/components/PrescripcionCard';
import { NuevaPrescripcionModal } from '../features/prescripcion/components/NuevaPrescripcionModal';
import { usePacienteDetalle, useEliminarPaciente, useActualizarTratamiento } from '../features/pacientes/hooks/usePacienteDetalle';
import { useVinculosPadre } from '../features/padres/hooks/useVinculos';
import { useRehabilitacion } from '../features/rehabilitacion/hooks/useRehabilitacion';
import { usePrescripcion } from '../features/prescripcion/hooks/usePrescripcion';
import { CATALOGO_EJERCICIOS } from '../constants/ejercicios';
import { calcularMesesDeEdad, obtenerIniciales, obtenerColorAvatar } from '../utils/helpers';
import { useAppStore } from '../store/useAppStore';
import { supabase } from '../lib/supabase';

const PLANES_CONFIG = [
  { id: 'ejercicios', label: 'Ejercicios y Masajes', icon: 'fitness-outline' as const, color: Colors.statusNormal, desc: 'Protocolo de abducciones y masajes diarios.' },
  { id: 'arnes', label: 'Arnés de Pavlik', icon: 'ribbon-outline' as const, color: Colors.statusWarning, desc: 'Uso de órtesis dinámica activa.' },
  { id: 'yeso', label: 'Yeso Pélvico', icon: 'construct-outline' as const, color: Colors.statusDanger, desc: 'Inmovilización post-reducción.' },
  { id: 'cirugia', label: 'Evaluación Quirúrgica', icon: 'business-outline' as const, color: Colors.statusUrgent, desc: 'Considerar reducción abierta.' },
  { id: 'observacion', label: 'Observación Controlada', icon: 'eye-outline' as const, color: Colors.textMuted, desc: 'Sin tratamiento activo por ahora.' },
];

const PRIORITY_ORDER = ['cirugia', 'yeso', 'arnes', 'ejercicios', 'observacion'];

interface SwipeablePrescripcionCardProps {
  children: React.ReactNode;
  onDelete: () => void;
  isMedico: boolean;
}

function SwipeablePrescripcionCard({ children, onDelete, isMedico }: SwipeablePrescripcionCardProps) {
  const translateX = React.useRef(new Animated.Value(0)).current;
  const isOpen = React.useRef(false);

  const panResponder = React.useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return (
          isMedico &&
          Math.abs(gestureState.dx) > 10 &&
          Math.abs(gestureState.dy) < 10
        );
      },
      onPanResponderMove: (_, gestureState) => {
        let newX = gestureState.dx;
        if (isOpen.current) {
          newX = -80 + gestureState.dx;
        }

        if (newX < -120) {
          newX = -120;
        } else if (newX > 0) {
          newX = 0;
        }

        translateX.setValue(newX);
      },
      onPanResponderRelease: (_, gestureState) => {
        const startX = isOpen.current ? -80 : 0;
        const currentX = startX + gestureState.dx;

        if (currentX < -40) {
          Animated.spring(translateX, {
            toValue: -80,
            useNativeDriver: true,
            bounciness: 4,
          }).start(() => {
            isOpen.current = true;
          });
        } else {
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 4,
          }).start(() => {
            isOpen.current = false;
          });
        }
      },
    })
  ).current;

  if (!isMedico) {
    return <>{children}</>;
  }

  return (
    <View style={{ width: '100%', overflow: 'hidden', borderRadius: Radius.lg }}>
      <Animated.View
        style={{
          flexDirection: 'row',
          width: '100%',
          transform: [{ translateX }],
        }}
        {...panResponder.panHandlers}
      >
        <View style={{ width: '100%', flexShrink: 0 }}>
          {children}
        </View>
        <TouchableOpacity
          activeOpacity={0.8}
          style={{
            width: 80,
            backgroundColor: Colors.statusDanger,
            justifyContent: 'center',
            alignItems: 'center',
            borderTopRightRadius: Radius.lg,
            borderBottomRightRadius: Radius.lg,
          }}
          onPress={() => {
            Animated.spring(translateX, {
              toValue: 0,
              useNativeDriver: true,
            }).start(() => {
              isOpen.current = false;
              onDelete();
            });
          }}
        >
          <Ionicons name="trash-outline" size={24} color="#FFF" />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

export default function PacienteDetalleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAppStore();
  const { paciente, historial, isLoading } = usePacienteDetalle(id ?? '');
  const { misBebes } = useVinculosPadre(); 
  
  // Hook de Rehabilitación
  const {
    prescripciones: ejerciciosPrescritos,
    seguimientos,
    seguimientosFullList,
    isLoading: isRehabLoading,
    prescribir,
    eliminarPrescripcion,
    evaluarVideo,
    eliminarSeguimiento
  } = useRehabilitacion(id ?? '');

  const { prescripciones, isLoading: isPrescLoading, crear: crearPrescripcion, isCreating, eliminar: eliminarPrescripcionMedica } = usePrescripcion(id ?? '');

  const { mutate: eliminar } = useEliminarPaciente(id ?? '');
  const { mutate: actualizarTratamiento } = useActualizarTratamiento(id ?? '');

  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showRehabModal, setShowRehabModal] = useState(false);
  const [showPrescripcionModal, setShowPrescripcionModal] = useState(false);
  const [tempTratamientos, setTempTratamientos] = useState<string[]>([]);

  const handleOpenPlanModal = () => {
    setTempTratamientos(paciente?.tratamientosAsignados || []);
    setShowPlanModal(true);
  };

  const toggleTratamiento = (id: string) => {
    setTempTratamientos(prev =>
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    );
  };

  const handleSaveTratamientos = () => {
    actualizarTratamiento(tempTratamientos);
    setShowPlanModal(false);
  };
  const [expandedExercise, setExpandedExercise] = useState<string | null>(null); // Para desplegar historial
  const [selectedVideo, setSelectedVideo] = useState<{ url: string; ejercicioId: string; ejercicioNombre: string } | null>(null);

  const isMedico = user?.role === 'medico';

  const handleBack = () => user?.role === 'padre' ? router.replace('/(tabs)/progreso') : router.back();

  const handleNuevoAnalisis = () => router.push({ pathname: '/(tabs)/cargar-imagen', params: { pacienteId: id } });

  const handleVerEvolucion = () => router.push({ pathname: '/evolucion', params: { pacienteId: id } });

  const handleSwitchSibling = (siblingId: string) => {
    router.setParams({ id: siblingId }); // Navegación instantánea entre hermanos
  };

  const handleDeletePress = () => {
    Alert.alert('Eliminar paciente', `¿Confirmas eliminar a ${paciente?.nombreCompleto}?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => eliminar() },
    ]);
  };

  const handleConfirmDeleteVideo = (segId: string, path: string) => {
    Alert.alert('Eliminar video', '¿Estás seguro de eliminar este registro y su video permanentemente?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => eliminarSeguimiento({ id: segId, videoPath: path }) },
    ]);
  };

  const handleConfirmDeletePrescripcion = (prescripcionId: string, titulo: string) => {
    Alert.alert(
      'Eliminar ejercicio',
      `¿Estás seguro de eliminar el ejercicio "${titulo || 'Ejercicio'}" del plan del paciente?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Eliminar', 
          style: 'destructive', 
          onPress: async () => {
            try {
              await eliminarPrescripcion(prescripcionId);
            } catch (e) {
              console.error("Error al eliminar prescripción:", e);
              Alert.alert('Error', 'No se pudo eliminar el ejercicio.');
            }
          } 
        }
      ]
    );
  };

  if (isLoading || !paciente) {
    return (
      <LinearGradient colors={Colors.gradientBg} style={styles.gradient}>
        <View style={styles.loadingContainer}><Skeleton height={200} borderRadius={Radius.lg} width="100%" /></View>
      </LinearGradient>
    );
  }

  const currentTratamientos = paciente?.tratamientosAsignados || [];
  const primaryId = PRIORITY_ORDER.find(t => currentTratamientos.includes(t)) || 'observacion';
  const planActual = PLANES_CONFIG.find(p => p.id === primaryId) || PLANES_CONFIG[4];
  const extraCount = Math.max(0, currentTratamientos.length - 1);
  const colorBebé = obtenerColorAvatar(paciente.id);

  return (
    <LinearGradient colors={Colors.gradientBg} style={styles.gradient}>
      <StatusBar style="light" />

      {/* ... (Header y Hero Profile omitidos por brevedad, mantenemos el resto igual) */}
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
          <TouchableOpacity disabled={!isMedico} onPress={handleOpenPlanModal} activeOpacity={0.85}>
            <GlassContainer intensity={20} style={[styles.planCard, { borderColor: planActual.color + '40', borderWidth: 1 }]}>
              {/* Fila superior: ícono principal + título + flecha */}
              <View style={styles.planCardHeader}>
                <View style={[styles.planIconBg, { backgroundColor: planActual.color + '20' }]}>
                  <Ionicons name={planActual.icon} size={24} color={planActual.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.planLabel, { color: planActual.color }]}>{planActual.label}</Text>
                  <Text style={styles.planDesc} numberOfLines={1}>{planActual.desc}</Text>
                </View>
                {isMedico && <Ionicons name="create-outline" size={18} color={Colors.textMuted} />}
              </View>

              {/* Tratamientos adicionales como chips */}
              {currentTratamientos.length > 1 && (
                <View style={styles.planChipsRow}>
                  {currentTratamientos
                    .filter(t => t !== primaryId)
                    .map(tid => {
                      const plan = PLANES_CONFIG.find(p => p.id === tid);
                      if (!plan) return null;
                      return (
                        <View key={tid} style={[styles.planChip, { borderColor: plan.color + '60', backgroundColor: plan.color + '12' }]}>
                          <Ionicons name={plan.icon} size={12} color={plan.color} />
                          <Text style={[styles.planChipText, { color: plan.color }]}>{plan.label}</Text>
                        </View>
                      );
                    })}
                </View>
              )}
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
              paciente.tratamientosAsignados?.includes('ejercicios') ? (
                <PrimaryButton
                  title="Rehabilitación"
                  onPress={() => router.push({ pathname: '/rehabilitacion', params: { id: paciente.id } })}
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

          {/* Sección de Rehabilitación Física */}
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
            ) : (ejerciciosPrescritos || []).length > 0 ? (
              <View style={styles.rehabListVertical}>
                  {(ejerciciosPrescritos || []).map((p: any) => {
                    // Buscar el último seguimiento para el badge de estado general
                    const ultimoSeguimiento = seguimientos ? (seguimientos[p.id] || seguimientos[p.ejercicio_id]) : null;
                    const isApproved = ultimoSeguimiento?.estado === 'Aprobado';
                    const isPending = ultimoSeguimiento?.estado === 'En revisión';
                    const isExpanded = expandedExercise === p.id;

                    // Mostramos todos los seguimientos con video del paciente
                    const historialDeEsteEjercicio = (seguimientosFullList || []).filter(
                      (s: any) => !!s.video_url
                    );

                  return (
                    <SwipeablePrescripcionCard
                      key={p.id}
                      isMedico={isMedico}
                      onDelete={() => handleConfirmDeletePrescripcion(p.id, p.ejercicio?.titulo)}
                    >
                      <GlassContainer style={[styles.rehabCardVertical, isExpanded && { borderColor: Colors.primary + '40', borderWidth: 1 }]}>
                        <TouchableOpacity 
                          style={styles.rehabHeader}
                          onPress={() => setExpandedExercise(isExpanded ? null : p.id)}
                        >
                          <View style={[styles.rehabIconBg, { backgroundColor: p.ejercicio?.color + '20' }]}>
                            <Ionicons name={p.ejercicio?.icon} size={20} color={p.ejercicio?.color} />
                          </View>
                          <View style={{ flex: 1, marginLeft: Spacing.sm }}>
                            <Text style={styles.rehabTitle}>{p.ejercicio?.titulo || 'Ejercicio'}</Text>
                            <Text style={styles.rehabFreq}>{p.frecuencia_diaria} veces al día</Text>
                          </View>
                          
                          {/* Badge de Estado General */}
                          {ultimoSeguimiento && (
                            <View style={[styles.statusBadge, { backgroundColor: isApproved ? 'rgba(16, 185, 129, 0.15)' : isPending ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255, 71, 87, 0.15)' }]}>
                              <Text style={[styles.statusBadgeText, { color: isApproved ? "#10B981" : isPending ? "#F59E0B" : "#FF4757" }]}>
                                {ultimoSeguimiento.estado}
                              </Text>
                            </View>
                          )}

                          <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={20} color={Colors.textMuted} style={{ marginLeft: 8 }} />
                        </TouchableOpacity>

                        {/* Lista de Intentos (Videos) - SOLO SE VE SI ESTÁ EXPANDIDO */}
                        {isExpanded && (
                          <View style={styles.intentosContainer}>
                            {historialDeEsteEjercicio.length > 0 ? (
                              <>
                                <Text style={styles.intentosLabel}>Historial de Videos ({historialDeEsteEjercicio.length})</Text>
                                {historialDeEsteEjercicio.map((seg: any) => {
                                  const fecha = new Date(seg.creado_en).toLocaleDateString();
                                  return (
                                    <View key={seg.id} style={styles.intentoItem}>
                                      <View style={styles.intentoMain}>
                                        <View style={[styles.intentoDot, { backgroundColor: seg.estado === 'Aprobado' ? '#10B981' : seg.estado === 'En revisión' ? '#F59E0B' : '#FF4757' }]} />
                                        <View style={{ flex: 1 }}>
                                          <Text style={styles.intentoMeta}>{fecha} · <Text style={{ fontWeight: 'bold' }}>{seg.estado}</Text></Text>
                                          {seg.comentarios_medico && (
                                            <Text style={styles.intentoComment} numberOfLines={1}>"{seg.comentarios_medico}"</Text>
                                          )}
                                        </View>
                                      </View>
                                      
                                      <View style={styles.intentoActions}>
                                        <TouchableOpacity 
                                          onPress={() => {
                                            const { data } = supabase.storage.from('ejercicios_videos').getPublicUrl(seg.video_url);
                                            setSelectedVideo({ 
                                              url: data.publicUrl, 
                                              ejercicioId: p.id, 
                                              ejercicioNombre: p.ejercicio?.titulo || 'Ejercicio' 
                                            });
                                          }}
                                          style={styles.intentoPlayBtn}
                                        >
                                          <Ionicons name="play" size={16} color={Colors.primary} />
                                        </TouchableOpacity>

                                        {isMedico && (
                                          <TouchableOpacity 
                                            onPress={() => handleConfirmDeleteVideo(seg.id, seg.video_url)}
                                            style={styles.intentoDeleteBtn}
                                          >
                                            <Ionicons name="trash-outline" size={16} color={Colors.statusDanger} />
                                          </TouchableOpacity>
                                        )}
                                      </View>
                                    </View>
                                  );
                                })}
                              </>
                            ) : (
                              <Text style={styles.sinIntentosText}>Sin videos enviados aún.</Text>
                            )}
                          </View>
                        )}
                      </GlassContainer>
                    </SwipeablePrescripcionCard>
                  );
                })}
              </View>
            ) : (
              <Text style={styles.emptyRehabText}>No hay ejercicios asignados.</Text>
            )}
          </View>

          {/* Prescripciones Médicas */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Prescripciones Médicas ({prescripciones.length})</Text>
            {isMedico && (
              <TouchableOpacity style={styles.addExerciseBtn} onPress={() => setShowPrescripcionModal(true)}>
                <Ionicons name="add" size={18} color={Colors.primary} />
              </TouchableOpacity>
            )}
          </View>
          {isPrescLoading ? (
            <Skeleton height={72} style={{ marginBottom: Spacing.sm }} />
          ) : prescripciones.length > 0 ? (
            prescripciones.map(p => (
              <PrescripcionCard
                key={p.id}
                prescripcion={p}
                isMedico={isMedico}
                onEliminar={(pid) => eliminarPrescripcionMedica(pid)}
              />
            ))
          ) : (
            <View style={styles.emptyActivity}>
              <Text style={styles.emptyActivityText}>
                {isMedico ? 'Emití la primera prescripción con el botón +' : 'No hay prescripciones emitidas aún.'}
              </Text>
            </View>
          )}

          {/* Historial de Análisis */}
          <Text style={styles.sectionTitle}>Análisis de Radiografías ({(historial || []).length})</Text>
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
                  {PLANES_CONFIG.map(plan => {
                    const isSelected = tempTratamientos.includes(plan.id);
                    return (
                      <TouchableOpacity
                        key={plan.id}
                        style={[styles.planOption, isSelected && { borderColor: plan.color + '80', borderWidth: 1 }]}
                        onPress={() => toggleTratamiento(plan.id)}
                      >
                        <View style={[styles.planIconBgSmall, { backgroundColor: plan.color + '20' }]}>
                          <Ionicons name={plan.icon} size={20} color={plan.color} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.planOptionLabel, { color: plan.color }]}>{plan.label}</Text>
                          <Text style={styles.planOptionDesc} numberOfLines={1}>{plan.desc}</Text>
                        </View>
                        <Ionicons
                          name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
                          size={24}
                          color={isSelected ? plan.color : Colors.textMuted}
                        />
                      </TouchableOpacity>
                    );
                  })}
                  <PrimaryButton
                    title="Guardar Tratamiento"
                    onPress={handleSaveTratamientos}
                    style={{ marginTop: Spacing.md }}
                  />
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
                  {CATALOGO_EJERCICIOS.map(ej => {
                    const yaPrescrito = (ejerciciosPrescritos || []).some((p: any) => {
                      return (
                        p.ejercicio_id === ej.id || 
                        p.ejercicio_id?.includes(ej.id) || 
                        ej.id.includes(p.ejercicio_id) ||
                        (p.ejercicio_id === 'ranita' && ej.id === 'abduccion-ranita')
                      );
                    });

                    return (
                      <TouchableOpacity 
                        key={ej.id} 
                        style={[styles.rehabOption, yaPrescrito && { opacity: 0.5 }]} 
                        disabled={yaPrescrito}
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
                        {yaPrescrito ? (
                          <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                        ) : (
                          <Ionicons name="add-circle" size={24} color={Colors.primary} />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </GlassContainer>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>

        {/* Modal de Revisión de Video del Doctor */}
        {selectedVideo && (
          <RevisionVideoModal
            visible={!!selectedVideo}
            videoUrl={selectedVideo.url}
            ejercicioNombre={selectedVideo.ejercicioNombre}
            pacienteNombre={paciente.nombreCompleto}
            onClose={() => setSelectedVideo(null)}
            onEvaluate={async (estado, comentario) => {
              evaluarVideo({
                ejercicioId: selectedVideo.ejercicioId,
                estado,
                comentario
              });
            }}
          />
        )}

        {/* Modal de Nueva Prescripción Médica */}
        <NuevaPrescripcionModal
          visible={showPrescripcionModal}
          onClose={() => setShowPrescripcionModal(false)}
          isLoading={isCreating}
          tratamientosActuales={paciente?.tratamientosAsignados ?? []}
          ultimoAnalisis={historial?.[0] ?? null}
          onGuardar={(payload) => {
            crearPrescripcion({
              pacienteId: id ?? '',
              medicoId: user?.id ?? '',
              ...payload,
            });
            setShowPrescripcionModal(false);
          }}
        />
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
  rehabCard: { padding: 12, borderRadius: Radius.lg, minHeight: 110, justifyContent: 'space-between' },
  rehabIconBg: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  rehabTitle: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  rehabFreq: { color: Colors.textSecondary, fontSize: 12, marginTop: 2 },
  removeBtn: { position: 'absolute', top: 8, right: 8 },
  emptyRehabText: { color: Colors.textMuted, fontSize: 13, marginTop: 8, fontStyle: 'italic', marginLeft: 4 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, gap: 4, marginTop: 6 },
  statusBadgeText: { fontSize: 10, fontWeight: 'bold' },
  reviewBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primary, paddingVertical: 6, borderRadius: 8, marginTop: 8, gap: 4 },
  reviewBtnText: { color: '#FFF', fontSize: 11, fontWeight: 'bold' },

  planCard: { padding: Spacing.md, gap: Spacing.sm, borderRadius: Radius.lg },
  planCardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  planIconBg: { width: 44, height: 44, borderRadius: Radius.md, justifyContent: 'center', alignItems: 'center' },
  planLabel: { fontSize: Typography.size.base, fontFamily: Typography.fonts.bold },
  planDesc: { fontSize: Typography.size.xs, color: Colors.textSecondary, marginTop: 2 },
  planChipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingTop: 4 },
  planChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  planChipText: { fontSize: 11, fontFamily: Typography.fonts.medium },
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
  
  rehabListVertical: { gap: Spacing.md },
  rehabCardVertical: { padding: Spacing.md, borderRadius: Radius.lg },
  rehabHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md },
  
  intentosContainer: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: Radius.md, padding: Spacing.sm },
  intentosLabel: { color: Colors.textMuted, fontSize: 11, fontWeight: 'bold', marginBottom: Spacing.xs, textTransform: 'uppercase' },
  intentoItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.xs, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  intentoMain: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flex: 1 },
  intentoDot: { width: 6, height: 6, borderRadius: 3 },
  intentoMeta: { color: '#FFF', fontSize: 12 },
  intentoComment: { color: Colors.primary, fontSize: 11, fontStyle: 'italic' },
  intentoActions: { flexDirection: 'row', gap: Spacing.xs },
  intentoPlayBtn: { padding: 6 },
  intentoDeleteBtn: { padding: 6 },
  sinIntentosText: { color: Colors.textMuted, fontSize: 12, textAlign: 'center', fontStyle: 'italic' },
});
