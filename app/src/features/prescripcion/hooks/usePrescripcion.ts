import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { prescripcionService } from '../../../services/prescripcion.service';
import { useToastStore } from '../../../store/useToastStore';
import { handleError } from '../../../utils/errorHandler';

export function usePrescripcion(pacienteId: string) {
  const queryClient = useQueryClient();
  const { showToast } = useToastStore();

  const { data: prescripciones = [], isLoading } = useQuery({
    queryKey: ['prescripciones', pacienteId],
    queryFn: () => prescripcionService.getByPaciente(pacienteId),
    enabled: !!pacienteId,
  });

  const { mutate: crear, isPending: isCreating } = useMutation({
    mutationFn: (payload: Parameters<typeof prescripcionService.crear>[0]) =>
      prescripcionService.crear(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prescripciones', pacienteId] });
      showToast('Prescripción emitida', 'La prescripción fue guardada correctamente.', 'success');
    },
    onError: (error: any) => handleError(error, 'Emitir Prescripción'),
  });

  const { mutate: eliminar } = useMutation({
    mutationFn: (id: string) => prescripcionService.eliminar(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prescripciones', pacienteId] });
      showToast('Prescripción eliminada', 'La prescripción fue removida.', 'info');
    },
    onError: (error: any) => handleError(error, 'Eliminar Prescripción'),
  });

  return { prescripciones, isLoading, crear, isCreating, eliminar };
}
