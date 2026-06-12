import * as Notifications from 'expo-notifications';
import { SchedulableTriggerInputTypes } from 'expo-notifications';
import { Platform } from 'react-native';
import { Paciente } from '../types';
import { rehabilitacionService } from './rehabilitacion.service';

// Configurar el gestor de notificaciones globales en primer plano
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const notificacionesService = {
  /**
   * Solicita permisos de notificación al usuario y configura el canal de Android.
   */
  async pedirPermisos(): Promise<boolean> {
    if (Platform.OS === 'web') return false;
    
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      // Configurar el canal de notificaciones exclusivo de Android
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('ddc-reminders', {
          name: 'Recordatorios Pasitos Firmes',
          description: 'Notificaciones sobre ejercicios de rehabilitación y citas médicas.',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#00E5CC',
        });
      }
      
      return finalStatus === 'granted';
    } catch (error) {
      console.error('[notificacionesService] Error al solicitar permisos:', error);
      return false;
    }
  },

  /**
   * Cancela todas las notificaciones previas y reprograma los recordatorios locales
   * de forma inteligente (Estilo Duolingo):
   * - Ejercicios: Se programan de forma individual para los próximos 7 días. Si para "hoy"
   *   el usuario ya cumplió con el total de sesiones diarias requeridas, se saltan las notificaciones
   *   del día de hoy para no importunarlo.
   * - Citas: Aviso la víspera a las 10:00 y el día de la revisión a las 08:30.
   */
  async reprogramar(bebes: Paciente[]): Promise<void> {
    if (Platform.OS === 'web') return;

    try {
      // 1. Cancelar todas las programadas anteriormente
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('[notificacionesService] Limpieza de notificaciones completada.');

      if (!bebes || bebes.length === 0) return;

      // 2. Solicitar/Verificar permisos
      const autorizado = await this.pedirPermisos();
      if (!autorizado) {
        console.log('[notificacionesService] Notificaciones desactivadas por el usuario.');
        return;
      }

      const hoy = new Date();
      const hoyISO = hoy.toISOString().split('T')[0]; // YYYY-MM-DD local aproximado

      // 3. Programar notificaciones para cada bebé
      for (const bebe of bebes) {
        const primerNombre = bebe.nombreCompleto.split(' ')[0];

        // --- A. Recordatorios de Ejercicios (Estilo Duolingo para 7 días) ---
        try {
          const prescripciones = await rehabilitacionService.getEjerciciosPrescritos(bebe.id);
          
          if (prescripciones && prescripciones.length > 0) {
            // Buscamos la frecuencia máxima configurada (cuántas veces al día)
            const maxFrecuencia = Math.max(...prescripciones.map(p => p.frecuencia_diaria || 1));
            
            // Consultar el historial de actividades para ver si ya hizo ejercicios hoy
            const historial = await rehabilitacionService.getHistorialActividad(bebe.id);
            const historialHoy = (historial || []).filter(h => {
              if (!h.fecha) return false;
              // h.fecha suele estar en formato ISO string
              return h.fecha.startsWith(hoyISO);
            });

            // Si las sesiones realizadas hoy igualan o superan la meta del día, se considera completado
            const completadoHoy = historialHoy.length >= maxFrecuencia;
            
            // Distribuimos las alertas del día (ej: 10:00, 16:00, etc.)
            const horas: number[] = [];
            if (maxFrecuencia === 1) {
              horas.push(10); // 10:00
            } else if (maxFrecuencia === 2) {
              horas.push(10, 16); // 10:00, 16:00
            } else {
              const horaInicio = 9;
              const horaFin = 19;
              const intervalo = (horaFin - horaInicio) / (maxFrecuencia - 1);
              for (let i = 0; i < maxFrecuencia; i++) {
                horas.push(Math.round(horaInicio + i * intervalo));
              }
            }

            // Programamos las alarmas día a día para los próximos 7 días
            for (let d = 0; d < 7; d++) {
              // Si es hoy (d === 0) y el padre ya completó las sesiones, NO le enviamos notificaciones hoy
              if (d === 0 && completadoHoy) {
                console.log(`[notificacionesService] ${primerNombre} ya completó sus ejercicios de hoy (${historialHoy.length}/${maxFrecuencia}). Saltando recordatorios por hoy.`);
                continue;
              }

              // Calcular la fecha para el día correspondiente
              const fechaDia = new Date();
              fechaDia.setDate(hoy.getDate() + d);

              for (const hora of horas) {
                const fechaAlarma = new Date(fechaDia);
                fechaAlarma.setHours(hora, 0, 0, 0);

                // Solo programamos si la alarma está en el futuro
                if (fechaAlarma > hoy) {
                  await Notifications.scheduleNotificationAsync({
                    content: {
                      title: `Ejercicios de ${primerNombre} 🦵`,
                      body: `Toca realizar la sesión de rehabilitación diaria. ¡Mantén tu racha activa!`,
                      sound: 'default',
                    },
                    trigger: {
                      type: SchedulableTriggerInputTypes.DATE,
                      date: fechaAlarma,
                      channelId: 'ddc-reminders',
                    },
                  });
                }
              }
            }
            console.log(`[notificacionesService] Programadas notificaciones de ejercicios de 7 días para ${bebe.nombreCompleto}.`);
          }
        } catch (exerciseErr) {
          console.error(`[notificacionesService] Error programando ejercicios para ${bebe.nombreCompleto}:`, exerciseErr);
        }

        // --- B. Recordatorios de Próxima Cita/Revisión ---
        if (bebe.proximaRevision) {
          try {
            const fechaCita = new Date(`${bebe.proximaRevision}T00:00:00`);
            
            if (!isNaN(fechaCita.getTime())) {
              // 1. Notificación la víspera (Día previo a las 10:00 AM)
              const fechaVispera = new Date(fechaCita);
              fechaVispera.setDate(fechaVispera.getDate() - 1);
              fechaVispera.setHours(10, 0, 0, 0);

              if (fechaVispera > hoy) {
                await Notifications.scheduleNotificationAsync({
                  content: {
                    title: `Revisión Médica Mañana 🩺`,
                    body: `Mañana es la cita de revisión de displasia para ${primerNombre}. ¡Ten a mano sus radiografías!`,
                    sound: 'default',
                  },
                  trigger: {
                    type: SchedulableTriggerInputTypes.DATE,
                    date: fechaVispera,
                    channelId: 'ddc-reminders',
                  },
                });
              }

              // 2. Notificación del mismo día (Cita hoy a las 08:30 AM)
              const fechaMismoDia = new Date(fechaCita);
              fechaMismoDia.setHours(8, 30, 0, 0);

              if (fechaMismoDia > hoy) {
                await Notifications.scheduleNotificationAsync({
                  content: {
                    title: `Hoy toca revisión con el médico 🏥`,
                    body: `Hoy le corresponde a ${primerNombre} la consulta periódica para displasia de cadera.`,
                    sound: 'default',
                  },
                  trigger: {
                    type: SchedulableTriggerInputTypes.DATE,
                    date: fechaMismoDia,
                    channelId: 'ddc-reminders',
                  },
                });
              }
            }
          } catch (dateErr) {
            console.error(`[notificacionesService] Error programando cita para ${bebe.nombreCompleto}:`, dateErr);
          }
        }
      }
    } catch (globalErr) {
      console.error('[notificacionesService] Error global en reprogramar:', globalErr);
    }
  }
};
