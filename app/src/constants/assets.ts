/**
 * Índice maestro de recursos multimedia (Imágenes, Lottie, Animaciones)
 * Centralizar aquí permite cambiar rutas fácilmente y tener autocompletado en toda la app.
 */

export const Assets = {
  animations: {
    rehab_ranita: require('../../assets/animations/rehab_anim.gif'),
  },
  lottie: {
    emptyState: require('../../assets/lottie/empty-state.json'),
    medicalRadar: require('../../assets/lottie/medical-radar.json'),
  },
  // Aquí puedes añadir logos o placeholders si los tienes
  images: {
    // logo: require('../../assets/images/logo.png'),
  }
};
