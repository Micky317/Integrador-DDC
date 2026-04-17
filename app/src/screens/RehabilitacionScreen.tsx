import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated, ActivityIndicator, Dimensions, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Colors, Typography, Spacing, Radius, Shadow } from '../constants/theme';
import { GlassContainer } from '../components/GlassContainer';
import { PrimaryButton } from '../components/PrimaryButton';
import { usePacienteDetalle } from '../features/pacientes/hooks/usePacienteDetalle';
import { useRehabilitacion } from '../features/rehabilitacion/hooks/useRehabilitacion';
import { Ejercicio, CATALOGO_EJERCICIOS } from '../constants/ejercicios';
import { Prescripcion } from '../services/rehabilitacion.service';

// Componente de Animación Memorizado para evitar parpadeos por el timer
const EjercicioAnimacion = React.memo(({ ex }: { ex: Ejercicio }) => {
  if (!ex.id?.includes('ranita') && !ex.videoLocal) return null;
  
  return (
    <Image 
      source={ex.id?.includes('ranita') ? require('../../assets/animations/rehab_anim.gif') : ex.videoLocal} 
      style={{ width: '100%', height: '100%', borderRadius: 16 }}
      resizeMode="cover"
    />
  );
});

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0D1225' },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingTop: 60, alignItems: 'center', paddingBottom: 10 },
  topTitle: { color: '#FFF', fontSize: Typography.size.lg, fontFamily: Typography.fonts.bold },
  scroll: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.md, paddingBottom: 120 },
  
  babyHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 30, backgroundColor: 'rgba(255,255,255,0.03)', padding: 16, borderRadius: Radius.lg },
  avatarMini: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primary + '20', alignItems: 'center', justifyContent: 'center' },
  avatarMiniText: { color: Colors.primary, fontWeight: 'bold', fontSize: 18 },
  babyName: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  instruction: { color: Colors.textSecondary, fontSize: 12 },

  // List Item Styles
  exerciseListItem: { flexDirection: 'row', alignItems: 'center', padding: 16, marginBottom: 16, gap: 16 },
  exIconContainer: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  exTitle: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  exSub: { color: Colors.textSecondary, fontSize: 13, marginTop: 2 },
  badgeRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeText: { color: Colors.textSecondary, fontSize: 11 },

  // Player Styles
  videoCard: { height: 220, borderRadius: Radius.xl, overflow: 'hidden', marginBottom: Spacing.xl, borderWidth: 1, backgroundColor: 'rgba(0,0,0,0.2)' },
  videoStyle: { flex: 1, width: '100%', height: '100%' },
  fallbackMedia: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  videoText: { color: Colors.textSecondary, fontSize: 14, fontWeight: '600' },
  timerContainer: { alignItems: 'center', marginBottom: Spacing.xl },
  timerCircle: { 
    width: 160, 
    height: 160, 
    borderRadius: 80, 
    borderWidth: 6, 
    justifyContent: 'center', 
    alignItems: 'center',
    marginBottom: Spacing.xl
  },
  timerNumber: { color: '#FFF', fontSize: 50, fontFamily: Typography.fonts.bold },
  timerLabel: { color: Colors.textMuted, fontSize: 12, textTransform: 'uppercase' },
  mainBtn: { width: 240, height: 60, borderRadius: 30 },
  
  sectionTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold', marginBottom: Spacing.md },
  instructionCard: { padding: Spacing.lg, gap: 16 },
  step: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  numBadge: { width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 2 },
  stepNum: { width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 2 },
  stepNumText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
  stepText: { flex: 1, color: Colors.textSecondary, fontSize: 14, lineHeight: 20 },
  
  emptyState: { padding: 40, alignItems: 'center', justifyContent: 'center', gap: 16, marginTop: 40 },
  emptyText: { color: Colors.textMuted, fontSize: 16, textAlign: 'center' },
});

export default function RehabilitacionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { paciente, isLoading: isPacLoading } = usePacienteDetalle(id ?? '');
  const { prescripciones, isLoading: isRehabLoading, registrarActividad } = useRehabilitacion(id ?? '');
  
  const [activeExercise, setActiveExercise] = useState<Prescripcion | null>(null);
  const [sessionActive, setSessionActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0); 
  const [isFinished, setIsFinished] = useState(false);

  // Memorizar el ejercicio para evitar re-renders infinitos
  // SIEMPRE arriba de cualquier return temprano
  const ex = React.useMemo(() => {
    if (!activeExercise) return null;
    const catalogoInfo = CATALOGO_EJERCICIOS.find(e => e.id === activeExercise.ejercicio_id);
    return { ...catalogoInfo, ...activeExercise.ejercicio } as Ejercicio;
  }, [activeExercise?.id, activeExercise?.ejercicio_id]);

  // Lógica del temporizador
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (sessionActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && sessionActive) {
      setSessionActive(false);
      setIsFinished(true);
      if (activeExercise && activeExercise.ejercicio) {
        // Guardar el tiempo total prescrito
        registrarActividad({ 
          ejercicioId: activeExercise.ejercicio_id, 
          duracionSegundos: activeExercise.ejercicio.duracionSegundos 
        });
      }
    }
    return () => clearInterval(interval);
  }, [sessionActive, timeLeft]);

  const handleStartExercise = (p: Prescripcion) => {
    setActiveExercise(p);
    const duration = p.ejercicio?.duracionSegundos || 30; // 30s fallback
    setTimeLeft(duration); 
    setSessionActive(true);
    setIsFinished(false);
  };

  const handleFinishSession = () => {
    // Si el usuario termina manualmente antes de tiempo, guardamos lo que hizo
    if (!isFinished && activeExercise && activeExercise.ejercicio) {
      const durationReal = activeExercise.ejercicio.duracionSegundos - timeLeft;
      if (durationReal > 5) { // Solo si hizo al menos 5 segundos
        registrarActividad({ 
          ejercicioId: activeExercise.ejercicio_id, 
          duracionSegundos: durationReal 
        });
      }
    }
    setActiveExercise(null);
    setIsFinished(false);
    setTimeLeft(0);
  };

  if (isPacLoading || isRehabLoading || !paciente) {
    return (
      <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>
    );
  }

  // Vista de Reproductor de Ejercicio
  if (activeExercise && ex) {
    return (
      <LinearGradient colors={Colors.gradientBg} style={styles.gradient}>
        <StatusBar style="light" />
        <View style={styles.topBar}>
          <TouchableOpacity onPress={handleFinishSession}>
            <Ionicons name="close" size={28} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.topTitle}>{ex.titulo}</Text>
          <View style={{ width: 28 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={[styles.videoCard, { backgroundColor: 'transparent', borderColor: ex.color + '30', borderWidth: 1 }]}>
            <EjercicioAnimacion ex={ex} />
            {(!ex.id?.includes('ranita') && !ex.videoLocal) && (
              <View style={styles.fallbackMedia}>
                <Ionicons name={ex.icon} size={80} color={ex.color} />
                <Text style={styles.videoText}>{ex.subtitulo}</Text>
              </View>
            )}
          </View>

          <View style={styles.timerContainer}>
            <View style={[styles.timerCircle, { borderColor: ex.color + '20', borderTopColor: ex.color }]}>
              <Text style={styles.timerNumber}>{timeLeft}</Text>
              <Text style={styles.timerLabel}>Segundos</Text>
            </View>
            
            {!isFinished ? (
              <PrimaryButton 
                title={sessionActive ? 'Pausar' : 'Reanudar'}
                onPress={() => setSessionActive(!sessionActive)}
                style={[styles.mainBtn, { backgroundColor: ex.color }]}
                icon={sessionActive ? 'pause' : 'play'}
              />
            ) : (
              <PrimaryButton 
                title="Siguiente / Terminar"
                onPress={handleFinishSession}
                style={[styles.mainBtn, { backgroundColor: Colors.statusNormal }]}
                icon="checkmark-done"
              />
            )}
          </View>

          <Text style={styles.sectionTitle}>Cómo realizarlo</Text>
          <GlassContainer style={styles.instructionCard}>
            {ex.instrucciones.map((step, index) => (
              <View key={index} style={styles.step}>
                <View style={[styles.stepNum, { backgroundColor: ex.color }]}>
                  <Text style={styles.stepNumText}>{index + 1}</Text>
                </View>
                <Text style={styles.stepText}>{step}</Text>
              </View>
            ))}
          </GlassContainer>
        </ScrollView>
      </LinearGradient>
    );
  }

  // Vista de Lista de Ejercicios del Día
  return (
    <LinearGradient colors={Colors.gradientBg} style={styles.gradient}>
      <StatusBar style="light" />
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => {
          router.replace('/(tabs)/progreso');
        }}>
          <Ionicons name="arrow-back" size={28} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.topTitle}>Plan de Hoy</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <TouchableOpacity 
          style={styles.babyHeader}
          onPress={() => router.push({ pathname: '/(tabs)/paciente-detalle', params: { id: paciente.id } })}
        >
          <View style={styles.avatarMini}>
            <Text style={styles.avatarMiniText}>{paciente.nombreCompleto[0] || 'B'}</Text>
          </View>
          <View>
            <Text style={styles.babyName}>{paciente.nombreCompleto}</Text>
            <Text style={styles.instruction}>Rutina prescrita por tu médico</Text>
          </View>
        </TouchableOpacity>

        {(prescripciones || []).length > 0 ? (
          (prescripciones || []).map((p: any) => (
            <TouchableOpacity key={p.id} onPress={() => handleStartExercise(p)} activeOpacity={0.9}>
              <GlassContainer style={styles.exerciseListItem}>
                <View style={[styles.exIconContainer, { backgroundColor: p.ejercicio?.color + '15' }]}>
                  <Ionicons name={p.ejercicio?.icon || 'fitness'} size={28} color={p.ejercicio?.color || Colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.exTitle}>{p.ejercicio?.titulo || 'Ejercicio'}</Text>
                  <Text style={styles.exSub}>{p.ejercicio?.subtitulo || 'Rehabilitación'}</Text>
                  <View style={styles.badgeRow}>
                    <View style={styles.badge}>
                      <Ionicons name="repeat" size={12} color={Colors.textSecondary} />
                      <Text style={styles.badgeText}>{p.frecuencia_diaria || 1} veces/día</Text>
                    </View>
                  </View>
                </View>
                <Ionicons name="play-circle" size={40} color={Colors.primary} />
              </GlassContainer>
            </TouchableOpacity>
          ))
        ) : (
          <GlassContainer style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyText}>No tienes ejercicios asignados para hoy.</Text>
          </GlassContainer>
        )}
      </ScrollView>
    </LinearGradient>
  );
}


