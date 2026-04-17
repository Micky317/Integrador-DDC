import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { vinculosService } from '../../../services/vinculos.service';
import { useAppStore } from '../../../store/useAppStore';
import { useToastStore } from '../../../store/useToastStore';

export function useVinculosPadre() {
  const { user } = useAppStore();
  const { showToast } = useToastStore();
  const queryClient = useQueryClient();

  // 1. Obtener lista de bebés vinculados
  const { data: misBebes, isLoading } = useQuery({
    queryKey: ['vinculos', user?.id],
    queryFn: () => vinculosService.getPacientesVinculados(user!.id),
    enabled: !!user?.id,
  });

  // 2. Vincular nuevo bebé
  const vincularMutation = useMutation({
    mutationFn: async (codigo: string) => {
      if (!user) throw new Error('Usuario no identificado');
      
      // Buscar al paciente
      const paciente = await vinculosService.getPacienteByCodigo(codigo);
      if (!paciente) {
        throw new Error('Código no válido o paciente no encontrado');
      }

      // Vincularlo
      await vinculosService.vincularPadreConPaciente(user.id, paciente.id);
      return paciente;
    },
    onSuccess: (paciente) => {
      showToast('¡Vinculado!', `Ahora puedes ver el historial de ${paciente.nombreCompleto}`, 'success');
      queryClient.invalidateQueries({ queryKey: ['vinculos', user?.id] });
    },
    onError: (error: any) => {
      showToast('Error', error.message, 'error');
    }
  });

  return {
    misBebes,
    isLoading,
    vincular: vincularMutation.mutate,
    isLinking: vincularMutation.isPending,
  };
}
