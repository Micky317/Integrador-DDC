import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Paciente } from '../../../types';
import { pacientesService } from '../../../services/pacientes.service';
import { useAppStore } from '../../../store/useAppStore';

export type FilterTab = 'TODOS' | 'URGENTES' | 'EN_SEGUIMIENTO';
export const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: 'TODOS', label: 'TODOS' },
  { key: 'URGENTES', label: 'URGENTES' },
  { key: 'EN_SEGUIMIENTO', label: 'EN SEGUIMIENTO' },
];

export function useListaPacientes() {
  const { user } = useAppStore();
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterTab>('TODOS');

  const { data: pacientes = [], isLoading, error } = useQuery({
    queryKey: ['pacientes', user?.id],
    queryFn: () => user ? pacientesService.getPacientesByMedico(user.id) : Promise.resolve([]),
    enabled: !!user?.id,
  });

  const filteredPacientes = useMemo(() => {
    return pacientes.filter((p) => {
      const matchSearch =
        p.nombreCompleto.toLowerCase().includes(search.toLowerCase()) ||
        p.codigoPaciente.toLowerCase().includes(search.toLowerCase());
      
      const estado = p.estadoGraf || 'GRAF_I';

      if (activeFilter === 'URGENTES') {
        const urgente = ['GRAF_IIB_URGENTE', 'GRAF_III', 'GRAF_IV'].includes(estado);
        return matchSearch && urgente;
      }
      if (activeFilter === 'EN_SEGUIMIENTO') {
        const seguimiento = ['GRAF_IIA', 'GRAF_IIB'].includes(estado);
        return matchSearch && seguimiento;
      }
      return matchSearch;
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
