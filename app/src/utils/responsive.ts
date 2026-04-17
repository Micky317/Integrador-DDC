import { Dimensions, PixelRatio } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// El iPhone XR (el teléfono base del proyecto) tiene una resolución lógica de 414 x 896.
// Usaremos estas medidas como nuestra base de diseño (Guideline Base).
const GUIDELINE_BASE_WIDTH = 414;
const GUIDELINE_BASE_HEIGHT = 896;

/**
 * Escala un tamaño basándose en el ancho de la pantalla actual 
 * comparado con el ancho del teléfono base (iPhone XR).
 * Útil para anchos, márgenes horizontales, paddings y tamaño de iconos.
 */
export const scale = (size: number) => (SCREEN_WIDTH / GUIDELINE_BASE_WIDTH) * size;

/**
 * Escala un tamaño basándose en el alto de la pantalla actual.
 * Útil para alturas y márgenes verticales.
 */
export const verticalScale = (size: number) => (SCREEN_HEIGHT / GUIDELINE_BASE_HEIGHT) * size;

/**
 * Escala 'moderada'. 
 * A diferencia del 'scale' puro que puede hacer elementos en tablets excesivamente grandes,
 * este aplica un factor para que el crecimiento no sea 1 a 1, dando un resultado más natural.
 * Se acostumbra usar con un factor de 0.5.
 * Perfecto para tamaños de fuente (Fonts).
 */
export const moderateScale = (size: number, factor = 0.5) => size + (scale(size) - size) * factor;

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
