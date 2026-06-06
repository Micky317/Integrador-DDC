import { useState } from 'react';
import { Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { pacientesService } from '../../../services/pacientes.service';
import { useAppStore } from '../../../store/useAppStore';
import { useToastStore } from '../../../store/useToastStore';
import { handleError } from '../../../utils/errorHandler';

export function useNuevoPaciente() {
  const { user } = useAppStore();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{ imageUri?: string; analisisRapido?: string }>();
  const esAnalisisRapido = params.analisisRapido === '1';
  
  const [nombreCompleto, setNombreCompleto] = useState('');
  const [fechaNac, setFechaNac] = useState('');
  const [sexo, setSexo] = useState<'M' | 'F'>('M');
  const [edadGestacional, setEdadGestacional] = useState('');
  const [nombreTutor, setNombreTutor] = useState('');
  const [telefono, setTelefono] = useState('');
  const [presentacionNalgas, setPresentacionNalgas] = useState(false);
  const [antecedenteFamiliar, setAntecedenteFamiliar] = useState(false);
  
  // Para mostrar el modal de vinculación QR
  const [successData, setSuccessData] = useState<{ id: string, codigo: string } | null>(null);

  const mutation = useMutation({
    mutationFn: (data: any) => pacientesService.createPaciente(data),
    onMutate: async (newPaciente) => {
      // Cancelar cualquier query pendiente para no sobrescribir nuestro update optimista
      await queryClient.cancelQueries({ queryKey: ['pacientes', user?.id] });

      // Guardar el estado previo de la cache por si hay error
      const previousPacientes = queryClient.getQueryData(['pacientes', user?.id]);

      // Insertar optimistamente en la cache (usando un id temporal predecible)
      queryClient.setQueryData(['pacientes', user?.id], (old: any) => [
        { ...newPaciente, id: `temp-${Date.now()}`, creadoEn: new Date().toISOString() },
        ...(old || []),
      ]);

      // Retornar el contexto con los datos anteriores para hacer rollback si falla
      return { previousPacientes };
    },
    onError: (error: any, _, context) => {
      // Si falla la mutación, volver a los datos que teníamos antes
      if (context?.previousPacientes) {
        queryClient.setQueryData(['pacientes', user?.id], context.previousPacientes);
      }
      handleError(error, 'Registro de Paciente');
    },
    onSettled: () => {
      // Siempre refrescar al final para asegurar sincronización con servidor gane quien gane
      queryClient.invalidateQueries({ queryKey: ['pacientes', user?.id] });
    },
    onSuccess: (data) => {
      // En lugar de redirigir, mostramos el código QR
      setSuccessData({ id: data.id, codigo: data.codigoPaciente || '' });
    }
  });

  const proceedToFeature = () => {
    if (!successData?.id) return;
    const pacId = successData.id;
    // Cerrar el modal primero para que no obstruya la siguiente pantalla
    setSuccessData(null);
    
    // Un pequeño respiro de tiempo (timeout) da tiempo a React a desmontar el modal visualmente
    setTimeout(() => {
      if (esAnalisisRapido && params.imageUri) {
        router.push({
          pathname: '/(tabs)/analisis',
          params: { pacienteId: pacId, imageUri: params.imageUri }
        });
      } else {
        router.push({
          pathname: '/(tabs)/cargar-imagen',
          params: { pacienteId: pacId }
        });
      }
    }, 150);
  };

  const handleContinuar = async () => {
    if (!nombreCompleto || !fechaNac || !nombreTutor) {
      useToastStore.getState().showToast('Campos requeridos', 'Complete nombre del bebé, fecha de nacimiento y nombre del tutor.', 'warning', 4000);
      return;
    }

    mutation.mutate({
      nombreCompleto,
      fechaNacimiento: fechaNac,
      sexo,
      edadGestacional: edadGestacional ? parseInt(edadGestacional) : undefined,
      nombreTutor,
      telefonoContacto: telefono,
      presentacionNalgas,
      antecedenteFamiliar,
      doctorId: user?.id,
      codigoPaciente: `P-${Math.floor(1000 + Math.random() * 9000)}`
    });
  };

  return {
    state: { nombreCompleto, fechaNac, sexo, edadGestacional, nombreTutor, telefono, presentacionNalgas, antecedenteFamiliar, loading: mutation.isPending, successData },
    setters: { setNombreCompleto, setFechaNac, setSexo, setEdadGestacional, setNombreTutor, setTelefono, setPresentacionNalgas, setAntecedenteFamiliar, setSuccessData },
    handleContinuar,
    proceedToFeature
  };
}
