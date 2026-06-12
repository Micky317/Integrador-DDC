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

function formatToPostgresDate(dateStr: string | undefined): string | null {
  if (!dateStr) return null;
  const cleaned = dateStr.trim();
  if (!cleaned) return null;

  // 1. Caso YYYY-MM-DD o YYYY/MM/DD
  const yyyymmdd = /^\d{4}[-/](\d{1,2})[-/](\d{1,2})$/;
  const matchY = cleaned.match(yyyymmdd);
  if (matchY) {
    const [_, month, day] = matchY;
    const year = cleaned.substring(0, 4);
    const paddedMonth = month.padStart(2, '0');
    const paddedDay = day.padStart(2, '0');
    return `${year}-${paddedMonth}-${paddedDay}`;
  }

  // 2. Caso DD-MM-YYYY o DD/MM/YYYY
  const ddmmyyyy = /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/;
  const matchD = cleaned.match(ddmmyyyy);
  if (matchD) {
    const [_, day, month, year] = matchD;
    const paddedDay = day.padStart(2, '0');
    const paddedMonth = month.padStart(2, '0');
    return `${year}-${paddedMonth}-${paddedDay}`;
  }

  return cleaned;
}

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
    const formattedDate = formatToPostgresDate(payload.proximaRevision);

    const { data, error } = await supabase
      .from('prescripciones_medicas')
      .insert([{
        paciente_id: payload.pacienteId,
        medico_id: payload.medicoId,
        diagnostico_resumen: payload.diagnosticoResumen,
        tratamientos: payload.tratamientos,
        indicaciones: payload.indicaciones || null,
        proxima_revision: formattedDate,
        analisis_id: payload.analisisId || null,
      }])
      .select()
      .single();

    if (error) throw error;

    // Actualizar la fecha de proxima_revision en el expediente del paciente
    if (formattedDate) {
      await supabase
        .from('pacientes')
        .update({ proxima_revision: formattedDate })
        .eq('id', payload.pacienteId);
    }

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
