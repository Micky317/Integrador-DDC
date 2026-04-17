import React, { ReactNode } from 'react';
import { StyleSheet, ViewStyle, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { Colors, Radius, Shadow } from '../constants/theme';

interface GlassContainerProps {
  children: ReactNode;
  style?: ViewStyle;
  intensity?: number;
}

export function GlassContainer({ children, style, intensity = 40 }: GlassContainerProps) {
  return (
    <View style={[styles.wrapper, style]}>
      {/* El BlurView provee el efecto cristalino base */}
      <BlurView intensity={intensity} tint="dark" style={StyleSheet.absoluteFill} />
      
      {/* Capa sutil de color para darle tonalidad al cristal */}
      <View style={styles.tintLayer} />
      
      {/* Contenido */}
      <View style={styles.content}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: Radius.xl,
    overflow: 'hidden',
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    ...Shadow.glow, // Añade resplandor sutil cyan
  },
  tintLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(20, 24, 48, 0.4)', // bgCard semi-transparente
  },
  content: {
    position: 'relative',
    zIndex: 1,
  },
});
