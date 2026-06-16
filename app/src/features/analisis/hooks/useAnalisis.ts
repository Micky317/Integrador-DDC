import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { analizarRadiografiaApi, recalculateRadiografiaApi, KeyPoint, AnalisisApiResponse } from '../../../services/analisis.service';
import { historialService } from '../../../services/historial.service';
import { storageService } from '../../../services/storage.service';
import { useAppStore } from '../../../store/useAppStore';
import { useToastStore } from '../../../store/useToastStore';
import { router } from 'expo-router';
import { handleError } from '../../../utils/errorHandler';

export function useAnalisisIA(imageUri?: string) {
  return useQuery({
    queryKey: ['analisisIA', imageUri],
    queryFn: async () => {
      if (!imageUri) throw new Error('No image URI provided');
      console.log('QUERY FETCHING FOR KEY:', ['analisisIA', imageUri]);
      return await analizarRadiografiaApi(imageUri);
    },
    enabled: !!imageUri,
    retry: 2,
  });
}

export function useAnalisisHistorial(analisisId?: string) {
  return useQuery({
    queryKey: ['analisisHistorial', analisisId],
    queryFn: async () => {
      if (!analisisId) return null;
      return await historialService.getAnalisisById(analisisId);
    },
    enabled: !!analisisId,
  });
}

export function useRecalcularAnalisis() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ imageUri, puntos }: { imageUri: string; puntos: KeyPoint[] }) => 
      recalculateRadiografiaApi(imageUri, puntos),
    onSuccess: (data, variables) => {
      console.log('MUTATION SUCCESS - SETTING CACHE FOR KEY:', ['analisisIA', variables.imageUri]);
      queryClient.setQueryData(['analisisIA', variables.imageUri], data);
    },
    onError: (error: any) => handleError(error, 'Recálculo de Puntos')
  });
}

export function useGuardarAnalisis() {
  const { user } = useAppStore();
  const { showToast } = useToastStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      pacienteId, 
      originalUri, 
      result,
      fechaRadiografia
    }: { 
      pacienteId: string; 
      originalUri: string; 
      result: AnalisisApiResponse;
      fechaRadiografia?: string;
    }) => {
      if (!user) throw new Error('Usuario no autenticado');

      // 1. Subir imagenes
      const [urlOriginal, urlAnotada] = await Promise.all([
        storageService.uploadRadiografiaOriginal(originalUri, user.id, pacienteId),
        storageService.uploadRadiografiaAnotada(result.imagen_anotada_base64, user.id, pacienteId)
      ]);

      // 2. Crear registro en BD
      return await historialService.createAnalisis({
        pacienteId,
        scanId: `DDC-${new Date().getTime().toString().slice(-6)}`,
        anguloIzq: result.angulo_izquierda,
        anguloDer: result.angulo_derecha,
        diagnosticoIzq: result.diagnostico_izquierda,
        diagnosticoDer: result.diagnostico_derecha,
        categoriaGraf: (result as any).categoria_graf || 'GRAF_IIA',
        imagenOriginalUrl: urlOriginal,
        imagenAnotadaUrl: urlAnotada,
        validadoPorDoctor: true,
        medicoId: user.id,
        fechaRadiografia,
      });
    },
    onSuccess: (_, variables) => {
      showToast('¡Éxito!', 'Análisis guardado correctamente en el historial.', 'success');
      queryClient.invalidateQueries({ queryKey: ['historial', variables.pacienteId] });
      router.replace({ pathname: '/(tabs)/paciente-detalle', params: { id: variables.pacienteId } });
    },
    onError: (error: any) => handleError(error, 'Guardado de Análisis en Historial')
  });
}

export function useActualizarFechaRadiografia(pacienteId: string) {
  const { showToast } = useToastStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ analisisId, fecha }: { analisisId: string; fecha: string }) => {
      await historialService.updateFechaRadiografia(analisisId, fecha);
    },
    onSuccess: () => {
      showToast('Actualizado', 'Fecha de radiografía corregida.', 'success');
      queryClient.invalidateQueries({ queryKey: ['historial', pacienteId] });
      // También podríamos invalidar el progreso / evolución si es necesario
      queryClient.invalidateQueries({ queryKey: ['paciente', pacienteId] });
    },
    onError: (error: any) => handleError(error, 'Actualizar Fecha')
  });
}
