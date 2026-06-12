import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { Paciente } from '../../../types';
import { notificacionesService } from '../../../services/notificaciones.service';

/**
 * Hook personalizado para inicializar y reprogramar las notificaciones locales del padre.
 * Se re-ejecuta al enfocar la pantalla o cuando cambia la lista de bebés vinculados, 
 * recalculando si ya cumplió la meta del día para silenciar las alertas (Estilo Duolingo).
 */
export function useNotificacionesPadre(misBebes: Paciente[] | undefined) {
  useFocusEffect(
    useCallback(() => {
      if (!misBebes || misBebes.length === 0) return;

      const programarRecordatorios = async () => {
        try {
          console.log('[useNotificacionesPadre] Reprogramando alertas por enfoque de pantalla (Estilo Duolingo)...');
          await notificacionesService.reprogramar(misBebes);
        } catch (error) {
          console.error('[useNotificacionesPadre] Error al reprogramar notificaciones:', error);
        }
      };

      programarRecordatorios();
    }, [misBebes])
  );
}
