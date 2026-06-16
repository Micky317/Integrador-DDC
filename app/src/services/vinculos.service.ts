import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import { Paciente } from '../types';

const API_URL = process.env.EXPO_PUBLIC_API_URL || (Platform.OS === 'web' ? 'http://localhost:8005' : 'http://192.168.0.2:8005');

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
        proximaRevision: data.proxima_revision,
        tratamientosAsignados: data.tratamientos_asignados || [],
        edadGestacional: data.edad_gestacional,
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
          proximaRevision: p.proxima_revision,
          tratamientosAsignados: p.tratamientos_asignados || [],
          edadGestacional: p.edad_gestacional,
        };
      });
  },

  /**
   * Decodifica un código QR desde una imagen local (URI de la galería)
   * llamando al endpoint del backend
   */
  async decodeQRFromImage(uri: string): Promise<string | null> {
    try {
      const formData = new FormData();
      
      // En React Native, el formato del archivo debe tener uri, name y type para multipart/form-data
      formData.append('file', {
        uri,
        name: 'qr_code.jpg',
        type: 'image/jpeg',
      } as any);

      const response = await fetch(`${API_URL}/clinical/decode-qr`, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error('Error al decodificar QR en backend:', errText);
        return null;
      }

      const resJson = await response.json();
      if (resJson.status === 'success') {
        return resJson.data;
      }
      return null;
    } catch (error) {
      console.error('Error en decodeQRFromImage:', error);
      return null;
    }
  }
};
