import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import { Paciente } from '../types';

const API_URL = process.env.EXPO_PUBLIC_API_URL || (Platform.OS === 'web' ? 'http://localhost:8005' : 'http://192.168.0.2:8005');

export interface ProyeccionPunto {
  step: number;
  label: string;
  fecha: string;
  angulo_proyectado: number;
  edad_meses: number;
}

export interface PacienteProyeccion {
  paciente_id: string;
  nombre_completo: string;
  edad_actual_meses: number;
  ultima_medicion: {
    fecha: string;
    izq: number;
    der: number;
  };
  tratamientos_activos: string[];
  cumplimiento_ejercicios_pct: number | null;
  factor_respuesta_paciente: number;
  tasa_tratamiento_mensual: number;
  ya_esta_sano: boolean;
  meses_para_meta: number | null;
  proyeccion_izq: ProyeccionPunto[];
  proyeccion_der: ProyeccionPunto[];
  historial_vacio?: boolean;
}

const mapPaciente = (p: any): Paciente => ({
  id: p.id,
  codigoPaciente: p.codigo_paciente,
  nombreCompleto: p.nombre_completo,
  fechaNacimiento: p.fecha_nacimiento,
  sexo: p.sexo,
  edadGestacional: p.edad_gestacional,
  nombreTutor: p.nombre_tutor,
  telefonoContacto: p.telefono_contacto,
  presentacionNalgas: p.presentacion_nalgas,
  antecedenteFamiliar: p.antecedente_familiar,
  doctorId: p.medico_id,
  creadoEn: p.created_at,
  estadoGraf: p.estado_graf,
  ultimaRevision: p.ultima_revision,
  proximaRevision: p.proxima_revision,
  tratamientosAsignados: p.tratamientos_asignados || [],
});

export const pacientesService = {
  /**
   * Obtiene la lista de pacientes de un medico especifico
   */
  async getPacientesByMedico(medicoId: string): Promise<Paciente[]> {
    const { data, error } = await supabase
      .from('pacientes')
      .select('*')
      .eq('medico_id', medicoId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(mapPaciente);
  },

  /**
   * Obtiene un paciente por su ID
   */
  async getPacienteById(pacienteId: string): Promise<Paciente | null> {
    const { data, error } = await supabase
      .from('pacientes')
      .select('*')
      .eq('id', pacienteId)
      .single();

    if (error) throw error;
    return data ? mapPaciente(data) : null;
  },

  /**
   * Registra un nuevo paciente
   */
  async createPaciente(paciente: Partial<Paciente>): Promise<Paciente> {
    const { data, error } = await supabase
      .from('pacientes')
      .insert([{
        nombre_completo: paciente.nombreCompleto,
        fecha_nacimiento: paciente.fechaNacimiento,
        sexo: paciente.sexo,
        codigo_paciente: paciente.codigoPaciente,
        medico_id: paciente.doctorId,
        nombre_tutor: paciente.nombreTutor,
        telefono_contacto: paciente.telefonoContacto,
        presentacion_nalgas: paciente.presentacionNalgas,
        antecedente_familiar: paciente.antecedenteFamiliar,
        edad_gestacional: paciente.edadGestacional,
      }])
      .select()
      .single();

    if (error) throw error;
    return mapPaciente(data);
  },

  /**
   * Actualiza el tratamiento asignado
   */
  async updateTratamiento(pacienteId: string, tratamientos: string[]): Promise<void> {
    const { error } = await supabase
      .from('pacientes')
      .update({ tratamientos_asignados: tratamientos })
      .eq('id', pacienteId);

    if (error) throw error;
  },

  /**
   * Elimina un paciente por su ID
   */
  async deletePaciente(pacienteId: string): Promise<void> {
    const { error } = await supabase
      .from('pacientes')
      .delete()
      .eq('id', pacienteId);
    if (error) throw error;
  },

  /**
   * Obtiene la proyección de la evolución del paciente basada en su edad, historial, tratamientos y cumplimiento.
   */
  async getProyeccionClinica(pacienteId: string, granularity: 'dias' | 'semanas' | 'meses' = 'meses'): Promise<PacienteProyeccion> {
    const response = await fetch(`${API_URL}/clinical/pacientes/${pacienteId}/proyeccion?granularity=${granularity}`);
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || 'Error al obtener la proyección clínica');
    }
    return response.json();
  },
};
