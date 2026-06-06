import { supabase } from '../lib/supabase';
import { Analisis } from '../types';

const mapAnalisis = (a: any): Analisis => ({
  id: a.id,
  pacienteId: a.paciente_id,
  scanId: a.scan_id || '',
  anguloIzq: a.angulo_izq,
  anguloDer: a.angulo_der,
  diagnosticoIzq: a.dx_izq,
  diagnosticoDer: a.dx_der,
  categoriaGraf: a.categoria_graf,
  imagenAnotadaUrl: a.imagen_anotada_url,
  imagenOriginalUrl: a.imagen_original_url,
  validadoPorDoctor: a.validado_por_doctor ?? false,
  notas: a.notas,
  medicoId: a.medico_id,
  creadoEn: a.created_at,
  fechaRadiografia: a.fecha_radiografia,
});

export const historialService = {
  /**
   * Obtiene todos los análisis de un paciente ordenados cronológicamente
   */
  async getHistorialByPaciente(pacienteId: string): Promise<Analisis[]> {
    const { data, error } = await supabase
      .from('analisis')
      .select('*')
      .eq('paciente_id', pacienteId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return (data || []).map(mapAnalisis);
  },

  /**
   * Obtiene un análisis específico por su ID
   */
  async getAnalisisById(analisisId: string): Promise<Analisis | null> {
    const { data, error } = await supabase
      .from('analisis')
      .select('*')
      .eq('id', analisisId)
      .single();

    if (error) throw error;
    return data ? mapAnalisis(data) : null;
  },

  /**
   * Guarda un nuevo análisis en Supabase
   */
  async createAnalisis(analisis: Partial<Analisis>): Promise<Analisis> {
    const { data, error } = await supabase
      .from('analisis')
      .insert([{
        paciente_id: analisis.pacienteId,
        scan_id: analisis.scanId,
        angulo_izq: analisis.anguloIzq,
        angulo_der: analisis.anguloDer,
        dx_izq: analisis.diagnosticoIzq,
        dx_der: analisis.diagnosticoDer,
        categoria_graf: analisis.categoriaGraf,
        imagen_anotada_url: analisis.imagenAnotadaUrl,
        imagen_original_url: analisis.imagenOriginalUrl,
        validado_por_doctor: true,
        notas: analisis.notas,
        medico_id: analisis.medicoId,
        fecha_radiografia: analisis.fechaRadiografia,
      }])
      .select()
      .single();

    if (error) throw error;

    // 2. Sincronizar con InfluxDB via sync completo (garantiza timestamps limpios y sin duplicados)
    try {
      const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.0.2:8005';
      await fetch(`${API_URL}/clinical/sync`, {
        method: 'POST',
      });
    } catch (e) {
      console.warn("[HistorialService] Error sincronizando InfluxDB después de crear análisis:", e);
    }

    return mapAnalisis(data);
  },

  /**
   * Guarda las notas del médico en un análisis existente
   */
  async updateNotas(analisisId: string, notas: string): Promise<void> {
    const { error } = await supabase
      .from('analisis')
      .update({ notas, validado_por_doctor: true })
      .eq('id', analisisId);
    if (error) throw error;
  },

  /**
   * Actualiza la fecha real de la radiografía
   */
  async updateFechaRadiografia(analisisId: string, fecha: string): Promise<void> {
    const { error } = await supabase
      .from('analisis')
      .update({ fecha_radiografia: fecha })
      .eq('id', analisisId);
    if (error) throw error;

    // Sincronizar de inmediato con el backend para actualizar InfluxDB
    try {
      const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.0.2:8005';
      await fetch(`${API_URL}/clinical/sync`, {
        method: 'POST',
      });
    } catch (e) {
      console.warn("[HistorialService] Error al sincronizar después de actualizar fecha:", e);
    }
  },
};
