import { Dimensions, PixelRatio, Platform } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// El iPhone XR (el teléfono base del proyecto) tiene una resolución lógica de 414 x 896.
const GUIDELINE_BASE_WIDTH = 414;
const GUIDELINE_BASE_HEIGHT = 896;

/**
 * Escala un tamaño basándose en el ancho de la pantalla actual 
 */
export const scale = (size: number) => (SCREEN_WIDTH / GUIDELINE_BASE_WIDTH) * size;

/**
 * Escala un tamaño basándose en el alto de la pantalla actual.
 */
export const verticalScale = (size: number) => (SCREEN_HEIGHT / GUIDELINE_BASE_HEIGHT) * size;

/**
 * Escala 'moderada'. 
 * Ajustada para que en Android no se vea todo minúsculo. 
 */
export const moderateScale = (size: number, factor = 0.5) => {
  const isAndroid = Platform.OS === 'android';
  // En Android le damos un pequeño "empujón" adicional para compensar densidades altas
  const finalFactor = isAndroid ? factor * 1.2 : factor;
  return size + (scale(size) - size) * finalFactor;
};

/**
 * Convierte un porcentaje del ancho de pantalla a DP reales.
 * wp('50%') retornará exactamente la mitad de los DP disponibles en cualquier pantalla.
 */
export const wp = (widthPercent: number | string) => {
  const elemWidth = typeof widthPercent === 'number' ? widthPercent : parseFloat(widthPercent);
  return PixelRatio.roundToNearestPixel((SCREEN_WIDTH * elemWidth) / 100);
};

/**
 * Convierte un porcentaje del alto de pantalla a DP reales.
 */
export const hp = (heightPercent: number | string) => {
  const elemHeight = typeof heightPercent === 'number' ? heightPercent : parseFloat(heightPercent);
  return PixelRatio.roundToNearestPixel((SCREEN_HEIGHT * elemHeight) / 100);
};

export const SCREEN = {
  width: SCREEN_WIDTH,
  height: SCREEN_HEIGHT,
  isSmallDevice: SCREEN_WIDTH < 375, // Ejemplo: iPhone SE es 320
};
