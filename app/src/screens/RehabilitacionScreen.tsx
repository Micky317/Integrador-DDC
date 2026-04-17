import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Colors, Typography, Spacing, Radius, Shadow } from '../constants/theme';
import { GlassContainer } from '../components/GlassContainer';
import { PrimaryButton } from '../components/PrimaryButton';
import { usePacienteDetalle } from '../features/pacientes/hooks/usePacienteDetalle';

export default function RehabilitacionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { paciente, isLoading } = usePacienteDetalle(id ?? '');
  const [sessionActive, setSessionActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30); // 30 segundos por ejercicio
  const timerAnim = useRef(new Animated.Value(1)).current;

  // Lógica del temporizador
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (sessionActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setSessionActive(false);
      // Aquí dispararíamos haptics y sonido de éxito
    }
    return () => clearInterval(interval);
  }, [sessionActive, timeLeft]);

  const handleStart = () => {
    if (timeLeft === 0) setTimeLeft(30);
    setSessionActive(true);
  };

  if (isLoading || !paciente) {
    return (
      <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>
    );
  }

  return (
    <LinearGradient colors={Colors.gradientBg} style={styles.gradient}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="close" size={28} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.topTitle}>Rehabilitación Asistida</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Baby Context */}
        <View style={styles.babyInfo}>
          <Text style={styles.babyName}>{paciente.nombreCompleto}</Text>
          <Text style={styles.instruction}>Sigue la guía para completar la sesión</Text>
        </View>

        {/* Video / Animation Area */}
        <GlassContainer intensity={30} style={styles.videoCard}>
          <View style={styles.videoPlaceholder}>
            <Ionicons name="play-circle" size={80} color={Colors.primary + '80'} />
            <Text style={styles.videoText}>Visualizando Técnica: Abducción Lenta</Text>
          </View>
        </GlassContainer>

        {/* Timer UI */}
        <View style={styles.timerContainer}>
          <View style={styles.timerCircle}>
            <Text style={styles.timerNumber}>{timeLeft}</Text>
            <Text style={styles.timerLabel}>Segundos</Text>
          </View>
          
          <PrimaryButton 
            title={sessionActive ? 'Pausar' : timeLeft === 0 ? 'Repetir' : 'Iniciar Ejercicio'}
            onPress={() => setSessionActive(!sessionActive)}
            style={styles.mainBtn}
            icon={sessionActive ? 'pause' : 'play'}
          />
        </View>

        {/* Instructions */}
        <Text style={styles.sectionTitle}>Instrucciones</Text>
        <GlassContainer style={styles.instructionCard}>
          <View style={styles.step}>
            <View style={styles.stepNum}><Text style={styles.stepNumText}>1</Text></View>
            <Text style={styles.stepText}>Coloca al bebé boca arriba en una superficie firme.</Text>
          </View>
          <View style={styles.step}>
            <View style={styles.stepNum}><Text style={styles.stepNumText}>2</Text></View>
            <Text style={styles.stepText}>Mueve suavemente sus rodillas hacia afuera hasta sentir el tope natural.</Text>
          </View>
          <View style={styles.step}>
            <View style={styles.stepNum}><Text style={styles.stepNumText}>3</Text></View>
            <Text style={styles.stepText}>Mantén la posición mientras el reloj llega a cero.</Text>
          </View>
        </GlassContainer>
      </ScrollView>

      {/* Done Button */}
      <View style={styles.footer}>
        <PrimaryButton 
          title="Finalizar Sesión" 
          disabled={timeLeft > 0}
          onPress={() => router.replace('/progreso')}
          style={{ width: '100%', backgroundColor: Colors.statusNormal }}
        />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0D1225' },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingTop: 60, alignItems: 'center' },
  topTitle: { color: '#FFF', fontSize: Typography.size.lg, fontFamily: Typography.fonts.bold },
  scroll: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.md, paddingBottom: 120 },
  babyInfo: { alignItems: 'center', marginBottom: Spacing.lg },
  babyName: { color: Colors.primary, fontSize: Typography.size.xl, fontFamily: Typography.fonts.bold },
  instruction: { color: Colors.textSecondary, fontSize: Typography.size.sm, marginTop: 4 },
  videoCard: { height: 220, borderRadius: Radius.xl, overflow: 'hidden', marginBottom: Spacing.xl },
  videoPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  videoText: { color: Colors.textMuted, fontSize: Typography.size.xs, fontFamily: Typography.fonts.medium },
  timerContainer: { alignItems: 'center', marginBottom: Spacing.xl },
  timerCircle: { 
    width: 140, 
    height: 140, 
    borderRadius: 70, 
    borderWidth: 8, 
    borderColor: Colors.primary + '30', 
    borderTopColor: Colors.primary,
    justifyContent: 'center', 
    alignItems: 'center',
    marginBottom: Spacing.lg
  },
  timerNumber: { color: '#FFF', fontSize: 44, fontFamily: Typography.fonts.bold },
  timerLabel: { color: Colors.textMuted, fontSize: 10, textTransform: 'uppercase', letterSpacing: 1 },
  mainBtn: { width: 220, height: 56 },
  sectionTitle: { color: '#FFF', fontSize: Typography.size.md, fontFamily: Typography.fonts.bold, marginBottom: Spacing.md },
  instructionCard: { padding: Spacing.md, gap: Spacing.md },
  step: { flexDirection: 'row', gap: Spacing.md, alignItems: 'center' },
  stepNum: { width: 24, height: 24, borderRadius: 12, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
  stepNumText: { color: Colors.bgDeep, fontSize: 12, fontFamily: Typography.fonts.bold },
  stepText: { flex: 1, color: Colors.textSecondary, fontSize: 13, lineHeight: 18 },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: Spacing.xl, backgroundColor: 'rgba(13, 18, 37, 0.95)' }
});
