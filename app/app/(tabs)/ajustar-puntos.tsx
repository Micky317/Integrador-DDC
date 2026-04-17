import React, { useRef } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Alert, Animated, PanResponder } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Colors, Typography, Spacing, Radius } from '../../src/constants/theme';
import { PrimaryButton } from '../../src/components/PrimaryButton';

export default function AjustarPuntosScreen() {
  const params = useLocalSearchParams<{ imageUri?: string }>();
  // Coordenadas simuladas para el ejemplo
  const startX = 150;
  const startY = 150;
  
  const pan = useRef(new Animated.ValueXY({ x: startX, y: startY })).current;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        pan.setOffset({
          x: (pan.x as any)._value,
          y: (pan.y as any)._value,
        });
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: Animated.event(
        [
          null,
          { dx: pan.x, dy: pan.y }
        ],
        { useNativeDriver: false } // pan x/y doesn't support native driver easily
      ),
      onPanResponderRelease: () => {
        pan.flattenOffset();
      }
    })
  ).current;

  const handleGuardarCierre = () => {
    Alert.alert(
      'Actualizado',
      `Simulando actualización: Las nuevas coordenadas del punto P1 han sido registradas para el cálculo del ángulo de Graf.`,
      [{ text: 'OK', onPress: () => router.back() }]
    );
  };

  return (
    <LinearGradient colors={Colors.gradientBg} style={styles.gradient}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
          <Text style={styles.backText}>Cancelar</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Editor de Puntos</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={styles.infoContainer}>
        <Text style={styles.infoText}>
          Desliza el punto color cyan para ajustar el cartílago trirradiado u otros landmarks.
        </Text>
      </View>

      <View style={styles.editorContainer}>
        {params.imageUri ? (
          <Image source={{ uri: params.imageUri }} style={styles.image} resizeMode="contain" />
        ) : (
          <View style={styles.placeholder}>
            <Text style={{color: Colors.textMuted}}>No hay imagen base</Text>
          </View>
        )}

        {/* Punto arrastrable usando sistema nativo de React Native */}
        <Animated.View 
          style={[styles.dragPoint, { transform: pan.getTranslateTransform() }]}
          {...panResponder.panHandlers}
        >
          <View style={styles.pointCenter} />
        </Animated.View>
        
      </View>

      <View style={styles.bottomBar}>
        <PrimaryButton title="Actualizar Ángulo" onPress={handleGuardarCierre} />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingTop: 58,
    paddingBottom: Spacing.md,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  backText: { color: Colors.textPrimary, fontSize: Typography.size.base },
  headerTitle: {
    color: Colors.textPrimary,
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.bold,
  },
  infoContainer: {
    padding: Spacing.md,
    backgroundColor: Colors.bgCardLight,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderCard,
  },
  infoText: {
    color: Colors.textSecondary,
    fontSize: Typography.size.sm,
    textAlign: 'center',
  },
  editorContainer: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: '#000',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dragPoint: {
    width: 44,
    height: 44,
    borderRadius: Radius.round,
    backgroundColor: 'rgba(0, 229, 204, 0.2)',
    borderWidth: 2,
    borderColor: Colors.primary,
    position: 'absolute',
    top: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  pointCenter: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFF',
  },
  bottomBar: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 40,
    paddingTop: Spacing.md,
    backgroundColor: Colors.bgDeep,
  },
});
