import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlassContainer } from '../../../components/GlassContainer';
import { Colors, Spacing, Radius, Typography } from '../../../constants/theme';
import { VIDEO_ESTADOS } from '../../../constants/clinical';

interface EjercicioListItemProps {
  prescripcion: any;
  seguimiento: any;
  onPress: () => void;
}
export const EjercicioListItem: React.FC<EjercicioListItemProps> = ({ prescripcion, seguimiento, onPress }) => {
  const estadoKey = (seguimiento?.estado?.toUpperCase()?.replace(' ', '_') || 'PENDIENTE') as keyof typeof VIDEO_ESTADOS;
  const config = VIDEO_ESTADOS[estadoKey] || VIDEO_ESTADOS.PENDIENTE;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.9}>
      <GlassContainer style={styles.exerciseListItem}>
        <View style={[styles.exIconContainer, { backgroundColor: prescripcion.ejercicio?.color + '15' }]}>
          <Ionicons name={prescripcion.ejercicio?.icon} size={28} color={prescripcion.ejercicio?.color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.exTitle}>{prescripcion.ejercicio?.titulo}</Text>
          <View style={styles.statusContainer}>
            <Ionicons name={config.icon as any} size={14} color={config.color} />
            <Text style={[styles.statusText, { color: config.color }]}>
              {config.label}
            </Text>
          </View>
        </View>
        <Ionicons name="play-circle" size={40} color={Colors.primary} />
      </GlassContainer>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  exerciseListItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: Spacing.md, 
    marginBottom: Spacing.md, 
    gap: Spacing.md 
  },
  exIconContainer: { 
    width: 56, 
    height: 56, 
    borderRadius: Radius.lg, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  exTitle: { 
    color: '#FFF', 
    fontSize: Typography.size.md, 
    fontFamily: Typography.fonts.bold 
  },
  statusContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 6, 
    marginTop: 4 
  },
  statusText: { 
    fontSize: Typography.size.xs, 
    fontFamily: Typography.fonts.semibold 
  }
});
