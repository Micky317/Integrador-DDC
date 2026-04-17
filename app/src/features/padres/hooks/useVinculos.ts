import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { vinculosService } from '../../../services/vinculos.service';
import { useAppStore } from '../../../store/useAppStore';
import { useToastStore } from '../../../store/useToastStore';
import { supabase } from '../../../lib/supabase';

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

  // REALTIME: Refrescar la lista de tarjetas si algún paciente cambia
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('lista-vinculos-padre')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'pacientes' },
        () => {
          console.log('--- [REALTIME] Un paciente en la lista ha cambiado ---');
          queryClient.invalidateQueries({ queryKey: ['vinculos', user.id] });
          queryClient.invalidateQueries({ queryKey: ['paciente'] }); // Invalida cualquier detalle abierto
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

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
