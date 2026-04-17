import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { pacientesService } from '../../../services/pacientes.service';
import { historialService } from '../../../services/historial.service';
import { useToastStore } from '../../../store/useToastStore';
import { useAppStore } from '../../../store/useAppStore';
import { router } from 'expo-router';

export function usePacienteDetalle(pacienteId: string) {
  const queryClient = useQueryClient();

  const { data: paciente, isLoading: loadingPaciente, error } = useQuery({
    queryKey: ['paciente', pacienteId],
    queryFn: () => pacientesService.getPacienteById(pacienteId),
    enabled: !!pacienteId,
    refetchOnWindowFocus: true, 
  });

  // SUSCRIPCIÓN REALTIME PURA (Pacientes y Análisis)
  useEffect(() => {
    if (!pacienteId) return;

    // 1. Escuchar cambios en los datos del PACIENTE
    const patientChannel = supabase
      .channel(`paciente-det-${pacienteId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'pacientes', filter: `id=eq.${pacienteId}` },
        () => {
          console.log('--- [REALTIME] Datos del paciente actualizados ---');
          queryClient.invalidateQueries({ queryKey: ['paciente', pacienteId] });
        }
      )
      .subscribe();

    // 2. Escuchar cambios en el HISTORIAL (Análisis)
    const historyChannel = supabase
      .channel(`historial-det-${pacienteId}`)
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'analisis',
        },
        (payload) => {
          // Filtramos manualmente por seguridad si el filtro de Supabase falla
          const newData = payload.new as any;
          if (newData && (newData.paciente_id === pacienteId)) {
            console.log('--- [REALTIME] ¡Nuevo análisis detectado! ---');
            queryClient.invalidateQueries({ queryKey: ['historial', pacienteId] });
            
            // Avisar SOLO al papá (El médico ya tiene su propio feedback al guardar)
            if (payload.eventType === 'INSERT' && useAppStore.getState().user?.role === 'padre') {
              useToastStore.getState().showToast('Nuevo Diagnóstico', 'Se ha añadido un nuevo análisis a la historia clínica.', 'success');
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(patientChannel);
      supabase.removeChannel(historyChannel);
    };
  }, [pacienteId, queryClient]);

  const { data: historial = [], isLoading: loadingHistorial } = useQuery({
    queryKey: ['historial', pacienteId],
    queryFn: () => historialService.getHistorialByPaciente(pacienteId),
    enabled: !!pacienteId,
  });

  const isLoading = loadingPaciente || loadingHistorial;

  return { paciente, historial, isLoading, error };
}

export function useActualizarTratamiento(pacienteId: string) {
  const queryClient = useQueryClient();
  const { showToast } = useToastStore();

  return useMutation({
    mutationFn: (tratamiento: string) => pacientesService.updateTratamiento(pacienteId, tratamiento),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paciente', pacienteId] });
      queryClient.invalidateQueries({ queryKey: ['pacientes'] });
      showToast('Tratamiento actualizado', 'El plan de tratamiento ha sido guardado.', 'success');
    },
    onError: () => {
      showToast('Error', 'No se pudo actualizar el tratamiento.', 'error');
    },
  });
}

export function useEliminarPaciente(pacienteId: string) {
  const queryClient = useQueryClient();
  const { showToast } = useToastStore();

  return useMutation({
    mutationFn: () => pacientesService.deletePaciente(pacienteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pacientes'] });
      showToast('Paciente eliminado', 'El registro fue eliminado correctamente.', 'success');
      router.replace('/(tabs)/pacientes');
    },
    onError: () => {
      showToast('Error', 'No se pudo eliminar el paciente. Intenta de nuevo.', 'error');
    },
  });
}
