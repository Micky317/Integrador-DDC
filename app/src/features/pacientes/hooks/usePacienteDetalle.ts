import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { pacientesService } from '../../../services/pacientes.service';
import { historialService } from '../../../services/historial.service';
import { useToastStore } from '../../../store/useToastStore';
import { router } from 'expo-router';

export function usePacienteDetalle(pacienteId: string) {
  const { data: paciente, isLoading: loadingPaciente, error } = useQuery({
    queryKey: ['paciente', pacienteId],
    queryFn: () => pacientesService.getPacienteById(pacienteId),
    enabled: !!pacienteId,
  });

  const { data: historial = [], isLoading: loadingHistorial } = useQuery({
    queryKey: ['historial', pacienteId],
    queryFn: () => historialService.getHistorialByPaciente(pacienteId),
    enabled: !!pacienteId,
  });

  const isLoading = loadingPaciente || loadingHistorial;

  return { paciente, historial, isLoading, error };
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
