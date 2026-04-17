import React, { useRef, ReactNode } from 'react';
import { Animated, TouchableWithoutFeedback, ViewStyle, StyleProp, GestureResponderEvent } from 'react-native';
import * as Haptics from 'expo-haptics';

interface TouchableScaleProps {
  children: ReactNode;
  onPress?: (event: GestureResponderEvent) => void;
  style?: StyleProp<ViewStyle>;
  scaleTo?: number;
  disabled?: boolean;
}

/**
 * TouchableScale
 * Componente Premium que se "hunde" (escala) sutilmente al presionarlo
 * y emite una leve vibración háptica (solo en dispositivos físicos reales).
 */
export function TouchableScale({
  children,
  onPress,
  style,
  scaleTo = 0.96, // Se encoge un 4% por defecto
  disabled = false,
}: TouchableScaleProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    if (disabled) return;
    Animated.spring(scaleAnim, {
      toValue: scaleTo,
      useNativeDriver: true,
      speed: 20,
      bounciness: 4,
    }).start();
  };

  const handlePressOut = () => {
    if (disabled) return;
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
      bounciness: 4,
    }).start();
  };

  const handlePress = (event: GestureResponderEvent) => {
    if (disabled) return;
    // Vibración ligera para dar sensación de fisicalidad (Haptics)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (onPress) onPress(event);
  };

  return (
    <TouchableWithoutFeedback
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      disabled={disabled}
    >
      <Animated.View style={[style, { transform: [{ scale: scaleAnim }] }]}>
        {children}
      </Animated.View>
    </TouchableWithoutFeedback>
  );
}
