import { supabase } from '../lib/supabase';
import { CATALOGO_EJERCICIOS, Ejercicio } from '../constants/ejercicios';

export interface Prescripcion {
  id: string;
  paciente_id: string;
  medico_id: string;
  ejercicio_id: string;
  frecuencia_diaria: number;
  creado_at: string;
  ejercicio?: Ejercicio; // Datos extendidos del catálogo
}

export interface RegistroActividad {
  id: string;
  paciente_id: string;
  ejercicio_id: string;
  fecha: string;
  completado: boolean;
  duracion_segundos: number;
  observaciones?: string;
}

export const rehabilitacionService = {
  // 1. Asignar ejercicio a un paciente
  async prescribirEjercicio(pacienteId: string, medicoId: string, ejercicioId: string, frecuencia: number = 1) {
    const { data, error } = await supabase
      .from('prescripciones_ejercicios')
      .insert([
        { 
          paciente_id: pacienteId, 
          medico_id: medicoId, 
          ejercicio_id: ejercicioId, 
          frecuencia_diaria: frecuencia 
        }
      ])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // 2. Obtener ejercicios prescritos para un paciente
  async getEjerciciosPrescritos(pacienteId: string): Promise<Prescripcion[]> {
    const { data, error } = await supabase
      .from('prescripciones_ejercicios')
      .select('*')
      .eq('paciente_id', pacienteId);

    if (error) throw error;

    // Combinar con los datos del catálogo local con búsqueda flexible
    return (data || []).map((prescripcion: any) => {
      console.log(`[RehabService] Recibido ejercicio_id: "${prescripcion.ejercicio_id}"`);
      
      const ejercicio = CATALOGO_EJERCICIOS.find(e => 
        e.id === prescripcion.ejercicio_id || 
        prescripcion.ejercicio_id?.includes(e.id) || 
        e.id.includes(prescripcion.ejercicio_id) ||
        (prescripcion.ejercicio_id === 'ranita' && e.id === 'abduccion-ranita')
      );

      return {
        ...prescripcion,
        ejercicio
      };
    });
  },

  // 3. Registrar que se realizó un ejercicio con su duración
  async registrarActividad(pacienteId: string, ejercicioId: string, duracionSegundos: number = 0, observaciones?: string) {
    const { data, error } = await supabase
      .from('historial_rehabilitacion')
      .insert([
        { 
          paciente_id: pacienteId, 
          ejercicio_id: ejercicioId, 
          completado: true,
          duracion_segundos: duracionSegundos,
          observaciones,
          fecha: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // 4. Eliminar una prescripción
  async eliminarPrescripcion(prescripcionId: string) {
    const { error } = await supabase
      .from('prescripciones_ejercicios')
      .delete()
      .eq('id', prescripcionId);

    if (error) throw error;
    return true;
  }
};
