import { Alert } from 'react-native';
import { Texts } from '../constants/texts';
import { useToastStore } from '../store/useToastStore';

/**
 * Tipos de errores que la app puede manejar de forma inteligente.
 */
export class AppError extends Error {
  code?: string;
  isNetworkError: boolean;

  constructor(message: string, code?: string, isNetworkError = false) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.isNetworkError = isNetworkError;
  }
}

/**
 * Función central para manejar cualquier error que explote en la app.
 */
export const handleError = (error: any, customContext?: string) => {
  console.error(`[Error] ${customContext || 'General'}:`, error);

  // Obtener la función showToast del store sin usar el hook directamente (para poder usarlo fuera de componentes React)
  const { showToast } = useToastStore.getState();

  // Si es un error de Supabase (suele tener propiedad 'code')
  if (error?.code) {
    showToast('Error de Base de Datos', 'No se pudo completar la acción. Intenta de nuevo.', 'error');
    return;
  }

  // Error de red genérico (Fetch / Axios)
  if (error?.message === 'Network Error' || error?.message?.includes('fetch')) {
    showToast('Sin conexión', 'Verifica tu conexión a internet.', 'warning');
    return;
  }

  // Error custom que lanzamos nosotros (AppError)
  if (error instanceof AppError) {
    showToast('Aviso', error.message, error.isNetworkError ? 'warning' : 'error');
    return;
  }

  // Fallback (Cualquier otro error misterioso)
  const msg = error?.message || Texts.common.error;
  showToast('Ups...', msg, 'error');
};

/**
 * Wrapper para envolver funciones asíncronas y atrapar errores automáticamente.
 * Ideal para usar dentro de los `mutationFn` de TanStack Query.
 */
export const withErrorHandling = async <T>(
  promise: Promise<T>, 
  contextName?: string
): Promise<T> => {
  try {
    return await promise;
  } catch (error) {
    handleError(error, contextName);
    throw error; // Lo lanzamos de nuevo por si el componente necesita saber que falló
  }
};
