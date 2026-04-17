import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
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
import { usePacienteDetalle, useEliminarPaciente } from '../features/pacientes/hooks/usePacienteDetalle';
import { calcularMesesDeEdad, obtenerIniciales, obtenerColorAvatar } from '../utils/helpers';
import { labelGraf } from '../types';
import { useAppStore } from '../store/useAppStore';

export default function PacienteDetalleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAppStore();
  const { paciente, historial, isLoading } = usePacienteDetalle(id ?? '');
  const { mutate: eliminar, isPending: eliminando } = useEliminarPaciente(id ?? '');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const isMedico = user?.role === 'medico';

  const handleBack = () => {
    if (user?.role === 'padre') {
      router.replace('/progreso');
    } else {
      router.back();
    }
  };

  const handleNuevoAnalisis = () => {
    router.push({ pathname: '/(tabs)/cargar-imagen', params: { pacienteId: id } });
  };

  const handleVerEvolucion = () => {
    router.push({ pathname: '/(tabs)/evolucion', params: { pacienteId: id } });
  };

  const handleDeletePress = () => {
    Alert.alert(
      'Eliminar paciente',
      `¿Confirmas eliminar a ${paciente?.nombreCompleto}?\nEsta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: () => eliminar() },
      ]
    );
  };

  if (isLoading || !paciente) {
    return (
      <LinearGradient colors={Colors.gradientBg} style={styles.gradient}>
        <StatusBar style="light" />
        <View style={styles.loadingContainer}>
          <Skeleton height={60} borderRadius={Radius.round} style={{ width: 60, marginBottom: Spacing.md }} />
          <Skeleton height={24} borderRadius={Radius.sm} style={{ width: 200, marginBottom: 8 }} />
          <Skeleton height={16} borderRadius={Radius.sm} style={{ width: 140, marginBottom: Spacing.xl }} />
          <Skeleton height={120} borderRadius={Radius.lg} style={{ marginBottom: 12, width: '100%' }} />
          <Skeleton height={100} borderRadius={Radius.lg} style={{ marginBottom: 12, width: '100%' }} />
        </View>
      </LinearGradient>
    );
  }

  const meses = calcularMesesDeEdad(paciente.fechaNacimiento);
  const iniciales = obtenerIniciales(paciente.nombreCompleto);
  const colorAvatar = obtenerColorAvatar(paciente.id);

  return (
    <LinearGradient colors={Colors.gradientBg} style={styles.gradient}>
      <StatusBar style="light" />

      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.topTitle}>Detalle Paciente</Text>
        {isMedico ? (
          <TouchableOpacity onPress={handleDeletePress} style={styles.deleteBtn} activeOpacity={0.7}>
            <Ionicons name="trash-outline" size={20} color={Colors.statusDanger} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile header */}
        <GlassContainer intensity={20} style={styles.profileCard}>
          <View style={[styles.avatar, { backgroundColor: colorAvatar }]}>
            <Text style={styles.avatarText}>{iniciales}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{paciente.nombreCompleto}</Text>
            <Text style={styles.profileMeta}>
              {meses} meses · {paciente.sexo === 'M' ? 'Masculino' : 'Femenino'}
            </Text>
            <Text style={styles.profileCode}>{paciente.codigoPaciente}</Text>
          </View>
          {paciente.estadoGraf && (
            <GrafBadge estado={paciente.estadoGraf} style={styles.grafBadge} />
          )}
        </GlassContainer>

        {/* Antecedentes */}
        <Text style={styles.sectionTitle}>Antecedentes de Riesgo</Text>
        <GlassContainer intensity={15} style={styles.antecedentesCard}>
          <View style={styles.riskRow}>
            <RiskItem
              icon="walk-outline"
              label="Presentación Pélvica"
              active={paciente.presentacionNalgas}
            />
            <RiskItem
              icon="people-outline"
              label="Antecedente familiar"
              active={paciente.antecedenteFamiliar}
            />
          </View>
          {paciente.edadGestacional && (
            <View style={styles.infoRow}>
              <Ionicons name="calendar-number-outline" size={14} color={Colors.textMuted} />
              <Text style={styles.infoText}>
                Edad gestacional: {paciente.edadGestacional} semanas
              </Text>
            </View>
          )}
        </GlassContainer>

        {/* Tutor */}
        <Text style={styles.sectionTitle}>Tutor / Contacto</Text>
        <GlassContainer intensity={15} style={styles.tutorCard}>
          <View style={styles.infoRow}>
            <Ionicons name="person-outline" size={14} color={Colors.textMuted} />
            <Text style={styles.infoText}>{paciente.nombreTutor}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="call-outline" size={14} color={Colors.textMuted} />
            <Text style={styles.infoText}>{paciente.telefonoContacto}</Text>
          </View>
        </GlassContainer>

        {/* Action buttons */}
        <View style={styles.actionRow}>
          {isMedico && (
            <PrimaryButton
              title="Nuevo Analisis"
              onPress={handleNuevoAnalisis}
              style={styles.actionBtn}
            />
          )}
          <TouchableOpacity
            onPress={handleVerEvolucion}
            style={[styles.secondaryBtn, !isMedico && { flex: 1 }]}
            activeOpacity={0.8}
          >
            <Ionicons name="trending-up-outline" size={18} color={Colors.primary} />
            <Text style={styles.secondaryBtnText}>Ver Evolucion</Text>
          </TouchableOpacity>
        </View>

        {/* Historial */}
        <View style={styles.historialHeader}>
          <Text style={styles.sectionTitle}>Historial de Analisis</Text>
          <Text style={styles.historialCount}>{historial.length} registros</Text>
        </View>

        {historial.length === 0 ? (
          <GlassContainer intensity={10} style={styles.emptyCard}>
            <Ionicons name="document-text-outline" size={32} color={Colors.textMuted} />
            <Text style={styles.emptyText}>Sin analisis registrados</Text>
            <Text style={styles.emptySubText}>Usa el boton para iniciar el primer analisis de IA</Text>
          </GlassContainer>
        ) : (
          historial.map((analisis) => (
            <AnalisisHistorialCard
              key={analisis.id}
              analisis={analisis}
              onPress={() =>
                router.push({ pathname: '/(tabs)/analisis', params: { analisisId: analisis.id, pacienteId: id } })
              }
            />
          ))
        )}
      </ScrollView>
    </LinearGradient>
  );
}

function RiskItem({ icon, label, active }: { icon: any; label: string; active: boolean }) {
  return (
    <View style={riskStyles.item}>
      <Ionicons
        name={icon}
        size={18}
        color={active ? Colors.statusDanger : Colors.textMuted}
      />
      <Text style={[riskStyles.label, active && { color: Colors.statusDanger }]}>
        {label}
      </Text>
      <View style={[riskStyles.dot, { backgroundColor: active ? Colors.statusDanger : Colors.borderDefault }]} />
    </View>
  );
}

const riskStyles = StyleSheet.create({
  item: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  label: {
    color: Colors.textSecondary,
    fontSize: Typography.size.xs,
    fontFamily: Typography.fonts.medium,
    flex: 1,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});

const styles = StyleSheet.create({
  gradient: { flex: 1 },

  loadingContainer: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: 80,
    alignItems: 'center',
  },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: 58,
    paddingBottom: Spacing.md,
  },
  backBtn: {
    padding: 4,
  },
  topTitle: {
    color: Colors.textPrimary,
    fontSize: Typography.size.lg,
    fontFamily: Typography.fonts.bold,
  },
  deleteBtn: {
    padding: 4,
  },

  scroll: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 100,
    gap: Spacing.md,
  },

  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.md,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarText: {
    color: '#FFF',
    fontFamily: Typography.fonts.bold,
    fontSize: Typography.size.lg,
  },
  profileInfo: { flex: 1 },
  profileName: {
    color: Colors.textPrimary,
    fontFamily: Typography.fonts.bold,
    fontSize: Typography.size.md,
  },
  profileMeta: {
    color: Colors.textSecondary,
    fontFamily: Typography.fonts.regular,
    fontSize: Typography.size.sm,
    marginTop: 2,
  },
  profileCode: {
    color: Colors.primary,
    fontFamily: Typography.fonts.semibold,
    fontSize: Typography.size.xs,
    marginTop: 2,
    letterSpacing: 0.5,
  },
  grafBadge: {
    flexShrink: 0,
  },

  sectionTitle: {
    color: Colors.textPrimary,
    fontFamily: Typography.fonts.semibold,
    fontSize: Typography.size.base,
    marginBottom: 4,
    marginTop: 4,
  },

  antecedentesCard: {
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  riskRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },

  tutorCard: {
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  infoText: {
    color: Colors.textSecondary,
    fontFamily: Typography.fonts.regular,
    fontSize: Typography.size.sm,
    flex: 1,
  },

  actionRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    alignItems: 'center',
    marginVertical: 4,
  },
  actionBtn: {
    flex: 1,
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: Radius.lg,
    paddingVertical: 14,
    paddingHorizontal: Spacing.md,
  },
  secondaryBtnText: {
    color: Colors.primary,
    fontFamily: Typography.fonts.semibold,
    fontSize: Typography.size.base,
  },

  historialHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 4,
  },
  historialCount: {
    color: Colors.textMuted,
    fontSize: Typography.size.xs,
    fontFamily: Typography.fonts.medium,
  },

  emptyCard: {
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  emptyText: {
    color: Colors.textSecondary,
    fontFamily: Typography.fonts.semibold,
    fontSize: Typography.size.base,
  },
  emptySubText: {
    color: Colors.textMuted,
    fontFamily: Typography.fonts.regular,
    fontSize: Typography.size.sm,
    textAlign: 'center',
  },
});
