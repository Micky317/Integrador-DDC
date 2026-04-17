import { supabase } from '../lib/supabase';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';

export const storageService = {
  /**
   * Sube una radiografía original al bucket de Supabase
   * Ruta estructurada: {medicoId}/{pacienteId}/{timestamp}_original.jpg
   */
  async uploadRadiografiaOriginal(
    uri: string, 
    medicoId: string, 
    pacienteId: string
  ): Promise<string> {
    try {
      const timestamp = new Date().getTime();
      const fileName = `${medicoId}/${pacienteId}/${timestamp}_original.jpg`;
      
      // Leer el archivo como Base64 desde el sistema de archivos local
      const base64File = await FileSystem.readAsStringAsync(uri, {
        encoding: 'base64',
      });

      // Subir a Supabase Storage
      const { data, error } = await supabase.storage
        .from('radiografias')
        .upload(fileName, decode(base64File), {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (error) throw error;

      // Retornar la URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('radiografias')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      console.error('Error al subir radiografía:', error);
      throw error;
    }
  },
  /**
   * Sube la imagen anotada (en base64) que devuelve la IA
   */
  async uploadRadiografiaAnotada(
    base64: string,
    medicoId: string,
    pacienteId: string
  ): Promise<string> {
    try {
      const timestamp = new Date().getTime();
      const fileName = `${medicoId}/${pacienteId}/${timestamp}_anotada.jpg`;
      
      const { error } = await supabase.storage
        .from('radiografias')
        .upload(fileName, decode(base64), {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('radiografias')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      console.error('Error al subir imagen anotada:', error);
      throw error;
    }
  }
};
