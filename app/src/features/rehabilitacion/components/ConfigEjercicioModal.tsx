import React from 'react';
import { View, Text, Modal, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { PrimaryButton } from '../../../components/PrimaryButton';
import { WheelPicker } from './WheelPicker';
import { Colors, Spacing, Radius, Typography } from '../../../constants/theme';
import { styles } from '../styles/rehabilitacion.styles';

interface ConfigEjercicioModalProps {
  visible: boolean;
  onClose: () => void;
  onStart: () => void;
  ejercicioName: string;
  sesiones: number;
  setSesiones: (val: number) => void;
  mins: number;
  setMins: (val: number) => void;
  secs: number;
  setSecs: (val: number) => void;
  restMins: number;
  setRestMins: (val: number) => void;
  restSecs: number;
  setRestSecs: (val: number) => void;
  totalTime: number;
}

export const ConfigEjercicioModal: React.FC<ConfigEjercicioModalProps> = ({
  visible,
  onClose,
  onStart,
  ejercicioName,
  sesiones,
  setSesiones,
  mins,
  setMins,
  secs,
  setSecs,
  restMins,
  setRestMins,
  restSecs,
  setRestSecs,
  totalTime
}) => {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <BlurView intensity={80} tint="dark" style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>{ejercicioName}</Text>
              <Text style={styles.instruction}>Configura tu sesión</Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close-circle" size={32} color="rgba(255,255,255,0.3)" />
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionLabel}>Sesiones de hoy</Text>
          <View style={styles.seriesRow}>
            {[1, 2, 3, 4, 5].map((s) => (
              <TouchableOpacity
                key={s}
                onPress={() => setSesiones(s)}
                style={[
                  styles.seriesBubble,
                  sesiones === s && { backgroundColor: Colors.primary, borderColor: Colors.primary }
                ]}
              >
                <Text style={[styles.seriesText, sesiones === s && { color: '#090D1F' }]}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.sectionLabel}>Duración de la Sesión</Text>
          <View style={[styles.wheelsRow, { justifyContent: 'center', gap: 10 }]}>
            <WheelPicker
              data={Array.from({ length: 16 }, (_, i) => i)}
              selectedValue={mins}
              onValueChange={setMins}
              label="MINS"
            />
            <Text style={styles.wheelSeparator}>:</Text>
            <WheelPicker
              data={Array.from({ length: 60 }, (_, i) => i)}
              selectedValue={secs}
              onValueChange={setSecs}
              label="SECS"
            />
          </View>

          <Text style={styles.sectionLabel}>Descanso entre Sesiones</Text>
          <View style={[styles.wheelsRow, { justifyContent: 'center', gap: 10 }]}>
            <WheelPicker
              data={Array.from({ length: 10 }, (_, i) => i)}
              selectedValue={restMins}
              onValueChange={setRestMins}
              label="MINS"
            />
            <Text style={styles.wheelSeparator}>:</Text>
            <WheelPicker
              data={Array.from({ length: 60 }, (_, i) => i)}
              selectedValue={restSecs}
              onValueChange={setRestSecs}
              label="SECS"
            />
          </View>

          <View style={styles.totalBadge}>
            <Ionicons name="time-outline" size={18} color={Colors.primary} />
            <Text style={styles.totalText}>
              Tiempo de ejercicio: {Math.floor(totalTime / 60)} min {totalTime % 60} seg
            </Text>
          </View>

          <PrimaryButton
            title="¡Empezar Ejercicio!"
            onPress={onStart}
            style={styles.startBtn}
            icon="play"
          />
        </BlurView>
      </View>
    </Modal>
  );
};
