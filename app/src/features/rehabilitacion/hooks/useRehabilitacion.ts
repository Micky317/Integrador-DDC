import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { rehabilitacionService } from '../../../services/rehabilitacion.service';
import { useToastStore } from '../../../store/useToastStore';
import { handleError } from '../../../utils/errorHandler';
import { supabase } from '../../../lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import * as FileSystem from 'expo-file-system/legacy';

export function useRehabilitacion(pacienteId: string) {
  const queryClient = useQueryClient();
  const { showToast } = useToastStore();

  // REALTIME: Escuchar cambios en prescripciones e historial
  useEffect(() => {
    if (!pacienteId) return;

    const channel = supabase
      .channel(`rehab-${pacienteId}`)
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'prescripciones_ejercicios',
          filter: `paciente_id=eq.${pacienteId}` 
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['rehabilitacion', pacienteId] });
        }
      )
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'historial_rehabilitacion',
          filter: `paciente_id=eq.${pacienteId}` 
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['rehabilitacion', pacienteId] });
        }
      )
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'seguimiento_ejercicios',
          filter: `paciente_id=eq.${pacienteId}` 
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['seguimientos-video', pacienteId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [pacienteId, queryClient]);

  // 1. Obtener ejercicios prescritos
  const { data: prescripciones, isLoading } = useQuery({
    queryKey: ['rehabilitacion', pacienteId],
    queryFn: () => rehabilitacionService.getEjerciciosPrescritos(pacienteId),
    enabled: !!pacienteId,
  });

  // 1.1 Obtener estados de videos (/video)
  const seguimientosQuery = useQuery({
    queryKey: ['seguimientos-video', pacienteId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('seguimiento_ejercicios')
        .select('*') // Traemos todo para el historial
        .eq('paciente_id', pacienteId)
        .order('creado_en', { ascending: false });
      
      if (error) throw error;
      
      // Mapear para búsqueda rápida: {ejercicioId: data}
      const mapped = (data || []).reduce((acc: any, curr: any) => {
        const id = curr.ejercicio_id;
        
        if (id) {
          acc[id] = curr;
        } else if (curr.video_url) {
          const parts = curr.video_url.split('/');
          const fileName = parts[parts.length - 1];
          const slug = fileName.split('_')[0];
          if (slug) acc[slug] = curr;
        }
        
        return acc;
      }, {});

      return {
        mapped,
        raw: data || []
      };
    },
    enabled: !!pacienteId,
  });

  const seguimientos = seguimientosQuery.data?.mapped || {};
  const seguimientosFullList = seguimientosQuery.data?.raw || [];

  // 2. Mutación para prescribir (Médico)
  const prescribirMutation = useMutation({
    mutationFn: ({ medicoId, ejercicioId, frecuencia }: { medicoId: string, ejercicioId: string, frecuencia: number }) => 
      rehabilitacionService.prescribirEjercicio(pacienteId, medicoId, ejercicioId, frecuencia),
    onSuccess: () => {
      showToast('¡Éxito!', 'Ejercicio asignado correctamente', 'success');
      queryClient.invalidateQueries({ queryKey: ['rehabilitacion', pacienteId] });
    },
    onError: (error: any) => handleError(error, 'Asignación de Ejercicio')
  });

  // 3. Mutación para registrar actividad (Padre)
  const registrarActividadMutation = useMutation({
    mutationFn: ({ ejercicioId, duracionSegundos }: { ejercicioId: string, duracionSegundos: number }) => 
      rehabilitacionService.registrarActividad(pacienteId, ejercicioId, duracionSegundos),
    onSuccess: () => {
      showToast('¡Buen trabajo!', 'Actividad registrada', 'success');
      queryClient.invalidateQueries({ queryKey: ['rehabilitacion', pacienteId] });
    },
    onError: (error: any) => handleError(error, 'Registro de Actividad')
  });

  // 4. Mutación para eliminar (Médico)
  const eliminarMutation = useMutation({
    mutationFn: (prescripcionId: string) => 
      rehabilitacionService.eliminarPrescripcion(prescripcionId),
    onSuccess: () => {
      showToast('Eliminado', 'Prescripción eliminada', 'info');
      queryClient.invalidateQueries({ queryKey: ['rehabilitacion', pacienteId] });
    },
    onError: (error: any) => handleError(error, 'Eliminar Prescripción')
  });

  // 4.5 Mutación para evaluar video (Médico)
  const evaluarVideoMutation = useMutation({
    mutationFn: ({ ejercicioId, estado, comentario }: { ejercicioId: string, estado: 'Aprobado' | 'Rechazado', comentario?: string }) => 
      rehabilitacionService.evaluarVideo(pacienteId, ejercicioId, estado, comentario),
    onSuccess: () => {
      showToast('Evaluación enviada', 'El paciente recibirá tu retroalimentación.', 'success');
      queryClient.invalidateQueries({ queryKey: ['seguimientos-video', pacienteId] });
    },
    onError: (error: any) => handleError(error, 'Evaluación de Video')
  });

  // 5. Lógica de Video (Captura y Subida)
  const uploadVideo = async (uri: string, ejercicioId: string, setIsUploading: (val: boolean) => void) => {
    try {
      setIsUploading(true);
      
      // Detectar extensión y tipo de contenido (Android suele ser mp4, iOS suele ser mov)
      const extension = uri.split('.').pop() || 'mp4';
      const contentType = extension === 'mov' ? 'video/quicktime' : `video/${extension}`;
      
      const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
      const fileName = `${pacienteId}/${ejercicioId}_${Date.now()}.${extension}`;
      const filePath = `videos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('ejercicios_videos')
        .upload(filePath, decode(base64), {
          contentType: contentType,
          upsert: true
        });

      if (uploadError) throw uploadError;

      // Registrar en la tabla de seguimiento
      const { error: dbError } = await supabase
        .from('seguimiento_ejercicios')
        .insert({
          paciente_id: pacienteId,
          video_url: filePath,
          estado: 'En revisión',
          acepto_consentimiento: true,
          // ejercicio_id omitido: los ejercicios viven en el catálogo local,
          // no en la tabla 'ejercicios' de la DB. El slug está en el video_url.
        });

      if (dbError) throw dbError;

      showToast('¡Éxito!', 'Video enviado para revisión médica', 'success');
      queryClient.invalidateQueries({ queryKey: ['seguimientos-video', pacienteId] });
      
    } catch (error: any) {
      handleError(error, 'Subida de Video');
    } finally {
      setIsUploading(false);
    }
  };

  // 4.6 Mutación para borrar seguimiento (Médico)
  const eliminarSeguimientoMutation = useMutation({
    mutationFn: ({ id, videoPath }: { id: string, videoPath?: string }) => 
      rehabilitacionService.eliminarSeguimiento(id, videoPath),
    onSuccess: () => {
      showToast('Eliminado', 'El registro de video ha sido eliminado.', 'info');
      queryClient.invalidateQueries({ queryKey: ['seguimientos-video', pacienteId] });
    },
    onError: (error: any) => handleError(error, 'Eliminar Seguimiento')
  });

  return {
    prescripciones,
    seguimientos,
    seguimientosFullList,
    isLoading: isLoading || seguimientosQuery.isLoading,
    prescribir: prescribirMutation.mutate,
    isPrescribing: prescribirMutation.isPending,
    registrarActividad: registrarActividadMutation.mutate,
    isRegistering: registrarActividadMutation.isPending,
    eliminarPrescripcion: eliminarMutation.mutate,
    evaluarVideo: evaluarVideoMutation.mutate,
    isEvaluating: evaluarVideoMutation.isPending,
    eliminarSeguimiento: eliminarSeguimientoMutation.mutate,
    uploadVideo,
  };
}
