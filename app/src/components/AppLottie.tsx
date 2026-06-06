import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import LottieView, { AnimationObject } from 'lottie-react-native';
import { Colors } from '../constants/theme';

interface AppLottieProps {
  source: string | AnimationObject | { uri: string };
  style?: ViewStyle;
  autoPlay?: boolean;
  loop?: boolean;
  applyThemeColors?: boolean;
}

/**
 * Wrapper de Lottie que aplica los colores del tema automáticamente.
 */
export const AppLottie: React.FC<AppLottieProps> = ({
  source,
  style,
  autoPlay = true,
  loop = true,
  applyThemeColors = true
}) => {
  
  // Filtros de color para inyectar el Cyan/Teal de la app en las animaciones
  const colorFilters = applyThemeColors ? [
    { keypath: "Circle", color: Colors.primary },
    { keypath: "Shape", color: Colors.primary },
    { keypath: "Fill", color: Colors.primary },
  ] : [];

  return (
    <LottieView
      source={source}
      style={style}
      autoPlay={autoPlay}
      loop={loop}
      colorFilters={colorFilters}
    />
  );
};
