import React, { ReactNode } from 'react';
import { StyleSheet, ViewStyle, View, StyleProp, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Radius, Shadow } from '../constants/theme';

interface GlassContainerProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  intensity?: number;
}

export function GlassContainer({ children, style, intensity = 25 }: GlassContainerProps) {
  const isAndroid = Platform.OS === 'android';

  return (
    <View style={[
      styles.wrapper, 
      { backgroundColor: isAndroid ? 'rgba(20, 24, 48, 0.85)' : 'rgba(20, 24, 48, 0.45)' },
      style
    ]}>
      {/* Capa de fondo base (Gradiante sutil para profundidad) */}
      <LinearGradient
        colors={['rgba(255, 255, 255, 0.08)', 'rgba(255, 255, 255, 0)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* El BlurView (Solo para iOS realmente) */}
      {!isAndroid && (
        <BlurView 
          intensity={intensity} 
          tint="dark" 
          style={StyleSheet.absoluteFill} 
        />
      )}
      
      {/* Capa de brillo superior (Solo para dar sensación de cristal) */}
      <LinearGradient
        colors={['rgba(255, 255, 255, 0.12)', 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.2, y: 0.5 }}
        style={StyleSheet.absoluteFill}
      />
      
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
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1,
    ...Shadow.glow,
  },
  content: {
    position: 'relative',
    zIndex: 1,
  },
});
