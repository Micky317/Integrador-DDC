import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors, Typography, Radius, Shadow } from '../../../constants/theme';
import { GrafBadge } from '../../../components/GrafBadge';
import { Paciente, EstadoGraf } from '../../../types';
import { TouchableScale } from '../../../components/TouchableScale';
import { GlassContainer } from '../../../components/GlassContainer';
import { calcularMesesDeEdad, obtenerIniciales, obtenerColorAvatar } from '../../../utils/helpers';

interface PacienteCardProps {
  paciente: Paciente;
  onPress?: () => void;
}

export const PacienteCard = ({ paciente, onPress }: PacienteCardProps) => {
  return (
    <TouchableScale
      onPress={onPress || (() => router.push({ pathname: '/(tabs)/paciente-detalle', params: { id: paciente.id } }))}
      style={styles.cardWrapper}
    >
      <GlassContainer intensity={20} style={styles.card}>
        <View style={[styles.avatar, { backgroundColor: obtenerColorAvatar(paciente.id) }]}>
          <Text style={styles.avatarText}>{obtenerIniciales(paciente.nombreCompleto)}</Text>
        </View>

        <View style={styles.cardInfo}>
          <View style={styles.cardTopRow}>
            <Text style={styles.cardName}>{paciente.nombreCompleto}</Text>
            <TouchableOpacity hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="ellipsis-horizontal" size={18} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>
          <Text style={styles.cardMeta}>
            {calcularMesesDeEdad(paciente.fechaNacimiento)} meses · ID: {paciente.codigoPaciente}
          </Text>

          {paciente.ultimaRevision && (
            <View style={styles.metaRow}>
              <Ionicons name="time-outline" size={12} color={Colors.statusWarning} />
              <Text style={[styles.cardMetaSub, { color: Colors.statusWarning }]}>
                {' '}Última revisión: {paciente.ultimaRevision}
              </Text>
            </View>
          )}
          {paciente.proximaRevision && (
            <View style={styles.metaRow}>
              <Ionicons name="calendar-outline" size={12} color={Colors.textSecondary} />
              <Text style={styles.cardMetaSub}> Próxima: {paciente.proximaRevision}</Text>
            </View>
          )}

          {paciente.estadoGraf && <GrafBadge estado={paciente.estadoGraf} style={styles.badge} />}
        </View>

        <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
      </GlassContainer>
    </TouchableScale>
  );
};

const styles = StyleSheet.create({
  cardWrapper: {
    marginBottom: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarText: { color: '#fff', fontWeight: Typography.weight.bold, fontSize: Typography.size.md },
  cardInfo: { flex: 1 },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardName: { color: Colors.textPrimary, fontSize: Typography.size.md, fontWeight: Typography.weight.semibold },
  cardMeta: { color: Colors.textMuted, fontSize: Typography.size.xs, marginTop: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 3 },
  cardMetaSub: { color: Colors.textSecondary, fontSize: Typography.size.xs },
  badge: { marginTop: 6 },
});
