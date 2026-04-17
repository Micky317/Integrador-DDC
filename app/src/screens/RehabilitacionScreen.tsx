import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius, Shadow } from '../constants/theme';
import { GlassContainer } from '../components/GlassContainer';
import { TouchableScale } from '../components/TouchableScale';
import { PrimaryButton } from '../components/PrimaryButton';
import { useToastStore } from '../store/useToastStore';

export default function RehabilitacionScreen() {
  const [timerActive, setTimerActive] = useState(false);
  const [seconds, setSeconds] = useState(600); // 10 minutos por defecto
  const [isMorningDone, setIsMorningDone] = useState(false);
  const [isAfternoonDone, setIsAfternoonDone] = useState(false);
  const showToast = useToastStore((state) => state.showToast);

  // Lógica del temporizador
  useEffect(() => {
    let interval: any = null;
    if (timerActive && seconds > 0) {
      interval = setInterval(() => {
        setSeconds((s) => s - 1);
      }, 1000);
    } else if (seconds === 0) {
      setTimerActive(false);
      showToast('¡Felicidades!', 'Has completado la sesión de ejercicios.', 'success');
      // Marcar sesión automáticamente
      const hour = new Date().getHours();
      if (hour < 14) setIsMorningDone(true);
      else setIsAfternoonDone(true);
      setSeconds(600); // Reset
    }
    return () => clearInterval(interval);
  }, [timerActive, seconds]);

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const toggleTimer = () => {
    setTimerActive(!timerActive);
  };

  return (
    <LinearGradient colors={Colors.gradientBg} style={styles.container}>
      <StatusBar style="light" />
      
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.greeting}>Centro de</Text>
          <Text style={styles.title}>Rehabilitación</Text>
        </View>

        {/* Progreso Diario */}
        <GlassContainer style={styles.progressContainer}>
          <Text style={styles.sectionTitle}>Progreso Diario</Text>
          <View style={styles.ringsRow}>
            <View style={styles.ringItem}>
              <View style={[styles.ring, isMorningDone && styles.ringActive]}>
                <Ionicons 
                  name={isMorningDone ? "checkmark" : "sunny-outline"} 
                  size={24} 
                  color={isMorningDone ? Colors.bgDeep : Colors.textCyan} 
                />
              </View>
              <Text style={styles.ringLabel}>Mañana</Text>
            </View>
            <View style={styles.ringItem}>
              <View style={[styles.ring, isAfternoonDone && styles.ringActive]}>
                <Ionicons 
                  name={isAfternoonDone ? "checkmark" : "cloudy-night-outline"} 
                  size={24} 
                  color={isAfternoonDone ? Colors.bgDeep : Colors.textCyan} 
                />
              </View>
              <Text style={styles.ringLabel}>Tarde</Text>
            </View>
          </View>
        </GlassContainer>

        {/* Ejercicios */}
        <Text style={[styles.sectionTitle, { marginLeft: Spacing.md, marginTop: Spacing.lg }]}>
          Guías de Ejercicios
        </Text>
        
        <TouchableScale>
          <GlassContainer style={styles.exerciseCard}>
            <View style={styles.exerciseIconBg}>
              <Ionicons name="body-outline" size={24} color={Colors.primary} />
            </View>
            <View style={styles.exerciseInfo}>
              <Text style={styles.exerciseName}>Ejercicios de Abducción</Text>
              <Text style={styles.exerciseDesc}>Movimientos suaves para la cadera.</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
          </GlassContainer>
        </TouchableScale>

        <TouchableScale>
          <GlassContainer style={styles.exerciseCard}>
            <View style={styles.exerciseIconBg}>
              <Ionicons name="shield-checkmark-outline" size={24} color={Colors.primary} />
            </View>
            <View style={styles.exerciseInfo}>
              <Text style={styles.exerciseName}>Cuidado del Arnés</Text>
              <Text style={styles.exerciseDesc}>Guía para el ajuste del Arnés de Pavlik.</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
          </GlassContainer>
        </TouchableScale>

        {/* Temporizador Section */}
        <View style={styles.timerSection}>
          <Text style={styles.timerText}>{formatTime(seconds)}</Text>
          <Text style={styles.timerSub}>Tiempo recomendado: 10 min</Text>
          
          <PrimaryButton
            title={timerActive ? "Pausar" : "Iniciar Sesión"}
            onPress={toggleTimer}
            style={styles.btn}
            icon={timerActive ? "pause-outline" : "play-outline"}
          />
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: Spacing.md, paddingTop: 60, paddingBottom: 100 },
  header: { marginBottom: Spacing.xl },
  greeting: { color: Colors.textSecondary, fontSize: Typography.size.lg, fontFamily: Typography.fonts.medium },
  title: { color: Colors.textPrimary, fontSize: Typography.size.xxl, fontFamily: Typography.fonts.bold },
  
  progressContainer: { padding: Spacing.lg, borderRadius: Radius.xl },
  sectionTitle: { color: Colors.textPrimary, fontSize: Typography.size.md, fontFamily: Typography.fonts.semibold, marginBottom: Spacing.md },
  ringsRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: Spacing.sm },
  ringItem: { alignItems: 'center' },
  ring: { width: 60, height: 60, borderRadius: 30, borderWidth: 2, borderColor: Colors.borderActive, justifyContent: 'center', alignItems: 'center', backgroundColor: 'transparent' },
  ringActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  ringLabel: { color: Colors.textSecondary, marginTop: Spacing.xs, fontSize: Typography.size.xs },

  exerciseCard: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, borderRadius: Radius.lg, marginBottom: Spacing.md },
  exerciseIconBg: { width: 44, height: 44, borderRadius: Radius.md, backgroundColor: 'rgba(0, 229, 204, 0.1)', justifyContent: 'center', alignItems: 'center', marginRight: Spacing.md },
  exerciseInfo: { flex: 1 },
  exerciseName: { color: Colors.textPrimary, fontSize: Typography.size.base, fontFamily: Typography.fonts.semibold },
  exerciseDesc: { color: Colors.textSecondary, fontSize: Typography.size.xs },

  timerSection: { marginTop: Spacing.xxl, alignItems: 'center', paddingVertical: Spacing.xl },
  timerText: { color: Colors.primary, fontSize: 64, fontFamily: Typography.fonts.bold, ...Shadow.glow },
  timerSub: { color: Colors.textSecondary, fontSize: Typography.size.sm, marginBottom: Spacing.xl },
  btn: { width: '80%' }
});
