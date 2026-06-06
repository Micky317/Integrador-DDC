/**
 * Catálogo maestro de textos de la aplicación.
 * Centralizar aquí facilita correcciones masivas y futuras traducciones.
 */

export const Texts = {
  common: {
    back: 'Atrás',
    save: 'Guardar',
    cancel: 'Cancelar',
    loading: 'Cargando...',
    error: 'Ocurrió un error inesperado',
    retry: 'Reintentar',
    success: 'Operación exitosa',
  },
  auth: {
    loginTitle: 'Bienvenido de nuevo',
    registerDoctor: 'Registro Médico',
    registerParent: 'Registro de Padre',
    emailPlaceholder: 'correo@ejemplo.com',
    passwordPlaceholder: 'Contraseña',
  },
  analisis: {
    title: 'Análisis Clínico',
    processing: 'Procesando con IA YOLOv8...',
    saveConfirmTitle: '¿Validar diagnóstico?',
    saveConfirmDesc: 'Confirma que revisaste el análisis y está correcto para guardarlo en el historial.',
    zoomHint: 'Toca para ampliar la radiografía',
    manualAdjust: 'Ajustar Puntos Manualmente',
    quickModeAlert: 'Análisis temporal. Crea un expediente para guardarlo permanentemente.',
  },
  rehabilitacion: {
    title: 'Sesión de Rehabilitación',
    preparing: 'Preparando ejercicio...',
    uploading: 'Subiendo video de validación...',
    consentTitle: 'Consentimiento de Grabación',
    consentDesc: 'Para validar la técnica del ejercicio, grabaremos un video corto que será revisado por su especialista.',
  },
  pacientes: {
    emptyState: 'Sin pacientes todavía',
    searchPlaceholder: 'Buscar por nombre o ID...',
    newPatient: 'Nuevo Paciente',
    analysisIA: 'Análisis Rápido IA',
  }
};
