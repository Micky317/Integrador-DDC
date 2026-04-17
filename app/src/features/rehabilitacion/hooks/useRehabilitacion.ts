import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { rehabilitacionService } from '../../../services/rehabilitacion.service';
import { useToastStore } from '../../../store/useToastStore';
import { supabase } from '../../../lib/supabase';

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

  // 2. Mutación para prescribir (Médico)
  const prescribirMutation = useMutation({
    mutationFn: ({ medicoId, ejercicioId, frecuencia }: { medicoId: string, ejercicioId: string, frecuencia: number }) => 
      rehabilitacionService.prescribirEjercicio(pacienteId, medicoId, ejercicioId, frecuencia),
    onSuccess: () => {
      showToast('¡Éxito!', 'Ejercicio asignado correctamente', 'success');
      queryClient.invalidateQueries({ queryKey: ['rehabilitacion', pacienteId] });
    },
    onError: (error: any) => {
      showToast('Error', error.message, 'error');
    }
  });

  // 3. Mutación para registrar actividad (Padre)
  const registrarActividadMutation = useMutation({
    mutationFn: ({ ejercicioId, duracionSegundos }: { ejercicioId: string, duracionSegundos: number }) => 
      rehabilitacionService.registrarActividad(pacienteId, ejercicioId, duracionSegundos),
    onSuccess: () => {
      showToast('¡Buen trabajo!', 'Actividad registrada', 'success');
      queryClient.invalidateQueries({ queryKey: ['rehabilitacion', pacienteId] });
    },
    onError: (error: any) => {
      showToast('Error', error.message, 'error');
    }
  });

  // 4. Mutación para eliminar (Médico)
  const eliminarMutation = useMutation({
    mutationFn: (prescripcionId: string) => 
      rehabilitacionService.eliminarPrescripcion(prescripcionId),
    onSuccess: () => {
      showToast('Eliminado', 'Prescripción eliminada', 'info');
      queryClient.invalidateQueries({ queryKey: ['rehabilitacion', pacienteId] });
    },
  });

  return {
    prescripciones,
    isLoading,
    prescribir: prescribirMutation.mutate,
    isPrescribing: prescribirMutation.isPending,
    registrarActividad: registrarActividadMutation.mutate,
    isRegistering: registrarActividadMutation.isPending,
    eliminarPrescripcion: eliminarMutation.mutate,
  };
}
