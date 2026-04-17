import React, { ReactNode } from 'react';
import { StyleSheet, ViewStyle, View, StyleProp, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Radius } from '../constants/theme';

interface GlassContainerProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  intensity?: number;
}

export function GlassContainer({ children, style, intensity = 25 }: GlassContainerProps) {
  const isAndroid = Platform.OS === 'android';

  if (isAndroid) {
    return (
      <View style={[styles.androidWrapper, style]}>
        {/* Fondo base oscuro */}
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(13, 18, 37, 0.92)' }]} />
        
        {/* Gradiente de profundidad (Efecto Glassmorphism para Android) */}
        <LinearGradient
          colors={['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.03)', 'rgba(255, 255, 255, 0)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        
        <View style={styles.content}>
          {children}
        </View>
      </View>
    );
  }

  return (
    <BlurView 
      intensity={intensity} 
      tint="dark" 
      style={[styles.iosWrapper, style]}
    >
      <View style={styles.content}>
        {children}
      </View>
    </BlurView>
  );
}

const styles = StyleSheet.create({
  iosWrapper: {
    borderRadius: Radius.xl,
    overflow: 'hidden',
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1,
  },
  androidWrapper: {
    borderRadius: Radius.xl,
    overflow: 'hidden',
    borderColor: 'rgba(255, 255, 255, 0.18)', // Borde más vivo para resaltar la forma
    borderWidth: 1.2,
    // Sombra sutil para dar elevación
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  content: {
    padding: 0, // El padding se maneja externamente si es necesario
  }
});
