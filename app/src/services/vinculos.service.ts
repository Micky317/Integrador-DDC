import { supabase } from '../lib/supabase';
import { Paciente } from '../types';

export const vinculosService = {
  /**
   * Busca un paciente por su código único (ej: DDC-A1B2)
   */
  async getPacienteByCodigo(codigo: string): Promise<Paciente | null> {
    const { data, error } = await supabase
      .from('pacientes')
      .select('*')
      .eq('codigo_paciente', codigo.toUpperCase().trim())
      .single();

    if (error) return null;
    
    return {
      id: data.id,
      codigoPaciente: data.codigo_paciente,
      nombreCompleto: data.nombre_completo,
      fechaNacimiento: data.fecha_nacimiento,
      sexo: data.sexo,
      nombreTutor: data.nombre_tutor,
      telefonoContacto: data.telefono_contacto,
      presentacionNalgas: data.presentacion_nalgas,
      antecedenteFamiliar: data.antecedente_familiar,
      doctorId: data.medico_id,
      creadoEn: data.created_at,
      estadoGraf: data.estado_graf,
    };
  },

  /**
   * Vincula a un padre con un paciente
   */
  async vincularPadreConPaciente(padreId: string, pacienteId: string) {
    const { error } = await supabase
      .from('vinculos_padres')
      .insert([
        { padre_id: padreId, paciente_id: pacienteId }
      ]);

    if (error) {
      if (error.code === '23505') {
        throw new Error('Ya estás vinculado a este paciente');
      }
      throw error;
    }
    return true;
  },

  /**
   * Obtiene todos los pacientes vinculados a un padre
   */
  async getPacientesVinculados(padreId: string): Promise<Paciente[]> {
    const { data, error } = await supabase
      .from('vinculos_padres')
      .select('paciente_id, pacientes(*)')
      .eq('padre_id', padreId);

    if (error) throw error;

    return (data || []).map((item: any) => {
      const p = item.pacientes;
      return {
        id: p.id,
        codigoPaciente: p.codigo_paciente,
        nombreCompleto: p.nombre_completo,
        fechaNacimiento: p.fecha_nacimiento,
        sexo: p.sexo,
        nombreTutor: p.nombre_tutor,
        telefonoContacto: p.telefono_contacto,
        presentacionNalgas: p.presentacion_nalgas,
        antecedenteFamiliar: p.antecedente_familiar,
        doctorId: p.medico_id,
        creadoEn: p.created_at,
        estadoGraf: p.estado_graf,
      };
    });
  }
};
