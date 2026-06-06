import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors, Typography, Radius, Spacing } from '../../../constants/theme';
import { GrafBadge } from '../../../components/GrafBadge';
import { Paciente } from '../../../types';
import { TouchableScale } from '../../../components/TouchableScale';
import { GlassContainer } from '../../../components/GlassContainer';
import { calcularMesesDeEdad, obtenerIniciales, obtenerColorAvatar } from '../../../utils/helpers';

interface PacienteCardProps {
  paciente: Paciente;
  onPress?: () => void;
}

export const PacienteCard = ({ paciente, onPress }: PacienteCardProps) => {
  const meses = calcularMesesDeEdad(paciente.fechaNacimiento);
  const colorSexo = paciente.sexo === 'M' ? '#4D6EE3' : '#E34D9B';
  const fechaNac = new Date(paciente.fechaNacimiento).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
  const esUrgente = paciente.estadoGraf === 'GRAF_IV' || paciente.estadoGraf === 'GRAF_IIB_URGENTE';
  
  return (
    <TouchableScale
      onPress={onPress || (() => router.push({ pathname: '/(tabs)/paciente-detalle', params: { id: paciente.id } }))}
      style={styles.cardWrapper}
    >
      <GlassContainer intensity={20} style={[styles.card, { borderLeftWidth: 4, borderLeftColor: colorSexo }]}>
        <View style={styles.cardMainContent}>
          <View style={styles.cardHeader}>
            <View style={[styles.avatar, { backgroundColor: obtenerColorAvatar(paciente.id) }]}>
              <Text style={styles.avatarText}>{obtenerIniciales(paciente.nombreCompleto)}</Text>
            </View>
            <View style={styles.headerInfo}>
              <View style={styles.nameSection}>
                <Text style={styles.cardName} numberOfLines={1}>{paciente.nombreCompleto}</Text>
                {esUrgente && <View style={styles.urgentDot} />}
                <Ionicons 
                  name={paciente.sexo === 'M' ? 'male' : 'female'} 
                  size={14} 
                  color={colorSexo} 
                />
              </View>
              <Text style={styles.cardMeta}>{meses} meses ({fechaNac})</Text>
            </View>

            {/* Tratamiento en la esquina superior derecha */}
            {paciente.tratamientosAsignados && paciente.tratamientosAsignados.length > 0 && (() => {
              const priority = ['cirugia', 'yeso', 'arnes', 'ejercicios', 'observacion'];
              const primary = priority.find(t => paciente.tratamientosAsignados!.includes(t)) || paciente.tratamientosAsignados[0];
              const color = primary === 'ejercicios' ? Colors.statusNormal
                : primary === 'arnes' ? Colors.statusWarning
                : primary === 'yeso' ? Colors.statusDanger
                : primary === 'cirugia' ? Colors.statusUrgent
                : Colors.textMuted;
              const extra = paciente.tratamientosAsignados.length - 1;
              return (
                <View style={[styles.treatmentBadgeTop, { backgroundColor: color }]}>
                  <Text style={styles.treatmentTextTop}>
                    {primary.toUpperCase()}{extra > 0 ? ` +${extra}` : ''}
                  </Text>
                </View>
              );
            })()}
          </View>

          <View style={styles.dataGrid}>
            <View style={styles.dataItem}>
              <Text style={styles.dataLabel}>ID</Text>
              <Text style={styles.dataValue}>{paciente.codigoPaciente}</Text>
            </View>
            <View style={styles.dataItem}>
              <Text style={styles.dataLabel}>GESTA.</Text>
              <Text style={styles.dataValue}>{paciente.edadGestacional || '--'} s</Text>
            </View>
            <View style={[styles.dataItem, { flex: 2 }]}>
              <Text style={styles.dataLabel}>TUTOR</Text>
              <Text style={styles.dataValue} numberOfLines={1}>{paciente.nombreTutor}</Text>
            </View>
          </View>

          <View style={styles.footerRow}>
            <View style={styles.badgesWrapper}>
              {paciente.estadoGraf && <GrafBadge estado={paciente.estadoGraf} compact={true} />}
            </View>

            <View style={styles.riskIcons}>
              {paciente.presentacionNalgas && (
                <View style={styles.riskBadge}>
                  <Ionicons name="swap-vertical" size={12} color={Colors.statusDanger} />
                  <Text style={[styles.riskText, { color: Colors.statusDanger }]}>PODÁLICA</Text>
                </View>
              )}
              {paciente.antecedenteFamiliar && (
                <View style={styles.riskBadge}>
                  <Ionicons name="people" size={12} color={Colors.statusWarning} />
                  <Text style={[styles.riskText, { color: Colors.statusWarning }]}>HEREDITARIO</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </GlassContainer>
    </TouchableScale>
  );
};

const styles = StyleSheet.create({
  cardWrapper: { marginBottom: 12 },
  card: { padding: 12, borderRadius: Radius.lg },
  cardMainContent: { gap: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontFamily: Typography.fonts.bold, fontSize: Typography.size.sm },
  headerInfo: { flex: 1 },
  nameSection: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardName: { color: Colors.textPrimary, fontSize: Typography.size.md, fontFamily: Typography.fonts.bold },
  urgentDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.statusUrgent, marginRight: -2 },
  cardMeta: { color: Colors.textSecondary, fontSize: Typography.size.xs, fontFamily: Typography.fonts.regular },
  
  dataGrid: { flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.15)', padding: 8, borderRadius: Radius.sm, gap: 12 },
  dataItem: { flex: 1 },
  dataLabel: { color: Colors.textMuted, fontSize: 8, fontFamily: Typography.fonts.bold, letterSpacing: 0.5 },
  dataValue: { color: Colors.textPrimary, fontSize: 11, fontFamily: Typography.fonts.medium },
  
  footerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  badgesWrapper: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  treatmentBadgeTop: { 
    paddingHorizontal: 8, 
    paddingVertical: 4, 
    borderRadius: Radius.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  treatmentTextTop: { 
    color: '#FFF', 
    fontSize: 9, 
    fontFamily: Typography.fonts.bold,
    letterSpacing: 0.5,
  },
  riskIcons: { flexDirection: 'row', gap: 8 },
  riskBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  riskText: { fontSize: 8, fontFamily: Typography.fonts.bold },
});
