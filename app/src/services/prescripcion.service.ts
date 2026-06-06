import { supabase } from '../lib/supabase';
import { PrescripcionMedica } from '../types';

const mapPrescripcion = (p: any): PrescripcionMedica => ({
  id: p.id,
  pacienteId: p.paciente_id,
  medicoId: p.medico_id,
  diagnosticoResumen: p.diagnostico_resumen,
  tratamientos: p.tratamientos || [],
  indicaciones: p.indicaciones,
  proximaRevision: p.proxima_revision,
  analisisId: p.analisis_id,
  creadoEn: p.created_at,
});

export const prescripcionService = {
  async getByPaciente(pacienteId: string): Promise<PrescripcionMedica[]> {
    const { data, error } = await supabase
      .from('prescripciones_medicas')
      .select('*')
      .eq('paciente_id', pacienteId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(mapPrescripcion);
  },

  async crear(payload: {
    pacienteId: string;
    medicoId: string;
    diagnosticoResumen: string;
    tratamientos: string[];
    indicaciones?: string;
    proximaRevision?: string;
    analisisId?: string;
  }): Promise<PrescripcionMedica> {
    const { data, error } = await supabase
      .from('prescripciones_medicas')
      .insert([{
        paciente_id: payload.pacienteId,
        medico_id: payload.medicoId,
        diagnostico_resumen: payload.diagnosticoResumen,
        tratamientos: payload.tratamientos,
        indicaciones: payload.indicaciones || null,
        proxima_revision: payload.proximaRevision || null,
        analisis_id: payload.analisisId || null,
      }])
      .select()
      .single();

    if (error) throw error;
    return mapPrescripcion(data);
  },

  async eliminar(id: string): Promise<void> {
    const { error } = await supabase
      .from('prescripciones_medicas')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },
};
