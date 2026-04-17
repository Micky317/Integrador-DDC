import { useState, useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { Paciente } from '../../../types';
import { pacientesService } from '../../../services/pacientes.service';
import { useAppStore } from '../../../store/useAppStore';

export type FilterTab = 'TODOS' | 'URGENTES' | 'EN_SEGUIMIENTO' | 'EJERCICIOS' | 'ARNES' | 'YESO' | 'CIRUGIA';
export const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: 'TODOS', label: 'TODOS' },
  { key: 'URGENTES', label: 'URGENTES' },
  { key: 'EN_SEGUIMIENTO', label: 'SEGUIMIENTO' },
  { key: 'EJERCICIOS', label: 'EJERCICIOS' },
  { key: 'ARNES', label: 'ARNÉS' },
  { key: 'YESO', label: 'YESO' },
  { key: 'CIRUGIA', label: 'CIRUGÍA' },
];

export function useListaPacientes() {
  const { user } = useAppStore();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterTab>('TODOS');

  const { data: pacientes = [], isLoading, error } = useQuery({
    queryKey: ['pacientes', user?.id],
    queryFn: () => user ? pacientesService.getPacientesByMedico(user.id) : Promise.resolve([]),
    enabled: !!user?.id,
  });

  // REALTIME: Refrescar la lista principal del médico
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('lista-pacientes-medico')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pacientes' },
        () => {
          console.log('--- [REALTIME-MED] Lista de pacientes actualizada ---');
          queryClient.invalidateQueries({ queryKey: ['pacientes', user.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  const filteredPacientes = useMemo(() => {
    return pacientes.filter((p) => {
      const matchSearch =
        p.nombreCompleto.toLowerCase().includes(search.toLowerCase()) ||
        p.codigoPaciente.toLowerCase().includes(search.toLowerCase());
      
      if (!matchSearch) return false;

      const estado = p.estadoGraf || 'GRAF_I';
      const tratamiento = p.tratamientoAsignado;

      switch (activeFilter) {
        case 'URGENTES':
          return ['GRAF_IIB_URGENTE', 'GRAF_III', 'GRAF_IV'].includes(estado);
        case 'EN_SEGUIMIENTO':
          return ['GRAF_IIA', 'GRAF_IIB'].includes(estado);
        case 'EJERCICIOS':
          return tratamiento === 'ejercicios';
        case 'ARNES':
          return tratamiento === 'arnes';
        case 'YESO':
          return tratamiento === 'yeso';
        case 'CIRUGIA':
          return tratamiento === 'cirugia';
        default:
          return true;
      }
    });
  }, [search, activeFilter, pacientes]);

  return {
    search,
    setSearch,
    activeFilter,
    setActiveFilter,
    filteredPacientes,
    isLoading,
    error,
    FILTER_TABS
  };
}
